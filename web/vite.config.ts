import { configDefaults, defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { connectionInstructions } from "./src/connection.mjs";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: { input: { studio: resolve(import.meta.dirname, "index.html"), connect: resolve(import.meta.dirname, "connect/index.html") } },
  },
  plugins: [{
    name: "agent-instructions",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "connect/agent.txt", source: connectionInstructions(process.env.VITE_MCP_ENDPOINT).text });
    },
  }],
  test: { environment: "jsdom", exclude: [...configDefaults.exclude, "e2e/**"] },
});
