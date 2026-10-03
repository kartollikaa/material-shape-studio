import { readFile, writeFile } from "node:fs/promises";
import { CATALOGUE, CATALOGUE_NAMES, encodeShare, type ShapeDocument, type SharedShape } from "@material-shape-studio/core";
import { ShapeJobs } from "./jobs";

const SITE = "https://kartollikaa.github.io/material-shape-studio/";
const jobs = new ShapeJobs();
const args = process.argv.slice(2);

function option(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`--${name} needs a value`);
  return value;
}

async function jsonFile(file: string | undefined): Promise<unknown> {
  if (!file) throw new Error("--document or --input file is required");
  const bytes = await readFile(file);
  if (bytes.length > 131_072) throw new Error("input exceeds size limit");
  return JSON.parse(bytes.toString("utf8"));
}

async function main(): Promise<unknown> {
  const [command] = args;
  if (command === "list") {
    const filter = option("filter")?.toLowerCase();
    return { shapes: CATALOGUE_NAMES.filter((name) => !filter || name.toLowerCase().includes(filter)).map((name) => ({ name, document: CATALOGUE[name] })) };
  }
  if (command === "create") {
    const name = option("name");
    const file = option("document");
    if (!!name === !!file) throw new Error("provide exactly one of --name or --document");
    const document = name ? CATALOGUE[name] : await jsonFile(file) as ShapeDocument;
    if (!document) throw new Error(`unknown catalogue name: ${name}`);
    const result = await jobs.run({ kind: "create", document }) as Record<string, unknown>;
    const colour = option("colour") ?? "#6750a4";
    if (!/^#[0-9a-fA-F]{6}$/.test(colour)) throw new Error("--colour must be a hex colour");
    return { ...result, studioUrl: SITE + await encodeShare({ document, presentation: { colour, theme: "light", context: "button" } }) };
  }
  if (command === "preview") {
    const shapes = await jsonFile(option("input")) as (SharedShape & { label: string })[];
    if (!Array.isArray(shapes) || shapes.length < 1 || shapes.length > 4) throw new Error("preview needs one to four shapes");
    const output = option("output");
    if (!output) throw new Error("--output PNG file is required");
    const links = await Promise.all(shapes.map(async (shape) => SITE + await encodeShare(shape)));
    const rendered = await jobs.run({ kind: "preview", shapes }) as { png: string };
    await writeFile(output, Buffer.from(rendered.png, "base64"), { flag: "wx" });
    return { output, links, mediaType: "image/png" };
  }
  if (command === "export") {
    const document = await jsonFile(option("document")) as ShapeDocument;
    const target = option("target");
    const colour = option("colour") ?? "#6750a4";
    if (target !== "compose" && target !== "svg" && target !== "css") throw new Error("--target must be compose, svg, or css");
    if (!/^#[0-9a-fA-F]{6}$/.test(colour)) throw new Error("--colour must be a hex colour");
    return jobs.run({ kind: "export", shape: { document, presentation: { colour, theme: "light", context: "button" } }, target });
  }
  throw new Error("usage: shape-studio list [--filter NAME] | create (--name NAME | --document FILE) [--colour HEX] | preview --input SHAPES.json --output FILE.png | export --document FILE --target compose|svg|css [--colour HEX]");
}

main().then((value) => process.stdout.write(`${JSON.stringify(value)}\n`)).catch((error) => {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exitCode = 1;
});
