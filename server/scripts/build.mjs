import { build } from "esbuild";

for (const entry of ["index", "worker"]) {
  await build({
    entryPoints: [`src/${entry}.ts`],
    outfile: `dist/${entry}.mjs`,
    platform: "node",
    format: "esm",
    target: "node24",
    bundle: true,
    external: ["@modelcontextprotocol/*", "@resvg/resvg-js", "express", "zod"],
  });
}
