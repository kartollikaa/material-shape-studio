import { buildCubics } from "@material-shape-studio/engine";
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "../catalogue";
import { cssRule } from "./css";
import { svgFile } from "./svg";

const heart = buildCubics(JSON.stringify(CATALOGUE.Heart));

describe("the SVG export", () => {
  it("is a well-formed SVG with a 100 by 100 view box and the chosen fill", () => {
    const svg = new DOMParser().parseFromString(svgFile(heart, "#123456"), "image/svg+xml");
    expect(svg.querySelector("parsererror")).toBeNull();
    expect(svg.documentElement.getAttribute("viewBox")).toBe("0 0 100 100");
    const path = svg.querySelector("path");
    expect(path?.getAttribute("fill")).toBe("#123456");
    expect(path?.getAttribute("d")).toMatch(/^M[\d.]+ [\d.]+C.*Z$/);
    expect(path?.getAttribute("d")?.match(/C/g)).toHaveLength(heart.length / 8);
  });
});

describe("the CSS export", () => {
  it("is one clip-path shape() with a start point, a curve per cubic, and close", () => {
    const css = cssRule(heart);
    expect(css).toMatch(/clip-path: shape\(\n {4}from -?[\d.]+% -?[\d.]+%,/);
    expect(css.match(/curve to -?[\d.]+% -?[\d.]+% with -?[\d.]+% -?[\d.]+% \/ -?[\d.]+% -?[\d.]+%/g)).toHaveLength(heart.length / 8);
    expect(css).toMatch(/,\n {4}close\n {2}\);\n\}\n$/);
  });
});
