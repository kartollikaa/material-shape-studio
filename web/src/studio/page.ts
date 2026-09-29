import { build, buildCubics, version } from "@material-shape-studio/engine";
import { CATALOGUE, CATALOGUE_NAMES } from "../catalogue";
import type { ShapeDocument } from "../document";
import { cssRule } from "../export/css";
import { kotlinFile } from "../export/kotlin";
import { svgFile, svgPath } from "../export/svg";
import {
  addDot, canRemoveDot, History, isEdited, mainControls, moreControls, moveDot, pick, removeDot, restore, round3, snapshot,
  viewTransforms, type Control, type EditorState,
} from "./editor";
import { backward, forward, squareAround, type Box } from "./geometry";

type Tab = "compose" | "svg" | "png" | "css";
type Built = { cubics: number[]; bounds: [number, number, number, number] };

const SVG_NS = "http://www.w3.org/2000/svg";
const PNG_SIZE = 1024;

export const displayName = (name: string) => name.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/([0-9])([A-Z])/g, "$1 $2");

export function mountStudio(page: Document) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => page.getElementById(id) as T;
  const svg = (tag: string, attrs: Record<string, string | number> = {}, parent?: Element) => {
    const node = page.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    parent?.appendChild(node);
    return node;
  };
  const html = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}) =>
    Object.assign(page.createElement(tag), props) as HTMLElementTagNameMap[K];

  let state: EditorState = pick("Cookie4Sided");
  let colour = "#6750a4";
  let tab: Tab = "compose";
  let dragging = false;
  let frozenBox: Box | null = null;
  let lastGood: Built | null = null;
  const history = new History();
  const remember = () => history.remember(snapshot(state));
  const buildDoc = (doc: ShapeDocument): Built => JSON.parse(build(JSON.stringify(doc)));
  const pathOf = (cubics: ArrayLike<number>) => svgPath(cubics, 1, 4);
  const normalizedCubics = () => {
    try {
      return buildCubics(JSON.stringify(state.doc));
    } catch {
      return null;
    }
  };

  const thumbs = Object.fromEntries(
    CATALOGUE_NAMES.map((name) => {
      const built = buildDoc(CATALOGUE[name]);
      return [name, { d: pathOf(built.cubics), box: squareAround(built.bounds, [], 1.08).join(" ") }];
    }),
  );

  function renderPicker() {
    const container = $("picker");
    if (!container.childElementCount) {
      for (const name of CATALOGUE_NAMES) {
        const b = html("button", { className: "thumb", title: displayName(name) });
        b.dataset.name = name;
        b.setAttribute("aria-label", displayName(name));
        svg("path", { d: thumbs[name].d }, svg("svg", { viewBox: thumbs[name].box, "aria-hidden": "true" }, b));
        b.addEventListener("click", () => { remember(); state = pick(name); lastGood = null; render(); });
        b.addEventListener("pointerenter", () => { $("caption").textContent = displayName(name); });
        b.addEventListener("pointerleave", () => { $("caption").textContent = `Selected: ${displayName(state.name)}`; });
        container.appendChild(b);
      }
    }
    for (const b of Array.from(container.children) as HTMLElement[]) b.setAttribute("aria-pressed", String(b.dataset.name === state.name));
    $("caption").textContent = `Selected: ${displayName(state.name)}`;
  }

  function controlRow(container: HTMLElement, c: Control) {
    const wrap = html("div", { className: "control" });
    const id = `control-${container.id}-${container.childElementCount}`;
    const top = html("div", { className: "top" });
    const label = html("label", { htmlFor: id, textContent: c.label });
    const out = html("output");
    top.append(label, out);
    wrap.appendChild(top);
    if (c.why) wrap.appendChild(html("p", { className: "why", textContent: c.why }));
    const range = html("input", { type: "range", id, min: String(c.min), max: String(c.max), step: String(c.step) });
    range.value = String(c.get());
    out.textContent = c.show(Number(range.value));
    let started = false;
    range.addEventListener("input", () => {
      if (!started) { remember(); started = true; }
      const v = c.step >= 1 ? Math.round(Number(range.value)) : round3(Number(range.value));
      c.set(v);
      out.textContent = c.show(v);
      renderLive();
    });
    range.addEventListener("change", () => { started = false; render(); });
    wrap.appendChild(range);
    container.appendChild(wrap);
  }

  function actionButton(container: HTMLElement, label: string, action: () => void, disabled = false) {
    const b = html("button", { textContent: label, disabled });
    b.addEventListener("click", () => { remember(); action(); render(); });
    container.appendChild(b);
  }

  function renderControls() {
    $("shape-name").textContent = `· ${displayName(state.name)}${isEdited(state) ? " (edited)" : ""}`;
    $("reset").hidden = !isEdited(state);
    const main = $("controls");
    main.replaceChildren();
    mainControls(state).forEach((c) => controlRow(main, c));
    const more = $("more-controls");
    more.replaceChildren();
    const extra = moreControls(state);
    extra.forEach((c) => controlRow(more, c));
    const polygon = state.doc.shape.kind === "polygon";
    if (polygon) {
      const buttons = html("div", { className: "buttons" });
      actionButton(buttons, "Add a dot", () => addDot(state));
      actionButton(buttons, "Remove the selected dot", () => removeDot(state), !canRemoveDot(state));
      more.appendChild(buttons);
    }
    $("more").hidden = !extra.length && !polygon;
  }

  function renderShape() {
    const preview = $("preview") as unknown as SVGSVGElement;
    preview.replaceChildren();
    const transforms = viewTransforms(state.doc);
    let built: Built | null;
    try {
      built = buildDoc({ ...state.doc, transforms });
      lastGood = built;
      $("error").hidden = true;
    } catch (e) {
      $("error").hidden = false;
      $("error").textContent = `That combination can't be drawn: ${(e as Error).message.replace(/^[\w.[\]]+: /, "")}`;
      built = lastGood;
    }
    if (!built) return;
    const shape = state.doc.shape;
    const dots = shape.kind === "polygon" ? shape.vertices.map((p) => forward(p, transforms)) : [];
    const box = dragging && frozenBox ? frozenBox : squareAround(built.bounds, dots);
    frozenBox = box;
    preview.setAttribute("viewBox", box.join(" "));
    svg("path", { d: pathOf(built.cubics), fill: colour }, preview);
    dots.forEach(([x, y], i) => {
      const dot = svg("circle", { cx: x, cy: y, r: box[2] * 0.02, class: `dot${i === state.selected ? " selected" : ""}`, role: "button", "aria-label": `Dot ${i + 1}` }, preview);
      dot.addEventListener("pointerdown", (e) => startDrag(e as PointerEvent, i));
    });
    $("stage-hint").hidden = !dots.length;
  }

  function startDrag(event: PointerEvent, index: number) {
    event.preventDefault();
    const preview = $("preview") as unknown as SVGSVGElement;
    preview.setPointerCapture?.(event.pointerId);
    const before = snapshot(state);
    state.selected = index;
    dragging = true;
    const move = (e: PointerEvent) => {
      const matrix = preview.getScreenCTM();
      if (!matrix) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
      moveDot(state, index, backward([p.x, p.y], viewTransforms(state.doc)));
      renderLive();
    };
    const up = () => {
      preview.removeEventListener("pointermove", move);
      preview.removeEventListener("pointerup", up);
      preview.removeEventListener("pointercancel", up);
      dragging = false;
      if (snapshot(state) !== before) history.remember(before);
      render();
    };
    preview.addEventListener("pointermove", move);
    preview.addEventListener("pointerup", up);
    preview.addEventListener("pointercancel", up);
    renderControls();
    renderShape();
  }

  function renderInUse(cubics: ArrayLike<number> | null) {
    const row = $("in-use");
    row.replaceChildren();
    if (!cubics) return;
    const d = pathOf(cubics);
    row.appendChild(html("span", { className: "label", textContent: "In use:" }));
    const figure = (caption: string, draw: (canvas: Element) => void) => {
      const fig = html("figure");
      draw(svg("svg", { viewBox: "0 0 1 1", "aria-hidden": "true" }, fig));
      fig.appendChild(html("figcaption", { textContent: caption }));
      row.appendChild(fig);
    };
    figure("Photo", (canvas) => {
      const defs = svg("defs", {}, canvas);
      svg("path", { d }, svg("clipPath", { id: "clip-photo" }, defs));
      const sky = svg("linearGradient", { id: "sky", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      svg("stop", { offset: 0, "stop-color": "#8ec5ff" }, sky);
      svg("stop", { offset: 1, "stop-color": "#fbd3e9" }, sky);
      const g = svg("g", { "clip-path": "url(#clip-photo)" }, canvas);
      svg("rect", { x: 0, y: 0, width: 1, height: 1, fill: "url(#sky)" }, g);
      svg("circle", { cx: 0.7, cy: 0.32, r: 0.12, fill: "#fff3b0" }, g);
      svg("path", { d: "M0 0.8 L0.3 0.45 L0.52 0.68 L0.7 0.5 L1 0.82 L1 1 L0 1Z", fill: "#3f6e5a" }, g);
    });
    figure("Icon button", (canvas) => {
      svg("path", { d, fill: colour }, canvas);
      svg("path", { d: "M0.5 0.34 V0.66 M0.34 0.5 H0.66", stroke: "#ffffff", "stroke-width": 0.07, "stroke-linecap": "round" }, canvas);
    });
    figure("Avatar", (canvas) => {
      svg("path", { d, style: "fill: var(--soft)" }, canvas);
      const text = svg("text", {
        x: 0.5, y: 0.5, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 0.32, "font-weight": 600,
        style: "fill: var(--text)", "font-family": "system-ui, sans-serif",
      }, canvas);
      text.textContent = "AB";
    });
  }

  const EXPORTS: Record<Tab, { about: () => string; code: (cubics: ArrayLike<number>) => string; buttons: [string, "copy" | "svg" | "png"][] }> = {
    compose: {
      about: () => (isEdited(state)
        ? "Your edited shape as code. Paste it into a Kotlin file of an app that uses Compose Material 3 and androidx.graphics:graphics-shapes."
        : `This is Material's own MaterialShapes.${state.name}. Paste the code into a Kotlin file of an app that uses Compose Material 3.`),
      code: () => kotlinFile(state.doc, { catalogueName: isEdited(state) ? null : state.name, colour }),
      buttons: [["Copy code", "copy"]],
    },
    svg: {
      about: () => "A vector file that stays sharp at any size. It opens in Figma, Illustrator and any browser.",
      code: (cubics) => svgFile(cubics, colour),
      buttons: [["Copy SVG", "copy"], ["Download SVG", "svg"]],
    },
    png: {
      about: () => `A ${PNG_SIZE} × ${PNG_SIZE} image with a transparent background.`,
      code: () => "",
      buttons: [["Download PNG", "png"]],
    },
    css: {
      about: () => "Clips any element on a web page to this shape. Give the element a width; the height follows.",
      code: (cubics) => cssRule(cubics),
      buttons: [["Copy CSS", "copy"]],
    },
  };

  const fileName = () => `${displayName(state.name).toLowerCase().replace(/\s+/g, "-")}${isEdited(state) ? "-edited" : ""}`;
  function download(blob: Blob, extension: string) {
    const a = html("a", { href: URL.createObjectURL(blob), download: `${fileName()}.${extension}` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportAction(kind: "copy" | "svg" | "png", button: HTMLButtonElement, cubics: ArrayLike<number>) {
    const current = EXPORTS[tab];
    if (kind === "copy") {
      const label = button.textContent;
      const done = (text: string) => {
        button.textContent = text;
        setTimeout(() => { button.textContent = label; }, 1400);
      };
      if (!navigator.clipboard) return done("Copy failed");
      navigator.clipboard.writeText(current.code(cubics)).then(() => done("Copied"), () => done("Copy failed"));
    }
    if (kind === "svg") download(new Blob([svgFile(cubics, colour)], { type: "image/svg+xml" }), "svg");
    if (kind === "png") {
      const canvas = html("canvas", { width: PNG_SIZE, height: PNG_SIZE });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = colour;
      ctx.fill(new Path2D(svgPath(cubics, PNG_SIZE, 2)));
      canvas.toBlob((blob) => { if (blob) download(blob, "png"); }, "image/png");
    }
  }

  function renderExport(cubics: ArrayLike<number> | null) {
    for (const b of Array.from($("tabs").querySelectorAll("button"))) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
    const current = EXPORTS[tab];
    $("export-about").textContent = current.about();
    const buttons = $("export-buttons");
    buttons.replaceChildren();
    current.buttons.forEach(([label, kind], i) => {
      const b = html("button", { textContent: label, className: i === 0 ? "primary" : "", disabled: !cubics });
      if (cubics) b.addEventListener("click", () => exportAction(kind, b, cubics));
      buttons.appendChild(b);
    });
    $("export-code").textContent = cubics ? current.code(cubics) : "";
  }

  let liveTimer: ReturnType<typeof setTimeout> | undefined;
  function renderLive() {
    renderShape();
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      const cubics = normalizedCubics();
      renderInUse(cubics);
      renderExport(cubics);
    }, 60);
  }

  function render() {
    renderPicker();
    renderControls();
    renderShape();
    const cubics = normalizedCubics();
    renderInUse(cubics);
    renderExport(cubics);
    ($("undo") as HTMLButtonElement).disabled = !history.canUndo;
    ($("redo") as HTMLButtonElement).disabled = !history.canRedo;
  }

  const undo = () => {
    const previous = history.undo(snapshot(state));
    if (previous) { state = restore(previous); lastGood = null; render(); }
  };
  const redo = () => {
    const next = history.redo(snapshot(state));
    if (next) { state = restore(next); lastGood = null; render(); }
  };

  $("undo").addEventListener("click", undo);
  $("redo").addEventListener("click", redo);
  $("reset").addEventListener("click", () => { remember(); state = pick(state.name); lastGood = null; render(); });
  $("colour").addEventListener("input", (e) => { colour = (e.target as HTMLInputElement).value; renderLive(); });
  $("tabs").addEventListener("click", (e) => {
    const chosen = (e.target as HTMLElement).dataset?.tab as Tab | undefined;
    if (!chosen) return;
    tab = chosen;
    renderExport(normalizedCubics());
  });
  page.defaultView?.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    const shape = state.doc.shape;
    if (shape.kind !== "polygon" || (e.target as HTMLElement).closest?.("input, textarea, pre")) return;
    const step = e.shiftKey ? 0.05 : 0.005;
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, [number, number]>)[e.key];
    if (!delta) return;
    e.preventDefault();
    remember();
    const [dx, dy] = backward(delta, viewTransforms(state.doc).filter((t) => t.type === "rotate"));
    const [x, y] = shape.vertices[state.selected];
    moveDot(state, state.selected, [x + dx, y + dy]);
    render();
  });

  const versions = JSON.parse(version());
  $("engine-version").textContent = versions.graphicsShapes;
  render();
}
