# Material Shape Studio — PR Decomposition Map

- **Created:** 2026-09-28
- **Epic reference:** [spec.md](./spec.md), [research/feasibility.md](./research/feasibility.md)
- **Trunk:** `main`, every slice lands as one pull request with a merge commit
- **Size budgets:** target ≤600 reviewable lines, cap 1000 (generated fixtures, snapshots, lockfiles,
  the Gradle wrapper and the Apache licence text do not count)
- **Branches:** `tech/<slice>` for tooling, `feature/<slice>` for product behaviour
- **Per slice:** acceptance criteria frozen before code (`acceptance-criteria`), an independent
  code review, the acceptance gate before the PR leaves draft, README and `docs/` updated in the
  same PR, `./gradlew check` and `npm test` green from a clean checkout, the Pages deploy green.

The spec and this map land first via `tech/spec-and-map`; S0 starts after that merges.

## Slices

| # | PR title | Purpose (one sentence) | Strategy | Size budget | Depends on | Status |
|---|----------|------------------------|----------|-------------|------------|--------|
| S0 | `tech/s0-scaffold` | A buildable, deployable skeleton: Gradle KMP engine, npm workspace, licence, CI and Pages deploy of a placeholder page | safe | ~300 | — | planned |
| S1 | `feature/s1-engine-facade` | The engine builds any document to cubics in JVM and JS, proven equal by golden fixtures, with its bundle size known | safe | ~800 | S0 | planned |
| S2 | `feature/s2-catalogue` | The 35 catalogue shapes as vendored documents, proven equal to Compose's `MaterialShapes` | safe | ~500 | S1 | planned |
| S3 | `feature/s3-ui-shell` | A site that shows the catalogue with a live preview and carries the document in the URL | safe | ~650 | S2 | planned |
| S4 | `feature/s4-editor` | Create and edit any document kind with sliders, a draggable repeat-and-mirror polygon and a transforms list | safe | ~700 | S3 | planned |
| S5 | `feature/s5-exporters` | Export Kotlin/Compose, SVG and CSS with copy buttons, the Kotlin output proven by a compiled round trip, plus the Playwright smoke test | safe | ~700 | S4 | planned |
| S6 | `feature/s6-morph` | Pick a target, scrub and play a morph, export the Compose `Morph` snippet | safe | ~400 | S5 | planned |
| S7 | `feature/s7-import` | Paste an SVG path, see and retype its features, keep it as a `features` document and export it | safe | ~600 | S5 | planned |
| S8 | `feature/s8-more-exporters` | Java (Views), Dart, Swift, TypeScript exporters and PNG download | safe | ~700 | S7 | planned |
| S9 | `feature/s9-gallery-site` | A contributed-shapes gallery, user docs and custom-domain readiness | safe | ~400 | S8 | planned |

Status values: `planned · in-progress · in-review · merged · dropped`

Every slice is naturally safe: the site is additive and each slice ships a complete capability, so
no feature toggles and no cleanup slices are needed. Budgets above 600 (S1, S3, S4, S5, S8) carry a
named re-cut in their details; the diff is sized before the PR opens.

## Slice details

### S0 — `tech/s0-scaffold`
- **In scope:** `settings.gradle.kts`, `engine/build.gradle.kts` with `jvm()` and `js()` targets,
  the version catalogue, the Gradle wrapper, `graphics-shapes` as a dependency with one
  `commonTest` that constructs a `RoundedPolygon`; root `package.json` with workspaces, empty
  `packages/engine`, `web` from the Vite React TypeScript template with one vitest; `LICENSE`
  (Apache 2.0), `NOTICE`, `.gitignore`, `.editorconfig`; `ci.yml` and `deploy.yml`; Vite `base`
  from `SITE_BASE`; README with build instructions and the trademark notice.
- **Out of scope:** any façade code, any real UI.
- **Acceptance:** (1) `./gradlew check` and `npm test` pass from a clean clone; (2) `ci.yml` is
  green on the PR; (3) the placeholder page is live on Pages after merge; (4) the licence and
  NOTICE name the upstream library; (5) the README says how to build and that the project is
  independent of Google. Proof: CI run links, the Pages URL, the clean-clone log in the PR body.
