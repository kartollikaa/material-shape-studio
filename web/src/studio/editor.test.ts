import { build, buildCubics } from "@material-shape-studio/engine";
import { describe, expect, it } from "vitest";
import { CATALOGUE_NAMES } from "../catalogue";
import type { Point } from "../document";
import {
  addDot, canRemoveDot, fromDocument, History, isEdited, mainControls, moreControls, moveDot, pick, removeDot, restore, round3, snapshot,
  viewTransforms, type EditorState, type Radii,
} from "./editor";
import { backward, forward } from "./geometry";

const PROTOTYPE_CONTROLS: Record<string, string> = {
  Arch: "Sides, Roundness, Rotate", Arrow: "Roundness, Rotate", Boom: "Repeats, Roundness, Rotate",
  Bun: "Repeats, Roundness, Rotate", Burst: "Repeats, Roundness, Rotate", Circle: "Squash",
  ClamShell: "Repeats, Roundness, Rotate", Clover4Leaf: "Repeats, Roundness, Rotate", Clover8Leaf: "Repeats, Roundness, Rotate",
  Cookie12Sided: "Points, Depth, Roundness, Rotate", Cookie4Sided: "Repeats, Roundness, Rotate", Cookie6Sided: "Repeats, Roundness, Rotate",
  Cookie7Sided: "Points, Depth, Roundness, Rotate", Cookie9Sided: "Points, Depth, Roundness, Rotate", Diamond: "Repeats, Roundness, Rotate",
  Fan: "Roundness, Rotate", Flower: "Repeats, Roundness, Rotate", Gem: "Roundness, Rotate", Ghostish: "Roundness, Rotate",
  Heart: "Roundness, Rotate", Oval: "Squash, Rotate", Pentagon: "Roundness, Rotate", Pill: "Repeats, Roundness, Rotate",
  PixelCircle: "Repeats, Roundness, Rotate", PixelTriangle: "Roundness, Rotate", Puffy: "Repeats, Roundness, Rotate",
  PuffyDiamond: "Repeats, Roundness, Rotate", SemiCircle: "Proportion, Roundness, Rotate", Slanted: "Repeats, Roundness, Rotate",
  SoftBoom: "Repeats, Roundness, Rotate", SoftBurst: "Repeats, Roundness, Rotate", Square: "Proportion, Roundness, Rotate",
  Sunny: "Points, Depth, Roundness, Rotate", Triangle: "Sides, Roundness, Rotate", VerySunny: "Repeats, Roundness, Rotate",
};

// From the prototype: why, min, max, step, and one value with how it is shown.
const PROTOTYPE_RANGES: Record<string, [string, number, number, number, [number, string]]> = {
  Repeats: ["How many times the pattern goes around the centre.", 2, 16, 1, [6, "6"]],
  Roundness: ["How rounded the corners are.", 0, 2.5, 0.01, [0.5, "50%"]],
  Points: ["How many points the shape has.", 3, 20, 1, [7, "7"]],
  Depth: ["How deep the dips between the points go.", 0.05, 0.9, 0.01, [0.25, "25%"]],
  Sides: ["How many corners the shape has.", 3, 12, 1, [5, "5"]],
  Proportion: ["Width compared to height.", 0.5, 3, 0.01, [2, "2.00 : 1"]],
  Squash: ["Flattens the circle into an oval.", 0.3, 1, 0.01, [0.64, "64%"]],
  Rotate: ["", -180, 180, 1, [45, "45°"]],
  Softness: ["Blends each corner smoothly into its sides.", 0, 1, 0.01, [0.6, "60%"]],
  "Roundness of the selected dot": ["Click a dot on the shape to select it.", 0, 1.2, 0.005, [0.35, "0.35"]],
};

const builds = (s: EditorState) => build(JSON.stringify(s.doc));
const radii = (r: Radii) => [r.rounding, r.innerRounding, ...(r.perVertexRounding ?? [])].filter((c) => !!c).map((c) => c.radius);
const anchors = (cubics: ArrayLike<number>): Point[] =>
  Array.from({ length: cubics.length / 8 }, (_, i) => [cubics[8 * i], cubics[8 * i + 1]]);
