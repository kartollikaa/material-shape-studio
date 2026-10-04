import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { inflateRawSync } from "node:zlib";

const endpoint = process.argv[2];
if (!endpoint) throw new Error("Pass the complete MCP endpoint URL");
const client = new Client({ name: "shape-probe", version: "1.0.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const tools = await client.listTools();
  if (tools.tools.length !== 4) throw new Error(`Expected four tools; found ${tools.tools.length}`);
  const document = { v: 1, shape: { kind: "ngon", vertices: 7 } };
  const listed = await client.callTool({ name: "list_shapes", arguments: { filter: "Heart" } });
  const created = await client.callTool({ name: "create_shape", arguments: { document } });
  const preview = await client.callTool({ name: "preview_shapes", arguments: { shapes: [{ document, presentation: { colour: "#6750a4", theme: "light", context: "button" }, label: "Seven sides" }] } });
  const exported = await client.callTool({ name: "export_shape", arguments: { document, colour: "#6750a4", target: "svg" } });
  for (const [name, result] of [["list", listed], ["create", created], ["preview", preview], ["export", exported]]) {
    if (result.isError) throw new Error(`${name} failed: ${JSON.stringify(result.content)}`);
  }
  if (!JSON.stringify(listed.structuredContent).includes("Heart")) throw new Error("Filtered catalogue failed");
  const createdValue = created.structuredContent;
  if (JSON.stringify(createdValue.document) !== JSON.stringify(document)) throw new Error("Document changed during create");
  const link = new URL(createdValue.studioUrl);
  if (!link.hash.startsWith("#doc=")) throw new Error("Editable Studio link missing");
  const linked = JSON.parse(inflateRawSync(Buffer.from(link.hash.slice(5), "base64url")).toString("utf8"));
  if (JSON.stringify(linked.document) !== JSON.stringify(document)) throw new Error("Linked document changed");
  const image = preview.content.find((item) => item.type === "image");
  if (!image || Buffer.from(image.data, "base64").subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("PNG preview missing");
  if (exported.structuredContent.mediaType !== "image/svg+xml") throw new Error("SVG export failed");
  console.log("MCP probe passed: connected, four tools, editable link, PNG, SVG export");
} finally {
  await client.close();
}
