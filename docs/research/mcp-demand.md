# MCP for Material Shape Studio: demand and feasibility

Research snapshot: 3 October 2026. This is a research recommendation, not an approved implementation plan or a change to the product specification.

## Recommendation

**Build a small experimental agent integration if the aim is to make this existing tool more useful. Do not yet invest in a standalone hosted shape-generation business or a general prototype builder.**

There is credible demand for agents that participate in visual design, and unusually relevant interest in Material Expressive prototyping. There is weaker evidence for a dedicated shape-only MCP, and this research does not establish willingness to pay for one.

The useful proposition is: **“Ask your coding agent for Material-correct shape variants, compare them visually in real UI contexts, refine the chosen variant, and get matching implementation code.”** MCP is a connection mechanism for that workflow, not the customer benefit by itself.

## Evidence of actual demand

| Evidence | Observation | What it supports | Limitation |
| --- | --- | --- | --- |
| Figma's reported MCP usage | Q1 2026 MCP weekly active users grew fivefold quarter over quarter. | People actually use an agent-to-design connection; this is stronger than launch announcements. | Figma does not give an absolute MCP user count here. Its quarterly calculation uses the peak week, not average weekly usage. It covers broad design workflows. |
| M3E Canvas | Direct GitHub API check returned 8,599 stars and 901 forks. The project creates Material 3 Expressive screen prototypes and exports prompts for coding agents. | A close audience match: Material developers want visual work to carry into agent-assisted implementation. | Repository attention is not active usage or revenue. Whole-screen prototyping is a larger job than custom shapes, and prompt export is not MCP adoption. |
| Official Excalidraw MCP | Direct GitHub API check returned 5,439 stars and 513 forks. | Interest in agents producing visual artifacts through MCP. | These are cumulative repository metrics, not installations, retention, or customers. Diagramming differs from UI geometry. |
| Shape-specific requests | An indexed r/MaterialDesign post asks for Expressive SVG assets for a React app; an r/FlutterDev author describes creating a package because using the new shapes was difficult. | Concrete discoverability and cross-platform export friction. | Anecdotal and older. Full threads could not be retrieved; only search excerpts were available. The second is an author's promotional claim. Neither asks specifically for MCP. |
| Paper | Its official documentation supports agents reading and writing visual designs through MCP. | This interaction model is already a real product category. | Product availability proves supply, not customer demand or market size. |

