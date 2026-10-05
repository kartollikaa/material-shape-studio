import { configDefaults, defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { resolve } from "node:path";
import { connectionHtml, connectionInstructions } from "./src/connection.mjs";

export default defineConfig(({ mode }) => {
  const instructions = connectionInstructions(loadEnv(mode, import.meta.dirname, "VITE_").VITE_MCP_PACKAGE_VERSION);
  return {
  base: "./",
  build: {
    rollupOptions: { input: { studio: resolve(import.meta.dirname, "index.html"), connect: resolve(import.meta.dirname, "connect/index.html") } },
  },
  plugins: [{
    name: "agent-instructions",
    transformIndexHtml: { order: "pre", handler: (html) => html.replace("<!-- connection -->", () => connectionHtml(instructions)) },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "connect/agent.txt", source: instructions.text });
    },
  }],
  test: { environment: "jsdom", exclude: [...configDefaults.exclude, "e2e/**"] },
  };
});