const nearest = (p: Point, points: Point[]) => Math.min(...points.map(([x, y]) => Math.hypot(x - p[0], y - p[1])));

describe("imported documents", () => {
  it("keeps an imported builder shape independent of the catalogue", () => {
    const doc = { v: 1 as const, shape: { kind: "ngon" as const, vertices: 7 } };
    const state = fromDocument(doc);
    expect(state.doc).toEqual(doc);
    expect(state.name).toBeNull();
    expect(isEdited(state)).toBe(false);
    mainControls(state).find((c) => c.label === "Sides")!.set(8);
    expect(state.doc.shape).toEqual({ kind: "ngon", vertices: 8 });
    expect(isEdited(state)).toBe(true);
    expect(() => builds(state)).not.toThrow();
  });

  it("retains the imported polygon's editable pattern", () => {
    const state = fromDocument({ v: 1, shape: {
      kind: "polygon", vertices: [[0.2, 0.1], [0.8, 0.1], [0.5, 0.8]],
      perVertexRounding: [{ radius: 0.1 }, { radius: 0.1 }, { radius: 0.1 }],
    } });
    expect(mainControls(state).map((c) => c.label)).toContain("Roundness");
    moveDot(state, 0, [0.3, 0.2]);
    expect(state.doc.shape.kind === "polygon" && state.doc.shape.vertices[0]).toEqual([0.3, 0.2]);
    expect(() => builds(state)).not.toThrow();
  });
});

describe("the adjust panel", () => {
  for (const name of CATALOGUE_NAMES) {
    it(`${name} shows the prototype's controls`, () => {
      expect(mainControls(pick(name)).map((c) => c.label).join(", ")).toBe(PROTOTYPE_CONTROLS[name]);
    });

    it(`${name}: every control reaches its minimum and maximum without an error`, () => {
      const s = pick(name);
      for (let i = 0; i < mainControls(s).length; i++) {
        for (const end of ["min", "max"] as const) {
          const control = mainControls(s)[i];
          control.set(control[end]);
          expect(() => builds(s), `${control.label} at ${control[end]}`).not.toThrow();
        }
      }
    });

    it(`${name}: More options work without an error`, () => {
      const s = pick(name);
      for (const control of moreControls(s)) {
        for (const end of ["min", "max"] as const) {
          control.set(control[end]);
          expect(() => builds(s), `${control.label} at ${control[end]}`).not.toThrow();
        }
      }
      if (s.doc.shape.kind === "polygon") {
        addDot(s);
        expect(() => builds(s), "after adding a dot").not.toThrow();
        removeDot(s);
        removeDot(s);
        expect(() => builds(s), "after removing dots").not.toThrow();
      }
    });
  }

  it("every control keeps the prototype's wording, range, step and format", () => {
    for (const name of CATALOGUE_NAMES) {
      const s = pick(name);
      for (const c of [...mainControls(s), ...moreControls(s)]) {
        const [why, min, max, step, [value, shown]] = PROTOTYPE_RANGES[c.label];
        expect([c.why, c.min, c.max, c.step, c.show(value)], `${name}: ${c.label}`).toEqual([why, min, max, step, shown]);
      }
    }
  });

  it("scales every corner from the shape's own radii", () => {
    let checked = 0;
    for (const name of CATALOGUE_NAMES) {
      const s = pick(name);
      const roundness = mainControls(s).find((c) => c.label === "Roundness");
      if (!roundness) continue;
      roundness.set(0.5);
      expect(radii(s.doc.shape as Radii), name).toEqual(radii(s.base).map((r) => round3(r * 0.5)));
      checked++;
    }
    expect(checked).toBe(CATALOGUE_NAMES.filter((n) => PROTOTYPE_CONTROLS[n].includes("Roundness")).length);
  });

  it("covers the whole catalogue", () => {
    expect(Object.keys(PROTOTYPE_CONTROLS).sort()).toEqual([...CATALOGUE_NAMES].sort());
  });

  it("starts sharp shapes at 0% roundness, and rounding them changes the shape", () => {
    for (const name of ["PixelCircle", "PixelTriangle"]) {
      const s = pick(name);
      const roundness = mainControls(s).find((c) => c.label === "Roundness")!;
      expect(roundness.get()).toBe(0);
      const before = builds(s);
      roundness.set(1.5);
      expect(builds(s)).not.toBe(before);
    }
  });

  it("keeps Arch building when its sides change, by rounding every corner alike", () => {
    const s = pick("Arch");
    mainControls(s).find((c) => c.label === "Sides")!.set(6);
    expect(s.doc.shape).toMatchObject({ kind: "ngon", vertices: 6, rounding: { radius: 0.6 } });
    expect(() => builds(s)).not.toThrow();
  });
});

