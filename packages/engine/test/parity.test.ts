import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCubics, createMorph, morphCubics, releaseMorph } from "@material-shape-studio/engine";

const TOLERANCE = 1e-5;
const SHAPE_KINDS = ["polygon", "ngon", "circle", "rectangle", "star", "pill", "pillStar", "features"];
const TRANSFORM_TYPES = ["normalize", "rotate", "scale", "translate", "fillSquare", "startAngle"];
const MORPH_PROGRESS: [string, number][] = [["0", 0], ["0.5", 0.5], ["1", 1]];

const fixtures = new URL("../../../engine/fixtures/", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, fixtures), "utf8");
const jsonFiles = (dir: string) =>
  readdirSync(new URL(`${dir}/`, fixtures))
    .filter((name) => name.endsWith(".json"))
    .sort();
const documents = jsonFiles("documents");
const morphs = jsonFiles("morphs");

function expectWithinTolerance(actual: Float32Array, expected: number[]) {
  expect(actual.length).toBe(expected.length);
  let worst = 0;
  actual.forEach((value, i) => {
    worst = Math.max(worst, Math.abs(value - expected[i]));
  });
  expect(worst).toBeLessThanOrEqual(TOLERANCE);
}

describe("parity with the JVM engine", () => {
  it("has fixture documents", () => {
    expect(documents.length).toBeGreaterThan(0);
  });

  for (const name of documents) {
    it(name, () => {
      expectWithinTolerance(buildCubics(read(`documents/${name}`)), JSON.parse(read(`expected/${name}`)).cubics);
    });
  }
});

describe("morph parity with the JVM engine", () => {
  it("has morph fixtures", () => {
    expect(morphs.length).toBeGreaterThan(0);
  });

  for (const name of morphs) {
    it(name, () => {
      const { start, end } = JSON.parse(read(`morphs/${name}`));
      const expected = JSON.parse(read(`expected-morphs/${name}`));
      const handle = createMorph(JSON.stringify(start), JSON.stringify(end));
      for (const [key, progress] of MORPH_PROGRESS) {
        expectWithinTolerance(morphCubics(handle, progress), expected[key]);
      }
      releaseMorph(handle);
    });
  }
});

describe("fixture coverage", () => {
  const parsed = documents.map((name) => JSON.parse(read(`documents/${name}`)));

  it("every shape kind appears in a fixture document", () => {
    const kinds = new Set(parsed.map((doc) => doc.shape.kind));
    expect(SHAPE_KINDS.filter((kind) => !kinds.has(kind))).toEqual([]);
  });

  it("every transform type appears in a fixture document", () => {
    const types = new Set(parsed.flatMap((doc) => (doc.transforms ?? []).map((t: { type: string }) => t.type)));
    expect(TRANSFORM_TYPES.filter((type) => !types.has(type))).toEqual([]);
  });
});
