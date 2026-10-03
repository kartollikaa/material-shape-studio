import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { ShapeJobs } from "./jobs";
import { registerShapeTools } from "./tools";

const studioUrl = process.env.STUDIO_URL ?? "https://kartollikaa.github.io/material-shape-studio/";
if (new URL(studioUrl).protocol !== "https:") throw new Error("STUDIO_URL must be an HTTPS URL");

void serveStdio(() => {
  const server = new McpServer({ name: "material-shape-studio", version: "0.1.0" });
  registerShapeTools(server, new ShapeJobs(), { studioUrl });
  return server;
});
