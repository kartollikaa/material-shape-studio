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
| S0 | `tech/s0-scaffold` | A buildable, deployable skeleton: Gradle KMP engine, npm workspace, licence, CI and Pages deploy of a placeholder page | safe | ~300 | — | in-review |
| S1 | `feature/s1-engine-pipeline` | The engine builds `ngon` and `polygon` (with repeat) documents plus `normalize` in JVM and JS, proven equal by golden fixtures, packaged with types, its bundle size known | safe | ~960, justified | S0 | in-review |
| S1b | `feature/s1b-engine-document` | Every remaining shape kind and transform, and morph handles, through the same pipeline | safe | ~920, justified | S1 | in-progress |
| S2 | `feature/s2-catalogue` | The 35 catalogue shapes as vendored documents, proven equal to Compose's `MaterialShapes` | safe | ~500 | S1b | planned |
| S3 | `feature/s3-ui-shell` | A site that shows the catalogue with a live preview and carries the document in the URL | safe | ~650 | S2 | planned |
| S4 | `feature/s4-editor-core` | Create and edit any document kind with sliders and numeric inputs, drag slice vertices, edit the transforms list | safe | ~600 | S3 | planned |
| S4b | `feature/s4b-direct-manipulation` | Corner and builder handles on the canvas, vertex insert and delete, rotation ring, snapping | safe | ~600 | S4 | planned |
| S4c | `feature/s4c-editor-conveniences` | Master rounding with overrides and presets, reset and compare, variations strip, undo and redo, shortcuts panel | safe | ~550 | S4 | planned |
| S5 | `feature/s5-exporters` | Export Kotlin/Compose, SVG and CSS with copy buttons, the Kotlin output proven by a compiled round trip, plus the Playwright smoke test | safe | ~700 | S4 | planned |
| S6 | `feature/s6-morph` | Pick a target, scrub and play a morph, export the Compose `Morph` snippet | safe | ~400 | S5 | planned |
| S7 | `feature/s7-import` | Paste an SVG path, see and retype its features, keep it as a `features` document and export it | safe | ~600 | S5 | planned |
| S8 | `feature/s8-more-exporters` | Java (Views), Dart, Swift, TypeScript exporters and PNG download | safe | ~700 | S7 | planned |
| S9 | `feature/s9-gallery-site` | A contributed-shapes gallery, user docs and custom-domain readiness | safe | ~400 | S8 | planned |

Status values: `planned · in-progress · in-review · merged · dropped`

Every slice is naturally safe: the site is additive and each slice ships a complete capability, so
no feature toggles and no cleanup slices are needed. Budgets above 600 (S1b, S3, S5, S8) carry a
named re-cut or a size justification in their details; the diff is sized before the PR opens. S5 depends on S4 core only,
so S4b and S4c can move after S5 if export is wanted sooner.

## Slice details

### S0 — `tech/s0-scaffold`
- **In scope:** `settings.gradle.kts`, `engine/build.gradle.kts` with `jvm()` and `js()` targets,
  the version catalogue, the Gradle wrapper, `graphics-shapes` as a dependency with one
  `commonTest` that constructs a `RoundedPolygon`; root `package.json` with workspaces, empty
  `packages/engine`, `web` from the Vite React TypeScript template with one vitest; `LICENSE`
  (Apache 2.0), `NOTICE`, `.gitignore`, `.editorconfig`; `ci.yml` and `deploy.yml`; a relative Vite
  `base`; README with build instructions and the trademark notice.
- **Out of scope:** any façade code, any real UI.
- **Acceptance:** (1) `./gradlew check` and `npm test` pass from a clean clone; (2) `ci.yml` is
  green on the PR; (3) the placeholder page is live on Pages after merge; (4) the licence and
  NOTICE name the upstream library; (5) the README says how to build and that the project is
  independent of Google. Proof: CI run links, the Pages URL, the clean-clone log in the PR body.
- **Ships safely because:** nothing user-facing beyond a placeholder page.
- **Cleanup owed:** none.

### S1 — `feature/s1-engine-pipeline`
- **In scope:** the document model and validator (kotlinx.serialization) for `ngon` and `polygon`
  with `repeat`, and the `normalize` transform; the vendored repeat-and-mirror expansion; the façade
  `version`, `build` and `buildCubics`; generated `.d.mts`; `./gradlew build` syncing the ES module
  into `packages/engine/dist`; committed golden fixtures checked exactly on the JVM; the vitest
  parity suite; the bundle size recorded in the README.
