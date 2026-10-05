export const REPOSITORY = "kartollikaa/material-shape-studio";
export const MARKETPLACE = "material-shape-studio";
export const PLUGIN = "material-shape-studio";
const AGENT_FILE_URL = "https://kartollikaa.github.io/material-shape-studio/connect/agent.txt";
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const UNAVAILABLE_TEXT = "Material Shape Studio agent plugin and CLI are not published yet. Use the Studio website to create and edit shapes, then copy its shape document. Do not attempt to install an unpublished package or configure a remote endpoint.\n";

export function connectionInstructions(version) {
  const available = typeof version === "string" && VERSION_PATTERN.test(version);
  if (!available) return { available, packageSpec: "", prompt: "", methods: [], verifyCommand: "", text: UNAVAILABLE_TEXT };
  const packageSpec = `material-shape-studio-mcp@${version}`;
  const verifyCommand = `npm exec --yes --package=${packageSpec} -- shape-studio list --filter Heart`;
  const mcpServer = { command: "npx", args: ["--yes", packageSpec] };
  const prompt = `Install the Material Shape Studio shape tools for me by following ${AGENT_FILE_URL}. Use the first install method my agent host supports, keep my existing settings, and ask me before anything that needs my approval. Then create a test shape and give me its editable Studio link.`;
  const methods = [
    {
      id: "claude-code", host: "Claude Code", kind: "Plugin from the marketplace",
      steps: [
        { label: "In a Claude Code session, type", command: `/plugin install ${PLUGIN} --marketplace ${REPOSITORY}` },
        { label: "Or from a terminal, which an agent can run for you", command: `claude plugin marketplace add ${REPOSITORY}\nclaude plugin install ${PLUGIN}@${MARKETPLACE}` },
        { label: "Prefer MCP tools over the plugin? Register the local server instead", command: `claude mcp add --transport stdio material-shape-studio -- npx --yes ${packageSpec}` },
      ],
      note: "The one-line slash command needs Claude Code 2.1.275 or newer.",
    },
    {
      id: "codex", host: "Codex", kind: "Plugin from the marketplace",
      steps: [
        { label: "In a terminal, add the marketplace", command: `codex plugin marketplace add ${REPOSITORY}` },
        { label: "In Codex, open the plugin browser and install Material Shape Studio", command: "/plugins" },
      ],
      note: "Start a new Codex session to load the plugin's skill.",
    },
    {
      id: "cursor", host: "Cursor", kind: "Local MCP server",
      link: { label: "Add to Cursor", href: `cursor://anysphere.cursor-deeplink/mcp/install?name=material-shape-studio&config=${encodeURIComponent(btoa(JSON.stringify(mcpServer)))}` },
      steps: [
        { label: "Or merge this entry into mcpServers in ~/.cursor/mcp.json", command: JSON.stringify({ mcpServers: { "material-shape-studio": mcpServer } }, null, 2) },
      ],
      note: "Keep your existing servers; add this one next to them.",
    },
    {
      id: "cli", host: "Any other agent", kind: "Local CLI, nothing to install",
      steps: [
        { label: "Any agent that can run shell commands uses the CLI through npm", command: verifyCommand },
        { label: "Hosts with stdio MCP can register this command as a server", command: `npx --yes ${packageSpec}` },
      ],
      note: "The CLI has list, create, preview and export commands; the package's npm README documents their options.",
    },
  ];
  return { available, packageSpec, prompt, methods, verifyCommand, text: agentText({ packageSpec, prompt, methods, verifyCommand }) };
}

