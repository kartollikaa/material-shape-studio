import { build, buildCubics, version } from "@material-shape-studio/engine";
import { previewFrame } from "@material-shape-studio/core";
import { CATALOGUE, CATALOGUE_NAMES } from "../catalogue";
import type { ShapeDocument, Transform } from "../document";
import { cssRule } from "../export/css";
import { kotlinFile } from "../export/kotlin";
import { svgFile, svgPath } from "../export/svg";
import {
  addDot, canRemoveDot, fromDocument, History, isEdited, mainControls, moreControls, moveDot, pick, removeDot, restore, round3, snapshot,
  viewTransforms, type Control, type EditorState,
} from "./editor";
import { backward, forward, squareAround, type Box } from "./geometry";
import { syncAddress } from "./url-state";

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

  // Controls close over the state they were built from, so every reassignment must be followed by render().
  let state: EditorState = pick("Cookie4Sided");
  let colour = "#6750a4";
  let tab: Tab = "compose";
  let address: ReturnType<typeof syncAddress> | undefined;
  let dragging = false;
  let frozenBox: Box | null = null;
  let lastGood: Built | null = null;
  let controlTimer: ReturnType<typeof setTimeout> | undefined;
  let history = new History();
  const remember = () => history.remember(snapshot(state));
  const buildDoc = (doc: ShapeDocument): Built => JSON.parse(build(JSON.stringify(doc)));
  const pathOf = (cubics: ArrayLike<number>) => svgPath(cubics, 1, 4);
  const refill = (container: Element, fill: () => void) => {
    const focused = container.contains(page.activeElement) ? page.activeElement?.getAttribute("data-focus") : null;
    container.replaceChildren();
    fill();
    if (!focused) return;
    const usable = (e?: Element | null) => !!e && !(e as HTMLButtonElement).disabled;
    const target = Array.from(container.querySelectorAll<HTMLElement | SVGElement>("[data-focus]")).find((e) => e.dataset.focus === focused);
    const fallback = Array.from(target?.parentElement?.querySelectorAll<HTMLElement>("[data-focus]") ?? []).find(usable);
    (usable(target) ? target : fallback)?.focus({ preventScroll: true });
  };
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
        b.addEventListener("click", () => {
          remember(); state = pick(name); lastGood = null; render();
          if ($("change-shape").getAttribute("aria-expanded") === "true") {
            $("change-shape").setAttribute("aria-expanded", "false");
            $("change-shape").focus({ preventScroll: true });
          }
        });
        b.addEventListener("pointerenter", () => { $("caption").textContent = displayName(name); });
        b.addEventListener("pointerleave", () => { $("caption").textContent = `Selected: ${displayName(state.name ?? "Custom shape")}`; });
        container.appendChild(b);
      }
    }
    for (const b of Array.from(container.children) as HTMLElement[]) b.setAttribute("aria-pressed", String(b.dataset.name === state.name));
    $("caption").textContent = `Selected: ${displayName(state.name ?? "Custom shape")}`;
  }

  function controlRow(container: HTMLElement, c: Control) {
    const wrap = html("div", { className: "control" });
    const id = `control-${container.id}-${container.childElementCount}`;
    const top = html("div", { className: "top" });
    const label = html("label", { htmlFor: id, textContent: c.label });
    const scale = c.scale ?? 1;
    const value = html("input", { type: "number", min: String(c.min * scale), max: String(c.max * scale), step: String(c.step * scale) });
    value.setAttribute("aria-label", `${c.label} value`);
    value.dataset.focus = `value:${c.label}`;
    const out = html("span", { className: "control-value" });
    out.append(value, html("span", { textContent: c.unit ?? "" }));
    top.append(label, out);
    wrap.appendChild(top);
    const range = html("input", { type: "range", id, min: String(c.min), max: String(c.max), step: String(c.step) });
    range.dataset.focus = `control:${c.label}`;
    if (c.why) {
      wrap.appendChild(html("p", { className: "why", id: `${id}-why`, textContent: c.why }));
      range.setAttribute("aria-describedby", `${id}-why`);
      value.setAttribute("aria-describedby", `${id}-why`);
    }
    const show = (v: number) => {
      value.value = String(round3(v * scale));
      range.setAttribute("aria-valuetext", c.show(v));
    };
    range.value = String(c.get());
    show(Number(range.value));
    let started = false;
    range.addEventListener("input", () => {
      if (!started) { remember(); started = true; }
      const v = c.step >= 1 ? Math.round(Number(range.value)) : round3(Number(range.value));
      c.set(v);
      show(v);
      renderLive();
    });
    range.addEventListener("change", () => { started = false; render(); });
    const commitValue = (deferRender = false) => {
      if (!value.value || !Number.isFinite(value.valueAsNumber)) { show(c.get()); return; }
      const bounded = Math.max(c.min, Math.min(c.max, value.valueAsNumber / scale));
      const next = round3(c.min + Math.round((bounded - c.min) / c.step) * c.step);
      if (next !== c.get()) { remember(); c.set(next); }
      updateAddress();
      clearTimeout(controlTimer);
      if (deferRender) controlTimer = setTimeout(render, 0);
      else render();
    };
    value.addEventListener("change", () => commitValue(true));
    value.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); commitValue(); } });
    wrap.appendChild(range);
    container.appendChild(wrap);
  }

  function actionButton(container: HTMLElement, label: string, action: () => void, disabled = false) {
    const b = html("button", { textContent: label, disabled });
    b.dataset.focus = `action:${label}`;
    b.addEventListener("click", () => { remember(); action(); render(); });
    container.appendChild(b);
  }

  function renderControls() {
    $("shape-name").textContent = displayName(state.name ?? "Custom shape");
    $("shape-status").textContent = isEdited(state) ? "Edited shape" : state.name ? "Material original" : "Custom shape";
    $("reset").hidden = !isEdited(state);
    const main = $("controls");
    const controls = [...mainControls(state), ...moreControls(state)];
    refill(main, () => {
      controls.forEach((c) => controlRow(main, c));
      if (state.doc.shape.kind === "circle" && controls.length === 1) {
        const space = html("div", { className: "control control-space" });
        space.setAttribute("aria-hidden", "true");
        const top = html("div", { className: "top" });
        top.append(html("span", { textContent: "Rotate" }), html("input", { type: "number", disabled: true }));
        space.append(top, html("input", { type: "range", disabled: true }));
        main.appendChild(space);
      }
    });
    const polygon = state.doc.shape.kind === "polygon";
    const buttons = $("dot-actions");
    buttons.hidden = !polygon;
    refill(buttons, () => {
      if (!polygon) return;
      actionButton(buttons, "Add a dot", () => addDot(state));
      actionButton(buttons, "Remove the selected dot", () => removeDot(state), !canRemoveDot(state));
    });
  }

  function buildPreview(transforms: Transform[]): Built | null {
    try {
      lastGood = buildDoc({ ...state.doc, transforms });
      $("error").hidden = true;
    } catch (e) {
      $("error").hidden = false;
      $("error").textContent = `That combination can't be drawn: ${(e as Error).message.replace(/^[\w.[\]]+: /, "")}`;
    }
    return lastGood;
  }

  const select = (index: number) => {
    if (state.selected === index) return;
    state.selected = index;
    render();
  };

  function renderShape() {
    const preview = $("preview") as unknown as SVGSVGElement;
    const transforms = viewTransforms(state.doc);
    const built = buildPreview(transforms);
    const shape = state.doc.shape;
    const dots = built && shape.kind === "polygon" ? shape.vertices.map((p) => forward(p, transforms)) : [];
    refill(preview, () => {
      if (!built) return;
      const box = dragging && frozenBox ? frozenBox : squareAround(built.bounds, dots);
      frozenBox = box;
      preview.setAttribute("viewBox", box.join(" "));
      svg("path", { d: pathOf(built.cubics), fill: colour }, preview);
      if (dots.length) svg("polyline", { class: "construction", points: dots.map((p) => p.join(",")).join(" "), "aria-hidden": "true" }, preview);
      dots.forEach(([x, y], i) => {
        const target = svg("circle", { cx: x, cy: y, r: box[2] * 0.02, class: "dot-target", "aria-hidden": "true" }, preview);
        target.addEventListener("pointerdown", (e) => startDrag(e as PointerEvent, i));
      });
      dots.forEach(([x, y], i) => {
        const dot = svg("circle", {
          cx: x, cy: y, r: box[2] * 0.02, class: `dot${i === state.selected ? " selected" : ""}`,
          role: "button", tabindex: 0, "aria-label": `Dot ${i + 1}`, "data-focus": `dot:${i}`,
        }, preview);
        dot.addEventListener("pointerdown", (e) => startDrag(e as PointerEvent, i));
        dot.addEventListener("focus", () => select(i));
      });
    });
    $("stage-hint").hidden = !dots.length;
  }

  function startDrag(event: PointerEvent, index: number) {
    event.preventDefault();
    const preview = $("preview") as unknown as SVGSVGElement;
    preview.setPointerCapture?.(event.pointerId);
    const before = snapshot(state);
    const docBefore = JSON.stringify(state.doc);
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
      if (JSON.stringify(state.doc) !== docBefore) history.remember(before);
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
    const [x, y, size] = previewFrame(buildDoc(state.doc).bounds);
    const artwork = { transform: `translate(${x} ${y}) scale(${size})` };
    row.appendChild(html("span", { className: "label", textContent: "In use:" }));
    const figure = (caption: string, draw: (canvas: Element) => void) => {
      const fig = html("figure");
      draw(svg("svg", { viewBox: `${x} ${y} ${size} ${size}`, "aria-hidden": "true" }, fig));
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
      const scene = svg("g", artwork, g);
      svg("rect", { x: 0, y: 0, width: 1, height: 1, fill: "url(#sky)" }, scene);
      svg("circle", { cx: 0.7, cy: 0.32, r: 0.12, fill: "#fff3b0" }, scene);
      svg("path", { d: "M0 0.8 L0.3 0.45 L0.52 0.68 L0.7 0.5 L1 0.82 L1 1 L0 1Z", fill: "#3f6e5a" }, scene);
    });
    figure("Icon button", (canvas) => {
      svg("path", { d, fill: colour }, canvas);
      svg("path", { d: "M0.5 0.34 V0.66 M0.34 0.5 H0.66", stroke: "#ffffff", "stroke-width": 0.07, "stroke-linecap": "round" }, svg("g", artwork, canvas));
    });
    figure("Avatar", (canvas) => {
      svg("path", { d, style: "fill: var(--soft)" }, canvas);
      const text = svg("text", {
        x: 0.5, y: 0.5, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 0.32, "font-weight": 600,
        style: "fill: var(--text)", "font-family": "system-ui, sans-serif",
      }, svg("g", artwork, canvas));
      text.textContent = "AB";
    });
  }

  const EXPORTS: Record<Tab, { about: () => string; code: (cubics: ArrayLike<number>) => string; buttons: [string, "copy" | "svg" | "png"][] }> = {
    compose: {
      about: () => (isEdited(state) || !state.name
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

  const fileName = () => `${displayName(state.name ?? "Custom shape").toLowerCase().replace(/\s+/g, "-")}${isEdited(state) ? "-edited" : ""}`;
  function download(blob: Blob, extension: string) {
    const a = html("a", { href: URL.createObjectURL(blob), download: `${fileName()}.${extension}` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportAction(kind: "copy" | "svg" | "png", button: HTMLButtonElement, label: string, cubics: ArrayLike<number>) {
    const flash = (text: string) => {
      button.textContent = text;
      setTimeout(() => { button.textContent = label; }, 1400);
    };
    if (kind === "copy") {
      if (!navigator.clipboard) return flash("Copy failed");
      navigator.clipboard.writeText(EXPORTS[tab].code(cubics)).then(() => flash("Copied"), () => flash("Copy failed"));
    }
    if (kind === "svg") download(new Blob([svgFile(cubics, colour)], { type: "image/svg+xml" }), "svg");
    if (kind === "png") {
      const canvas = html("canvas", { width: PNG_SIZE, height: PNG_SIZE });
      const ctx = canvas.getContext("2d");
      if (!ctx) return flash("Download failed");
      ctx.fillStyle = colour;
      ctx.fill(new Path2D(svgPath(cubics, PNG_SIZE, 2)));
      canvas.toBlob((blob) => (blob ? download(blob, "png") : flash("Download failed")), "image/png");
    }
  }

  function renderExport(cubics: ArrayLike<number> | null) {
    for (const b of Array.from($("tabs").querySelectorAll("button"))) {
      b.setAttribute("aria-selected", String(b.dataset.tab === tab));
      b.tabIndex = b.dataset.tab === tab ? 0 : -1;
    }
    const current = EXPORTS[tab];
    $("export-about").textContent = current.about();
    const buttons = $("export-buttons");
    refill(buttons, () => current.buttons.forEach(([label, kind], i) => {
      const b = html("button", { textContent: label, className: i === 0 ? "primary" : "", disabled: !cubics });
      b.dataset.focus = `export:${label}`;
      if (cubics) b.addEventListener("click", () => exportAction(kind, b, label, cubics));
      buttons.appendChild(b);
    }));
    $("export-code").textContent = cubics ? current.code(cubics) : "";
    $("code-details").hidden = tab === "png";
  }

  let liveTimer: ReturnType<typeof setTimeout> | undefined;
  function renderLive() {
    updateAddress();
    renderShape();
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      const cubics = normalizedCubics();
      renderInUse(cubics);
      renderExport(cubics);
    }, 60);
  }

  function render() {
    updateAddress();
    const view = page.defaultView;
    const scroll = view && page.activeElement?.matches('input[type="range"], input[type="number"]') ? [view.scrollX, view.scrollY] : null;
    renderPicker();
    renderControls();
    renderShape();
    const cubics = normalizedCubics();
    renderInUse(cubics);
    renderExport(cubics);
    try {
      const bounds = buildDoc(state.doc).bounds;
      $("bounds-warning").hidden = bounds.every((v, i) => i < 2 ? v >= -1e-4 : v <= 1 + 1e-4);
    } catch {
      $("bounds-warning").hidden = true;
    }
    ($("undo") as HTMLButtonElement).disabled = !history.canUndo;
    ($("redo") as HTMLButtonElement).disabled = !history.canRedo;
    if (view && scroll && (view.scrollX !== scroll[0] || view.scrollY !== scroll[1])) view.scrollTo(scroll[0], scroll[1]);
  }

  const undo = () => {
    if (dragging) return;
    const previous = history.undo(snapshot(state));
    if (previous) { state = restore(previous); lastGood = null; render(); }
  };
  const redo = () => {
    if (dragging) return;
    const next = history.redo(snapshot(state));
    if (next) { state = restore(next); lastGood = null; render(); }
  };

  $("undo").addEventListener("click", undo);
  $("change-shape").addEventListener("click", () => {
    const button = $("change-shape");
    button.setAttribute("aria-expanded", String(button.getAttribute("aria-expanded") !== "true"));
  });
  $("redo").addEventListener("click", redo);
  $("reset").addEventListener("click", () => {
    remember();
    state = state.name ? pick(state.name) : fromDocument(state.initial);
    lastGood = null;
    render();
  });
  $("copy-document").addEventListener("click", () => {
    const button = $("copy-document");
    if (!navigator.clipboard) { button.textContent = "Copy failed"; return; }
    navigator.clipboard.writeText(JSON.stringify(state.doc)).then(
      () => { button.textContent = "Copied document"; },
      () => { button.textContent = "Copy failed"; },
    );
  });
  $("colour").addEventListener("input", (e) => { colour = (e.target as HTMLInputElement).value; renderLive(); });
  $("tabs").addEventListener("click", (e) => {
    const chosen = (e.target as HTMLElement).dataset?.tab as Tab | undefined;
    if (!chosen) return;
    tab = chosen;
    renderExport(normalizedCubics());
    updateAddress();
  });
  $("tabs").addEventListener("keydown", (e) => {
    const step = ({ ArrowLeft: -1, ArrowRight: 1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    const tabs = Array.from($("tabs").querySelectorAll<HTMLButtonElement>("[role=tab]"));
    const next = tabs[(tabs.findIndex((b) => b.dataset.tab === tab) + step + tabs.length) % tabs.length];
    next.click();
    next.focus();
  });
  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    const shape = state.doc.shape;
    if (shape.kind !== "polygon" || (e.target as HTMLElement).closest?.("input, textarea, select, pre, [role=tab]")) return;
    const step = e.shiftKey ? 0.05 : 0.005;
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, [number, number]>)[e.key];
    if (!delta) return;
    e.preventDefault();
    remember();
    const [dx, dy] = backward(delta, viewTransforms(state.doc).filter((t) => t.type === "rotate"));
    const [x, y] = shape.vertices[state.selected];
    moveDot(state, state.selected, [x + dx, y + dy]);
    render();
  };
  page.defaultView?.addEventListener("keydown", onKey);

  const versions = JSON.parse(version());
  $("engine-version").textContent = versions.graphicsShapes;
  render();
  function updateAddress() {
    address?.update({ v: 1, editor: state, colour, tab });
  }
  const view = page.defaultView;
  if (view) address = syncAddress(view, { v: 1, editor: state, colour, tab }, (saved) => {
    page.querySelector("[data-url-notice]")?.remove();
    history = new History();
    state = saved.editor;
    colour = saved.colour;
    tab = saved.tab;
    ($("colour") as HTMLInputElement).value = colour;
    lastGood = null;
    render();
  }, (message) => {
    page.querySelector("[data-url-notice]")?.remove();
    const notice = html("div", { className: "error" });
    notice.dataset.urlNotice = "";
    notice.setAttribute("role", "status");
    const dismiss = html("button", { textContent: "Dismiss" });
    dismiss.addEventListener("click", () => notice.remove());
    notice.append(html("p", { textContent: message }), dismiss);
    page.querySelector("header")?.after(notice);
  });
  return () => {
    address?.dispose();
    clearTimeout(controlTimer);
    clearTimeout(liveTimer);
    page.defaultView?.removeEventListener("keydown", onKey);
  };
}