- **Out of scope:** the other kinds and transforms, morph (S1b); the catalogue (S2); import (S7).
- **Acceptance:** frozen as AC-1..AC-17 before the code; the headline ones are parity within 1e-5
  for every fixture, a deliberate break failing both suites, invalid documents naming the field on
  both targets, `npm test` refusing to run before the engine is built, and the size recorded.
- **Size:** about 960 reviewable lines, 430 of them tests. The one separable piece is the repeat
  expansion, about 180 lines, but it is the vendored Material code most likely to drift, half the
  fixtures depend on it, and the deliberate-break proof targets it; without it this PR would prove
  parity only for plain library constructors.
- **Ships safely because:** engine only; the site is unchanged.
- **Cleanup owed:** none.

### S1b — `feature/s1b-engine-document`
- **In scope:** `circle`, `rectangle`, `star`, `pill`, `pillStar`, `features` (by serialised
  string, centre defaulting to the anchor average); `rotate`, `scale`, `translate`, `fillSquare`,
  `startAngle` with Compose's `toShape(startAngle)` semantics and the last-only rule; `features` in
  the build result; the morph handles `createMorph`, `morphCubics`, `morphBounds`, `releaseMorph`;
  fixtures for every new kind and transform.
- **Out of scope:** the catalogue (S2); SVG import (S7).
- **Acceptance:** (1) every kind in spec §3 except `catalogue` builds to the same cubics as its library constructor on
  both targets; (2) each transform has a fixture and a test of its documented geometry; (3) parity
  holds for every new fixture; (4) morph handles return cubics at any progress, match the fixture
  at 0, 0.5 and 1, and a released handle throws; (5) the new validation rules name their field.
- **Size:** about 920 reviewable lines, 500 of them tests. The named re-cut, morph handles to S6,
  would save about 180 and still leave the slice above 600, while S6 would then have to change the
  engine and the UI at once.
- **Ships safely because:** engine only.
- **Cleanup owed:** none.

### S2 — `feature/s2-catalogue`
- **In scope:** the 35 documents as engine data with a NOTICE entry, `kind: "catalogue"`,
  `catalogue()`, `matchCatalogue` and the `catalogue` field of the build result, the JVM sync test against `MaterialShapes` from the Compose
  Multiplatform desktop artifact pinned in the version catalogue, fixtures regenerated.
- **Out of scope:** showing the catalogue (S3).
- **Acceptance:** (1) all 35 vendored documents match Compose's cubics within 1e-4; (2) changing
  one vendored number fails the sync test, shown once; (3) `matchCatalogue` recognises each
  entry built from its own document and returns null for a modified one; (4) the parity suite
  covers the 35. Proof: sync test output, the deliberate-break run.
- **Ships safely because:** engine only.
- **Cleanup owed:** none.

### S3 — `feature/s3-ui-shell`
- **In scope:** engine limits for documents that arrive from a URL (finite numbers within the float
  range, caps on vertex and repeat counts, quoted scalars rejected, messages that name the missing
  field itself); the engine wrapper, the document reducer, the URL codec with tests, the preview
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

### S4 — `feature/s4-editor-core`
- **In scope:** the kind selector, slider plus numeric input bindings for every numeric field with
  the library's ranges, label scrubbing, the polygon canvas with draggable slice vertices and
  ghosted repeated copies, keyboard nudging, per-vertex radius and smoothing controls, repeat count
  and mirror, the transforms list with reorder, three-decimal rounding on write, the unit-square
  warning, validator errors next to their control.
- **Out of scope:** canvas handles beyond vertices (S4b), history and presets (S4c), export (S5).
- **Acceptance:** (1) every kind in spec §3 can be created and every field edited from the
  controls; (2) opening a catalogue shape shows Material's own parameters and reproduces it
  unchanged; (3) dragging a vertex updates the document, the preview and the URL; (4) typing a
  value or scrubbing a label writes the same field as the slider; (5) a validator error is shown
  next to the control, never as a blank preview. Proof: vitest for bindings and reducer, a
  recorded edit session in the PR body.
