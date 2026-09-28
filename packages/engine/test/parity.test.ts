import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCubics } from "@material-shape-studio/engine";

const TOLERANCE = 1e-5;
const fixtures = new URL("../../../engine/fixtures/", import.meta.url);
const names = readdirSync(new URL("documents/", fixtures))
  .filter((name) => name.endsWith(".json"))
  .sort();

describe("parity with the JVM engine", () => {
  it("has fixture documents", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  for (const name of names) {
    it(name, () => {
      const document = readFileSync(new URL(`documents/${name}`, fixtures), "utf8");
      const expected: number[] = JSON.parse(readFileSync(new URL(`expected/${name}`, fixtures), "utf8")).cubics;
      const actual = buildCubics(document);
      expect(actual.length).toBe(expected.length);
      let worst = 0;
      actual.forEach((value, i) => {
        worst = Math.max(worst, Math.abs(value - expected[i]));
      });
      expect(worst).toBeLessThanOrEqual(TOLERANCE);
    });
  }
});
