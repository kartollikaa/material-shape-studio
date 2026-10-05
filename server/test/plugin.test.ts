import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";
import { buildCubics } from "@material-shape-studio/engine";
import type { ShapeDocument } from "@material-shape-studio/core";
import { documentSchema } from "../src/schemas";
import { performJob } from "../src/worker";

const root = join(import.meta.dirname, "../..");
const skillDirectory = join(root, "skills/material-shapes");
const json = async (path: string) => JSON.parse(await readFile(join(root, path), "utf8"));
const shapeDesign = () => readFile(join(skillDirectory, "references/shape-design.md"), "utf8");

type SchemaDef = { type: string; shape?: Record<string, { _zod: { def: SchemaDef } }>; options?: { _zod: { def: SchemaDef } }[]; innerType?: { _zod: { def: SchemaDef } }; element?: { _zod: { def: SchemaDef } }; values?: unknown[] };

function documentedNames(def: SchemaDef, names = new Set<string>()): Set<string> {
  if (def.type === "object") {
    for (const [key, value] of Object.entries(def.shape!)) {
      names.add(key);
      documentedNames(value._zod.def, names);
    }
  }
  if (def.type === "union") def.options!.forEach((option) => documentedNames(option._zod.def, names));
  if (def.type === "optional") documentedNames(def.innerType!._zod.def, names);
  if (def.type === "array") documentedNames(def.element!._zod.def, names);
  if (def.type === "literal") def.values!.filter((value) => typeof value === "string").forEach((value) => names.add(value as string));
  return names;
}

it("pins the skill's CLI to the package and plugin version in SKILL.md only", async () => {
  const { version } = await json("server/package.json");
  const files = await readdir(skillDirectory, { recursive: true, withFileTypes: true });
  const pins = await Promise.all(files.filter((file) => file.isFile()).map(async (file) => {
    const path = join(file.parentPath, file.name);
    const found = [...(await readFile(path, "utf8")).matchAll(/material-shape-studio-mcp@([^\s`]+)/g)].map((match) => match[1]);
    return [path.slice(skillDirectory.length + 1), found] as const;
  }));
  expect(Object.fromEntries(pins.filter(([, found]) => found.length))).toEqual({ "SKILL.md": [version] });
  expect((await json(".claude-plugin/plugin.json")).version).toBe(version);
  expect((await json("plugin.json")).version).toBe(version);
});

it("names every shape document field, kind, and transform in the shape design reference", async () => {
  const reference = await shapeDesign();
  const names = [...documentedNames((documentSchema as unknown as { _zod: { def: SchemaDef } })._zod.def)];
  expect(names.filter((name) => !reference.includes(`\`${name}\``))).toEqual([]);
});

it("builds every example document in the shape design reference without warnings", async () => {
  const examples = [...(await shapeDesign()).matchAll(/```json\n([\s\S]*?)```/g)].map((match) => JSON.parse(match[1]));
  expect(examples.length).toBeGreaterThan(0);
  for (const example of examples) {
    const document = documentSchema.parse(example) as ShapeDocument;
    expect(performJob({ kind: "create", document }), JSON.stringify(example)).toMatchObject({ warnings: [] });
  }
});

it("matches the reference's rule for how far a smoothed right-angle corner reaches along each edge", () => {
  const straightRuns = (document: object) => {
    const cubics = Array.from(buildCubics(JSON.stringify(document)));
    const runs: number[] = [];
    for (let i = 0; i < cubics.length; i += 8) {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = cubics.slice(i, i + 8);
      const offLine = (x: number, y: number) => Math.abs((x - x0) * (y3 - y0) - (y - y0) * (x3 - x0));
      if (offLine(x1, y1) < 1e-6 && offLine(x2, y2) < 1e-6) runs.push(Math.hypot(x3 - x0, y3 - y0));
    }
    return runs.sort((a, b) => a - b);
  };
  for (const [radius, smoothing] of [[0.3, 0], [0.3, 0.6], [0.25, 0.4], [0.2, 1]]) {
    const shortSide = 1.2 - 2 * radius * (1 + smoothing);
    const runs = straightRuns({ v: 1, shape: { kind: "rectangle", width: 2, height: 1.2, rounding: { radius, smoothing } } });
    expect(runs[0], `radius ${radius}, smoothing ${smoothing}`).toBeCloseTo(shortSide, 4);
  }
});
