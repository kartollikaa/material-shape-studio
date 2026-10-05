import { readFile, writeFile } from "node:fs/promises";
import type * as z from "zod/v4";
import { CATALOGUE, CATALOGUE_NAMES, studioAddress, type ShapeDocument, type SharedShape } from "@material-shape-studio/core";
import { localStudioUrl } from "./config";
import { ShapeJobs } from "./jobs";
import { documentSchema, previewItemsSchema } from "./schemas";

const jobs = new ShapeJobs();
const args = process.argv.slice(2);

function option(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`--${name} needs a value`);
  return value;
}

function colourOption(): string {
  const colour = option("colour") ?? "#6750a4";
  if (!/^#[0-9a-fA-F]{6}$/.test(colour)) throw new Error("--colour must be a hex colour");
  return colour.toLowerCase();
}

function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new Error(result.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("\n"));
}

async function jsonFile(file: string | undefined): Promise<unknown> {
  if (!file) throw new Error("--document or --input file is required");
  const bytes = await readFile(file);
  if (bytes.length > 131_072) throw new Error("input exceeds size limit");
  return JSON.parse(bytes.toString("utf8"));
}

async function main(): Promise<unknown> {
  const [command] = args;
  const site = localStudioUrl();
  const studioUrl = (shape: SharedShape) => site + studioAddress(shape);
  if (command === "list") {
    const filter = option("filter")?.toLowerCase();
    return { shapes: CATALOGUE_NAMES.filter((name) => !filter || name.toLowerCase().includes(filter)).map((name) => ({ name, document: CATALOGUE[name] })) };
  }
  if (command === "create") {
    const name = option("name");
    const file = option("document");
    if (!!name === !!file) throw new Error("provide exactly one of --name or --document");
    if (name && !Object.hasOwn(CATALOGUE, name)) throw new Error(`unknown catalogue name: ${name}`);
    const colour = colourOption();
    const document = name ? CATALOGUE[name] : parsed(documentSchema, await jsonFile(file)) as ShapeDocument;
    const result = await jobs.run({ kind: "create", document }) as Record<string, unknown>;
    return { ...result, studioUrl: studioUrl({ document, presentation: { colour, theme: "light", context: "button" } }) };
  }
  if (command === "preview") {
    const output = option("output");
    if (!output) throw new Error("--output PNG file is required");
    const shapes = parsed(previewItemsSchema, await jsonFile(option("input"))) as (SharedShape & { label: string })[];
    const links = shapes.map(({ document, presentation }) => studioUrl({ document, presentation }));
    const rendered = await jobs.run({ kind: "preview", shapes }) as { png: string };
    await writeFile(output, Buffer.from(rendered.png, "base64"), { flag: "wx" });
    return { output, links, mediaType: "image/png" };
  }
  if (command === "export") {
    const target = option("target");
    if (target !== "compose" && target !== "svg" && target !== "css") throw new Error("--target must be compose, svg, or css");
    const colour = colourOption();
    const document = parsed(documentSchema, await jsonFile(option("document"))) as ShapeDocument;
    return jobs.run({ kind: "export", shape: { document, presentation: { colour, theme: "light", context: "button" } }, target });
  }
  throw new Error("usage: shape-studio list [--filter NAME] | create (--name NAME | --document FILE) [--colour HEX] | preview --input SHAPES.json --output FILE.png | export --document FILE --target compose|svg|css [--colour HEX]");
}

main().then((value) => process.stdout.write(`${JSON.stringify(value)}\n`)).catch((error) => {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exitCode = 1;
});
