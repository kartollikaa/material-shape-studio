import { build } from "esbuild";
import { chmod, copyFile } from "node:fs/promises";

const runtimeDependencies = ["@modelcontextprotocol/server", "@resvg/resvg-js", "zod"];
const executables = ["stdio", "cli"];
// The HTTP prototype bundles its express adapters, which are devDependencies of the published CLI package.
const requireShim = 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);';

for (const entry of ["index", "stdio", "cli", "worker"]) {
  const banner = [executables.includes(entry) ? "#!/usr/bin/env node" : "", entry === "index" ? requireShim : ""].filter(Boolean).join("\n");
  await build({
    entryPoints: [`src/${entry}.ts`],
    outfile: `dist/${entry}.mjs`,
    platform: "node",
    format: "esm",
    target: "node24",
    bundle: true,
    external: entry === "index" ? runtimeDependencies : [...runtimeDependencies, "@modelcontextprotocol/*", "express"],
    banner: banner ? { js: banner } : undefined,
  });
  if (executables.includes(entry)) await chmod(`dist/${entry}.mjs`, 0o755);
}
for (const file of ["LICENSE", "NOTICE"]) await copyFile(`../${file}`, file);
