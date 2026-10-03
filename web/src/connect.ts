import { connectionInstructions } from "./connection.mjs";

const instructions = connectionInstructions(import.meta.env.VITE_MCP_ENDPOINT);
const byId = (id: string) => document.getElementById(id)!;
byId("connection-state").textContent = instructions.available ? "Remote shape tools are available." : "Public MCP connection is not available yet.";
byId("connection-details").hidden = !instructions.available;
if (instructions.available) {
  byId("endpoint").textContent = instructions.endpoint;
  byId("prompt").textContent = instructions.prompt;
  byId("claude-command").textContent = `claude mcp add --transport http material-shape-studio ${instructions.endpoint}`;
}
for (const [button, content] of [["copy-endpoint", instructions.endpoint], ["copy-prompt", instructions.prompt]]) {
  byId(button).addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(content); byId("copy-status").textContent = "Copied."; }
    catch { byId("copy-status").textContent = "Copy failed. Select and copy the text above."; }
  });
}
