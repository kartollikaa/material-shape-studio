import { buildCubics } from "@material-shape-studio/engine";
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "../catalogue";
import type { ShapeDocument } from "../document";
import { KOTLIN_DIGITS, roundTo } from "./kotlin";
import { polygonCorners } from "./repeat";

const repeated = Object.entries(CATALOGUE).filter(([, doc]) => doc.shape.kind === "polygon" && doc.shape.repeat);

describe("the repeat expansion the Compose export emits", () => {
  it("covers every repeated catalogue shape", () => {
    expect(repeated.length).toBe(25);
  });

  for (const [name, doc] of repeated) {
    it(`${name}: the emitted vertices build to the engine's shape within 1e-4`, () => {
      if (doc.shape.kind !== "polygon") throw new Error("not a polygon");
      const { corners, center } = polygonCorners(doc.shape);
      const expanded: ShapeDocument = {
        ...doc,
        shape: {
          kind: "polygon",
          vertices: corners.map(({ point: [x, y] }) => [roundTo(x, KOTLIN_DIGITS), roundTo(y, KOTLIN_DIGITS)]),
          perVertexRounding: corners.map((c) => c.rounding),
          center,
        },
      };
      const engine = buildCubics(JSON.stringify(doc));
      const emitted = buildCubics(JSON.stringify(expanded));
      expect(emitted.length).toBe(engine.length);
      const worst = engine.reduce((max, v, i) => Math.max(max, Math.abs(v - emitted[i])), 0);
      expect(worst).toBeLessThan(1e-4);
    });
  }
});
