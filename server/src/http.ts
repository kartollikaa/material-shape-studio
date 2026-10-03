import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { ShapeJobs } from "./jobs";
import { registerShapeTools } from "./tools";
import type { ServiceConfig } from "./config";

export function createHttpServer(config: ServiceConfig): Server {
  const jobs = new ShapeJobs(config.maxConcurrentJobs, config.jobDeadlineMs);
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts: config.allowedHosts, allowedOrigins: config.allowedOrigins, jsonLimit: `${config.maxRequestBytes ?? 65_536}b` });
  app.disable("x-powered-by");
  const requests = new Map<string, { count: number; until: number }>();
  app.use((req, res, next) => {
    const requestId = randomUUID();
    res.setHeader("x-request-id", requestId);
    res.on("finish", () => console.log(JSON.stringify({ requestId, method: req.method, path: req.path, outcome: res.statusCode })));
    if (req.path !== "/healthz") {
      const address = req.socket.remoteAddress ?? "unknown";
      const now = Date.now();
      const usage = requests.get(address);
      const current = usage && usage.until > now ? usage : { count: 0, until: now + 60_000 };
      current.count++;
      requests.set(address, current);
      if (current.count > (config.maxRequestsPerMinute ?? 120)) { res.status(429).end(); return; }
    }
    if (req.path === "/mcp" && Number(req.headers["content-length"] ?? 0) > (config.maxRequestBytes ?? 65_536)) {
      res.status(413).end();
      return;
    }
    next();
  });
  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: "material-shape-studio", version: "0.1.0" });
    registerShapeTools(server, jobs, config);
    return server;
  });
  const nodeHandler = toNodeHandler(handler);
  app.all("/mcp", (req, res) => void nodeHandler(req, res, req.body));
  return createServer(app);
}
