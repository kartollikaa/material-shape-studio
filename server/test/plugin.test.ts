import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
const json = async (path: string) => JSON.parse(await readFile(join(root, path), "utf8"));

it("pins the skill's CLI to the package and plugin version", async () => {
  const { version } = await json("server/package.json");
  const skill = await readFile(join(root, "skills/material-shapes/SKILL.md"), "utf8");
  expect([...skill.matchAll(/material-shape-studio-mcp@([^\s`]+)/g)].map((match) => match[1])).toEqual([version]);
  expect((await json(".claude-plugin/plugin.json")).version).toBe(version);
  expect((await json("plugin.json")).version).toBe(version);
});
