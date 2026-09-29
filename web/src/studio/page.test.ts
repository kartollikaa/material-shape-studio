import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { mountStudio } from "./page";

const markup = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const body = markup.slice(markup.indexOf("<body>") + "<body>".length, markup.indexOf("</body>")).replace(/<script[\s\S]*?<\/script>/, "");

const byId = (id: string) => document.getElementById(id)!;
const click = (element: Element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
const labels = (selector: string) => Array.from(document.querySelectorAll(selector)).map((e) => e.textContent);
const exportCode = () => byId("export-code").textContent ?? "";
const openTab = (name: string) => click(document.querySelector(`[data-tab=${name}]`)!);
function slide(label: string, value: number) {
  const control = Array.from(document.querySelectorAll("#controls .control")).find((c) => c.querySelector("label")?.textContent === label);
  const input = control!.querySelector("input")!;
  input.value = String(value);
  input.dispatchEvent(new Event("input"));
  input.dispatchEvent(new Event("change"));
}

beforeEach(() => {
  document.body.innerHTML = body;
  mountStudio(document);
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
