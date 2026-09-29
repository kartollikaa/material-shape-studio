import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "@material-shape-studio/engine";
import { describe, expect, it } from "vitest";
import { CATALOGUE, CATALOGUE_NAMES, CATALOGUE_SOURCE } from ".";

const COMPOSE_NAMES = [
  "Circle", "Square", "Slanted", "Arch", "Fan", "Arrow", "SemiCircle", "Oval", "Pill", "Triangle", "Diamond", "ClamShell",
  "Pentagon", "Gem", "Sunny", "VerySunny", "Cookie4Sided", "Cookie6Sided", "Cookie7Sided", "Cookie9Sided", "Cookie12Sided",
  "Ghostish", "Clover4Leaf", "Clover8Leaf", "Burst", "SoftBurst", "Boom", "SoftBoom", "Flower", "Puffy", "PuffyDiamond",
  "PixelCircle", "PixelTriangle", "Bun", "Heart",
];

const cubicsOf = (doc: unknown): number[] => JSON.parse(build(JSON.stringify(doc))).cubics;

describe("the Material catalogue", () => {
  it("holds Compose's 35 MaterialShapes in declaration order", () => {
    expect(CATALOGUE_NAMES).toEqual(COMPOSE_NAMES);
  });

  it("records the pinned upstream file it was generated from", () => {
    expect(CATALOGUE_SOURCE).toMatch(/^androidx\/androidx@[0-9a-f]{40}:compose\/.*\/MaterialShapes\.kt$/);
  });

  for (const name of COMPOSE_NAMES) {
    it(`${name} builds to a shape normalized into the unit square`, () => {
      const [left, top, right, bottom] = JSON.parse(build(JSON.stringify(CATALOGUE[name]))).bounds;
      expect(Math.max(right - left, bottom - top)).toBeCloseTo(1, 3);
      expect(Math.min(left, top)).toBeGreaterThan(-1e-3);
      expect(Math.max(right, bottom)).toBeLessThan(1 + 1e-3);
    });
  }

  const handTranscribed: Record<string, string> = {
    Cookie4Sided: "polygon-cookie4-normalized.json",
    Clover4Leaf: "polygon-clover4-normalized.json",
    Burst: "polygon-burst-normalized.json",
  };
  for (const [name, fixture] of Object.entries(handTranscribed)) {
    it(`${name} matches the hand-transcribed engine fixture exactly`, () => {
      const document = JSON.parse(readFileSync(resolve(process.cwd(), "../engine/fixtures/documents", fixture), "utf8"));
      expect(cubicsOf(CATALOGUE[name])).toEqual(cubicsOf(document));
    });
  }
});