- **Ships safely because:** nothing user-facing beyond a placeholder page.
- **Cleanup owed:** none.

### S1 — `feature/s1-engine-facade`
- **In scope:** the document model and validator (kotlinx.serialization), all shape kinds of spec
  §3 including `features` by string, transforms, the vendored repeat-and-mirror expansion, the
  catalogue registry (empty until S2), the façade of spec §4 except the three import functions,
  generated `.d.ts`, the `jsPackage` task that copies the ES module into `packages/engine/dist`,
  JVM fixture generation into `engine/fixtures`, the vitest parity suite, the bundle size recorded
  in the README.
- **Out of scope:** catalogue data (S2), SVG import functions (S7), any UI.
- **Acceptance:** (1) every document kind builds on JVM and JS; (2) the parity suite compares all
  fixtures within 1e-5 and passes; (3) breaking a vendored constant makes the parity suite fail,
  shown once in the PR; (4) an invalid document throws a message naming the field, on both
  targets; (5) morph handles produce cubics at any progress and are released; (6) the production
  bundle size is measured and written into the README, with a remedy proposed if it is too heavy
  for a tool page. Proof: test output on both targets, the deliberate-break run, the size line.
- **Re-cut if over budget:** the morph handles move to S6.
- **Ships safely because:** engine only; the site is unchanged.
- **Cleanup owed:** none.

### S2 — `feature/s2-catalogue`
- **In scope:** the 35 documents as engine data with a NOTICE entry, `catalogue()` and
  `matchCatalogue` implemented, the JVM sync test against `MaterialShapes` from the Compose
  Multiplatform desktop artifact pinned in the version catalogue, fixtures regenerated.
- **Out of scope:** showing the catalogue (S3).
- **Acceptance:** (1) all 35 vendored documents match Compose's cubics within 1e-4; (2) changing
  one vendored number fails the sync test, shown once; (3) `matchCatalogue` recognises each
  entry built from its own document and returns null for a modified one; (4) the parity suite
  covers the 35. Proof: sync test output, the deliberate-break run.
- **Ships safely because:** engine only.
- **Cleanup owed:** none.

### S3 — `feature/s3-ui-shell`
- **In scope:** the engine wrapper, the document reducer, the URL codec with tests, the preview
  component (size, fill or outline, light or dark), the catalogue grid, the `view=` switch with
  editor, import and morph views as placeholders that say what is coming, the placeholder page
  replaced by the app.
- **Out of scope:** editing (S4), export (S5).
- **Acceptance:** (1) the deployed site shows all 35 shapes and opens one in the preview; (2) a
  share URL reopens the same document, and a corrupt hash opens the catalogue with a notice;
  (3) the preview controls work with keyboard only; (4) codec and reducer tests pass. Proof:
  vitest output, a screenshot of the live site in the PR body, a share URL that round-trips.
- **Re-cut if over budget:** the URL codec becomes its own PR before the grid.
- **Ships safely because:** the catalogue is a complete feature; placeholders name what is next.
- **Cleanup owed:** none.

### S4 — `feature/s4-editor`
- **In scope:** the kind selector, slider bindings for the builder kinds with the library's
  ranges, the polygon canvas with draggable slice vertices and keyboard nudging, per-vertex radius
  and smoothing, repeat count and mirror, the transforms list with reorder, three-decimal rounding
  on write, the unit-square warning.
- **Out of scope:** export (S5), features editing (S7).
- **Acceptance:** (1) every kind in spec §3 can be created and every field edited from the UI;
  (2) opening a catalogue shape shows Material's own parameters and reproduces it unchanged;
  (3) dragging a vertex updates the document, the preview and the URL; (4) a validator error is
  shown next to the control, never as a blank preview. Proof: vitest for bindings and reducer,
  a recorded edit session in the PR body.
- **Re-cut if over budget:** the polygon canvas ships as a follow-up PR `feature/s4b-polygon-canvas`.
- **Ships safely because:** the editor is complete for what it exposes.
- **Cleanup owed:** none.

