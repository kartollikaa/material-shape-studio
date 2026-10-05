import { expect, it } from "vitest";
import { decodeState } from "@material-shape-studio/core";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

it("runs all shape tools through the packaged local process", async () => {
  const client = new Client({ name: "local-shape-test", version: "1.0.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/stdio.mjs"] }));
  try {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(["create_shape", "export_shape", "list_shapes", "preview_shapes"]);
    const document = { v: 1, shape: { kind: "ngon", vertices: 7 } };
    const created = await client.callTool({ name: "create_shape", arguments: { document } });
    expect(created.isError).not.toBe(true);
    expect(created.structuredContent).toMatchObject({ document });
    const studioUrl = new URL((created.structuredContent as { studioUrl: string }).studioUrl);
    expect(studioUrl.origin + studioUrl.pathname).toBe("https://kartollikaa.github.io/material-shape-studio/");
    expect(decodeState(studioUrl.hash.slice(1)).editor.initial).toEqual(document);
    const preview = await client.callTool({ name: "preview_shapes", arguments: { shapes: [{ document, presentation: { colour: "#6750a4", theme: "light", context: "button" }, label: "Seven sides" }] } });
    expect(preview.isError).not.toBe(true);
    expect(preview.content).toContainEqual(expect.objectContaining({ type: "image", mimeType: "image/png" }));
    const exported = await client.callTool({ name: "export_shape", arguments: { document, colour: "#6750a4", target: "svg" } });
    expect(exported.structuredContent).toMatchObject({ mediaType: "image/svg+xml" });
  } finally {
    await client.close();
  }
});
