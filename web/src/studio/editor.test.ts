import { build } from "@material-shape-studio/engine";
import { describe, expect, it } from "vitest";
import { CATALOGUE_NAMES } from "../catalogue";
import {
  addDot, canRemoveDot, History, isEdited, mainControls, moreControls, moveDot, pick, removeDot, restore, snapshot,
  type EditorState,
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

const builds = (s: EditorState) => build(JSON.stringify(s.doc));

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
  it("maps a point through rotations and scales and back", () => {
    const transforms = [{ type: "scale" as const, x: 1, y: 0.64 }, { type: "rotate" as const, degrees: -45 }];
    const [x, y] = backward(forward([0.3, -0.7], transforms), transforms);
    expect(x).toBeCloseTo(0.3, 9);
    expect(y).toBeCloseTo(-0.7, 9);
  });
});
