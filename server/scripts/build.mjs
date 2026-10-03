import { build } from "esbuild";
import { chmod } from "node:fs/promises";

for (const entry of ["index", "stdio", "cli", "worker"]) {
  await build({
    entryPoints: [`src/${entry}.ts`],
    outfile: `dist/${entry}.mjs`,
    platform: "node",
    format: "esm",
    target: "node24",
    bundle: true,
    external: ["@modelcontextprotocol/*", "@resvg/resvg-js", "express", "zod"],
    banner: ["stdio", "cli"].includes(entry) ? { js: "#!/usr/bin/env node" } : undefined,
  });
  if (["stdio", "cli"].includes(entry)) await chmod(`dist/${entry}.mjs`, 0o755);
}
