import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { browserName: "chromium", channel: "chrome" },
  projects: [
    { name: "root", use: { baseURL: "http://127.0.0.1:4179/" } },
    { name: "subpath", use: { baseURL: "http://127.0.0.1:4179/material-shape-studio/" } },
  ],
  webServer: { command: "node scripts/serve-dist.mjs", url: "http://127.0.0.1:4179/", reuseExistingServer: false },
});
