# Agent integration plan

## Current zero-cost slice

The owner replaced the remote-first release with a local CLI, plugin skill, and optional stdio MCP. The remote plan below records completed design work and is no longer the release checklist. No hosted service or public endpoint will be configured for this slice.

- [x] Reuse the shared document, catalogue, exporters, browser codec, preview renderer, and worker limits from the locally completed remote prototype.
- [x] Add stdio MCP with an SDK-client check of the four shape tools.
- [x] Add `shape-studio` CLI for list, create, preview, and export with CLI workflow tests.
- [x] Package a public npm tarball with only runtime files; install it outside the monorepo and verify CLI and MCP without workspace dependencies.
- [x] Add a portable plugin manifest and skill teaching the CLI workflow; validate the Claude-compatible manifest and examples.
- [x] Update the Connect page and machine-readable instructions for a pinned published package; verify unavailable and configured builds at root and subpath.
- [x] Update README, product spec, and MCP documentation. Run full tests, build, browser checks, package smoke, and independent review; fix its findings.
- [x] Merge `main` into the branch, resolving the studio page conflicts with the readable URL state, and rerun the full checks.
- [ ] Publish package and plugin only with an owner-approved publishing identity. Set the website version only after external install succeeds. Report publication and actual client checks separately from local readiness.

## Superseded remote-hosting plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Implementation is native in the current chat. An independent review is required at each completed slice; reviewer availability must be established before implementation rather than replaced with self-grading.

**Goal:** Let another developer connect an agent through the Studio website, generate and inspect shapes, refine them, and export matching code without installing a local server.

**Architecture:** Share document/catalogue/export logic between the static Studio and a separate Node MCP service. Carry complete documents between operations and in browser links. Serve bounded image generation from isolated workers; keep the public connection unavailable until a working endpoint is configured.

**Tech stack:** Existing Kotlin/JS engine, TypeScript, Node 24 or newer, Vite, Vitest, official MCP TypeScript SDK, an established SVG-to-PNG renderer, and Playwright for browser checks. Prefer `@resvg/resvg-js` for the Node renderer after verifying its supported Node/platform versions. Pin selected dependency versions in the lockfile.

**Spec:** [Approved MCP specification](../mcp-spec.md).

**Acceptance:** [Draft criteria](../../../../.claude/projects/-Users-dmitrijmaksimov-Projects-material-shape-studio/acceptance/public-mcp.md). The canonical file is `/Users/dmitrijmaksimov/.claude/projects/-Users-dmitrijmaksimov-Projects-material-shape-studio/acceptance/public-mcp.md`.

## Global constraints

- Remote connection is the first release; users do not run a local MCP package.
- Keep GitHub Pages for the website; hosting identity, billing, hostname, and publishing require the owner's decision.
- No accounts, payment, live collaboration, arbitrary HTML/URL rendering, whole-screen prototypes, morph animations, or embedded LLM.
- Preserve the current focused-canvas work. The observed starting checkout is `feature/focused-canvas` at `74ce6ab`; recheck before execution because another session owns those commits.
- Reuse the current engine and exporter behavior. The main spec's future engine catalogue APIs are not implemented and cannot be assumed.
- `ShapeDocument` remains the source of truth. Use `#doc=base64url(deflate-raw(JSON))`; validate compressed and inflated size before accepting external input.
- No source-only assertion may pass a runtime acceptance check. Local readiness and public release are separate results.
- Keep this plan under `docs/wip` until delivery; archive it according to repository practice after shipping. Keep the design spec.

## Review focus

1. Imported custom documents currently have no catalogue identity: edits, reset, and exports must never substitute a catalogue shape. Task 2 tests this.
2. A short compressed link can expand into excessive work: enforce inflated bytes and effective vertices before geometry construction. Tasks 1–3 test this.
3. A timeout cannot interrupt synchronous geometry/raster work on the main event loop: terminate a worker and prove the next request succeeds. Task 3 tests this.
4. Root/subpath hosting and fragments can break agent onboarding or shape restoration without failing unit tests. Tasks 2 and 4 exercise real built sites at both prefixes.
5. A host may accept MCP tools without showing images or allowing configuration changes: links remain available and actual client connection claims require manual evidence. Tasks 3–5 cover this.

