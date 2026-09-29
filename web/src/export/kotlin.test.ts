import { describe, expect, it } from "vitest";
import { CATALOGUE, CATALOGUE_NAMES } from "../catalogue";
import type { ShapeDocument } from "../document";
import { kotlinExpression, kotlinFile } from "./kotlin";

const PURPLE = "#6750a4";
const edited = (name: string, change: (doc: ShapeDocument) => void): ShapeDocument => {
  const doc = structuredClone(CATALOGUE[name]);
  change(doc);
  return doc;
};
const importsOf = (file: string) => file.split("\n").filter((l) => l.startsWith("import ")).map((l) => l.slice(7));

describe("the Compose export", () => {
  it("uses MaterialShapes for an untouched catalogue shape", () => {
    const file = kotlinFile(CATALOGUE.Heart, { catalogueName: "Heart", colour: PURPLE });
    expect(file).toContain(".clip(MaterialShapes.Heart.toShape())");
    expect(importsOf(file)).toContain("androidx.compose.material3.MaterialShapes");
    expect(file).not.toContain("RoundedPolygon");
  });

  it("declares MyShape with the polygon constructor for an edited repeated shape", () => {
    const file = kotlinFile(edited("Cookie4Sided", (d) => { if (d.shape.kind === "polygon") d.shape.repeat!.count = 6; }), { catalogueName: null, colour: PURPLE });
    expect(file).toContain("private val MyShape = RoundedPolygon(\n    vertices = floatArrayOf(");
    expect(file).toContain(".clip(MyShape.toShape())");
    expect(file.match(/^ {8}-?[\d.]+f, -?[\d.]+f,$/gm)).toHaveLength(12);
    expect(importsOf(file)).toEqual(expect.arrayContaining(["androidx.graphics.shapes.CornerRounding", "androidx.graphics.shapes.RoundedPolygon"]));
    expect(importsOf(file)).not.toContain("androidx.compose.material3.MaterialShapes");
  });

  it("uses each builder with its own import", () => {
    const cases: [string, (d: ShapeDocument) => void, string, string][] = [
      ["Sunny", (d) => { if (d.shape.kind === "star") d.shape.verticesPerRadius = 11; }, "RoundedPolygon.star(\n    numVerticesPerRadius = 11,", "androidx.graphics.shapes.star"],
      ["Square", (d) => { if (d.shape.kind === "rectangle") d.shape.width = 2; }, "RoundedPolygon.rectangle(\n    width = 2f,", "androidx.graphics.shapes.rectangle"],
      ["Circle", (d) => { d.transforms = [{ type: "scale", x: 1, y: 0.5 }, { type: "normalize" }]; }, "RoundedPolygon.circle(\n    numVertices = 10,", "androidx.graphics.shapes.circle"],
    ];
    for (const [name, change, call, symbol] of cases) {
      const file = kotlinFile(edited(name, change), { catalogueName: null, colour: PURPLE });
      expect(file).toContain(call);
      expect(importsOf(file)).toContain(symbol);
    }
  });

  it("writes an n-gon with the numVertices constructor", () => {
    const { code } = kotlinExpression(edited("Triangle", (d) => { if (d.shape.kind === "ngon") d.shape.vertices = 5; }));
    expect(code).toMatch(/^RoundedPolygon\(\n {4}numVertices = 5,\n {4}rounding = CornerRounding\(0\.2f\),\n\)/);
  });

  it("imports TransformResult only when a transform needs it", () => {
    expect(kotlinExpression(CATALOGUE.Sunny).imports.has("androidx.graphics.shapes.TransformResult")).toBe(false);
    expect(kotlinExpression(CATALOGUE.Cookie7Sided).imports.has("androidx.graphics.shapes.TransformResult")).toBe(true);
  });

  it("writes rotations and scales as plain arithmetic", () => {
    expect(kotlinExpression(CATALOGUE.Cookie7Sided).code).toContain(".transformed { x, y -> TransformResult(y, -x) }.normalized()");
    expect(kotlinExpression(CATALOGUE.Oval).code).toContain(".transformed { x, y -> TransformResult(x, 0.64f * y) }");
    expect(kotlinExpression(CATALOGUE.Oval).code).toContain("TransformResult(0.707107f * x + 0.707107f * y, -0.707107f * x + 0.707107f * y)");
  });

  it("paints the box in the chosen colour", () => {
    expect(kotlinFile(CATALOGUE.Heart, { catalogueName: "Heart", colour: "#1a2b3c" })).toContain(".background(Color(0xFF1A2B3C))");
  });

  it("opens with the dependency it needs", () => {
    expect(kotlinFile(CATALOGUE.Heart, { catalogueName: "Heart", colour: PURPLE }).split("\n")[0]).toBe(
      "// Needs Compose Material 3 with the Expressive API (MaterialShapes and toShape).",
    );
    expect(kotlinFile(CATALOGUE.Heart, { catalogueName: null, colour: PURPLE }).split("\n")[0]).toContain("and androidx.graphics:graphics-shapes");
  });

  it("drops transforms that change nothing and folds signs into offsets", () => {
    const { code } = kotlinExpression({ v: 1, shape: { kind: "circle" }, transforms: [{ type: "rotate", degrees: 360 }, { type: "scale", x: 1, y: 1 }, { type: "translate", x: -0.5, y: 1 }] });
    expect(code).toBe("RoundedPolygon.circle().transformed { x, y -> TransformResult(x - 0.5f, y + 1f) }");
  });

  it("writes one rounding when every corner of a polygon is rounded alike", () => {
    const doc = edited("PixelCircle", (d) => { if (d.shape.kind === "polygon") d.shape.perVertexRounding = d.shape.perVertexRounding!.map(() => ({ radius: 0.05 })); });
    const { code } = kotlinExpression(doc);
    expect(code).toContain("    rounding = CornerRounding(0.05f),");
    expect(code).not.toContain("perVertexRounding");
    expect(kotlinExpression(CATALOGUE.PixelCircle).code).not.toMatch(/rounding/i);
  });

  it("escapes a feature string for a Kotlin string literal", () => {
    const { code } = kotlinExpression({ v: 1, shape: { kind: "features", serialized: 'V1"$\\' } });
    expect(code).toContain('FeatureSerializer.parse("V1\\"\\$\\\\")');
  });

  it("accepts a short hex colour", () => {
    expect(kotlinFile(CATALOGUE.Heart, { catalogueName: "Heart", colour: "#abc" })).toContain("Color(0xFFAABBCC)");
  });

  it("exports every catalogue shape both as MaterialShapes and as a constructor", () => {
    for (const name of CATALOGUE_NAMES) {
      expect(kotlinFile(CATALOGUE[name], { catalogueName: name, colour: PURPLE })).toContain(`MaterialShapes.${name}.toShape()`);
      expect(kotlinFile(CATALOGUE[name], { catalogueName: null, colour: PURPLE })).toContain("private val MyShape = RoundedPolygon");
    }
  });
});
