import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(import.meta.dirname, "../dist");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".txt": "text/plain" };
createServer(async (req, res) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname.replace(/^\/material-shape-studio(?=\/)/, "");
  const target = resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
  if (!target.startsWith(root + sep)) { res.writeHead(404).end(); return; }
  try {
    const data = await readFile(target);
    res.writeHead(200, { "content-type": mime[extname(target)] ?? "application/octet-stream" }).end(data);
  } catch { res.writeHead(404).end(); }
}).listen(4179, "127.0.0.1");
