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
| S0 | `tech/s0-scaffold` | A buildable, deployable skeleton: Gradle KMP engine, npm workspace, licence, CI and Pages deploy of a placeholder page | safe | ~300 | — | merged |
| S1 | `feature/s1-engine-pipeline` | The engine builds `ngon` and `polygon` (with repeat) documents plus `normalize` in JVM and JS, proven equal by golden fixtures, packaged with types, its bundle size known | safe | ~960, justified | S0 | merged |
| S1b | `feature/s1b-engine-document` | Every remaining shape kind and transform, and morph handles, through the same pipeline | safe | ~920, justified | S1 | merged |
| S2 | `feature/s2-catalogue` | The 35 catalogue shapes as vendored documents, proven equal to Compose's `MaterialShapes` | safe | ~500 | S1b | planned |
| S3a | `feature/s3a-exporters-catalogue` | The 35 Material shapes generated from Compose's source, and the Compose, SVG and CSS exporters, all tested | safe | ~600 | S1b | in-review |
| S3b | `feature/s3b-studio-editor` | The studio's editing model: per-shape controls, dots, undo and redo, tested on every catalogue shape | safe | ~420 | S3a | in-review |
| S3c | `feature/s3c-studio-page` | The approved prototype as the site: pick, adjust, see it in use, export; React leaves | safe | ~650 | S3b | planned |
| S4 | `feature/s4-editor-core` | Superseded by S3b: the owner chose the prototype's simpler editor | — | — | — | dropped |
| S4b | `feature/s4b-direct-manipulation` | Superseded by S3b: dots on the shape cover direct editing; handles, ring and snapping are not wanted | — | — | — | dropped |
| S4c | `feature/s4c-editor-conveniences` | Superseded by S3b: undo, reset and per-dot roundness ship there; the rest is not wanted | — | — | — | dropped |
| S5 | `feature/s5-proof-and-share` | The compiled Compose round trip and a Playwright smoke test in CI, and share links that carry the document in the URL | safe | ~600 | S3b | planned |
| S6 | `feature/s6-press-animation` | The shape morphs when pressed in the "In use" preview, and Compose gets the `Morph` code | safe | ~400 | S3b | planned |
| S7 | `feature/s7-import` | Paste an SVG path, see and retype its features, keep it as a `features` document and export it | safe | ~600 | S5 | planned |
| S8 | `feature/s8-more-exporters` | Java (Views), Dart, Swift and TypeScript exporters | safe | ~700 | S7 | planned |
| S9 | `feature/s9-gallery-site` | A contributed-shapes gallery, user docs and custom-domain readiness | safe | ~400 | S8 | planned |

Status values: `planned · in-progress · in-review · merged · dropped`

Every slice is naturally safe: the site is additive and each slice ships a complete capability, so
no feature toggles and no cleanup slices are needed. Budgets above 600 (S1, S1b, S3a, S3b, S8) carry a
named re-cut or a size justification in their details; the diff is sized before the PR opens.

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
- **Out of scope:** showing the catalogue (S3b).
- **Acceptance:** (1) all 35 vendored documents match Compose's cubics within 1e-4; (2) changing
  one vendored number fails the sync test, shown once; (3) `matchCatalogue` recognises each
  entry built from its own document and returns null for a modified one; (4) the parity suite
  covers the 35. Proof: sync test output, the deliberate-break run.
- **Ships safely because:** engine only.
- **Cleanup owed:** none.

### S3a — `feature/s3a-exporters-catalogue`
- **In scope:** `web/scripts/generate-catalogue.mjs`, which reads `MaterialShapes.kt` at a pinned
  androidx commit and writes the 35 shapes as documents; the document types; the Compose, SVG and CSS
  exporters with the repeat expansion; tests for all of them; spec §7 and this re-cut.
- **Out of scope:** the page (S3b); moving the catalogue into the engine (S2).
- **Acceptance:** frozen as AC-1..AC-11. The headline ones: the generator reproduces the committed
  file; all 35 build and match the hand-transcribed fixtures; the Compose export uses `MaterialShapes`
  for untouched shapes; the emitted repeat vertices match the engine within 1e-4; the exported Kotlin
  compiles and matches the engine for all 35 shapes and six edited ones.
