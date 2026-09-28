# Material Shape Studio: a web editor for Material Expressive shapes

Feasibility research, 2026-09-28. The question: can a browser tool reproduce ("imitate") and
create any Material Expressive shape, and hand back code for the platforms Material runs on?
The companion kickoff prompt is [kickoff-prompt.md](./kickoff-prompt.md).

## Verdict

Build it. The engine does not need to be written: Google's `androidx.graphics:graphics-shapes`
is pure common Kotlin, and since 1.1.0 (October 2025) it ships `js` and `wasm-js` artifacts whose
dependencies all resolve for JavaScript. The code that draws the cookie on the Counter can run in
a browser unchanged. Nobody has put a web editor on top of it: Google's own Shape Editor is a demo
app inside the AndroidX repository that has to be built from source and run on a phone, and the
one TypeScript port on npm has a preset gallery but no editor, no SVG import and no code export.
The gap is exactly "that editor, on the web, for every port".

## 1. What a Material shape is

Everything in the Expressive shape system is one type, `RoundedPolygon`:

- a list of vertices and a centre;
- per vertex a `CornerRounding(radius, smoothing)`. `radius` cuts the corner into a circular arc;
  `smoothing` (0..1) stretches the arc's ends along the edges into a squircle-like flank;
- the result is a closed list of cubic Béziers (`cubics`), which every renderer can draw.

Around that core the library has builders (`circle`, `rectangle`, `star`, `pill`, `pillStar`, an
n-gon from `numVertices`), `normalized()` (fit into the unit square, aspect kept), `transformed`
(any point transform), `Morph(start, end).asCubics(progress)` (feature-matched interpolation
between two shapes), and since 1.1.0 an import pipeline:
`SvgPathParser.parseFeatures(d)` turns an SVG path into a list of `Feature`s (convex corner,
concave corner, edge, ignorable), `FeatureSerializer.serialize(features)` turns them into a
string, and production code rebuilds the shape with
`RoundedPolygon(FeatureSerializer.parse(string))`. That pipeline is the "imitate any shape" half
of the idea, and Google already shipped it.

Source: 16 files, about 180 KB of common Kotlin, no `expect`/`actual`, Apache 2.0.

## 2. The 35 shapes and how Material builds them

The catalogue lives in Compose Material 3 (`androidx.compose.material3.MaterialShapes`), not in
the shapes library. `MaterialShapes.kt` is about 790 lines and every entry is data:

| Built with | Count | Examples |
|---|---|---|
| `customPolygon(points, reps, mirroring)`: a slice of vertices with per-vertex rounding, repeated `reps` times around the centre, optionally mirrored | 25 | cookies 4/6, clovers, bursts, flower, puffy, heart, ghostish, pixel shapes |
| `RoundedPolygon.star(...)` | 4 | Sunny, Cookie7Sided, Cookie9Sided, Cookie12Sided |
| `RoundedPolygon.rectangle(...)` | 2 | Square, SemiCircle |
| `RoundedPolygon(numVertices, ...)` | 2 | Arch, Triangle |
| `RoundedPolygon.circle(...)` | 1 | Oval (a circle scaled and rotated) |

All 35 are `normalized()`. The repeat-and-mirror trick is the designer's secret behind the
catalogue: a cookie is one bump described once and repeated. An editor that offers "draw one
slice, repeat it N times, mirror it" reproduces the whole catalogue's language, which sliders for
`star()` alone cannot.

The same 35 exist as `public static final RoundedPolygon` fields in Material Components for
Android (Views), with `MaterialShapes.createShapeDrawable(shape)`, and in the Flutter ports.

## 3. What Cats Radar does with them today

- The count sits in `MaterialShapes.Cookie12Sided.toShape()` (`ui/.../counter/TallyBlock.kt`).
- Each coat has a catalogue shape (`ui/.../coat/CoatShapes.kt`), stretched onto the unit square
  with a hand-written `filledToSquare()` transform because the catalogue shapes stop short of
  their square by different amounts.
- Tiles clip to `coatShapeFor(coat).toShape()`; a selected tile borders the same shape.

So the app already consumes exactly what the tool would emit: a `RoundedPolygon` value plus an
optional post-transform. Anything the tool exports as `RoundedPolygon(...)` drops straight into
`:ui`.

## 4. The engine already runs in a browser

Verified facts:

- `androidx.graphics:graphics-shapes-js:1.1.0` and `graphics-shapes-wasm-js:1.1.0` are on
  Google's Maven. The JS artifact's POM depends only on `kotlin-stdlib`, `annotation-js` and
  `collection-js`, all published for JS.