### S5 — `feature/s5-exporters`
- **In scope:** the exporter contract, Kotlin/Compose with catalogue equality and transforms, SVG,
  CSS `path()` and `shape()`, the export panel with copy buttons and per-target options,
  snapshot tests, the Kotlin round trip (a script emits the fixtures' snippets into a generated
  JVM test source set that `./gradlew check` compiles and renders), the Playwright smoke test
  and its CI job.
- **Out of scope:** the other targets (S8), the morph snippet (S6).
- **Acceptance:** (1) a catalogue document exports as `MaterialShapes.Name`; (2) every fixture's
  Kotlin snippet compiles and renders cubics equal to the fixture; (3) SVG and CSS snapshots
  match for every fixture; (4) the smoke test opens a catalogue shape, moves a slider and copies
  Kotlin on the built site; (5) breaking the exporter fails the round trip, shown once. Proof:
  round-trip and snapshot output, the smoke test run, the deliberate-break run.
- **Re-cut if over budget:** the Playwright setup ships first as `tech/playwright-smoke`.
- **Ships safely because:** export is a complete feature for three targets.
- **Cleanup owed:** none.

### S6 — `feature/s6-morph`
- **In scope:** the morph view (target picker from the catalogue or a pasted share URL, scrubber,
  play), `morph=` in the URL, the frame drawn from `morphCubics`, the Compose `Morph` snippet in
  the Kotlin exporter, a morph fixture at three progress values in the parity suite.
- **Out of scope:** morph export to other targets.
- **Acceptance:** (1) any two documents morph and the frame matches the JVM fixture at 0, 0.5
  and 1; (2) the share URL restores both documents and the view; (3) the exported snippet
  compiles in the round trip. Proof: parity and round-trip output, a recorded scrub.
- **Ships safely because:** additive view.
- **Cleanup owed:** none.

### S7 — `feature/s7-import`
- **In scope:** `parseSvgPath`, `serializeFeatures`, `featuresToDocument` in the façade, the
  import view (text box, feature list coloured by type, retype control, ignorable features
  blocking export until retyped), the `features` document through preview, editor transforms and
  the Kotlin exporter (`FeatureSerializer.parse`), fixtures for imported paths.
- **Out of scope:** raster tracing, editing feature geometry.
- **Acceptance:** (1) a Figma-exported path and an icon path import and preview; (2) retyping a
  feature changes the serialised string and the preview; (3) the string round-trips through the
  engine on both targets; (4) the Kotlin export of an imported shape compiles and matches. Proof:
  parity and round-trip output, before-and-after screenshots of a retyped corner.
- **Ships safely because:** additive view.
- **Cleanup owed:** none.

### S8 — `feature/s8-more-exporters`
- **In scope:** Java (Views) with the constant-name mapping, Dart with a package option whose
  API names are read from the chosen package when written, Swift `UIBezierPath` and SwiftUI
  `Path`, TypeScript against the engine package, PNG download from the preview; snapshot tests;
  a `dart test` job if the Dart package can be tested in CI.
- **Out of scope:** new document features.
- **Acceptance:** (1) each target has a snapshot for every fixture; (2) the Java snippets compile
  in the round trip source set; (3) PNG downloads at the chosen size. Proof: snapshot and
  round-trip output, a downloaded PNG attached to the PR.
- **Re-cut if over budget:** Java and Dart first, then Swift, TypeScript and PNG as `feature/s8b`.
- **Ships safely because:** each target is complete when it appears in the selector.
- **Cleanup owed:** none.

### S9 — `feature/s9-gallery-site`
- **In scope:** `gallery/` of contributed documents added by pull request with a validation test,
  a gallery view, user docs in `docs/`, a contributing guide, the custom-domain path (a `CNAME`
  produced from a repository variable), README polish.
- **Out of scope:** accounts, uploads, a backend.
- **Acceptance:** (1) a document in `gallery/` appears on the site and an invalid one fails CI;
  (2) the docs describe every view and every target; (3) changing `SITE_BASE` alone moves the site
  to a custom domain. Proof: CI runs for a valid and an invalid gallery entry, a docs review.
- **Ships safely because:** additive.
- **Cleanup owed:** none.

## Decision log
- 2026-09-28: map created from the kickoff's S0..S9 list; all slices naturally safe, no toggles.
  Budgets above 600 carry a named re-cut instead of pre-splitting, to keep the owner's numbering.
