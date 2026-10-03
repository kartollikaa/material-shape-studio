# Public MCP integration

Approved extension to [the product specification](spec.md). It supersedes the local-first recommendation in [the research](research/mcp-demand.md) for this feature only. Implementation and public deployment are separate milestones.

## Outcome

A developer gives the Studio website address to a compatible coding agent. The agent reads the connection instructions, registers the public remote MCP endpoint where its host permits configuration, and can browse, create, preview, and export shapes. The developer does not install a local server, Node, or a Kotlin toolchain.

Automatic registration depends on the agent host. The website must explain when the user needs to approve a connection or add its URL manually. Connection instructions cannot promise universal automatic installation.

The first release covers shapes in the existing photo, icon-button, and avatar preview contexts. Full application screens, navigation prototypes, live collaborative editing, accounts, paid plans, and an embedded LLM are outside this release. Interactive MCP Apps controls and press-state morphing remain later additions. These exclusions preserve the scope discussed with the owner.

## Approach

Keep the Studio on GitHub Pages and add a separate Node service exposing Streamable HTTP at `/mcp`. Use the official MCP SDK, with its release and protocol compatibility verified against the chosen clients during implementation. The service runs the existing compiled Kotlin/JS engine; it does not reproduce geometry in TypeScript or ask another model to generate paths.

The service is stateless at the application level: each operation receives the complete shape document and returns a result. There are no server-side shape IDs that expire or leak between users. Preview and export operate on the same returned document. Protocol-specific connection state, if required for a supported client, is distinct from saved user documents.

Three approaches were considered:

- A hosted Node service fits the engine's existing Node tests and permits an established SVG-to-PNG renderer. This is the recommendation.
- An edge Worker could host a thin adapter, but renderer and Kotlin/JS runtime compatibility would require additional validation.
- A local MCP package would avoid hosting but does not meet the approved onboarding requirement.

The hosting account, billing owner, public hostname, and release approval are owner decisions. Until they are supplied, implementation can target a portable container and environment configuration; it must not advertise an invented or nonfunctional production endpoint.

## Shared implementation

Move the document types, catalogue access, and pure exporters needed by both consumers into one shared workspace package. Keep the geometry engine package as it is. Update website imports and retain existing exporter tests and Kotlin round-trip coverage; avoid maintaining a second exporter or catalogue in the server.

Catalogue shortcuts resolve through the actual generated catalogue. The current JavaScript engine façade must not be assumed to implement the catalogue APIs described as future work in the main spec.

Add a server workspace for transport, tool definitions, request limits, rendering, and operational configuration. The website keeps its current editing model and focused canvas layout. Connection help is a separate page reached through a small navigation link.

## Tools

| Tool | Request | Observable result |
| --- | --- | --- |
| `list_shapes` | Optional name filter | Matching catalogue names, editable documents, and supported shape vocabulary |
| `create_shape` | A catalogue name or complete shape document | Validated document, bounds, engine version, export warnings, and an editable Studio link |
| `preview_shapes` | A bounded list of documents, colour, theme, and preview context | A labelled comparison PNG plus a Studio link for each item |
| `export_shape` | A complete document, colour, and Compose/SVG/CSS target | The generated source text, media type, and a suggested filename |

The connected agent reasons about the prompt and creates the parameter variants. The service performs deterministic operations. Input schemas expose shape parameters rather than an opaque string wherever practical, and engine validation remains authoritative for geometry semantics.

A create/refine operation returns the full document, which the agent passes to preview and export. Do not use positional references such as “the last shape” as server state. Ordinary tool responses contain concise metadata and structured documents rather than large cubic arrays.

Invalid input produces a field-specific tool error. Transport errors remain protocol errors. A failed item makes a comparison request fail with its item index; no silent partial success. Names and labels are data and are escaped before rendering.

## Visual review and editing

The tool returns a standard MCP image result for hosts that display images. The browser link is always present and is the fallback when images are not rendered. No dependency on MCP Apps support is required.

