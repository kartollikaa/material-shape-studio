import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const image = process.argv[2] ?? "material-shape-studio-mcp";
const socket = createServer();
await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const name = `shape-smoke-${process.pid}`;
const run = spawn("docker", ["run", "--rm", "--name", name, "-p", `127.0.0.1:${port}:3000`, "-e", "STUDIO_URL=https://kartollikaa.github.io/material-shape-studio/", "-e", "ALLOWED_HOSTS=127.0.0.1,localhost", image], { stdio: "ignore" });
try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(1000);
  }
  if (!ready) throw new Error("container health check timed out");
  const probe = spawn(process.execPath, ["server/scripts/probe.mjs", `http://127.0.0.1:${port}/mcp`], { stdio: "inherit" });
  const exitCode = await new Promise((resolve) => probe.on("exit", resolve));
  if (exitCode !== 0) throw new Error(`container probe exited ${exitCode}`);
} finally {
  const stop = spawn("docker", ["stop", name], { stdio: "ignore" });
  await new Promise((resolve) => stop.on("exit", resolve));
  run.kill();
}
