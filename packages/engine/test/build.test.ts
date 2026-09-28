import { describe, expect, it } from "vitest";
import { build, buildCubics } from "@material-shape-studio/engine";

const hexagon = JSON.stringify({
  v: 1,
  shape: { kind: "ngon", vertices: 6, radius: 2, center: [1, 2], rounding: { radius: 0.2 } },
});

type Built = { cubics: number[]; bounds: [number, number, number, number]; center: [number, number] };

describe("build", () => {
  it("buildCubics returns eight numbers per cubic, equal to build's cubics", () => {
    const cubics = buildCubics(hexagon);
    const built: Built = JSON.parse(build(hexagon));
    expect(cubics).toBeInstanceOf(Float32Array);
    expect(cubics.length).toBeGreaterThan(0);
    expect(cubics.length % 8).toBe(0);
    expect(Array.from(cubics)).toEqual(built.cubics.map(Math.fround));
  });

  it("orders each cubic as anchor0, control0, control1, anchor1", () => {
    const triangle = JSON.stringify({ v: 1, shape: { kind: "polygon", vertices: [[0, 0], [3, 0], [0, 3]] } });
    const c = buildCubics(triangle);
    expect(c.length).toBeGreaterThan(0);
    for (let o = 0; o < c.length; o += 8) {
      const [x0, y0, cx0, cy0, cx1, cy1, x1, y1] = c.slice(o, o + 8);
      expect(Math.hypot(x1 - x0, y1 - y0)).toBeGreaterThan(0.1);
      expect(cx0).toBeCloseTo(x0 + (x1 - x0) / 3, 5);
      expect(cy0).toBeCloseTo(y0 + (y1 - y0) / 3, 5);
      expect(cx1).toBeCloseTo(x0 + (2 * (x1 - x0)) / 3, 5);
      expect(cy1).toBeCloseTo(y0 + (2 * (y1 - y0)) / 3, 5);
    }
  });

  it("each cubic starts where the previous one ends", () => {
    const c = buildCubics(hexagon);
    for (let i = 8; i < c.length; i += 8) {
      expect(c[i]).toBeCloseTo(c[i - 2], 5);
      expect(c[i + 1]).toBeCloseTo(c[i - 1], 5);
    }
  });

  it("bounds enclose every anchor", () => {
    const { cubics, bounds } = JSON.parse(build(hexagon)) as Built;
    const [left, top, right, bottom] = bounds;
    for (let i = 0; i < cubics.length; i += 8) {
      for (const [x, y] of [[cubics[i], cubics[i + 1]], [cubics[i + 6], cubics[i + 7]]]) {
        expect(x).toBeGreaterThanOrEqual(left - 1e-6);
        expect(x).toBeLessThanOrEqual(right + 1e-6);
        expect(y).toBeGreaterThanOrEqual(top - 1e-6);
        expect(y).toBeLessThanOrEqual(bottom + 1e-6);
      }
    }
  });

  it("center is the polygon's centre", () => {
    expect((JSON.parse(build(hexagon)) as Built).center).toEqual([1, 2]);
  });

  it("an invalid document throws an Error whose message names the field", () => {
    const bad = JSON.stringify({
      v: 1,
      shape: { kind: "polygon", vertices: [[0, 0], [1, 0], [0.5, 1]], repeat: { count: 0, mirror: false } },
    });
    let caught: unknown;
    try {
      build(bad);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/^shape\.repeat\.count: /);
  });
});
