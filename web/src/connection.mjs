export function connectionInstructions(raw) {
  let endpoint;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password || url.hash || url.search || !url.pathname.endsWith("/mcp") || /^(localhost|127\.|10\.|192\.168\.|172\.|0\.)/.test(url.hostname)) throw new Error("invalid endpoint");
    endpoint = url.href;
  } catch {
    return { available: false, endpoint: "", prompt: "", text: "Material Shape Studio MCP connection is unavailable. The public endpoint has not been verified and published yet.\n" };
  }
  const prompt = `Connect Material Shape Studio as a remote MCP server named material-shape-studio at ${endpoint} using your agent host's normal MCP setup. Preserve existing MCP settings. Ask me for any required approval, then list its four tools. Use it to create, preview, refine, and export shapes.`;
  const text = `Material Shape Studio MCP\nEndpoint: ${endpoint}\nTransport: Streamable HTTP\n\nAgent prompt:\n${prompt}\n\nClaude Code:\nclaude mcp add --transport http material-shape-studio ${endpoint}\n\nCursor:\nAdd a remote MCP server entry named material-shape-studio with URL ${endpoint} in your MCP settings. Merge the entry into existing mcpServers; do not replace other entries.\n\nYour agent host may require you to approve the connection or add the URL yourself.\n`;
  return { available: true, endpoint, prompt, text };
}