describe("editing state", () => {
  it("knows when the shape differs from Material's", () => {
    const s = pick("Heart");
    expect(isEdited(s)).toBe(false);
    mainControls(s).find((c) => c.label === "Rotate")!.set(20);
    expect(isEdited(s)).toBe(true);
    expect(isEdited(pick("Heart"))).toBe(false);
  });

  it("never lets a dot removal leave fewer than three corners or change a one-off shape's repeats", () => {
    const s = pick("Heart");
    while (canRemoveDot(s)) removeDot(s);
    const shape = s.doc.shape;
    if (shape.kind !== "polygon" || !shape.repeat) throw new Error("Heart is a mirrored polygon");
    expect(shape.repeat.count).toBe(1);
    expect(shape.vertices).toHaveLength(2);
    expect(shape.repeat.count * (2 * shape.vertices.length - 1)).toBe(3);
    expect(() => builds(s)).not.toThrow();
  });

  it("raises a repeating shape's count when a removal would leave fewer than three corners", () => {
    const s = pick("Diamond");
    expect(canRemoveDot(s)).toBe(true);
    removeDot(s);
    expect(s.doc.shape).toMatchObject({ vertices: [expect.anything()], repeat: { count: 3 } });
    expect(canRemoveDot(s)).toBe(false);
    expect(() => builds(s)).not.toThrow();
  });

  it("undoes and redoes edits in order", () => {
    const history = new History();
    let s = pick("Cookie4Sided");
    const original = snapshot(s);
    history.remember(snapshot(s));
    moveDot(s, 1, [0.5, 0.7]);
    const moved = snapshot(s);
    s = restore(history.undo(snapshot(s))!);
    expect(snapshot(s)).toBe(original);
    s = restore(history.redo(snapshot(s))!);
    expect(snapshot(s)).toBe(moved);
    expect(history.canRedo).toBe(false);
  });
});

describe("the preview's dot geometry", () => {
  it("turns a point a quarter turn anticlockwise for 90 degrees", () => {
    const [x, y] = forward([1, 0], [{ type: "rotate", degrees: 90 }]);
    expect(x).toBeCloseTo(0, 9);
    expect(y).toBeCloseTo(1, 9);
  });

  it("puts every dot on a corner of the shape the engine draws", () => {
    for (const name of ["Heart", "Diamond", "Arrow"]) {
      const s = pick(name);
      if (s.doc.shape.kind !== "polygon") throw new Error(`${name} is a polygon`);
      s.doc.shape.perVertexRounding = s.doc.shape.vertices.map(() => ({ radius: 0 }));
      s.doc.transforms = [{ type: "scale", x: 1, y: 0.6 }, { type: "rotate", degrees: 30 }, { type: "normalize" }];
      const transforms = viewTransforms(s.doc);
      const corners = anchors(buildCubics(JSON.stringify({ ...s.doc, transforms })));
      for (const dot of s.doc.shape.vertices) expect(nearest(forward(dot, transforms), corners), `${name} ${dot}`).toBeLessThan(1e-4);
    }
  });

  it("maps a point through rotations and scales and back", () => {
    const transforms = [{ type: "scale" as const, x: 1, y: 0.64 }, { type: "rotate" as const, degrees: -45 }];
    const [x, y] = backward(forward([0.3, -0.7], transforms), transforms);
    expect(x).toBeCloseTo(0.3, 9);
    expect(y).toBeCloseTo(-0.7, 9);
  });
});
