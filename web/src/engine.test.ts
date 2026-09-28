import { describe, expect, it } from "vitest";
import { buildCubics, version } from "@material-shape-studio/engine";

describe("the engine package seen from the web workspace", () => {
  it("resolves by package name with its types", () => {
    const cubics: Float32Array = buildCubics(JSON.stringify({ v: 1, shape: { kind: "ngon", vertices: 4 } }));
    expect(cubics.length).toBeGreaterThan(0);
    expect(JSON.parse(version()).graphicsShapes).toBe("1.1.0");
  });
});
