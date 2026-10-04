import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build, buildCubics } from "@material-shape-studio/engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOGUE, CATALOGUE_NAMES } from "../catalogue";
import { decodeShare, encodeShare, previewFrame } from "@material-shape-studio/core";
import { svgPath } from "../export/svg";
import { displayName, mountStudio } from "./page";
import { decodeState } from "./url-state";

vi.mock("@material-shape-studio/engine", async (importOriginal) => {
  const engine = await importOriginal<typeof import("@material-shape-studio/engine")>();
  return { ...engine, build: vi.fn(engine.build), buildCubics: vi.fn(engine.buildCubics) };
});

const markup = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const body = markup.slice(markup.indexOf("<body>") + "<body>".length, markup.indexOf("</body>")).replace(/<script[\s\S]*?<\/script>/, "");

const byId = (id: string) => document.getElementById(id)!;
const click = (element: Element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
const labels = (selector: string) => Array.from(document.querySelectorAll(selector)).map((e) => e.textContent);
const exportCode = () => byId("export-code").textContent ?? "";
const openTab = (name: string) => click(document.querySelector(`[data-tab=${name}]`)!);
const slider = (label: string) =>
  Array.from(document.querySelectorAll("#controls .control")).find((c) => c.querySelector("label")?.textContent === label)!.querySelector<HTMLInputElement>('input[type="range"]')!;
function drag(label: string, value: number) {
  const input = slider(label);
  input.value = String(value);
  input.dispatchEvent(new Event("input"));
}
function slide(label: string, value: number) {
  drag(label, value);
  slider(label).dispatchEvent(new Event("change"));
}
const press = (key: string, options: KeyboardEventInit = {}, target: EventTarget = window) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...options }));
const dots = () => Array.from(document.querySelectorAll<SVGElement>("#preview .dot"));
const selectedDot = () => document.querySelector("#preview .dot.selected")!;
const position = (dot: Element) => ["cx", "cy"].map((a) => Number(dot.getAttribute(a)));
const firstExportButton = () => document.querySelector<HTMLButtonElement>("#export-buttons button")!;
const undoButton = () => byId("undo") as HTMLButtonElement;

let dispose: () => void;
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  document.body.innerHTML = body;
  dispose = mountStudio(document);
});