- **Ships safely because:** the editor is complete for what it exposes.
- **Cleanup owed:** none.

### S4b — `feature/s4b-direct-manipulation`
- **In scope:** radius and smoothing handles per corner with hover values, edge-midpoint insert
  and Delete for vertices, handles for builder kinds (star outer and inner radius, pill width and
  height, rectangle corner radius), the rotation ring writing a `rotate` transform, grid and axis
  snapping with an Alt bypass, hit testing and pointer capture that work with touch.
- **Out of scope:** new document fields; everything a handle does is already a control in S4.
- **Acceptance:** (1) every handle writes the same document field as its control and the two stay
  in sync; (2) inserting and deleting vertices keeps the rounding arrays valid; (3) snapping can be
  toggled and bypassed with Alt; (4) the handles work with a mouse and with touch. Proof: vitest
  for the handle-to-field mapping, a recorded session with a mouse and with the mobile emulation.
- **Ships safely because:** additive on the S4 canvas.
- **Cleanup owed:** none.

### S4c — `feature/s4c-editor-conveniences`
- **In scope:** the master rounding control with per-corner overrides, the link toggle, "copy to
  all corners", rounding presets, "Reset" and "Compare" against the catalogue original, the
  variations strip, undo and redo with the past, present and future stack, the shortcuts panel.
- **Out of scope:** in-context prototyping (later idea).
- **Acceptance:** (1) undo and redo restore exact documents and the URL follows; (2) a variation
  stays within every field's range and builds without error; (3) "Reset" reproduces the catalogue
  shape's fixture; (4) the master control and overrides never produce an invalid rounding array.
  Proof: vitest for the history reducer, the variation generator and the rounding merge; a
  recorded session.
- **Ships safely because:** additive.
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
  a gallery view, user docs in `docs/`, a contributing guide, custom-domain readiness (a domain
  set in the Pages settings, no code change), README polish.
- **Out of scope:** accounts, uploads, a backend.
- **Acceptance:** (1) a document in `gallery/` appears on the site and an invalid one fails CI;
  (2) the docs describe every view and every target; (3) the built site loads unchanged from a
  domain root and from a sub-path. Proof: CI runs for a valid and an invalid gallery entry, a docs review.
- **Ships safely because:** additive.
- **Cleanup owed:** none.

## Decision log
- 2026-09-28: map created from the kickoff's S0..S9 list; all slices naturally safe, no toggles.
  Budgets above 600 carry a named re-cut instead of pre-splitting, to keep the owner's numbering.
- 2026-09-28: the owner asked for an interactive editor that is convenient to customise; S4 split
  into S4 core, S4b direct manipulation and S4c conveniences. In-context prototyping (the shape on
  an avatar, a button, a FAB, a morphing loader) recorded as a later idea, not v1.
- 2026-09-28: S0 replaces the `SITE_BASE` repository variable with a relative Vite `base`. The app
  routes only through the hash, so no variable is needed and a custom domain is a Pages setting.
  S0 stacks on the spec PR, so CI runs on pull requests to any base branch.
- 2026-09-28: S1 as mapped measured about 1,200 reviewable lines, over the cap even without morph.
  Re-cut vertically: S1 proves the pipeline end to end on `ngon`, `polygon` with `repeat` and
  `normalize`; S1b adds the other kinds, transforms and morph. `catalogue()`, `matchCatalogue` and
  `kind: "catalogue"` move wholly to S2 rather than shipping as empty stubs.
- 2026-09-28: reading Compose's source corrected the spec: `startAngle` rotates the drawn shape (it
  is not only a start point), a `features` shape's default centre is the anchor average, and
  `toShape()` maps the unit square to the component rather than fitting the bounds. S1b and S3
  implement those.
- 2026-09-28: S1's review deferred engine hardening (number range and size caps, quoted scalars,
  message wording) to S3, where documents first arrive from a URL, so S1b stays within its size.
  S1b measured about 920 reviewable lines, 500 of them tests, and keeps morph rather than moving it
  to S6.
- 2026-09-28: `morphBounds` bounds the outline, not the control points, which can lie outside it;
  `fillSquare` guards flat shapes against the library's `Float.MIN_VALUE` bounds quirk.
