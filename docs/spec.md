# Material Shape Studio: specification

What the app does and how its parts fit. The reasoning behind the architecture is in
[research/feasibility.md](./research/feasibility.md); the delivery order is in
[decomposition.md](./decomposition.md). Everything here is for v1 unless marked later.

## 1. Purpose and scope

A static web app for designers and developers working with Material 3 Expressive shapes:

1. **Browse** the 35-shape `MaterialShapes` catalogue, at any size, light and dark, filled or outlined.
2. **Create** a shape with Material's own vocabulary: the library builders, and a custom polygon
   made of one slice of vertices repeated around the centre, optionally mirrored, with a radius and a
   smoothing per corner.
3. **Imitate** a shape from an SVG path: detect its features, retype a corner the detector misread,
   keep the result as a `FeatureSerializer` string.
4. **Morph** between any two shapes and scrub the progress.
5. **Export** the shape as code for platforms with a port of `androidx.graphics.shapes`, and as SVG,
   PNG and CSS for those without; share it as a URL that carries the whole document.

Out of scope: raster tracing, component or theme building, accounts, telemetry, any server.
Recorded as a later idea, not v1: in-context prototyping, the shape applied to an avatar, a button,
a FAB and a loading indicator that morphs to a circle.
The project is independent of Google; "Material Design" is Google's trademark and the site says so.

## 2. Architecture

The engine is Google's `androidx.graphics:graphics-shapes` compiled to JavaScript behind a small
Kotlin façade. The UI is TypeScript and never sees a Kotlin type: it sends JSON documents in and
gets cubic Béziers out, which it renders as SVG.

```
engine/                 Gradle, Kotlin Multiplatform: jvm() + js()
  src/commonMain        document model + validation, builders, catalogue data, façade (@JsExport)
  src/commonTest        document round trips, validation
  src/jvmTest           fixture generation, catalogue sync test, Kotlin exporter round trip
  fixtures/             committed golden cubics, one JSON per document
packages/engine/        npm package @material-shape-studio/engine; dist/ is copied from the
                        Kotlin/JS build (ES module + .d.ts), never committed
web/                    Vite + React + TypeScript; workspace member depending on the package above
  src/document          types, defaults, URL codec
  src/engine            typed wrapper over the façade
  src/exporters         one module per target, pure functions document -> text
  src/ui                screens and components
.github/workflows       ci.yml (every PR), deploy.yml (main -> GitHub Pages)
```

`npm install` works without a Gradle build because the package exists before its `dist/` is built.
Testing or running anything that imports the engine needs `./gradlew build` first, which runs the
engine's tests and syncs the whole-program ES module and its `.d.mts` into `dist/`; `npm test` refuses
to run without it. CI does both. `wasmJs` is a later optional target of the same module, not part of v1.

## 3. The shape document

The document is the source of truth; paths and code are derived from it. It is JSON, versioned, and
mirrors the library's constructors one to one, so every exporter is a serialiser of the document into
one language's constructor call.

