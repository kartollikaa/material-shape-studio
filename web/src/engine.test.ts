import { describe, expect, it } from "vitest";
import { build, buildCubics, version } from "@material-shape-studio/engine";

const square = JSON.stringify({ v: 1, shape: { kind: "ngon", vertices: 4 } });

describe("the engine package seen from the web workspace", () => {
  it("resolves by package name with its types", () => {
    const cubics: Float32Array = buildCubics(square);
    const built: { cubics: number[] } = JSON.parse(build(square));
    const versions: { graphicsShapes: string } = JSON.parse(version());
    expect(cubics.length).toBeGreaterThan(0);
    expect(built.cubics.length).toBe(cubics.length);
    expect(versions.graphicsShapes).toBe("1.1.0");
  });
});