- The library has no `@JsExport`, so plain JavaScript cannot call it directly. A small Kotlin/JS
  façade module (`@JsExport` functions taking numbers, `Float32Array`s and JSON strings) is
  needed; that façade is also the first `graphics-shapes` package on npm.
- The catalogue is in Material 3, which for JS would drag in the whole Compose runtime. The 790
  lines of shape data get vendored into the engine (Apache 2.0, with NOTICE) and guarded by a JVM
  test that compares every vendored shape's cubics with `androidx.compose.material3.MaterialShapes`
  from the desktop artifact, so a catalogue change upstream fails the build instead of drifting.
- Compose Multiplatform for web (Wasm) has been Beta since 1.9.0 (September 2025) and ships the
  same `MaterialShapes`, so a Compose-rendered web app is also possible; see the options below.

## 5. Prior art

| Project | What it is | Licence, state | What it lacks for this tool |
|---|---|---|---|
| AndroidX `graphics/integration-tests/testapp-compose` Shape Editor | Google's reference editor: parametric shapes, SVG path import, feature editing, `FeatureSerializer` export through the share sheet, morph scrubbing | Apache 2.0; a demo, not published, built from the AndroidX repo | Not on the web; Android only; exports one string |
| [chethaase/ShapesDemo](https://github.com/chethaase/ShapesDemo) | Chet Haase's demo apps (Views and Compose) with a shape editor and morph scrubber | Apache 2.0 | Same: Android app |
| [shape-morph](https://github.com/Thereallo1026/shape-morph) (npm 0.4.0) | TypeScript port: 35 presets, `createCircle/Rectangle/Star/Polygon`, `Morph`, SVG `d`, `clip-path`, canvas, React | MIT; created February 2026; one maintainer, 20 stars, last push May 2026 | No editor (the "playground" morphs two presets), no vertex-list constructor, no SVG import, no `FeatureSerializer`, no code export; fidelity is a re-implementation, not the upstream code |
| [Shape Shifter](https://shapeshifter.design) | Alex Lockwood's web app for icon animations, exports SVG and `AnimatedVectorDrawable`; open source on GitHub Pages | Apache 2.0 | Path morphing, not Material shapes; the closest analogue for "web tool that exports Android code" |
| [androidx_graphics_shapes](https://pub.dev/packages/androidx_graphics_shapes) 1.7.0 | Dart port of the library and the catalogue | community; August 2026 | An export target, not a tool |
| flutter/packages [#12771](https://github.com/flutter/packages/pull/12771) | Official `material_ui` port of the library and the 35 shapes | open since September 2026 | An export target once merged |
| [expressive-shapes](https://github.com/amansxcalibur/expressive-shapes) | Python port with morphing | GPL-3.0 | Not vendorable (GPL); an optional target |
| jethac/slint, soramanew/m3shapes, matraic `@m3e/shape`, rit3zh/reacticx | Rust, Qt, web-component and React Native ports of the catalogue | various | Targets, and proof the catalogue is wanted everywhere |
| Figma "M3 Expressive - Shapes set" | Static vectors of the 35 shapes | community file | No parameters, no morph, no code |
| Material Theme Builder | Google's web tool for colour and type | Google | Has no shape editor at all |

Reading of the table: libraries exist on every platform, Google's editor exists but is hidden,
and no web tool exists. A web editor with cross-platform export is a real gap, not a duplicate.

## 6. What the tool is

A static web app, hosted on GitHub Pages first and a domain later, that lets a designer or
developer:

1. browse the 35 catalogue shapes at any size, in light and dark, with a fill and an outline;
2. create a shape with the same vocabulary Material used: builders with sliders, and a
   repeat-and-mirror custom polygon whose vertices can be dragged and whose corners each have a
   radius and a smoothing;
3. imitate a shape from outside: paste an SVG path (Figma export, an icon), get the detected
   features, fix a corner the detector misread, and keep the result as a serialised feature string;
4. preview a morph between any two shapes and scrub it;
5. export the shape as code for each platform (section 8), as SVG, PNG and CSS, and share it as a
   URL that carries the whole shape document.

Not in scope: tracing shapes from raster images, a component builder, a colour tool.

## 7. Architecture

Three ways to get the engine into the browser:

| Option | Engine | UI | For | Against |
|---|---|---|---|---|
| **A. Real engine, web UI** | `graphics-shapes-js` behind a Kotlin/JS `@JsExport` façade, published as an ES module with `.d.ts` | TypeScript app (Vite + React or Svelte) rendering SVG | Byte-exact with Compose; upstream fixes arrive by bumping a version; the same module builds for the JVM, giving golden fixtures and a future CLI; the façade is itself a useful npm package | Two toolchains (Gradle and npm); Kotlin/JS bundle size to be measured; `@JsExport` limits the API to primitives, arrays and strings |
| B. TypeScript port | shape-morph (MIT) extended, or an own port, with golden fixtures from the JVM | Same | One toolchain; tiny bundle; web-native contributors | Roughly half the library (SVG import, feature serialiser, per-vertex constructor, 1.1's length-based morph) is missing from shape-morph and would have to be ported and kept in step with upstream; fidelity is asserted by tests, not inherited |
| C. Compose for Web | The real library through Compose Multiplatform, Wasm | Compose | One language; could ship the same app on Android and desktop | Web is Beta; a canvas-rendered UI is weaker at text selection, copy of code output, accessibility and SEO; multi-megabyte first load; harder for web contributors |

Recommendation: **A**, with the façade kept minimal and JSON in, JSON out, so the UI never sees a
Kotlin type. B's golden-fixture idea is kept as the test strategy. Use the `js` target for the
façade first (JS interop is the simplest); `wasmJs` is an optional later build of the same module.

### Modules

```
engine/          Kotlin Multiplatform: jvm() + js().  Depends on graphics-shapes 1.1.0.
                 - vendored MaterialShapes data (Apache 2.0, NOTICE)
                 - ShapeDocument: parse/serialise the JSON document below
                 - @JsExport façade: build(doc) -> cubics, morph(a, b, t), parseSvg(d), serialize(features), catalogue()
                 - jvmTest: golden fixtures + catalogue sync test against material3
web/             Vite + TypeScript UI, imports engine's ES module; vitest parity tests against the fixtures
exporters/       (inside web/) one module per target, pure functions from ShapeDocument to text; snapshot-tested
.github/         build engine -> build web -> deploy to Pages
```

### The shape document

The source of truth is the parametric definition, never the path. One small JSON schema:

- `kind: "catalogue"` with a name;
- `kind: "polygon"` with vertices, per-vertex `{radius, smoothing}`, centre, and an optional
  `repeat: {count, mirror}` that expands a slice the way `customPolygon` does;
- `kind: "star" | "pill" | "pillStar" | "rectangle" | "circle" | "ngon"` with that builder's
  parameters;
- `kind: "features"` with a `FeatureSerializer` string;
- optional post-transforms in order: `normalize`, `rotate`, `scale`, `fillSquare` (the Cats Radar
  stretch), `startAngle`.

Because every platform port takes the same parameters, an exporter is a serialiser of this
document into that language's constructor call. The path is derived and only exported to formats
that have no shape library (SVG, CSS, Swift).

### Hosting and sharing

Static files on GitHub Pages through an Actions workflow. The document is encoded in the URL
hash, so a link is a shape; a later gallery is a folder of documents added by pull request.

## 8. Export matrix

| Target | Form | Document kinds |
|---|---|---|
| Kotlin, Compose (Android, Compose Multiplatform incl. web) | `MaterialShapes.X` when the document equals a catalogue entry; otherwise `RoundedPolygon(vertices = floatArrayOf(...), perVertexRounding = listOf(CornerRounding(r, s), ...), centerX, centerY)` or `RoundedPolygon.star(...)`; `RoundedPolygon(FeatureSerializer.parse("..."))` for imports; `.normalized()` / `.transformed { }` for the post-transforms; `.toShape()` / `.toPath()`; a `Morph` snippet | all |
| Java, Material Components for Android (Views) | `MaterialShapes.COOKIE_12_SIDED` style constants or the same constructor in Java; `MaterialShapes.createShapeDrawable(shape)` | all |
| Dart, Flutter | `androidx_graphics_shapes` today, `material_ui` once merged; the exporter reads that package's constructor names before emitting | all |
| TypeScript | the engine's own npm package; shape-morph builders where expressible | all |
| SVG | `<path d="...">` at a chosen size; PNG rendered from it | all |
| CSS | `clip-path: path("...")` at a fixed size and `clip-path: shape(...)` (Baseline February 2026) for a responsive clip | all |
| Swift (iOS has no Material library) | `UIBezierPath` / SwiftUI `Path` built from the cubics | all, path only |

## 9. Fidelity and testing

- **Engine parity.** A JVM test renders every catalogue shape and a set of custom documents to
  cubics and writes `fixtures/*.json`; a vitest suite runs the JS build of the same engine over
  the same documents and compares within a float tolerance. This proves the browser draws what
  Compose draws.
- **Catalogue sync.** The JVM test compares each vendored shape with
  `androidx.compose.material3.MaterialShapes` from the desktop artifact, pinned in the version
  catalogue; a bump that changes a shape fails loudly.
- **Exporter round trips.** The Kotlin exporter's snippets are written into a generated JVM test
  source set, compiled and rendered in CI; their cubics must equal the fixture's. The other
  exporters get snapshot tests, and the Dart one a `dart test` job once the package is chosen.
- **UI.** Vitest for the document and URL codec; a Playwright smoke test that opens the deployed
  build, changes a slider and copies the Kotlin output.
- **Positive controls.** Every parity test is proven by breaking a vendored constant once.

## 10. Risks

- **Kotlin/JS bundle size** is unmeasured. Slice 1 measures it; if it is too heavy, the façade
  moves to `wasmJs` or the catalogue is loaded on demand.
- **`@JsExport` constraints**: no `List`, no default-argument overloads, no `FloatFloatPair`.
  Mitigated by the JSON-in, JSON-out façade.
- **Upstream is experimental in Material 3.** `MaterialShapes` is still behind
  `ExperimentalMaterial3ExpressiveApi`, and its promotion to stable was reverted once. The
  library itself (graphics-shapes) is stable at 1.1.0; the catalogue data is what may move, and
  the sync test catches that.
- **Trademark.** "Material Design" is Google's mark. The owner chose to keep "Material" in the
  name so the purpose is obvious; the README and the site state that the project is independent
  and not affiliated with Google, and use no Google logos.
- **Maintainer bandwidth.** A single-owner open-source tool needs a small surface: v1 below is
  deliberately narrow.

## 11. Roadmap in pull-request-sized slices

1. **S0 scaffold**: Gradle KMP `engine` (`jvm`, `js`), npm workspace, Apache 2.0 with NOTICE,
   Actions workflow that builds both and deploys an empty page to GitHub Pages.
2. **S1 engine façade**: builders, vertex polygon with per-vertex rounding, normalize/transform,
   morph, cubics out as JSON; `.d.ts` generated; JVM golden fixtures and the vitest parity test;
   bundle size measured and recorded in the README.
3. **S2 catalogue**: the 35 shapes vendored, the sync test against material3 on the JVM.
4. **S3 UI shell**: catalogue grid, preview (size, fill, outline, light and dark), the document
   in the URL hash.
5. **S4 parametric editor**: builder sliders; repeat-and-mirror custom polygon with draggable
   vertices and per-corner radius and smoothing; post-transforms.
6. **S5 exporters v1**: Kotlin/Compose with catalogue detection, SVG, CSS; copy buttons; the
   round-trip test.
7. **S6 morph**: pick two documents, scrub, play; Compose `Morph` snippet.
8. **S7 import**: SVG path in, features shown and editable, `FeatureSerializer` string out,
   Kotlin export of it.
9. **S8 more exporters**: Java (Views), Dart, Swift, TypeScript, PNG.
10. **S9 gallery and site**: shapes contributed by pull request, docs, custom-domain readiness.

Later ideas, not planned: a Figma plugin reusing the engine; a JVM CLI that turns a document into
code for a build step; raster tracing.

## 12. Decisions for the owner

- **Name and repository.** "Material Shape Studio", repository `material-shape-studio` (owner's
  choice, 2026-09-28).
- **UI framework.** React or Svelte, both fine; React has the larger contributor pool.
- **Where the code lives.** A new public repository under `kartollikaa`, Apache 2.0.
- **First target order.** Kotlin, SVG and CSS in v1 as above, or Dart earlier if Flutter users are
  the audience you want first.

## Sources

- graphics-shapes release notes (1.1.0 on 2025-10-22; js and wasm targets in 1.1.0-beta01;
  SVG import and feature serialiser in 1.1.0-alpha01):
  https://developer.android.com/jetpack/androidx/releases/graphics
- Maven artifacts: https://dl.google.com/android/maven2/androidx/graphics/group-index.xml and
  the `graphics-shapes-js` 1.1.0 POM
- Library source: https://github.com/androidx/androidx/tree/androidx-main/graphics/graphics-shapes
- Catalogue source: https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt
- Google's Shape Editor demo: https://github.com/androidx/androidx/tree/androidx-main/graphics/integration-tests/testapp-compose
- API reference: https://developer.android.com/reference/kotlin/androidx/graphics/shapes/package-summary
- Material Components for Android `MaterialShapes.java`: https://github.com/material-components/material-components-android/blob/master/lib/java/com/google/android/material/shape/MaterialShapes.java
- shape-morph: https://shape-morph.thereallo.dev/docs and https://github.com/Thereallo1026/shape-morph
- Shape Shifter: https://github.com/alexjlockwood/ShapeShifter
- Flutter ports: https://pub.dev/packages/androidx_graphics_shapes and https://github.com/flutter/packages/pull/12771
- Compose Multiplatform for web Beta: https://blog.jetbrains.com/kotlin/2025/09/compose-multiplatform-1-9-0-compose-for-web-beta/
- CSS `shape()` Baseline: https://developer.chrome.com/blog/css-shape