```ts
type ShapeDocument = { v: 1; name?: string; shape: Shape; transforms?: Transform[] }

type Rounding = { radius: number; smoothing?: number }        // smoothing defaults to 0
type Point    = [x: number, y: number]

type Shape =
  | { kind: "catalogue"; name: CatalogueName }                    // one of the 35, by its Compose name
  | { kind: "polygon"; vertices: Point[]; rounding?: Rounding; perVertexRounding?: Rounding[];
      center?: Point; repeat?: { count: number; mirror: boolean } }
  | { kind: "ngon"; vertices: number; radius?: number; center?: Point;
      rounding?: Rounding; perVertexRounding?: Rounding[] }
  | { kind: "circle"; vertices?: number; radius?: number; center?: Point }
  | { kind: "rectangle"; width?: number; height?: number; center?: Point;
      rounding?: Rounding; perVertexRounding?: Rounding[] }
  | { kind: "star"; verticesPerRadius: number; radius?: number; innerRadius?: number; center?: Point;
      rounding?: Rounding; innerRounding?: Rounding; perVertexRounding?: Rounding[] }
  | { kind: "pill"; width?: number; height?: number; smoothing?: number; center?: Point }
  | { kind: "pillStar"; width?: number; height?: number; verticesPerRadius?: number;
      innerRadiusRatio?: number; rounding?: Rounding; innerRounding?: Rounding;
      perVertexRounding?: Rounding[]; vertexSpacing?: number; startLocation?: number; center?: Point }
  | { kind: "features"; serialized: string; center?: Point }     // a FeatureSerializer "V1..." string

type Transform =
  | { type: "normalize" }                       // RoundedPolygon.normalized(): fit the unit square, aspect kept
  | { type: "rotate"; degrees: number }         // about the origin, like Compose Matrix.rotateZ
  | { type: "scale"; x: number; y: number }     // about the origin
  | { type: "translate"; x: number; y: number }
  | { type: "fillSquare" }                      // stretch so the bounds become exactly (0,0)-(1,1)
  | { type: "startAngle"; degrees: number }     // as Compose's toShape(startAngle); last only
```

Rules:

- An absent optional field means the library default, and exporters omit it too. That keeps emitted
  code as short as the catalogue's own source.
- `polygon.repeat` expands the slice exactly as Material's private `customPolygon` does (the engine
  vendors that algorithm), about `center`, which defaults to (0.5, 0.5) as it does there.
  `perVertexRounding` applies to the slice, before expansion. Exporters
  always emit the expanded vertex list, since no platform exposes the slice helper.
- `perVertexRounding`, when present, must have one entry per vertex the library constructor receives:
  the slice length for `polygon`, `vertices` for `ngon`, 4 for `rectangle`, `2 × verticesPerRadius`
  for `star` and `pillStar`. `rounding` is the fallback for vertices without an entry.
- For `features` without `center`, the engine uses the library default: the average of the
  features' anchor points.
- `startAngle` rotates the whole shape about the origin so that its first point lies at `degrees`
  from the polygon's centre, then the shape is recentred by its bounds, which is what Compose's
  `toShape(startAngle)` does when it draws. It changes the geometry, so it is a real transform.
- Transforms apply in order after the shape is built. New documents created in the editor start with
  `[normalize]`; the export panel warns when the final bounds leave the unit square, because Compose's
  `toShape()` scales the unit square to the component size.
- Validation is in the engine (common Kotlin) and rejects: fewer than three vertices, a rounding
  array of the wrong length, `smoothing` outside 0..1, `repeat.count < 1`, a `startAngle` not last,
  an unknown `kind`, `name` or `type`, a `v` other than 1. The message names the field.

### Catalogue equality

A document *is* a catalogue entry when its `shape.kind` is `catalogue`, or when the engine's
`matchCatalogue` finds a vendored entry whose cubics equal the document's within 1e-4 after the
document's own transforms. The Kotlin exporter then emits `MaterialShapes.Name` instead of a
constructor. A catalogue document with extra transforms emits `MaterialShapes.Name.transformed { }`.

### URL codec

The hash holds a query string: `#doc=<payload>&morph=<payload>&view=catalogue|editor|import|morph`.
A payload is `base64url(deflate-raw(JSON))`, produced with the browser's `CompressionStream`, no
dependency. A hash the codec cannot decode opens the catalogue with a dismissable notice, never a
blank page. The codec is a pure module with its own tests; nothing else touches `location.hash`.

## 4. Engine façade

