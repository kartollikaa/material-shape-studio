import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { MARKETPLACE, PLUGIN, connectionHtml, connectionInstructions } from "./connection.mjs";

const manifest = (path: string) => JSON.parse(readFileSync(resolve(process.cwd(), "..", path), "utf8"));

it("does not advertise an unset or invalid package version", () => {
  for (const input of [undefined, "latest", "1.0.0;rm -rf ~", "v1.0.0", "1.0"]) {
    const instructions = connectionInstructions(input);
    expect(instructions.available).toBe(false);
    expect(instructions.prompt).toBe("");
    expect(instructions.methods).toEqual([]);
    expect(instructions.text).toContain("not published yet");
    expect(connectionHtml(instructions)).toContain("not published yet");
  }
});

it("uses one pinned package in every method, the page and the text artifact", () => {
  const instructions = connectionInstructions("0.1.0");
  const html = connectionHtml(instructions);
  expect(instructions.available).toBe(true);
  expect(instructions.prompt).toContain("/connect/agent.txt");
  for (const id of ["claude-code", "cursor", "cli"]) {
    expect(JSON.stringify(instructions.methods.find((m) => m.id === id))).toContain(instructions.packageSpec);
  }
  expect(instructions.text).toContain(`claude mcp add --transport stdio material-shape-studio -- npx --yes ${instructions.packageSpec}`);
  expect(instructions.text).toContain("never replace other entries");
  expect(html).toContain(`<code id="package-spec">${instructions.packageSpec}</code>`);
});

it("installs the plugin from the marketplaces this repository publishes", () => {
  for (const path of [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"]) {
    const marketplace = manifest(path);
    expect(marketplace.name).toBe(MARKETPLACE);
    expect(marketplace.plugins.map((plugin: { name: string }) => plugin.name)).toContain(PLUGIN);
  }
  const { text } = connectionInstructions("0.1.0");
  expect(text).toContain("/plugin install material-shape-studio --marketplace kartollikaa/material-shape-studio");
  expect(text).toContain("claude plugin install material-shape-studio@material-shape-studio");
  expect(text).toContain("codex plugin marketplace add kartollikaa/material-shape-studio");
});

it("encodes the Cursor install link as Cursor's MCP server config", () => {
  const cursor = connectionInstructions("0.1.0").methods.find((m) => m.id === "cursor")!;
  const config = new URL(cursor.link!.href).searchParams.get("config")!;
  expect(JSON.parse(atob(config))).toEqual({ command: "npx", args: ["--yes", "material-shape-studio-mcp@0.1.0"] });
});

it("escapes rendered commands", () => {
  const html = connectionHtml(connectionInstructions("0.1.0"));
  expect(html).toContain("&amp;config=");
  expect(html).not.toMatch(/<pre>[^<]*"mcpServers"/);
});
