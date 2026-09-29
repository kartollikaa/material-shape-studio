import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const entry = fileURLToPath(new URL("../dist/engine.mjs", import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), "engine-size-"));
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

try {
  await build({
    configFile: false,
    logLevel: "silent",
    build: {
      outDir,
      emptyOutDir: true,
      minify: true,
      lib: { entry, formats: ["iife"], name: "engine", fileName: "engine" },
    },
  });
  const file = readdirSync(outDir).find((name) => name.endsWith(".js"));
  const code = readFileSync(join(outDir, file));
  console.log(`engine: ${kb(code.length)} minified, ${kb(gzipSync(code).length)} gzipped`);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