Everything `@JsExport`ed takes and returns numbers, strings (JSON) and `Float32Array`. Cubics are a
flat `Float32Array` of 8 floats per cubic in the library's order: `anchor0X, anchor0Y, control0X,
control0Y, control1X, control1Y, anchor1X, anchor1Y`. Errors are thrown; JavaScript receives an
`Error` whose message is the validator's or the library's.

```ts
version(): string                              // JSON {engine, graphicsShapes}
catalogue(): string                            // JSON: [{ name, doc: ShapeDocument }] for all 35
build(doc: string): string                     // JSON BuildResult
buildCubics(doc: string): Float32Array         // the cubics only, for hot paths
matchCatalogue(doc: string): string | null     // catalogue name or null
createMorph(docA: string, docB: string): number   // handle; both documents are built once
morphCubics(handle: number, progress: number): Float32Array
morphBounds(handle: number): Float32Array      // [left, top, right, bottom] over all progress
releaseMorph(handle: number): void
parseSvgPath(d: string): string                // JSON: Feature[]
serializeFeatures(features: string): string    // Feature[] JSON in, "V1..." string out
featuresToDocument(features: string): string   // convenience: a `features` document, centre computed

type BuildResult = { cubics: number[]; bounds: [l, t, r, b]; center: Point;
                     features: Feature[]; catalogue: CatalogueName | null }