The PNG comparison uses the engine's exact cubics, the same geometry framing as the Studio, and fixed trusted preview templates. Photo and avatar examples use bundled assets, not agent-supplied remote URLs. The service never fetches arbitrary image URLs or renders arbitrary HTML.

Links use the existing specified shape-document codec: `#doc=` contains base64url-encoded deflate-raw JSON. Colour and preview presentation may be separate validated fragment fields; they do not alter the geometry document. The website loads and validates the document before replacing the default shape. Malformed or excessive input retains a usable default editor and shows a dismissible explanation.

Custom documents arriving from MCP must be editable without falsely identifying them as unchanged catalogue entries. Imported geometry outside the unit square gets the export warning required by the main spec; it is not silently normalized into a different document.

The Studio offers a copyable shape document after manual edits. The user can give that document back to the agent for further work. A fragment is not sent to the web server, so an agent cannot recover browser edits merely by fetching the page URL. Live browser-to-agent synchronization is outside this release and must not be implied by the UI.

## Connection page

Provide a static `connect/` page and a plain-text machine-readable instruction file linked from it. Both work under the repository subpath and a domain root. One validated deployment setting supplies the endpoint to every generated instruction.

The page contains the public endpoint, a copyable “connect this MCP” prompt, and client-specific setup steps verified against current official documentation. The prompt tells the agent to use its normal host-supported configuration path and report any required user action; it does not ask for global permissions or unrelated configuration changes.

Without a production endpoint configured, the page shows setup as unavailable and does not generate install commands. Enabling public connection requires a successful external connection check against the deployed endpoint.

## Service boundaries

The initial public service requires no Studio account. Enforce configured limits on request bytes, decompressed documents, effective vertex count after repetition, transform count, comparison count, rendered pixels, execution time, and concurrent renders. Limits live in configuration with boundary tests rather than duplicated numerical constants in documentation.

Apply rate limiting at the public ingress. Proxy trust must match the selected host so a client cannot bypass limits by forging forwarded address headers. Document whether enforcement is per instance or shared; do not describe an in-memory counter as a global quota.

Configure accepted hostnames and browser origins explicitly while allowing legitimate non-browser MCP clients. Logs capture request outcomes and operational failures without storing shape documents. The geometry service has no arbitrary file-write, shell, or outbound-fetch tools.

The deployed artifact includes the built engine and renderer. Kotlin compilation happens at build time. The runtime requires neither a JDK nor an LLM key. Include health checks and a rollback procedure before publishing.

## Verification and release

Freeze numbered acceptance criteria separately before product code changes. They must cover external connection, the four tools, image previews, share-link restoration, manual edit return, export fidelity, rejected invalid input, limit boundaries, and the existing editor interactions.

Use an independent SDK client against the actual HTTP service, not just direct handler calls. Verify an ordinary request succeeds after each rejected-input case. Deliberately break a limit and an export-fidelity assertion to show their guards detect the fault, then restore the correct implementation.

Verify image output visually and compare generated geometry against the existing engine fixtures. Retain the compiled Kotlin expression round trip, making clear that it does not compile the entire Compose UI wrapper. Test share links in a browser at both a root and a repository subpath, including invalid and oversized fragments.

For onboarding, perform a clean connection in at least two selected agent clients using only the website instructions. Record the actual client versions and user approvals required. A protocol test alone cannot prove that an agent can install its connection automatically.

The feature is locally verified only after these local checks pass. It is publicly available only after the approved host runs the service, an external client can use it, and the website advertises that working endpoint. Release reporting must distinguish these states.

## Sources and existing contracts

- [Product specification](spec.md): shape documents, URL codec, export fidelity, and website hosting.
- [Research](research/mcp-demand.md): demand evidence and initial tradeoffs; the owner's remote-first requirement supersedes its delivery recommendation.
- [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/): official SDK entry point.
- [Official Express integration](https://ts.sdk.modelcontextprotocol.io/v2/serving/express.html): HTTP serving and host/origin configuration.
- [MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/documents/overview.html): optional interactive display enhancement, deferred here.
