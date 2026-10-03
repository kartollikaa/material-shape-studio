import { connectionInstructions } from "./connection.mjs";

const instructions = connectionInstructions(import.meta.env.VITE_MCP_PACKAGE_VERSION);
const byId = (id: string) => document.getElementById(id)!;
byId("connection-state").textContent = instructions.available ? "Local shape tools are available." : "Agent plugin and CLI are not published yet.";
byId("connection-details").hidden = !instructions.available;
if (instructions.available) {
  byId("package-spec").textContent = instructions.packageSpec;
  byId("prompt").textContent = instructions.prompt;
  byId("cli-command").textContent = `npm exec --yes --package=${instructions.packageSpec} -- shape-studio list --filter Heart`;
  byId("claude-command").textContent = `claude mcp add --transport stdio material-shape-studio -- npx --yes ${instructions.packageSpec}`;
}
for (const [button, content] of [["copy-package", instructions.packageSpec], ["copy-prompt", instructions.prompt]]) {
  byId(button).addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(content); byId("copy-status").textContent = "Copied."; }
    catch { byId("copy-status").textContent = "Copy failed. Select and copy the text above."; }
  });
}