type Feature = { type: "convex" | "concave" | "edge" | "ignorable"; cubics: number[] }
```

Only edge, convex and concave features serialise, as in the library. The import screen therefore
requires every `ignorable` feature to be retyped before the document can be exported. The façade is
the whole public surface of the engine; the JVM side exposes the same functions as ordinary Kotlin for
tests and a possible later CLI.

## 5. Catalogue

The 35 shapes are vendored as 35 documents in the engine (Apache 2.0, with a NOTICE entry naming the
upstream file), for example Sunny as a `star` with eight vertices per radius, inner radius 0.8 and
rounding 0.15, then `normalize`; Oval as a `circle`, `scale`, `rotate`, `normalize`. Opening a
catalogue shape in the editor therefore shows Material's own parameters, and a JVM test compares each
vendored document's cubics with `androidx.compose.material3.MaterialShapes` from the Compose
Multiplatform desktop artifact, so an upstream change fails the build. Names are the Compose names
(`Cookie12Sided`); the Java exporter maps them to the Views constants (`COOKIE_12_SIDED`).

## 6. User interface

One page, four views selected by `view=` in the URL, with a persistent preview and export panel.

- **Preview** (every view): the shape rendered as an SVG path in a square viewport the way Compose's
  `toShape()` draws it: the unit square scaled to the viewport, then centred by the shape's bounds;
  controls for size, fill or outline, light or dark; the same component draws the
  catalogue thumbnails and the morph frame.
- **Catalogue**: a grid of the 35 shapes; click opens one in the editor as its own document; a
  second click (or a "morph to" action) sets it as the morph target.
- **Editor**: a kind selector and, for every kind, two views of the same document fields: controls
  in a side panel and handles on the canvas. Every change writes the document, which rebuilds the
  preview and the URL; values are rounded to three decimals on write, as the catalogue's data is.
  - *Controls*: every numeric field has a slider with the library's range and a numeric input, and
    dragging the input's label scrubs the value. Rounding has a master control for all corners, a
    per-corner override list, a link toggle, "copy to all corners" and presets (sharp, soft,
    squircle). Repeat count and mirror for `polygon`; a transforms list that can be reordered.
  - *Canvas*: slice vertices drag, and the repeated and mirrored copies are drawn ghosted so the
    slice is obvious. Each corner has a radius handle on its bisector and a smoothing handle;
    hovering shows the values. Clicking an edge midpoint inserts a vertex, Delete removes the
    selected one, arrows nudge and Shift makes steps ten times larger. Builder kinds expose handles
    for their fields: a star's outer and inner radius points, a pill's width and height, a
    rectangle's corner radius. A rotation ring writes a `rotate` transform. Grid and axis snapping
    can be toggled and Alt bypasses them.
  - *Starting points*: any catalogue shape opens with Material's own parameters; "Reset" restores
    them and "Compare" overlays the original outline on the preview.
  - *Variations*: a strip of six documents that perturb the current numeric fields within their
    ranges, regenerated on demand; clicking one adopts it.
  - *History*: undo and redo over the document, with the URL following the current state, and a
    shortcuts panel listing every key.
  - A validator error is shown next to the control that caused it, never as a blank preview.
- **Import**: a text box for an SVG `d` attribute; the detected features are listed and drawn with a
  colour per type; a feature's type can be changed; the result is a `features` document whose
  serialised string is shown and copyable.
- **Morph**: the current document and a target document, a scrubber and a play button, the frame
  drawn from `morphCubics`; the target is chosen from the catalogue or pasted as a share URL.
- **Export panel**: a target selector, the generated code with a copy button, and per-target
  options (size for SVG and CSS). Present in every view.

State is one `ShapeDocument` (plus a morph target) in a React reducer with a past, present and
future stack for undo and redo; the URL codec subscribes to the present with a short debounce. No
global store library. Every control is a labelled native input, so the editor works without a mouse;
the canvas handles are a second way in, never the only one.

## 7. Exporters

An exporter is a pure function `(doc: ShapeDocument, built: BuildResult, options) => { code: string;
language: string; filename: string }` in `web/src/exporters/<target>.ts`, snapshot-tested over the
fixture documents. Targets, in delivery order:

| Target | Emits |
|---|---|
| Kotlin, Compose | `MaterialShapes.Name` on catalogue equality, else the constructor (`RoundedPolygon(...)`, `RoundedPolygon.star(...)`, `RoundedPolygon(FeatureSerializer.parse("V1..."))`), then `.normalized()` and `.transformed { x, y -> ... }` for the transforms, then `.toShape(startAngle = n)` usage; a `Morph(a, b)` snippet on the morph view; `fillSquare` emits a small extension function |
| SVG | `<svg viewBox>` with one `<path d>` at the chosen size |
| CSS | `clip-path: path("...")` at a fixed size and `clip-path: shape(...)` for a responsive clip |
| Java, Views | the same as Kotlin in Java syntax with `MaterialShapes.COOKIE_12_SIDED` constants and `MaterialShapes.createShapeDrawable(shape)` |
| Dart | the constructor for the chosen package (`androidx_graphics_shapes` or `material_ui`), names read from that package's API when the exporter is written |
| Swift | `UIBezierPath` and SwiftUI `Path` from the cubics; path only |
| TypeScript | a `build(doc)` call against this project's own engine package |
| PNG | not an exporter: the preview rasterises its SVG to a canvas at the chosen size and downloads it |

Numbers are emitted exactly as stored in the document, so the Kotlin round trip compares the exported
code's cubics with the document's fixture without any rounding step.

## 8. Fidelity and tests

- **Engine parity**: `engine/fixtures/documents/` holds the fixture documents and
  `engine/fixtures/expected/` their JVM-built output, both committed. A JVM test requires the output
  to match exactly, so drift fails instead of being rewritten; only `./gradlew :engine:jvmTest
  -PupdateFixtures` regenerates. A vitest suite runs the JS engine over the same documents and
  compares cubics within 1e-5.
- **Catalogue sync**: the JVM test of section 5.
- **Kotlin round trip**: the Kotlin exporter's output for every fixture document is written into a
  generated JVM test source set, compiled and rendered in CI; cubics must equal the fixture.
- **Other exporters**: snapshot tests; Dart gets a `dart test` job once its package is chosen.
- **UI**: vitest for the codec, reducer and exporters; a Playwright smoke test against the built
  site that opens a catalogue shape, moves a slider and copies the Kotlin output.
- **Positive controls**: every parity test is shown to fail once by breaking a vendored constant, and
  the evidence goes into that slice's PR body.

## 9. Build, CI and hosting

`./gradlew build` runs the engine's tests and packages it; `npm test` runs vitest in each workspace; `npm run build`
produces `web/dist`. `ci.yml` runs all three on every pull request from a clean checkout; `deploy.yml`
builds on every push to `main` and publishes with `actions/deploy-pages`. Vite's `base` is `./`:
the app routes only through the URL hash, so relative asset URLs work under any path, nothing
depends on the Pages URL, and a custom domain is a Pages setting with no code change. The engine's
production size is measured by `npm run size -w packages/engine` and recorded in the README after
each change that affects it.