## Execution preparation

- [ ] Recheck HEAD, working changes, repository instructions, and `origin/main..HEAD`. Use the worktree skill to isolate implementation from the current focused-canvas branch. Reuse a suitable attached worktree where possible; keep the approved spec, plan, and research in the implementation checkout.
- [ ] Freeze the separately stored acceptance list after plan/criteria review. Record the exact starting commit and establish an independent reviewer using available review tooling. Do not silently treat self-review as independent evidence.
- [ ] Run the existing engine build, `npm ci`, `npm test`, and `npm run build` before changing behavior. Capture baseline failures without altering unrelated user work.
- [ ] Verify current MCP SDK client/server imports and renderer APIs from their official documentation and installed package declarations. Run a minimal HTTP connection probe in scratch before choosing a protocol release; retain only the tested integration in product code.

Commands below assume the implementation checkout as the working directory. Run long-output commands through context-mode. Engine evidence builds disable the build cache. No remote branch is pushed or merged by this plan without the applicable publishing instruction.

## Task 1 — shared document, catalogue, export, and link primitives

**Deliverable:** Both website and future service can consume the same tested shape operations without browser globals.

**Files:** Create `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/index.ts`, `packages/core/src/limits.ts`, `packages/core/src/share.ts`, and corresponding `packages/core/test/*.test.ts`. Move `web/src/document.ts`, `web/src/catalogue/`, and pure modules in `web/src/export/` to `packages/core/src/`; move pure exporter tests with them. Keep the Kotlin round-trip test in `web/src/export/round-trip.test.ts` to preserve its editor fixture dependencies. Update `web/scripts/generate-catalogue.mjs` output, workspace manifests, imports, and CI package ordering.

**Interfaces:** Export the existing `ShapeDocument`, catalogue constants, `kotlinExpression`, `kotlinFile`, `svgPath`, `svgFile`, and `cssRule` signatures unchanged. Add:

```ts
type ShapePresentation = {
  colour: string;
  theme: "light" | "dark";
  context: "photo" | "button" | "avatar";
};
type SharedShape = { document: ShapeDocument; presentation: ShapePresentation };
function encodeShare(value: SharedShape): Promise<string>;
function decodeShare(fragment: string): Promise<SharedShape>;
function assertDocumentBudget(value: unknown): void;
```

`encodeShare` returns the fragment beginning with `#doc=`. The codec uses browser-compatible streams rather than Node-only compression, bounds decompression while reading, validates presentation fields, and never reads `location`. Document semantic validation still calls the engine. The geometry stays in the existing document payload, with validated presentation fields alongside it.

- [ ] Write `share.test.ts` and `limits.test.ts` first. Use at-limit and over-limit inputs based on exported configuration values, plus every catalogue document as known-valid controls. Pin transform ordering and optional defaults through round trips.

```ts
it("round trips a custom shape without normalizing it", async () => {
  const value: SharedShape = {
    document: { v: 1, shape: { kind: "ngon", vertices: 5 },
      transforms: [{ type: "translate", x: 2, y: 0 }] },
    presentation: { colour: "#6750a4", theme: "dark", context: "avatar" },
  };
  expect(await decodeShare(await encodeShare(value))).toEqual(value);
});
```

- [ ] Run the new focused tests and confirm their initial failure is missing behavior, not an unrelated environment error.
- [ ] Move existing modules without changing their algorithms. Update all consumers, generator paths and workspace exports. Implement the codec and budget check with field-specific errors. Budget repeated/mirrored polygons and constructor-generated vertices before expansion; limit serialized features and validate their resulting finite cubics inside the bounded worker later.
- [ ] Run core tests, engine fixture tests, web tests, the Kotlin expression round-trip check, and the website build. Search tracked imports to confirm there is one exporter implementation and one generated catalogue, with known valid import matches as controls.
- [ ] Document the shared package and link format in `README.md` and `docs/spec.md`; independently review and commit this slice.

