# Kickoff prompt: Shape Studio

Paste everything below the line into a Claude Code session opened in this repository. The
feasibility research it relies on is [feasibility.md](./feasibility.md).
---

You are starting an open-source project in a repository that holds only this prompt and its research.
Read this whole prompt, then `docs/research/feasibility.md`, before doing anything else.

## What we are building

**Shape Studio** (working title): a static web app that lets anyone browse, create, imitate and
export the shapes of Material 3 Expressive, the rounded-polygon shapes behind Android's
`androidx.graphics.shapes` library (cookies, clovers, bursts, the 35-shape `MaterialShapes`
catalogue). The engine is the real Google library compiled to JavaScript, so what the browser
draws is what Jetpack Compose draws. The app exports each shape as code for the platforms that
have a port of the library, and as SVG, PNG and CSS for those that do not.

Hosted on GitHub Pages from this repository; a custom domain may come later, so nothing may
depend on the Pages URL. Licence Apache 2.0. Public repository. English throughout.

## Facts you may rely on (verified 2026-09-28)

- `androidx.graphics:graphics-shapes:1.1.0` is stable, pure common Kotlin, Apache 2.0, and
  publishes `graphics-shapes-js` and `graphics-shapes-wasm-js`. The JS POM depends on
  `kotlin-stdlib`, `androidx.annotation:annotation-js:1.9.1` and
  `androidx.collection:collection-js:1.5.0`, all published. Nothing in it is `@JsExport`ed, so a
  façade module is required.
- Its API: `RoundedPolygon(numVertices, radius, centerX, centerY, rounding, perVertexRounding)`,
  `RoundedPolygon(vertices: FloatArray, rounding, perVertexRounding, centerX, centerY)`,
  `RoundedPolygon(features: List<Feature>, centerX, centerY)`; companions `circle`, `rectangle`,
  `star`, `pill`, `pillStar`; `CornerRounding(radius, smoothing)`; `normalized()`,
  `transformed(PointTransformer)`, `calculateBounds()`, `cubics`; `Morph(start, end).asCubics(t)`;
  `SvgPathParser.parseFeatures(d)`; `FeatureSerializer.serialize(features)` and `.parse(string)`;
  `Feature.buildConvexCorner / buildConcaveCorner / buildEdge / buildIgnorableFeature`.
- The 35-shape catalogue lives in `androidx.compose.material3.MaterialShapes` (Compose Material
  3, still `@ExperimentalMaterial3ExpressiveApi`), about 790 lines of shape data: 25 shapes are
  `customPolygon(points, reps, mirroring)` (a slice of vertices with per-vertex rounding repeated
  around the centre, optionally mirrored), 4 are `star`, 2 `rectangle`, 2 n-gons, 1 a transformed
  circle; all are `normalized()`. The source is
  https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt
  and the same data is `public static final RoundedPolygon` fields (`CIRCLE`, `SLANTED_SQUARE`,
  `SEMI_CIRCLE`, ...) in Material Components for Android's `MaterialShapes.java`.
- Google's reference editor is an unpublished demo at
  https://github.com/androidx/androidx/tree/androidx-main/graphics/integration-tests/testapp-compose
  (`ShapeEditor.kt`, `ShapeParameters.kt`): parametric editing, SVG path import, feature
  editing, export of the `FeatureSerializer` string. Read it for the parameter model
  (`sides, innerRadius, roundness, smooth, innerRoundness, innerSmooth, rotation, width, height,
  pillStarFactor`) and for how imported features are edited. Reuse ideas, not code.
- Prior art on the web is `shape-morph` (npm, MIT, TypeScript port with presets and morph, no
  editor, no import, no export). Do not depend on it; the engine is the upstream library.
