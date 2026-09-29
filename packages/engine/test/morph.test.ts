import { describe, expect, it } from "vitest";
import { createMorph, morphBounds, morphCubics, releaseMorph } from "@material-shape-studio/engine";

const circle = JSON.stringify({ v: 1, shape: { kind: "circle", vertices: 8 }, transforms: [{ type: "normalize" }] });
const star = JSON.stringify({
  v: 1,
  shape: { kind: "star", verticesPerRadius: 6, innerRadius: 0.6, rounding: { radius: 0.1 } },
  transforms: [{ type: "normalize" }],
});

describe("morph handles", () => {
  it("return eight numbers per cubic at any progress", () => {
    const handle = createMorph(circle, star);
    for (const progress of [0, 0.3, 1]) {
      const cubics = morphCubics(handle, progress);
      expect(cubics).toBeInstanceOf(Float32Array);
      expect(cubics.length).toBeGreaterThan(0);
      expect(cubics.length % 8).toBe(0);
    }
    releaseMorph(handle);
  });

  it("report bounds that enclose the morph's outline at every progress", () => {
    const handle = createMorph(circle, star);
    const [left, top, right, bottom] = morphBounds(handle);
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      for (const [x, y] of pointsOnCurves(morphCubics(handle, progress))) {
        expect(x).toBeGreaterThanOrEqual(left - 1e-6);
        expect(x).toBeLessThanOrEqual(right + 1e-6);
        expect(y).toBeGreaterThanOrEqual(top - 1e-6);
        expect(y).toBeLessThanOrEqual(bottom + 1e-6);
      }
    }
    releaseMorph(handle);
  });

  it("throw an Error naming the handle once released", () => {
    const handle = createMorph(circle, star);
    releaseMorph(handle);
    expect(() => morphCubics(handle, 0.5)).toThrow(new RegExp(`^handle: morph ${handle} `));
  });

  it("throw an Error naming a handle that was never created", () => {
    expect(() => morphCubics(987654, 0)).toThrow(/^handle: morph 987654 /);
  });

  it("reject progress outside 0..1 naming progress", () => {
    const handle = createMorph(circle, star);
    expect(() => morphCubics(handle, 1.5)).toThrow(/^progress: /);
    releaseMorph(handle);
  });
});

function pointsOnCurves(c: Float32Array): [number, number][] {
  const points: [number, number][] = [];
  for (let o = 0; o < c.length; o += 8) {
    for (let step = 0; step <= 40; step++) {
      const t = step / 40;
      const u = 1 - t;
      const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      points.push([
        w[0] * c[o] + w[1] * c[o + 2] + w[2] * c[o + 4] + w[3] * c[o + 6],
        w[0] * c[o + 1] + w[1] * c[o + 3] + w[2] * c[o + 5] + w[3] * c[o + 7],
      ]);
    }
  }
  return points;
}