describe("the browser address", () => {
  it("automatically carries live edits, colour and export format into a reopened editor", async () => {
    click(document.querySelector('[data-name="Heart"]')!);
    drag("Rotate", 45);
    drag("Roundness", 1.25);
    const colour = byId("colour") as HTMLInputElement;
    colour.value = "#123456";
    colour.dispatchEvent(new Event("input"));
    openTab("svg");
    await vi.waitFor(() => expect(window.location.hash).toContain("shape=Heart"));
    expect(window.location.hash).toContain("rotate=45");
    expect(window.location.hash).toContain("roundness=125");
    await vi.waitFor(async () => expect((await decodeState(window.location.hash.slice(1))).tab).toBe("svg"));
    const address = window.location.href;
    const path = document.querySelector("#preview path")!.getAttribute("d");
    const code = exportCode();
    dispose();
    document.body.innerHTML = body;
    window.history.replaceState(null, "", address);
    dispose = mountStudio(document);
    await vi.waitFor(() => expect(byId("shape-name").textContent).toBe("Heart"));
    expect(slider("Rotate").value).toBe("45");
    expect(slider("Roundness").value).toBe("1.25");
    expect((byId("colour") as HTMLInputElement).value).toBe("#123456");
    expect(document.querySelector('[data-tab="svg"]')!.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector("#preview path")!.getAttribute("d")).toBe(path);
    expect(exportCode()).toBe(code);
    slide("Roundness", 1.5);
    expect(slider("Roundness").value).toBe("1.5");
  });

  it("updates the address after undo, redo and reset without adding browser history entries", async () => {
    const length = window.history.length;
    slide("Rotate", 30);
    await vi.waitFor(() => expect(window.location.hash).not.toBe(""));
    const edited = window.location.hash;
    click(byId("undo"));
    await vi.waitFor(() => expect(window.location.hash).not.toBe(edited));
    const original = window.location.hash;
    click(byId("redo"));
    await vi.waitFor(() => expect(window.location.hash).toBe(edited));
    click(byId("reset"));
    await vi.waitFor(() => expect(window.location.hash).toBe(original));
    expect(window.history.length).toBe(length);
  });

  it("keeps the last rapid edit in the address and preserves moved and added dots", async () => {
    for (let angle = 1; angle <= 30; angle++) drag("Rotate", angle);
    click(document.querySelector("#dot-actions button")!);
    press("ArrowRight", { shiftKey: true });
    await vi.waitFor(async () => {
      const saved = await decodeState(window.location.hash.slice(1));
      expect(saved.editor.doc.transforms).toContainEqual({ type: "rotate", degrees: 30 });
      expect(saved.editor.selected).toBe(1);
      expect(saved.editor.doc.shape.kind).toBe("polygon");
      if (saved.editor.doc.shape.kind === "polygon") expect(saved.editor.doc.shape.vertices).toHaveLength(3);
    });
    const path = document.querySelector("#preview path")!.getAttribute("d");
    const dot = position(selectedDot());
    dispose();
    document.body.innerHTML = body;
    dispose = mountStudio(document);
    await vi.waitFor(() => expect(dots()).toHaveLength(3));
    expect(document.querySelector("#preview path")!.getAttribute("d")).toBe(path);
    expect(position(selectedDot())).toEqual(dot);
  });

  it("opens a corrupt address with a usable default shape and a dismissible notice", async () => {
    dispose();
    window.history.replaceState(null, "", "#doc=broken");
    document.body.innerHTML = body;
    dispose = mountStudio(document);
    await vi.waitFor(() => expect(document.querySelector('[data-url-notice]')).not.toBeNull());
    expect(byId("shape-name").textContent).toBe("Cookie 4 Sided");
    click(document.querySelector('[data-url-notice] button')!);
    expect(document.querySelector('[data-url-notice]')).toBeNull();
    slide("Rotate", 30);
    expect(slider("Rotate").value).toBe("30");
  });

  it("restores the default when a corrupt link replaces the hash in an open editor", async () => {
    click(document.querySelector('[data-name="Heart"]')!);
    slide("Rotate", 45);
    window.history.replaceState(null, "", "#doc=broken");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await vi.waitFor(() => expect(document.querySelector('[data-url-notice]')).not.toBeNull());
    expect(byId("shape-name").textContent).toBe("Cookie 4 Sided");
    expect(slider("Rotate").value).toBe("0");
  });

  it("applies a value edited directly in the address bar", async () => {
    slide("Rotate", 30);
    await vi.waitFor(() => expect(window.location.hash).toContain("rotate=30"));
    window.history.replaceState(null, "", window.location.hash.replace("rotate=30", "rotate=75"));
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await vi.waitFor(() => expect(slider("Rotate").value).toBe("75"));
  });

  it("clears a bad-link notice when the address is corrected", () => {
    window.history.replaceState(null, "", "#broken");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(document.querySelector("[data-url-notice]")).not.toBeNull();
    window.history.replaceState(null, "", "#shape=Heart&rotate=75");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(slider("Rotate").value).toBe("75");
    expect(document.querySelector("[data-url-notice]")).toBeNull();
  });

  it("updates the address immediately when a numeric edit defers rendering to preserve focus", () => {
    vi.useFakeTimers();
    const value = document.querySelector<HTMLInputElement>('[aria-label="Rotate value"]')!;
    value.value = "45";
    value.dispatchEvent(new Event("change"));
    expect(window.location.hash).toContain("rotate=45");
  });

  it("restores the default editor when all URL parameters are removed", () => {
    click(document.querySelector('[data-name="Heart"]')!);
    slide("Rotate", 45);
    openTab("svg");
    window.history.replaceState(null, "", "/");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(byId("shape-name").textContent).toBe("Cookie 4 Sided");
    expect(slider("Rotate").value).toBe("0");
    expect(document.querySelector('[data-tab="compose"]')!.getAttribute("aria-selected")).toBe("true");
    expect(window.location.hash).toBe("");
  });

  it("clears a bad-link notice when all URL parameters are removed", () => {
    window.history.replaceState(null, "", "#broken");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(document.querySelector("[data-url-notice]")).not.toBeNull();
    window.history.replaceState(null, "", "/");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(document.querySelector("[data-url-notice]")).toBeNull();
    expect(window.location.hash).toBe("");
  });

  it("keeps an edited custom shape in a reopenable link and returns to readable parameters for Material shapes", async () => {
    dispose();
    document.body.innerHTML = body;
    window.history.replaceState(null, "", await encodeShare({
      document: { v: 1, shape: { kind: "ngon", vertices: 7 } },
      presentation: { colour: "#123456", theme: "light", context: "button" },
    }));
    dispose = mountStudio(document);
    await vi.waitFor(() => expect(byId("shape-name").textContent).toBe("Custom shape"));
    expect((byId("colour") as HTMLInputElement).value).toBe("#123456");
    slide("Sides", 9);
    await vi.waitFor(async () => expect((await decodeShare(window.location.hash)).document).toEqual({ v: 1, shape: { kind: "ngon", vertices: 9 } }));
    const address = window.location.href;
    dispose();
    document.body.innerHTML = body;
    window.history.replaceState(null, "", address);
    dispose = mountStudio(document);
    await vi.waitFor(() => expect(slider("Sides").value).toBe("9"));
    click(document.querySelector('[data-name="Heart"]')!);
    expect(window.location.hash).toContain("shape=Heart");
  });
});
afterEach(() => {
  dispose();
  window.history.replaceState(null, "", window.location.pathname);
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("the studio page", () => {
  it("opens an agent-created custom shape and copies the edited document", async () => {
    const doc = { v: 1 as const, shape: { kind: "ngon" as const, vertices: 7 } };
    dispose();
    document.body.innerHTML = body;
    window.location.hash = await encodeShare({
      document: doc,
      presentation: { colour: "#6750a4", theme: "light", context: "button" },
    });
    dispose = mountStudio(document);
    await vi.waitFor(() => expect(byId("shape-name").textContent).toBe("Custom shape"));
    expect(document.querySelectorAll("#preview path")).toHaveLength(1);
    const bounds = JSON.parse(build(JSON.stringify(doc))).bounds as [number, number, number, number];
    expect(document.querySelector("#in-use svg")!.getAttribute("viewBox")).toBe(previewFrame(bounds).join(" "));
    slide("Sides", 8);
    expect(byId("shape-status").textContent).toBe("Edited shape");
    const writeText = vi.fn(async (_value: string) => undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    click(byId("copy-document"));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual({ v: 1, shape: { kind: "ngon", vertices: 8 } });
  });

  it("starts with editable dots and point-specific controls without a mode toggle", () => {
    expect(byId("edit-points")).toBeNull();
    expect(dots()).toHaveLength(2);
    expect(labels("#controls label")).toContain("Roundness of the selected dot");
    expect(labels("#dot-actions button")).toEqual(["Add a dot", "Remove the selected dot"]);
  });

  it("closes the compact picker and returns focus after selecting a shape", () => {
    click(byId("change-shape"));
    expect(byId("change-shape").getAttribute("aria-expanded")).toBe("true");
    click(document.querySelector('[data-name="Heart"]')!);
    expect(byId("change-shape").getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(byId("change-shape"));
    expect(byId("shape-name").textContent).toBe("Heart");
  });

  it("accepts displayed numeric units, clamps values, and restores numeric focus", () => {
    vi.useFakeTimers();
    const value = () => document.querySelector<HTMLInputElement>('[aria-label="Roundness value"]')!;
    expect(value().value).toBe("100");
    value().focus();
    value().value = "125";
    value().dispatchEvent(new Event("change"));
    vi.runOnlyPendingTimers();
    expect(slider("Roundness").value).toBe("1.25");
    expect(document.activeElement).toBe(value());
    click(byId("undo"));
    expect(value().value).toBe("100");
    value().value = "999";
    value().dispatchEvent(new Event("change"));
    vi.runOnlyPendingTimers();
    expect(value().value).toBe("250");
    value().value = "";
    value().dispatchEvent(new Event("change"));
    vi.runOnlyPendingTimers();
    expect(value().value).toBe("250");
  });

  it("lets native Tab move focus before rebuilding numeric controls", () => {
    vi.useFakeTimers();
    const value = document.querySelector<HTMLInputElement>('[aria-label="Rotate value"]')!;
    value.focus();
    value.value = "45";
    value.dispatchEvent(new Event("change"));
    expect(value.isConnected).toBe(true);
    slider("Rotate").focus();
    vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(slider("Rotate"));
    expect(slider("Rotate").value).toBe("45");
  });

  it("keeps code optional and omits the disclosure for PNG", () => {
    expect((byId("code-details") as HTMLDetailsElement).open).toBe(false);
    expect(exportCode()).toContain("MaterialShapes");
    openTab("png");
    expect(byId("code-details").hidden).toBe(true);
    openTab("svg");
    expect(byId("code-details").hidden).toBe(false);
  });
  it("offers the 35 Material shapes as named buttons, and picking one selects and names it", () => {
    const thumbs = () => Array.from(document.querySelectorAll("#picker .thumb"));
    expect(thumbs().map((t) => [t.tagName, t.getAttribute("aria-label")])).toEqual(CATALOGUE_NAMES.map((n) => ["BUTTON", displayName(n)]));
    expect(thumbs()[0].getAttribute("aria-label")).toBe("Circle");
    expect(document.querySelector('[data-name="Cookie4Sided"]')!.getAttribute("aria-pressed")).toBe("true");
    for (const name of CATALOGUE_NAMES) {
      click(document.querySelector(`[data-name="${name}"]`)!);
      expect(thumbs().filter((t) => t.getAttribute("aria-pressed") === "true").map((t) => t.getAttribute("data-name")), name).toEqual([name]);
      expect(byId("shape-name").textContent).toBe(displayName(name));
    }
    click(document.querySelector('[data-name="Heart"]')!);
    expect(labels("#controls label")).toEqual(["Roundness", "Rotate", "Softness", "Roundness of the selected dot"]);
  });

  it("names a tab icon that the site ships", () => {
    const head = new DOMParser().parseFromString(markup, "text/html");
    const icon = head.querySelector('link[rel="icon"]')!.getAttribute("href")!;
    expect(icon).toBe("/favicon.svg");
    const file = resolve(process.cwd(), "public", icon.slice(1));
    expect(existsSync(file)).toBe(true);
    expect(new DOMParser().parseFromString(readFileSync(file, "utf8"), "image/svg+xml").querySelector("parsererror")).toBeNull();
  });

  it("draws the shape with its dots, and no dots for a builder shape", () => {
    expect(document.querySelectorAll("#preview path")).toHaveLength(1);
    expect(document.querySelectorAll("#preview .dot")).toHaveLength(2);
    expect(byId("stage-hint").hidden).toBe(false);
    click(document.querySelector('[data-name="Sunny"]')!);
    expect(document.querySelectorAll("#preview .dot")).toHaveLength(0);
    expect(byId("stage-hint").hidden).toBe(true);
    expect(byId("error").hidden).toBe(true);
  });

  it("shows Reset only while the shape is edited, and undo and redo step through edits", () => {
    expect(byId("reset").hidden).toBe(true);
    slide("Rotate", 30);
    expect(byId("reset").hidden).toBe(false);
    expect(byId("shape-name").textContent).toBe("Cookie 4 Sided");
    expect(byId("shape-status").textContent).toBe("Edited shape");
    click(byId("undo"));
    expect(byId("reset").hidden).toBe(true);
    click(byId("redo"));
    expect(byId("reset").hidden).toBe(false);
    click(byId("reset"));
    expect(byId("reset").hidden).toBe(true);
  });

  it("steps back and forward through several edits", () => {
    const rotation = () => slider("Rotate").value;
    slide("Rotate", 30);
    slide("Rotate", 60);
    const seen = [rotation()];
    for (const button of ["undo", "undo", "redo", "redo"]) {
      click(byId(button));
      seen.push(rotation());
    }
    expect(seen).toEqual(["60", "30", "0", "30", "60"]);
    expect(undoButton().disabled).toBe(false);
    expect((byId("redo") as HTMLButtonElement).disabled).toBe(true);
  });

  it("exports MaterialShapes for an untouched shape and MyShape after an edit", () => {
    expect(exportCode()).toContain(".clip(MaterialShapes.Cookie4Sided.toShape())");
    slide("Repeats", 6);
    expect(exportCode()).toContain("private val MyShape = RoundedPolygon(");
    expect(byId("export-about").textContent).toContain("Your edited shape as code");
  });

  it("offers the right actions on each export tab", () => {
    openTab("svg");
    expect(labels("#export-buttons button")).toEqual(["Copy SVG", "Download SVG"]);
    expect(exportCode()).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"/);
    openTab("png");
    expect(labels("#export-buttons button")).toEqual(["Download PNG"]);
    expect(exportCode()).toBe("");
    openTab("css");
    expect(labels("#export-buttons button")).toEqual(["Copy CSS"]);
    expect(exportCode()).toContain("clip-path: shape(");
    openTab("compose");
    expect(labels("#export-buttons button")).toEqual(["Copy code"]);
  });

  it("shows the current shape in use as a photo, an icon button and an avatar", () => {
    expect(labels("#in-use figcaption")).toEqual(["Photo", "Icon button", "Avatar"]);
    const inUse = () => {
      const photo = document.querySelector("#in-use clipPath path")!.getAttribute("d");
      expect(document.querySelector("#in-use g")!.getAttribute("clip-path")).toBe("url(#clip-photo)");
      for (const figure of Array.from(document.querySelectorAll("#in-use figure")).slice(1)) {
        expect(figure.querySelector("path")!.getAttribute("d")).toBe(photo);
      }
      return photo;
    };
    const pathOf = (name: string) => svgPath(buildCubics(JSON.stringify(CATALOGUE[name])), 1, 4);
    expect(inUse()).toBe(pathOf("Cookie4Sided"));
    click(document.querySelector('[data-name="Heart"]')!);
    expect(inUse()).toBe(pathOf("Heart"));
    slide("Rotate", 30);
    expect(inUse()).not.toBe(pathOf("Heart"));
  });

  it("shows all relevant properties together without More options", () => {
    expect(byId("more")).toBeNull();
    expect(labels("#controls label")).toEqual(["Repeats", "Roundness", "Rotate", "Softness", "Roundness of the selected dot"]);
    expect(labels("#dot-actions button")).toEqual(["Add a dot", "Remove the selected dot"]);
    click(document.querySelector('[data-name="Circle"]')!);
    expect(labels("#controls label")).toEqual(["Squash"]);
  });
});

describe("when something goes wrong", () => {
  it("keeps the last good preview and says why", () => {
    const before = document.querySelector("#preview path")!.getAttribute("d");
    vi.mocked(build).mockImplementationOnce(() => { throw new Error("ShapeEngine: rounding is too large"); });
    drag("Rotate", 30);
    expect(document.querySelector("#preview path")!.getAttribute("d")).toBe(before);
    expect(byId("error").hidden).toBe(false);
    expect(byId("error").textContent).toBe("That combination can't be drawn: rounding is too large");
    slider("Rotate").dispatchEvent(new Event("change"));
    expect(byId("error").hidden).toBe(true);
    expect(document.querySelector("#preview path")!.getAttribute("d")).not.toBe(before);
  });

  it("disables the exports when the shape can't be exported", () => {
    vi.mocked(buildCubics).mockImplementationOnce(() => { throw new Error("ShapeEngine: no"); });
    click(document.querySelector('[data-name="Heart"]')!);
    expect(Array.from(document.querySelectorAll<HTMLButtonElement>("#export-buttons button")).map((b) => b.disabled)).toEqual([true]);
    expect(exportCode()).toBe("");
    expect(byId("in-use").childElementCount).toBe(0);
  });

  it("says so when there is no clipboard, then shows the button's own label again", () => {
    vi.useFakeTimers();
    click(firstExportButton());
    expect(firstExportButton().textContent).toBe("Copy failed");
    vi.advanceTimersByTime(1500);
    expect(firstExportButton().textContent).toBe("Copy code");
  });

  it("says so when a PNG can't be drawn", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    openTab("png");
    click(firstExportButton());
    expect(firstExportButton().textContent).toBe("Download failed");
  });
});

describe("copying", () => {
  it("copies the code, and a second click still ends on the button's own label", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    click(firstExportButton());
    await vi.advanceTimersByTimeAsync(0);
    expect(firstExportButton().textContent).toBe("Copied");
    click(firstExportButton());
    await vi.advanceTimersByTimeAsync(1500);
    expect(firstExportButton().textContent).toBe("Copy code");
    expect(writeText).toHaveBeenCalledWith(exportCode());
  });
});

describe("the keyboard", () => {
  it("undoes and redoes with Ctrl+Z and Ctrl+Shift+Z", () => {
    slide("Rotate", 30);
    press("z", { ctrlKey: true });
    expect(byId("reset").hidden).toBe(true);
    press("Z", { ctrlKey: true, shiftKey: true });
    expect(byId("reset").hidden).toBe(false);
  });

  it("nudges the selected dot on screen the way the arrow points, whatever the rotation", () => {
    slide("Rotate", 90);
    const [x, y] = position(selectedDot());
    press("ArrowRight", { shiftKey: true });
    const [x1, y1] = position(selectedDot());
    expect(x1 - x).toBeCloseTo(0.05, 2);
    expect(y1 - y).toBeCloseTo(0, 2);
  });

  it("keeps focus on a slider while it changes, and its arrows don't move a dot", () => {
    slider("Rotate").focus();
    slide("Rotate", 10);
    expect(document.activeElement).toBe(slider("Rotate"));
    const before = position(selectedDot());
    press("ArrowRight", {}, slider("Rotate"));
    expect(position(selectedDot())).toEqual(before);
  });

  it("restores slider focus without asking the browser to scroll", () => {
    slider("Rotate").focus();
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    slide("Rotate", 10);
    expect(document.activeElement).toBe(slider("Rotate"));
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("keeps Squash focused when flattening a circle introduces Rotate", () => {
    click(document.querySelector('[data-name="Circle"]')!);
    expect(labels("#controls label")).toEqual(["Squash"]);
    slider("Squash").focus();
    slide("Squash", 0.99);
    expect(labels("#controls label")).toEqual(["Squash", "Rotate"]);
    expect(document.activeElement).toBe(slider("Squash"));
    slide("Squash", 0.98);
    expect(slider("Squash").value).toBe("0.98");
    slide("Squash", 1);
    expect(labels("#controls label")).toEqual(["Squash"]);
    expect(document.activeElement).toBe(slider("Squash"));
  });

  it("moves focus to the next usable button when the pressed one turns itself off", () => {
    click(document.querySelector('[data-name="Diamond"]')!);
    const remove = () => Array.from(document.querySelectorAll<HTMLButtonElement>("#dot-actions button")).find((b) => b.textContent === "Remove the selected dot")!;
    remove().focus();
    click(remove());
    expect(remove().disabled).toBe(true);
    expect(document.activeElement?.textContent).toBe("Add a dot");
  });

  it("keeps focus on a button that changes the shape", () => {
    const add = Array.from(document.querySelectorAll<HTMLButtonElement>("#dot-actions button")).find((b) => b.textContent === "Add a dot")!;
    add.focus();
    click(add);
    expect(document.activeElement?.textContent).toBe("Add a dot");
  });

  it("reaches every dot, and focusing one selects it without an undo step", () => {
    expect(byId("preview").getAttribute("role")).toBe("group");
    expect(dots().map((d) => d.getAttribute("tabindex"))).toEqual(["0", "0"]);
    dots()[1].focus();
    expect(dots()[1].classList.contains("selected")).toBe(true);
    expect(document.activeElement).toBe(dots()[1]);
    expect(undoButton().disabled).toBe(true);
  });

  it("moves between export tabs with the arrow keys", () => {
    const compose = document.querySelector<HTMLButtonElement>("[data-tab=compose]")!;
    compose.focus();
    const before = position(selectedDot());
    press("ArrowRight", {}, compose);
    const svgTab = document.querySelector<HTMLButtonElement>("[data-tab=svg]")!;
    expect(svgTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(svgTab);
    expect([compose.tabIndex, svgTab.tabIndex]).toEqual([-1, 0]);
    expect(position(selectedDot())).toEqual(before);
  });
});

describe("dragging a dot", () => {
  it("selects a dot through its larger pointer target", () => {
    document.querySelectorAll(".dot-target")[1].dispatchEvent(new Event("pointerdown"));
    byId("preview").dispatchEvent(new Event("pointerup"));
    expect(dots()[1].classList.contains("selected")).toBe(true);
    expect(undoButton().disabled).toBe(true);
  });
  it("adds no undo step for a press that moves nothing", () => {
    dots()[1].dispatchEvent(new Event("pointerdown"));
    byId("preview").dispatchEvent(new Event("pointerup"));
    expect(dots()[1].classList.contains("selected")).toBe(true);
    expect(undoButton().disabled).toBe(true);
  });

  it("ignores undo while the drag is under way", () => {
    slide("Rotate", 30);
    dots()[0].dispatchEvent(new Event("pointerdown"));
    press("z", { ctrlKey: true });
    expect(byId("reset").hidden).toBe(false);
    byId("preview").dispatchEvent(new Event("pointerup"));
    press("z", { ctrlKey: true });
    expect(byId("reset").hidden).toBe(true);
  });
});
