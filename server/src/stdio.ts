import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { ShapeJobs } from "./jobs";
import { registerShapeTools } from "./tools";
import { localStudioUrl } from "./config";

const studioUrl = localStudioUrl();

void serveStdio(() => {
  const server = new McpServer({ name: "material-shape-studio", version: "0.1.2" });
  registerShapeTools(server, new ShapeJobs(), { studioUrl });
  return server;
});