## Task 2 — restore, edit, and return agent-generated shapes

**Deliverable:** Links reopen actual editable geometry and manual changes can return to an agent.

**Files:** Modify `web/src/studio/editor.ts`, `web/src/studio/page.ts`, their existing tests, `web/src/main.ts`, and `web/index.html`. Create `web/src/studio/share.ts`, `web/e2e/share.spec.ts`, `web/e2e/studio.spec.ts`, and `web/playwright.config.ts`. Use the current styles for controls and notices.

**Interfaces:** Add `fromDocument(doc: ShapeDocument): EditorState`. Make catalogue identity explicitly nullable and retain an immutable baseline document for reset/isEdited. Existing `pick(name)` delegates to the same initializer with the selected catalogue baseline. Add `loadSharedShape(page: Document): Promise<SharedShape | null>` at the browser boundary; only that module accesses the fragment.

- [ ] Add editor tests for custom `ngon`, polygon/repeat, and serialized-feature documents. Editable controls apply where supported; all imported shapes retain transform controls, export, and document copy. Test reset against the imported baseline and undo/redo after an edit. Do not fabricate vertex handles for serialized features.

```ts
it("keeps an imported shape independent of the catalogue", () => {
  const doc: ShapeDocument = { v: 1, shape: { kind: "ngon", vertices: 7 } };
  const state = fromDocument(doc);
  expect(state.doc).toEqual(doc);
  expect(state.name).toBeNull();
  expect(isEdited(state)).toBe(false);
});
```

- [ ] Run the focused editor tests to confirm the unsupported import behavior fails.
- [ ] Implement initialization and page restoration after bounded decode and engine validation. Add a dismissible error, copy-document action, and explicit out-of-unit-square warning. Ensure the fragment cannot overwrite an edit made while asynchronous decoding was still pending. Handle hash navigation with the same validation boundary.
- [ ] Add Playwright coverage against the built app at `/` and `/material-shape-studio/`: restore exact document, edit, copy JSON, reset, malformed/oversized input, and rapid fragment changes. Expose no test-only product API; assert clipboard/document output and recompute geometry in the test process. Add the browser test script and CI browser setup.
- [ ] Run the existing selection/slider/drag/history/export cases, including focused-canvas scroll and circle controls. Verify usable recovery after each rejected link.
- [ ] Update sharing/import behavior in `docs/spec.md` and user instructions in `README.md`; independently review and commit this slice.

## Task 3 — remote tools, bounded rendering, and HTTP service

**Deliverable:** A locally runnable remote MCP endpoint completes all four operations through an SDK client over HTTP.

**Files:** Create `server/package.json`, `server/tsconfig.json`, `server/src/{config,schemas,tools,http,index,worker,preview}.ts`, and `server/test/{tools,http,worker,preview}.test.ts`. Add shared preview framing/templates to `packages/core/src/preview.ts` and consume them in the current website's in-use preview where needed to prevent geometry drift.

**Interfaces:** `createHttpServer(config)` returns a Node HTTP server for tests or `index.ts` to listen on. `registerShapeTools(server, service)` registers the four approved tools. `runShapeJob(request, signal)` sends a complete document operation to an isolated worker and returns structured output. Expose no arbitrary module names or worker code through tool arguments.

```ts
type ShapeJob =
  | { kind: "create"; document: ShapeDocument }
  | { kind: "preview"; shapes: SharedShape[] }
  | { kind: "export"; shape: SharedShape; target: "compose" | "svg" | "css" };
type CreatedShape = {
  document: ShapeDocument;
  bounds: [number, number, number, number];
  engineVersion: string;
  warnings: string[];
  studioUrl: string;
};
```

Runtime schema validation accepts either a catalogue name or document for create; normalize that choice before constructing `ShapeJob`. `list_shapes` includes a discoverable parameter schema and bounded optional name filter. Preview input carries labels; validate/escape labels before generating SVG. The SVG renderer consumes only generated templates and geometry.

