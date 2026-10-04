export function connectionInstructions(version) {
  const available = typeof version === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version);
  const packageSpec = available ? `material-shape-studio-mcp@${version}` : "";
  const prompt = available
    ? `Read this page and install the Material Shape Studio agent plugin from https://github.com/kartollikaa/material-shape-studio using your host's plugin flow if supported. Otherwise use the ${packageSpec} CLI locally; if your host supports local MCP, you may register its stdio server. Preserve existing settings and ask me for required approval. Create and preview variants, give me editable Studio links, and export the chosen shape.`
    : "";
  const text = available
    ? `Material Shape Studio local agent integration\nPlugin source: https://github.com/kartollikaa/material-shape-studio\nPackage: ${packageSpec}\nRuntime: Node.js 24 or newer on the agent's machine\n\nAgent prompt:\n${prompt}\n\nCLI:\nnpm exec --yes --package=${packageSpec} -- shape-studio list --filter Heart\n\nOptional local MCP for Claude Code:\nclaude mcp add --transport stdio material-shape-studio -- npx --yes ${packageSpec}\n\nOptional local MCP for Cursor:\nAdd a stdio MCP server named material-shape-studio with command npx and args ["--yes", "${packageSpec}"]. Merge this entry into existing mcpServers; do not replace other entries.\n\nA compatible agent can perform setup, but its host may ask the user to approve installation or configuration. Do not claim a remote endpoint exists.\n`
    : "Material Shape Studio agent plugin and CLI are not published yet. Use the Studio website to create and edit shapes, then copy its shape document. Do not attempt to install an unpublished package or configure a remote endpoint.\n";
  return { available, packageSpec, prompt, text };
}
