import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const directory = await mkdtemp(join(tmpdir(), "shape-package-"));
try {
  const packed = JSON.parse(execFileSync("npm", ["pack", "-w", "server", "--pack-destination", directory, "--json"], { encoding: "utf8" }));
  const tarball = join(directory, packed[0].filename);
  const install = join(directory, "install");
  execFileSync("npm", ["install", "--prefix", install, tarball], { stdio: "pipe" });
  const packageRoot = join(install, "node_modules", "material-shape-studio-mcp");
  const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  if (manifest.dependencies["@material-shape-studio/core"] || manifest.dependencies["@material-shape-studio/engine"]) throw new Error("packed package depends on unpublished workspaces");
  const cli = join(install, "node_modules", ".bin", "shape-studio");
  const listed = JSON.parse(execFileSync(cli, ["list", "--filter", "Heart"], { encoding: "utf8" }));
  if (listed.shapes.length !== 1 || listed.shapes[0].name !== "Heart") throw new Error("installed CLI failed");
  const comparison = join(directory, "comparison.json");
  const png = join(directory, "comparison.png");
  await writeFile(comparison, JSON.stringify([{ document: listed.shapes[0].document, presentation: { colour: "#6750a4", theme: "light", context: "photo" }, label: "Heart" }]));
  execFileSync(cli, ["preview", "--input", comparison, "--output", png], { encoding: "utf8" });
  if ((await readFile(png)).subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("installed CLI preview is not a PNG");
  if (manifest.license !== "Apache-2.0" || !(await readFile(join(packageRoot, "LICENSE"), "utf8")).includes("Apache License")) throw new Error("packed package lacks its licence");
  const client = new Client({ name: "installed-package-check", version: "1.0.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(packageRoot, "dist", "stdio.mjs")] }));
  try {
    const { tools } = await client.listTools();
    if (tools.length !== 4) throw new Error("installed MCP tools missing");
    const created = await client.callTool({ name: "create_shape", arguments: { document: { v: 1, shape: { kind: "ngon", vertices: 7 } } } });
    if (created.isError || !(created.structuredContent?.studioUrl?.toString().includes("#doc="))) throw new Error("installed MCP shape creation failed");
  } finally {
    await client.close();
  }
  process.stdout.write("packed CLI and stdio MCP passed\n");
} finally {
  await rm(directory, { recursive: true, force: true });
}
