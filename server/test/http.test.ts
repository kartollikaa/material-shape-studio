import { afterAll, beforeAll, expect, it } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createHttpServer } from "../src/http";
import { request, type Server } from "node:http";

let server: Server;
let client: Client;
let endpoint: URL;

beforeAll(async () => {
  server = createHttpServer({ studioUrl: "https://example.com/studio/", allowedHosts: ["127.0.0.1", "localhost"], allowedOrigins: [] });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server address missing");
  endpoint = new URL(`http://127.0.0.1:${address.port}/mcp`);
  client = new Client({ name: "shape-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(endpoint));
});

afterAll(async () => {
  await client?.close();
  await new Promise<void>((resolve) => server?.close(() => resolve()));
});

it("offers four connected tools and exports the created document", async () => {
  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name).sort()).toEqual(["create_shape", "export_shape", "list_shapes", "preview_shapes"]);
  const listed = await client.callTool({ name: "list_shapes", arguments: { filter: "Heart" } });
  expect(listed.isError).not.toBe(true);
  expect(JSON.stringify(listed.structuredContent)).toContain("Heart");
  const document = { v: 1, shape: { kind: "ngon", vertices: 7 } };
  const created = await client.callTool({ name: "create_shape", arguments: { document } });
  expect(created.isError).not.toBe(true);
  expect(created.structuredContent).toMatchObject({ document });
  const exported = await client.callTool({ name: "export_shape", arguments: { document, colour: "#6750a4", target: "svg" } });
  expect(exported.isError).not.toBe(true);
  expect(exported.structuredContent).toMatchObject({ mediaType: "image/svg+xml" });
  const preview = await client.callTool({ name: "preview_shapes", arguments: { shapes: [{ document, presentation: { colour: "#6750a4", theme: "light", context: "button" }, label: "Seven sides" }] } });
  expect(preview.isError).not.toBe(true);
  expect(preview.content).toContainEqual(expect.objectContaining({ type: "image", mimeType: "image/png" }));
  const image = preview.content.find((item) => item.type === "image");
  if (!image || image.type !== "image") throw new Error("PNG missing");
  expect(Buffer.from(image.data, "base64").subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
});

it("rejects an unknown name and invalid comparison item, then recovers", async () => {
  const unknown = await client.callTool({ name: "create_shape", arguments: { name: "Missing" } });
  expect(unknown.isError).toBe(true);
  const good = { document: { v: 1, shape: { kind: "ngon", vertices: 5 } }, presentation: { colour: "#6750a4", theme: "light", context: "button" }, label: "Good" };
  const invalid = { ...good, document: { v: 1, shape: { kind: "ngon", vertices: 2 } }, label: "Bad" };
  const preview = await client.callTool({ name: "preview_shapes", arguments: { shapes: [good, invalid] } });
  expect(preview.isError).toBe(true);
  expect(JSON.stringify(preview.content)).toContain("shapes[1]");
  const recovered = await client.callTool({ name: "create_shape", arguments: { document: good.document } });
  expect(recovered.isError).not.toBe(true);
});

it("rejects forged hosts and browser origins while accepting a native client", async () => {
  const payload = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  const wrongOrigin = await fetch(endpoint, { method: "POST", headers: { ...headers, origin: "https://evil.example", "x-forwarded-for": "127.0.0.1" }, body: payload });
  expect(wrongOrigin.status).toBe(403);
  const wrongHost = await new Promise<number>((resolve, reject) => {
    const req = request(endpoint, { method: "POST", headers: { ...headers, host: "evil.example", "x-forwarded-host": "127.0.0.1" } }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode ?? 0));
    });
    req.on("error", reject);
    req.end(payload);
  });
  expect(wrongHost).toBe(403);
  const native = await fetch(endpoint, { method: "POST", headers, body: payload });
  expect(native.status).toBe(200);
});

it("reports health and rejects a body over the configured limit", async () => {
  for (let index = 0; index < 125; index++) {
    const health = await fetch(new URL("/healthz", endpoint));
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true });
  }
  const oversized = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(70_000) });
  expect(oversized.status).toBe(413);
});

it("keeps health available when the configured traffic throttle rejects MCP calls", async () => {
  const limited = createHttpServer({ studioUrl: "https://example.com/studio/", allowedHosts: ["127.0.0.1"], allowedOrigins: [], maxRequestsPerMinute: 2 });
  await new Promise<void>((resolve) => limited.listen(0, "127.0.0.1", resolve));
  try {
    const address = limited.address();
    if (!address || typeof address === "string") throw new Error("server address missing");
    const base = `http://127.0.0.1:${address.port}`;
    expect((await fetch(`${base}/mcp`)).status).toBe(405);
    expect((await fetch(`${base}/mcp`)).status).toBe(405);
    expect((await fetch(`${base}/mcp`)).status).toBe(429);
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  } finally {
    await new Promise<void>((resolve) => limited.close(() => resolve()));
  }
});