- [ ] Add SDK-client tests against a real ephemeral listening server. Include connection, tools listing, a filtered catalogue request, custom shape creation, PNG comparison, and export of the returned document. Keep client transport calls in one test helper using the selected SDK's verified APIs.

```ts
it("exports the exact returned document without server state", async () => {
  const created = await client.callTool({ name: "create_shape", arguments: {
    document: { v: 1, shape: { kind: "ngon", vertices: 7 } },
  } });
  const value = created.structuredContent as CreatedShape;
  const exported = await client.callTool({ name: "export_shape", arguments: {
    document: value.document, colour: "#6750a4", target: "svg",
  } });
  expect(exported.isError).not.toBe(true);
  expect(exported.structuredContent).toMatchObject({ mediaType: "image/svg+xml" });
});
```

- [ ] Confirm tests fail before handlers exist. Then implement schemas, deterministic operations, structured/text/image results, and errors. Build geometry only after byte/complexity checks; omit raw cubic arrays from normal model-facing output. Unknown catalogue names and unknown fields must not silently change a document.
- [ ] Implement shared framing and fixed photo/button/avatar templates. Use the existing synthetic landscape and avatar initials rather than adding remote assets. Rasterize PNG with the selected renderer; provide a stable font or deterministic vector initials so the Linux container matches local previews. Return a link per preview even when the client does not display images.
- [ ] Run geometry/raster work outside the HTTP event loop. Bound workers and queue; terminate a worker on execution deadline or cancellation and release its slot. Add a test worker fixture that intentionally stalls: deadline must end it and the next normal request must succeed. Do not implement a timeout as only `Promise.race` around synchronous work.
- [ ] Enforce request bytes before body parsing; document/expanded-shape/pixel limits before allocation; allowed hosts/origins; and a conservative per-instance throttle. Default proxy trust to off. Test forged forwarded headers, an absent-Origin native client, and allowed browser origins. The selected ingress provides release-level throttling in Task 5.
- [ ] Assert operational logs include outcome/request identifiers but never sentinel labels, JSON or fragments. Test hostile labels, invalid second comparison item, overflow/degenerate geometry, and recovery after rejection.
- [ ] Run SDK tests, image decode tests, existing fixture parity and compiled Kotlin round trips. Inspect light/dark image comparisons visually. Deliberately disable a tested bound and corrupt an export comparison; capture failing results, restore, and rerun those checks.
- [ ] Document the four tools, limits configuration, error behavior and local service use in `docs/mcp.md`. Independently review and commit this slice.

## Task 4 — website-led connection instructions

**Deliverable:** A user can give the website to an agent and find accurate connection instructions or an honest unavailable state.

**Files:** Create `web/connect/index.html`, `web/src/connect.ts`, `web/scripts/connection-config.mjs`, and `web/e2e/connect.spec.ts`. Modify `web/vite.config.ts` for a multipage build, package scripts, `web/index.html` navigation, and `.github/workflows/deploy.yml` for the endpoint setting. Generate `connect/agent.txt` into the build; do not commit duplicated endpoint strings.

**Interface:** `connectionInstructions(endpoint: string | undefined)` produces `{ available, endpoint, prompt, text }`. Accept only a valid public HTTPS URL without credentials or fragment in production. Unset/invalid configuration emits unavailable content, never a placeholder install command. Tests may use a reserved HTTPS example hostname solely as test input, never a live site configuration.

- [ ] Add build/browser tests for absent, invalid, and configured endpoint settings. Verify root and subpath URLs and that the text artifact and visible page contain the identical endpoint.

```ts
it("does not produce install commands without an endpoint", () => {
  const instructions = connectionInstructions(undefined);
  expect(instructions.available).toBe(false);
  expect(instructions.prompt).toBe("");
  expect(instructions.text).toContain("unavailable");
});
```

