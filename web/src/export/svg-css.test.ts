import { buildCubics } from "@material-shape-studio/engine";
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "../catalogue";
import { cssRule } from "./css";
import { svgFile } from "./svg";

const ROUNDING = 0.005 + 1e-9;
const heart = Array.from(buildCubics(JSON.stringify(CATALOGUE.Heart)));
const numbers = (text: string) => (text.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

// The geometry an exporter must reproduce, as the SVG and CSS orders write it: the start point, then per cubic c0, c1, end.
function expectedSequence(cubics: number[]): number[] {
  const out = [cubics[0], cubics[1]];
  for (let o = 0; o < cubics.length; o += 8) out.push(cubics[o + 2], cubics[o + 3], cubics[o + 4], cubics[o + 5], cubics[o + 6], cubics[o + 7]);
  return out.map((v) => v * 100);
}

function expectSameNumbers(actual: number[], expected: number[]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((v, i) => expect(Math.abs(v - expected[i]), `number ${i}`).toBeLessThanOrEqual(ROUNDING));
}

describe("the SVG export", () => {
  it("is a well-formed SVG with a 100 by 100 view box and the chosen fill", () => {
    const svg = new DOMParser().parseFromString(svgFile(heart, "#123456"), "image/svg+xml");
    expect(svg.querySelector("parsererror")).toBeNull();
    expect(svg.documentElement.getAttribute("viewBox")).toBe("0 0 100 100");
    expect(svg.querySelector("path")?.getAttribute("fill")).toBe("#123456");
  });

  it("draws the shape's cubics in the path, scaled to 100", () => {
    const d = new DOMParser().parseFromString(svgFile(heart, "#123456"), "image/svg+xml").querySelector("path")!.getAttribute("d")!;
    expect(d).toMatch(/^M[^MC]+(C[^MC]+)+Z$/);
    expect(d.match(/C/g)).toHaveLength(heart.length / 8);
    expectSameNumbers(numbers(d), expectedSequence(heart));
  });
});

describe("the CSS export", () => {
  it("is one clip-path shape() with a start point, a curve per cubic, and close", () => {
    const css = cssRule(heart);
    expect(css).toMatch(/clip-path: shape\(\n {4}from -?[\d.]+% -?[\d.]+%,/);
    expect(css.match(/curve to /g)).toHaveLength(heart.length / 8);
    expect(css).toMatch(/,\n {4}close\n {2}\);\n\}\n$/);
  });

  it("places every point at the shape's coordinates in percent", () => {
    const css = cssRule(heart);
    const start = numbers(/from ([^,]+),/.exec(css)![1]);
    const curves = [...css.matchAll(/curve to (\S+) (\S+) with (\S+) (\S+) \/ (\S+) (\S+?),/g)].map((m) => {
      const [toX, toY, c0x, c0y, c1x, c1y] = m.slice(1).map((v) => Number(v.replace("%", "")));
      return [c0x, c0y, c1x, c1y, toX, toY];
    });
    expectSameNumbers([...start, ...curves.flat()], expectedSequence(heart));
  });
});
