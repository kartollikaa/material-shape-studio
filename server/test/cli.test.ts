import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { CATALOGUE, decodeState } from "@material-shape-studio/core";

const run = promisify(execFile);
const cli = join(import.meta.dirname, "../dist/cli.mjs");

it("creates, previews, and exports the same document", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shape-cli-"));
  const document = { v: 1, shape: { kind: "ngon", vertices: 7 } };
  const documentFile = join(directory, "shape.json");
  await writeFile(documentFile, JSON.stringify(document));
  const created = JSON.parse((await run(process.execPath, [cli, "create", "--document", documentFile])).stdout);
  expect(created.document).toEqual(document);
  expect(new URL(created.studioUrl).hash).toBe(`#${new URLSearchParams({ document: JSON.stringify(document) })}`);
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

it("creates a catalogue shape by name and rejects names that are not entries", async () => {
  const created = JSON.parse((await run(process.execPath, [cli, "create", "--name", "Heart"])).stdout);
  expect(created.document).toEqual(CATALOGUE.Heart);
  expect(created.studioUrl).toBe("https://kartollikaa.github.io/material-shape-studio/#shape=Heart");
  for (const name of ["Nonexistent", "constructor", "__proto__"]) {
    await expect(run(process.execPath, [cli, "create", "--name", name])).rejects.toMatchObject({ stderr: `unknown catalogue name: ${name}\n` });
  }
});

it("links each preview item to the address the website writes for its document and colour", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shape-cli-"));
  const input = join(directory, "comparison.json");
  const document = { v: 1, shape: { kind: "ngon", vertices: 5 } };
  const presentation = { colour: "#ABCDEF", theme: "dark", context: "avatar" };
  await writeFile(input, JSON.stringify([{ document, presentation, label: "Five" }, { document: CATALOGUE.Sunny, presentation, label: "Sunny" }]));
  const preview = JSON.parse((await run(process.execPath, [cli, "preview", "--input", input, "--output", join(directory, "out.png")])).stdout);
  const [custom, preset] = preview.links.map((link: string) => decodeState(new URL(link).hash.slice(1)));
  expect(custom.editor).toMatchObject({ name: null, doc: document, initial: document });
  expect(custom.colour).toBe("#abcdef");
  expect(preset.editor).toMatchObject({ name: "Sunny", doc: CATALOGUE.Sunny });
  expect(new URL(preview.links[1]).hash).toBe("#shape=Sunny&colour=abcdef");
});

it("exports an unedited catalogue document as Material's own shape, like the website", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shape-cli-"));
  const heart = join(directory, "heart.json");
  const edited = join(directory, "edited.json");
  await writeFile(heart, JSON.stringify(CATALOGUE.Heart));
  await writeFile(edited, JSON.stringify({ ...CATALOGUE.Heart, transforms: [{ type: "rotate", degrees: 45 }, { type: "normalize" }] }));
  const exportCompose = async (file: string) => JSON.parse((await run(process.execPath, [cli, "export", "--document", file, "--target", "compose"])).stdout).code as string;
  expect(await exportCompose(heart)).toContain("MaterialShapes.Heart.toShape()");
  expect(await exportCompose(edited)).toContain("private val MyShape = RoundedPolygon");
});

it("rejects malformed preview items by field before rendering", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shape-cli-"));
  const document = { v: 1, shape: { kind: "ngon", vertices: 5 } };
  const presentation = { colour: "#6750a4", theme: "light", context: "button" };
  const cases: [unknown, string][] = [
    [[{ document, presentation }], "0.label"],
    [[{ document, presentation, label: "x".repeat(61) }], "0.label"],
    [[{ document, label: "No presentation" }], "0.presentation"],
    [[{ document, presentation, label: "Extra", secret: "token" }], "secret"],
  ];
  for (const [index, [items, field]] of cases.entries()) {
    const input = join(directory, `bad-${index}.json`);
    const output = join(directory, `bad-${index}.png`);
    await writeFile(input, JSON.stringify(items));
    await expect(run(process.execPath, [cli, "preview", "--input", input, "--output", output])).rejects.toMatchObject({ stderr: expect.stringContaining(field) });
    await expect(stat(output)).rejects.toThrow();
  }
});

it("refuses to overwrite a preview and rejects bad options and oversized input", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shape-cli-"));
  const document = { v: 1, shape: { kind: "ngon", vertices: 5 } };
  const documentFile = join(directory, "shape.json");
  await writeFile(documentFile, JSON.stringify(document));
  const input = join(directory, "comparison.json");
  const output = join(directory, "existing.png");
  await writeFile(input, JSON.stringify([{ document, presentation: { colour: "#6750a4", theme: "light", context: "button" }, label: "Five" }]));
  await writeFile(output, "keep");
  await expect(run(process.execPath, [cli, "preview", "--input", input, "--output", output])).rejects.toMatchObject({ stderr: expect.stringContaining("EEXIST") });
  expect(await readFile(output, "utf8")).toBe("keep");
  await expect(run(process.execPath, [cli, "export", "--document", documentFile, "--target", "png"])).rejects.toMatchObject({ stderr: expect.stringContaining("--target") });
  await expect(run(process.execPath, [cli, "create", "--name", "Heart", "--colour", "red"])).rejects.toMatchObject({ stderr: expect.stringContaining("--colour") });
  const oversized = join(directory, "oversized.json");
  await writeFile(oversized, JSON.stringify({ ...document, name: "x".repeat(131_072) }));
  await expect(run(process.execPath, [cli, "create", "--document", oversized])).rejects.toMatchObject({ stderr: expect.stringContaining("size limit") });
});

it("rejects an invalid shape and leaves a subsequent command usable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shape-cli-"));
  const invalid = join(directory, "invalid.json");
  await writeFile(invalid, JSON.stringify({ v: 1, shape: { kind: "ngon", vertices: 2 } }));
  await expect(run(process.execPath, [cli, "create", "--document", invalid])).rejects.toThrow();
  const listed = JSON.parse((await run(process.execPath, [cli, "list", "--filter", "Heart"])).stdout);
  expect(listed.shapes.map((shape: { name: string }) => shape.name)).toEqual(["Heart"]);
});