- [ ] Run failing tests. Implement the static page, plain-text discovery link, endpoint copy, setup-prompt copy, and navigation. The homepage links to the instructions in rendered HTML so a text-fetching agent can discover them without executing the editor.
- [ ] Verify current official setup steps for Claude Code and Cursor. Generate the HTTP endpoint command/config from the validated setting and explain host approval requirements. Instructions merge a named server entry rather than replacing unrelated client configuration. No scripts modifying a user's machine run merely by visiting the website.
- [ ] Run connection and ordinary Studio browser suites at both serving prefixes. Check keyboard navigation, copy success/failure messages, and narrow-screen layout.
- [ ] Update `README.md`, `docs/spec.md`, and `docs/mcp.md` with the remote service scope and honest installation limitations. Independently review and commit this slice.

## Task 5 — deployable artifact and public-release evidence

**Deliverable:** A tested runtime container and release procedure; actual public availability follows only when the owner supplies hosting and authorizes publication.

**Files:** Create `server/Dockerfile`, `.dockerignore`, `server/test/container-smoke.mjs`, `server/scripts/probe.mjs`, and `docs/mcp-deployment.md`. Update `.github/workflows/ci.yml` to build/check core, server, browser tests and runtime artifact. Add provider-specific configuration only after the host is chosen.

**Interfaces:** The runtime listens on configured `PORT`, exposes `/healthz` and `/mcp`, and uses configured `STUDIO_URL`, allowed hosts/origins, explicit proxy trust, and resource limits. `probe.mjs` receives the complete MCP URL as an argument and uses a fresh SDK client to call all four tools. It never changes agent configuration or publishes artifacts.

- [ ] Write the external probe and container smoke script first. A probe of an unreachable URL must fail nonzero; a healthy service is the positive control. Decode its PNG response and verify the linked document can be decoded rather than accepting a tools-list-only response.
- [ ] Build the engine and TypeScript in a builder stage; copy only built packages, production dependencies and renderer assets into the runtime. Use the existing Node major, a non-root runtime user, and no JDK or LLM secrets. Confirm native renderer support inside the container rather than copying macOS dependencies.
- [ ] Run the container smoke against its mapped port. Verify health, workflow, limits, graceful termination, and that runtime logs contain no documents. CI builds from a clean checkout and fails if engine output is missing.
- [ ] Write exact deployment, ingress limits, proxy trust, health, smoke, and rollback steps for the chosen host. Before a host is chosen, document only portable container requirements; mark production release pending.
- [ ] With owner-approved hosting, publish the service and run the SDK probe from outside that host. Verify ingress rate-limit behavior and spoofed-forwarded-header rejection for the actual proxy configuration.
- [ ] Use clean scoped Claude Code and Cursor configurations to connect using only the website's candidate instructions. Record version, setup steps, required user approvals, preview display/fallback, and a successful create–refine–export task. If either client/account is unavailable, retain NO EVIDENCE and report that specific release limitation.
- [ ] Enable the website's public endpoint only after the external check succeeds; deploy the site with approval and repeat the probe using the exact URL advertised by the published page. Confirm rollback to the previous service revision and the ability to disable advertising an unavailable endpoint.
- [ ] Run the acceptance gate against the frozen list and exact revision. Report local, container, client, and deployment evidence separately. Keep provider-dependent criteria pending if publishing is not authorized; do not mark the whole feature released.

## Self-review and handoff

Every approved-spec section maps to the tasks above: shared code (1), editing/sharing (2), tools/previews/service boundaries (3), onboarding (4), and verification/operations/publication (5). The five review risks each have an owning task and a concrete test. Numerical limits belong in tested configuration; the implementation must define them before enabling public access.

This plan awaits review before product implementation under the writing-plans workflow. Native execution is the recommendation because the tasks share document, preview, and transport interfaces; implementation remains in this chat. Hosting selection and publication remain separate owner decisions, and need not block local preparation after plan approval.

## Primary references

- [MCP SDK](https://ts.sdk.modelcontextprotocol.io/v2/) and [Express adapter](https://ts.sdk.modelcontextprotocol.io/v2/serving/express.html).
- [resvg-js](https://github.com/thx/resvg-js): maintained SVG renderer; verify selected package/runtime during Task 3.
- [Claude Code MCP](https://code.claude.com/docs/en/mcp) and [Cursor MCP](https://cursor.com/docs/context/mcp): verify exact current instructions before generating onboarding content.
