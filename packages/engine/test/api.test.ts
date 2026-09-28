import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { version } from "@material-shape-studio/engine";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

describe("version", () => {
  it("reports the engine version and the graphics-shapes version", () => {
    expect(JSON.parse(version())).toEqual({ engine: pkg.version, graphicsShapes: "1.1.0" });
  });
});
