import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { CATALOGUE, CATALOGUE_NAMES, encodeShare, type ShapeDocument, type SharedShape } from "@material-shape-studio/core";
import { documentSchema, previewItemsSchema } from "./schemas";
import { ShapeJobs } from "./jobs";
import type { ServiceConfig } from "./config";

type ToolResult = { content: ({ type: "text"; text: string } | { type: "image"; data: string; mimeType: "image/png" })[]; structuredContent?: Record<string, unknown>; isError?: boolean };
const textResult = (value: Record<string, unknown>): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value });
const toolError = (error: unknown): ToolResult => ({ content: [{ type: "text", text: (error as Error).message }], isError: true });
const presentation = (colour: string): SharedShape["presentation"] => ({ colour, theme: "light", context: "button" });

export function registerShapeTools(server: McpServer, jobs: ShapeJobs, config: Pick<ServiceConfig, "studioUrl">) {
  const studioUrl = (fragment: string) => `${config.studioUrl.replace(/#.*$/, "")}${fragment}`;

  server.registerTool("list_shapes", {
    description: "Browse Material's 35 named shapes and the editable document format. Filter names before creating a shape.",
    inputSchema: z.object({ filter: z.string().max(80).optional() }).strict(),
  }, async ({ filter }): Promise<ToolResult> => {
    const names = CATALOGUE_NAMES.filter((name) => !filter || name.toLowerCase().includes(filter.toLowerCase()));
    return textResult({ shapes: names.map((name) => ({ name, document: CATALOGUE[name] })), vocabulary: ["polygon", "ngon", "circle", "rectangle", "star", "pill", "pillStar", "features"] });
  });

  server.registerTool("create_shape", {
    description: "Validate a Material catalogue name or a complete editable shape document, and return its bounds and Studio link. Pass the returned document to preview_shapes or export_shape.",
    inputSchema: z.object({ name: z.string().optional(), document: documentSchema.optional(), colour: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6750a4") }).strict(),
  }, async ({ name, document, colour }): Promise<ToolResult> => {
    try {
      if (!!name === !!document) throw new Error("provide exactly one of name or document");
      if (name && !Object.hasOwn(CATALOGUE, name)) throw new Error(`unknown catalogue name: ${name}`);
      const chosen = name ? CATALOGUE[name] : document as ShapeDocument;
      const created = await jobs.run({ kind: "create", document: chosen }) as Record<string, unknown>;
      return textResult({ ...created, studioUrl: studioUrl(await encodeShare({ document: chosen, presentation: presentation(colour) })) });
    } catch (error) { return toolError(error); }
  });

  server.registerTool("preview_shapes", {
    description: "Render up to four labelled shapes as a PNG comparison. Each item also gets an editable Studio link, even if your agent host cannot show images.",
    inputSchema: z.object({ shapes: previewItemsSchema }).strict(),
  }, async ({ shapes }): Promise<ToolResult> => {
    try {
      const links = await Promise.all(shapes.map(async (item) => studioUrl(await encodeShare({ document: item.document as ShapeDocument, presentation: item.presentation }))));
      const rendered = await jobs.run({ kind: "preview", shapes: shapes as (SharedShape & { label: string })[] }) as { png: string };
      return { content: [{ type: "text", text: JSON.stringify({ links }) }, { type: "image", data: rendered.png, mimeType: "image/png" }], structuredContent: { links, mediaType: "image/png" } };
    } catch (error) { return toolError(error); }
  });

  server.registerTool("export_shape", {
    description: "Export the exact supplied shape document as Compose Kotlin, SVG, or CSS source.",
    inputSchema: z.object({ document: documentSchema, colour: z.string().regex(/^#[0-9a-fA-F]{6}$/), target: z.enum(["compose", "svg", "css"]) }).strict(),
  }, async ({ document, colour, target }): Promise<ToolResult> => {
    try {
      const result = await jobs.run({ kind: "export", shape: { document: document as ShapeDocument, presentation: presentation(colour) }, target }) as Record<string, unknown>;
      return textResult(result);
    } catch (error) { return toolError(error); }
  });
}