function agentText({ packageSpec, prompt, methods, verifyCommand }) {
  const indent = (text, by) => text.split("\n").map((line) => by + line).join("\n");
  const method = (m, index) => [
    `${index + 1}. ${m.host}: ${m.kind}`,
    ...(m.link ? [`   ${m.link.label} (install link for the user to open): ${m.link.href}`] : []),
    ...m.steps.map((step) => `   ${step.label}:\n${indent(step.command, "     ")}`),
    `   ${m.note}`,
  ].join("\n");
  return `Material Shape Studio: install instructions for agents

Package: ${packageSpec}
Plugin source: https://github.com/${REPOSITORY}
Runtime: Node.js 24 or newer on the user's machine. Free and local: no account, API key or hosted service.

Rules
- Use the first method below that your host supports.
- Preserve existing settings: merge configuration entries, never replace other entries.
- Your host may ask the user to approve installation or configuration; ask the user when it does.
- Slash commands such as /plugin are typed by the user; you can run the terminal commands yourself.
- No remote endpoint exists. Do not configure one.

Install
${methods.map(method).join("\n\n")}

Verify
${indent(verifyCommand, "  ")}
  It prints JSON describing the Heart shape.

Then
Create and preview variants, give the user editable Studio links, and export the chosen shape.

Prompt a user can paste into their agent
${indent(prompt, "  ")}
`;
}

const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const copyable = (text, label) => `<div class="command"><pre>${escapeHtml(text)}</pre><button type="button" class="small" data-copy aria-label="Copy ${escapeHtml(label)}">Copy</button></div>`;

export function connectionHtml(instructions) {
  if (!instructions.available) {
    return `<section class="connect-card" id="connection-unavailable">
  <h2>Agent tools are not published yet</h2>
  <p>Use the <a href="../">Studio</a> to create and edit shapes, then copy the shape document. This page will list install steps once the package is published.</p>
</section>`;
  }
  const { packageSpec, prompt, methods, verifyCommand } = instructions;
  const tab = (m, i) => `<button type="button" role="tab" id="tab-${m.id}" aria-controls="${m.id}" aria-selected="${i === 0}">${escapeHtml(m.host)}</button>`;
  const panel = (m) => `<article class="host" id="${m.id}" role="tabpanel" aria-labelledby="tab-${m.id}">
    <h3>${escapeHtml(m.host)} <span class="kind">${escapeHtml(m.kind)}</span></h3>
    ${m.link ? `<p><a class="button primary" href="${escapeHtml(m.link.href)}">${escapeHtml(m.link.label)}</a></p>` : ""}
    <ol class="steps">${m.steps.map((s) => `<li><p>${escapeHtml(s.label)}</p>${copyable(s.command, `${m.host} command`)}</li>`).join("")}</ol>
    <p class="note">${escapeHtml(m.note)}</p>
  </article>`;
  return `<section class="connect-intro">
  <h2>Material shape tools for your coding agent</h2>
  <p>Let Claude Code, Codex, Cursor or any agent that runs commands create, preview and export Material 3 Expressive shapes, and hand you editable Studio links.</p>
  <ul class="facts"><li>Free</li><li>Runs on your machine</li><li>Node.js 24 or newer</li><li>No account or API key</li></ul>
</section>
<section class="connect-card" id="ask-agent">
  <h2><span class="step-number">1</span> Quickest: ask your agent</h2>
  <p>Paste this into your agent. It reads the instructions, picks the right install method and asks for your approval.</p>
  ${copyable(prompt, "agent prompt")}
</section>
<section class="connect-card" id="install">
  <h2><span class="step-number">2</span> Or install it yourself</h2>
  <div class="tabs host-tabs" role="tablist" aria-label="Agent host" hidden>${methods.map(tab).join("")}</div>
  ${methods.map(panel).join("\n  ")}
</section>
<section class="connect-card" id="verify">
  <h2><span class="step-number">3</span> Check it works</h2>
  <p>This prints the Heart shape as JSON. Then ask your agent for a shape, for example “a soft, playful badge shape”.</p>
  ${copyable(verifyCommand, "check command")}
  <p class="note">Package <code id="package-spec">${escapeHtml(packageSpec)}</code> · <a href="https://github.com/${REPOSITORY}">Source on GitHub</a></p>
</section>`;
}
