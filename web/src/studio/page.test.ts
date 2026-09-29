import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build, buildCubics } from "@material-shape-studio/engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountStudio } from "./page";

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
  Array.from(document.querySelectorAll("#controls .control")).find((c) => c.querySelector("label")?.textContent === label)!.querySelector("input")!;
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
  document.body.innerHTML = body;
  dispose = mountStudio(document);
});
afterEach(() => {
  dispose();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("the studio page", () => {
  it("offers the 35 Material shapes and names the picked one", () => {
    const thumbs = Array.from(document.querySelectorAll("#picker .thumb"));
    expect(thumbs).toHaveLength(35);
    expect(thumbs[0].getAttribute("aria-label")).toBe("Circle");
    expect(document.querySelector('[data-name="Cookie4Sided"]')!.getAttribute("aria-pressed")).toBe("true");
    click(document.querySelector('[data-name="Heart"]')!);
    expect(byId("shape-name").textContent).toBe("· Heart");
    expect(document.querySelector('[data-name="Heart"]')!.getAttribute("aria-pressed")).toBe("true");
    expect(labels("#controls label")).toEqual(["Roundness", "Rotate"]);
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
    expect(byId("shape-name").textContent).toBe("· Cookie 4 Sided (edited)");
    click(byId("undo"));
    expect(byId("reset").hidden).toBe(true);
    click(byId("redo"));
    expect(byId("reset").hidden).toBe(false);
    click(byId("reset"));
    expect(byId("reset").hidden).toBe(true);
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

  it("shows the shape in use as a photo, an icon button and an avatar", () => {
    expect(labels("#in-use figcaption")).toEqual(["Photo", "Icon button", "Avatar"]);
    const shapePath = document.querySelector("#in-use clipPath path")!.getAttribute("d");
    expect(shapePath).toMatch(/^M[\d.]+ [\d.]+C/);
    for (const figure of Array.from(document.querySelectorAll("#in-use figure")).slice(1)) {
      expect(figure.querySelector("path")!.getAttribute("d")).toBe(shapePath);
    }
  });

  it("keeps More options for shapes that have them", () => {
    expect(byId("more").hidden).toBe(false);
    expect(labels("#more-controls label")).toEqual(["Softness", "Roundness of the selected dot"]);
    expect(labels("#more-controls button")).toEqual(["Add a dot", "Remove the selected dot"]);
    click(document.querySelector('[data-name="Circle"]')!);
    expect(byId("more").hidden).toBe(true);
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

  it("keeps focus on a button that changes the shape", () => {
    const add = Array.from(document.querySelectorAll<HTMLButtonElement>("#more-controls button")).find((b) => b.textContent === "Add a dot")!;
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
