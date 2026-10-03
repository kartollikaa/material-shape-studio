import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const run = promisify(execFile);
const cli = join(import.meta.dirname, "../dist/cli.mjs");

it("creates, previews, and exports the same document", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shape-cli-"));
  const document = { v: 1, shape: { kind: "ngon", vertices: 7 } };
  const documentFile = join(directory, "shape.json");
  await writeFile(documentFile, JSON.stringify(document));
  const created = JSON.parse((await run(process.execPath, [cli, "create", "--document", documentFile])).stdout);
  expect(created.document).toEqual(document);
  expect(created.studioUrl).toContain("#doc=");
  const input = join(directory, "comparison.json");
  const output = join(directory, "comparison.png");
  await writeFile(input, JSON.stringify([{ document, presentation: { colour: "#6750a4", theme: "light", context: "button" }, label: "Seven sides" }]));
  const preview = JSON.parse((await run(process.execPath, [cli, "preview", "--input", input, "--output", output])).stdout);
  expect(preview.links).toHaveLength(1);
  expect((await readFile(output)).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  const exported = JSON.parse((await run(process.execPath, [cli, "export", "--document", documentFile, "--target", "svg"])).stdout);
  expect(exported.mediaType).toBe("image/svg+xml");
  expect(exported.code).toContain("<svg");
});

it("rejects an invalid shape and leaves a subsequent command usable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shape-cli-"));
  const invalid = join(directory, "invalid.json");
  await writeFile(invalid, JSON.stringify({ v: 1, shape: { kind: "ngon", vertices: 2 } }));
  await expect(run(process.execPath, [cli, "create", "--document", invalid])).rejects.toThrow();
  const listed = JSON.parse((await run(process.execPath, [cli, "list", "--filter", "Heart"])).stdout);
  expect(listed.shapes.map((shape: { name: string }) => shape.name)).toEqual(["Heart"]);
});