Sources: [Figma Q1 results and metric definitions](https://investor.figma.com/news-events/news/news-details/2026/Figma-Announces-First-Quarter-2026-Financial-Results/default.aspx), [M3E Canvas](https://github.com/lnkiai/m3e-canvas), [M3E Canvas API snapshot endpoint](https://api.github.com/repos/lnkiai/m3e-canvas), [Excalidraw MCP](https://github.com/excalidraw/excalidraw-mcp), [Excalidraw MCP API snapshot endpoint](https://api.github.com/repos/excalidraw/excalidraw-mcp), [Material SVG request](https://www.reddit.com/r/MaterialDesign/comments/1kwuqpq/), [Flutter shape-package post](https://www.reddit.com/r/FlutterDev/comments/1o2u6wz/), [Paper MCP documentation](https://paper.design/docs/mcp).

For recency, Figma's August Q2 release also reports that over half of paid customers with more than $10,000 ARR used its first-party Figma agent weekly as of July 31. That supports the broader direction but is a **different product and denominator** from external MCP usage; it must not be treated as an updated MCP adoption figure. [Figma Q2 results](https://investor.figma.com/news-events/news/news-details/2026/Figma-Announces-Second-Quarter-2026-Financial-Results/default.aspx).

My interpretation:

- **Broad visual-agent workflow:** credible demand.
- **Material Expressive design-to-code workflow:** promising adjacent demand.
- **Shape-only agent tool:** plausible niche, insufficient direct validation.
- **Paid hosted shape-only service:** not validated by these sources.

This was public desk research, not a customer study. It includes primary product documentation, reported usage, direct repository metrics, and limited community excerpts. No customer interviews, site usage analytics, search-volume dataset, conversion experiment, or willingness-to-pay study was available. Counts are a dated snapshot; the linked API endpoints will change. No claim of “no competitors” or a quantified addressable market is justified.

## Who would benefit

The strongest initial audience is an Android/Compose developer already using a coding agent and implementing an expressive avatar, image mask, badge, or icon button. The frustrating work is choosing and tuning geometry, inspecting it at actual sizes, and keeping the preview consistent with the code.

A secondary audience is a web developer wanting Material-like SVG/CSS output. This audience has more substitutes: an agent can already write ordinary SVG or CSS. Exact Material geometry and editable, reproducible output must be visibly better to justify another integration.

Designers building full application flows are a less suitable first audience. M3E Canvas, Paper, and Figma cover much broader canvas and prototype needs. Competing with them would expand this project's scope substantially. [M3E Canvas](https://github.com/lnkiai/m3e-canvas), [Paper](https://paper.design/docs/mcp), [Figma Q2 product announcements](https://investor.figma.com/news-events/news/news-details/2026/Figma-Announces-Second-Quarter-2026-Financial-Results/default.aspx).

## The workflow worth testing

Example request:

> Create four soft, six-lobed shapes for a profile avatar. Show each at small and large sizes on light and dark backgrounds. Make the second less rounded, then give me the Compose implementation.

Proposed sequence:

1. The agent discovers the available shape vocabulary and valid parameter ranges.
2. It requests a bounded batch of variants using structured parameters.
3. The engine creates validated documents and exact geometry.
4. The developer sees a comparison and can open any variant in the Studio.
5. A refinement produces a new document revision and preview.
6. Export uses the chosen revision, so the code matches the approved shape.

Here, “prototype” initially means a shape shown in the existing photo, icon-button, and avatar contexts. A later press-state morph demo is a natural extension. Multi-screen navigation, arbitrary layouts, and complete app generation are a separate product decision.

The differentiator is repeatable geometry and a useful visual decision loop. Asking an LLM to invent a raw SVG path is already easy. Google's shape APIs provide rounded polygons and morphing; the project can expose those capabilities without asking the model to approximate their mathematics. [Android shape documentation](https://developer.android.com/develop/ui/compose/graphics/draw/shapes).

## Fit with the current project

Reviewed the README, specification, decomposition, indexed architecture, and current source files. Baseline was local `main` at `e353f38`, with existing uncommitted UI changes. This is a source assessment, not a fresh build or verification of the deployed website.

Useful foundations already present:

- A Kotlin/JS geometry engine behind JSON and numeric interfaces.
- `build`, `buildCubics`, `createMorph`, `morphCubics`, `morphBounds`, and `releaseMorph` in the JS façade.
- A shape catalogue and document model used by the web application.
- Compose, SVG, and CSS exporter modules.
- Photo, icon-button, and avatar previews in the Studio.

Work still needed for the proposed integration:

- A small agent-facing adapter with input schemas, validation errors, and tool descriptions.
- Reusable access to the catalogue and exporters outside the page's DOM code.
- Preview links that restore a supplied document. The spec defines `#doc=` compression, but this should be treated as unfinished: the current tracked web/JS façade source search contained no `location.hash` or `CompressionStream` occurrences, while the same search successfully found the existing `createMorph` and `renderInUse` symbols. The decomposition also places sharing in S5.
- Server-side image rendering if the MCP returns PNG previews: today's PNG export uses a browser canvas. Returning SVG text alone does not guarantee that every agent host displays an image.
- A user-edit round trip. A generated link transfers the initial document; it does not automatically send subsequent browser edits back to the agent. An initial version can provide explicit document copy/export. Live synchronization requires additional design.

The specification currently excludes servers, accounts, telemetry, and component/theme building. An MCP process extends that scope and should be documented explicitly before implementation. The static website itself can remain unchanged in hosting model.

Local references: [specification](../spec.md), [decomposition](../decomposition.md), [README](../../README.md), [engine façade](../../engine/src/jsMain/kotlin/io/github/kartollikaa/shapestudio/engine/Facade.kt), [preview page](../../web/src/studio/page.ts), [Compose exporter](../../web/src/export/kotlin.ts).

## How to add MCP

Use the existing engine as the common implementation for the website and agent tools:

```text
Coding agent → small MCP adapter → validated ShapeDocument → existing engine/exporters
                                         ↓
                              preview + editable Studio link
                                         ↓
                              developer chooses a revision
                                         ↓
                                  matching source code
```

Proposed initial tools, not existing APIs:

| Tool | Input | Result |
| --- | --- | --- |
| `list_shapes` | Optional category/filter | Catalogue entries and supported parameter descriptions |
| `create_shape` | Preset or validated document, optional bounded variants | Canonical documents, identifiers, validation feedback |
| `preview_shapes` | Documents, size/theme/context | Comparison image where supported, plus editable links |
| `export_shape` | Exact document revision and target | Compose, SVG, or CSS text |

Keep natural-language reasoning in the connected agent. The MCP server should execute deterministic operations; it does not need its own LLM or model subscription. Return readable validation errors, engine version, and the canonical document. Avoid sending large cubic arrays into model context unless explicitly requested.

**First delivery: local stdio MCP.** Package the compiled engine with a Node adapter so users do not need a Kotlin build toolchain. The agent launches the process. The website continues on GitHub Pages; the adapter returns a preview image and/or document link. Reuse the official TypeScript SDK and verify the selected release against the actual target clients. The current v2 SDK documents the 2026-07-28 specification, while many examples still describe v1; do not mix their lifecycle/session assumptions. [Official TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/).

**Later delivery: remote Streamable HTTP.** This serves users whose agent runs remotely or who need URL-only connection. It needs a separate compute host: GitHub Pages serves static assets and cannot execute the MCP endpoint. Start with stateless document-in/result-out operations where possible; authentication, quotas, and persistence depend on the chosen audience and host requirements. [GitHub Pages hosting model](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [official transport specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports).

**Optional display layer: MCP Apps.** This extension can show interactive HTML inside compatible agent hosts. It could offer a shape grid, controls, and a morph scrubber directly in the conversation. Support is negotiated; ordinary MCP connectivity does not guarantee inline UI. Always preserve a useful image/text/link fallback. [MCP Apps overview](https://apps.extensions.modelcontextprotocol.io/api/documents/overview.html).

A local pilot should bound document complexity, variant count, and image size; release morph handles after use; and render trusted templates rather than arbitrary agent-supplied HTML. Those are practical implementation requirements for this tool, not reasons to build a large security platform.

## Alternatives and tradeoffs

| Approach | Best use | Tradeoff |
| --- | --- | --- |
| Skill/documentation plus JSON or CLI | Cheapest experiment with coding agents | File/process access needed; discoverability and previews vary by host |
| Local MCP plus browser preview | Recommended functional pilot | Requires installing a local package; remote agents cannot necessarily reach it |
| Remote MCP | Easy connection from hosted agents | Adds ongoing hosting and operations |
| MCP Apps | Rich in-conversation controls | Additional UI surface and host compatibility testing |
| Browser automation of the existing editor | Immediate manual demonstration | More fragile and less deterministic than calling the engine |

MCP should earn its place through easier connection or a better feedback loop. M3E Canvas demonstrates that prompt handoff alone can attract interest; the first demand test does not require a remote MCP service.

## Validation before a larger investment

These are proposed experiment thresholds, not observed market benchmarks.

Recruit 8–12 developers actively implementing Material/Compose UI. Use their real tasks. Compare their current workflow with the proposed generate–preview–refine–export loop, recording setup time separately from design time. A lightweight manual demonstration can precede the MCP pilot.

Record one row per participant/task: existing workflow, setup success, time to an accepted shape, refinements, whether exported code works in their project, and whether they voluntarily use it again. Do not treat tool-call volume as success; retries can inflate it.

A reasonable signal to continue is:

- At least five participants use an exported shape in a real project.
- At least three return for another task within two weeks without prompting.
- The median end-to-end task is materially faster than their baseline; preselect a target such as 30% and retain the individual measurements.
- Most can connect without live assistance, and visual/code mismatches are rare enough to investigate individually.

If developers value previews but avoid installing MCP, prioritize sharing and the editor. If they export once and do not return, keep it a small free utility. If users repeatedly request full-screen prototypes, evaluate an integration with an existing canvas tool before expanding into that market. Hosted-service investment needs evidence that remote access solves a recurring problem; paid plans need actual purchase commitments.

The present evidence justifies **a bounded experiment around accurate shapes, visual review, and matching code**. It does not yet justify a broad platform roadmap.