- **Size:** about 600 reviewable lines, 180 of them tests; the catalogue JSON is generated.
- **Ships safely because:** nothing on the site uses it yet.
- **Cleanup owed:** none.

### S3b — `feature/s3b-studio-editor`
- **In scope:** `web/src/studio/editor.ts` and `geometry.ts`: the editing state for a picked shape,
  the main and "More options" controls per shape kind, adding, removing and moving dots, reset
  detection, undo and redo, and the dot geometry through rotations and scales; tests that drive
  every control of every catalogue shape to both ends.
- **Out of scope:** the page (S3c).
- **Ships safely because:** nothing on the site uses it yet.
- **Cleanup owed:** none.

### S3c — `feature/s3c-studio-page`
- **In scope:** the approved prototype as the site, in framework-free TypeScript over the editing
  model: the picker of 35 shapes, the preview with draggable dots, the adjust panel, colour, reset,
  undo and redo, "More options", the "In use" row, and the export panel with Compose, SVG, PNG and
  CSS. React leaves the project. A DOM test of the page. Spec §2 and §6 and the README describe the
  studio.
- **Out of scope:** share links and the Playwright test (S5); the press animation (S6).
- **Ships safely because:** it replaces the placeholder with a complete tool.
- **Cleanup owed:** none.

### S4, S4b, S4c — dropped
The owner found the fuller editor these slices described too complex and approved the prototype's
simpler one, which S3b ships.

### S5 — `feature/s5-proof-and-share`
- **In scope:** a CI job that compiles the Compose export for every catalogue shape and a set of
  edited ones against `graphics-shapes` and compares the geometry with the engine; a Playwright smoke
  test on the built site; share links, with the document in the URL hash; engine limits for
  documents that arrive from a link (finite numbers within the float range, caps on vertex and
  repeat counts, quoted scalars rejected, messages that name the missing field).
- **Acceptance:** (1) the compiled round trip runs in CI and fails when the exporter is broken on
  purpose; (2) the smoke test picks a shape, moves a slider and copies the Compose code; (3) a share
  link reopens the same shape, and a corrupt link opens the studio with a notice.
- **Ships safely because:** additive.
- **Cleanup owed:** none.

### S6 — `feature/s6-press-animation`
- **In scope:** in the "In use" row, the icon button morphs to a chosen pressed shape when pressed;
  the Compose export adds the `Morph` code for it.
- **Acceptance:** (1) pressing the preview button morphs it and releasing morphs it back; (2) the
  exported `Morph` code compiles in the S5 round trip.
- **Ships safely because:** additive.
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
  `Path`, TypeScript against the engine package; snapshot tests; a `dart test` job if the Dart
  package can be tested in CI.
- **Out of scope:** new document features.
- **Acceptance:** (1) each target has a snapshot for every fixture; (2) the Java snippets compile
  in the round trip source set. Proof: snapshot and round-trip output.
- **Re-cut if over budget:** Java and Dart first, then Swift and TypeScript as `feature/s8b`.
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
- 2026-09-28: the S1 gate showed the engine's own tests import it through the package's
  self-reference, so they did not prove a second workspace can consume it. `web` now depends on the
  engine package from S1, with a test that imports it, and the deploy packages the engine before it
  builds the site; S3 no longer carries that wiring.
- 2026-09-28: S0, S1 and S1b merged in order with merge commits on the owner's go. S1b's review
  fixes landed first: `fillSquare` measures the true extent at negative coordinates, a validation
  test the merge had disabled runs again, and the malformed-features error paths are tested.
- 2026-09-29: the owner approved the local prototype and asked for it as the site. S3 becomes S3a
  (catalogue data and exporters) and S3b (the studio page). The prototype's simpler editor replaces
  S4, S4b and S4c, which are dropped. S5 keeps the compiled Kotlin round trip and the Playwright smoke
  test and gains share links. S6 becomes the press animation, which is how Material uses morphing. The
  UI stays framework-free TypeScript, as the prototype is. The 35 shapes ship as data generated from
  Compose's source at a pinned commit until S2 vendors them into the engine with the sync test.
  The engine hardening deferred to S3 moves to S5, where documents first arrive from a link.
- 2026-09-29: S3b measured about 1,070 reviewable lines, over the cap. Split into S3b, the editing
  model, and S3c, the page with React's removal and the docs.
