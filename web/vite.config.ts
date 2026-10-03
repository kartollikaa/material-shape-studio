import { configDefaults, defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { resolve } from "node:path";
import { connectionInstructions } from "./src/connection.mjs";

export default defineConfig(({ mode }) => {
  const endpoint = loadEnv(mode, import.meta.dirname, "VITE_").VITE_MCP_ENDPOINT;
  return {
  base: "./",
  define: { "import.meta.env.VITE_MCP_ENDPOINT": JSON.stringify(endpoint ?? "") },
  build: {
    rollupOptions: { input: { studio: resolve(import.meta.dirname, "index.html"), connect: resolve(import.meta.dirname, "connect/index.html") } },
  },
  plugins: [{
    name: "agent-instructions",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "connect/agent.txt", source: connectionInstructions(endpoint).text });
    },
  }],
  test: { environment: "jsdom", exclude: [...configDefaults.exclude, "e2e/**"] },
  };
});