- Flutter ports: `androidx_graphics_shapes` on pub.dev, and an open official `material_ui` pull
  request (flutter/packages #12771). CSS `clip-path: shape()` is Baseline since February 2026.

## Decisions already made (do not reopen)

1. **Architecture.** A Kotlin Multiplatform `engine` module with `jvm()` and `js()` targets,
   depending on `graphics-shapes:1.1.0`, exposing a small `@JsExport` façade that takes and
   returns only numbers, `Float32Array`s and JSON strings; built as an ES module with generated
   TypeScript definitions (`useEsModules()`, `generateTypeScriptDefinitions()`,
   `binaries.library()`). A TypeScript UI (Vite) imports it and renders SVG. `wasmJs` is a later
   optional build of the same module, not part of v1.
2. **The catalogue is vendored** into `engine` under Apache 2.0 with a NOTICE entry, and a JVM
   test compares every vendored shape's cubics with `androidx.compose.material3.MaterialShapes`
   from the Compose Multiplatform desktop artifact, so upstream drift fails the build.
3. **The shape document is the source of truth**, never the path. One JSON schema:
   `kind: catalogue | polygon | star | pill | pillStar | rectangle | circle | ngon | features`,
   the builder's parameters, per-vertex `{radius, smoothing}`, an optional
   `repeat: {count, mirror}` for `polygon`, and ordered post-transforms
   (`normalize`, `rotate`, `scale`, `fillSquare`, `startAngle`). Exporters are pure functions
   from the document to text. The document travels in the URL hash, so a link is a shape.
4. **Export targets, in order:** Kotlin/Compose (emits `MaterialShapes.X` when the document
   equals a catalogue entry, otherwise the constructor call, plus `.normalized()` /
   `.transformed { }`, `.toShape()`, and a `Morph` snippet), SVG, CSS (`path()` and `shape()`),
   then Java for Views, Dart, Swift (`UIBezierPath` / SwiftUI `Path` from cubics), TypeScript,
   PNG.
5. **Fidelity is proven, not assumed.** JVM golden fixtures (`fixtures/*.json`, cubics per
   document) are compared by a vitest suite against the JS engine; the Kotlin exporter's output
   is compiled into a generated JVM test source set and rendered, and must match the fixture.
   Every parity test is validated once by breaking a vendored constant on purpose.
6. **Not in scope:** raster tracing, a component or theme builder, accounts, telemetry, any
   server. The product name must not lead with "Material" (Google's mark); "for Material 3
   Expressive" in the description is fine.

## How the owner works

- Terse directives, results not questions. Decide everything inside an approved plan yourself;
  ask only for owner-level calls: the name, the UI framework (React or Svelte; recommend React
  and proceed unless told otherwise), merges, anything public-facing such as publishing to npm.
- One pull request per slice, review-sized, landed with a merge commit. Branches
  `feature/ | fix/ | tech/`. Never force-push a reviewed branch.
- Tests first. Every slice gets numbered acceptance criteria frozen before code (the
  `acceptance-criteria` skill), an independent code review, and the acceptance gate before the
  PR is marked ready. Docs are part of done: the README and `docs/` describe what the app does
  after every slice.
- Comments: default none; only a fact the code cannot show. No process narration in code.
- Use the `superpowers` skills (brainstorming, writing-plans, test-driven-development,
  verification-before-completion) and the `tbd` decomposition skill; process skills first.

## Your first steps

1. Read `docs/research/feasibility.md`. Then run a short brainstorm only on the open decisions
   above; do not re-litigate the fixed ones.
2. Write `docs/spec.md`: the shape document schema, the façade API, the UI's screens
   (catalogue, editor, import, morph, export), and the exporter contracts. Keep it under 300
   lines.
3. Write the decomposition map as pull-request-sized slices S0..S9 exactly as the research
   lists them, each with its acceptance criteria and its proof.
4. Do S0 and S1 without waiting: scaffold (Gradle KMP engine, npm workspace, Apache 2.0 with
   NOTICE, a GitHub Actions workflow that builds the engine, builds the site and deploys an empty
   page to Pages), then the engine façade with the JVM fixtures and the vitest parity test.
   S1 must record the production bundle size of the engine in the README; if it exceeds what a
   tool page can carry, say so and propose the remedy before S2.
5. Stop and report after S1 with: the deployed URL, the bundle size, the parity test result,
   and the two decisions you need from the owner.

Definition of done for every slice: `./gradlew check` and `npm test` green from a clean
checkout, the Pages deploy green, acceptance criteria all PASS with fresh evidence, docs updated,
the PR body listing what changed and how it was verified.
