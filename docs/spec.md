# Material Shape Studio: specification

What the app does and how its parts fit. The reasoning behind the architecture is in
[research/feasibility.md](./research/feasibility.md); the delivery order is in
[decomposition.md](./decomposition.md). Everything here is for v1 unless marked later.
The remote agent extension is specified separately in [mcp-spec.md](./mcp-spec.md) and implemented
as the service described in [mcp.md](./mcp.md).

## 1. Purpose and scope

A static web app for designers and developers working with Material 3 Expressive shapes:

1. **Browse** the 35-shape `MaterialShapes` catalogue, light and dark, and start from any of them.
2. **Create** a shape with Material's own vocabulary: the library builders, and a custom polygon
   made of one slice of vertices repeated around the centre, optionally mirrored, with a radius and a
   smoothing per corner.
3. **Imitate** a shape from an SVG path: detect its features, retype a corner the detector misread,
   keep the result as a `FeatureSerializer` string.
4. **Morph** the shape when it is pressed, the way Material's components do, and export the Compose
   `Morph` for it.
5. **Export** the shape as code for platforms with a port of `androidx.graphics.shapes`, and as SVG,
   PNG and CSS for those without; share it as a URL that carries the whole document.

Out of scope: raster tracing, component or theme building, accounts, and hosted services. The site counts its use with Google Analytics as §10 describes. The optional local agent CLI and stdio MCP are specified in [the agent integration spec](mcp-spec.md).
The studio shows the shape in use on a photo, an icon button and an avatar. Recorded as a later
idea, not v1: a FAB and a loading indicator that morphs to a circle.
The project is independent of Google; "Material Design" is Google's trademark and the site says so.

## 2. Architecture

The engine is Google's `androidx.graphics:graphics-shapes` compiled to JavaScript behind a small
Kotlin façade. The UI is TypeScript and never sees a Kotlin type: it sends JSON documents in and
gets cubic Béziers out, which it renders as SVG.

```
engine/                 Gradle, Kotlin Multiplatform: jvm() + js()
  src/commonMain        document model + validation, builders, catalogue data, ShapeEngine
  src/jsMain            the @JsExport façade
  src/commonTest        document round trips, validation
  src/jvmTest           fixture generation, catalogue sync test, Kotlin exporter round trip
  fixtures/             committed golden cubics, one JSON per document
packages/engine/        npm package @material-shape-studio/engine; dist/ is copied from the
                        Kotlin/JS build (ES module + .d.mts), never committed
packages/core/          shared shape documents, generated catalogue, pure exporters, the editor model,
                        and the Studio address codec used by the website, CLI and MCP
web/                    Vite + TypeScript, no UI framework; workspace member depending on the package above
  scripts/              generate-catalogue.mjs: the 35 MaterialShapes from Compose's source
  src/document.ts       compatibility re-export of shared shape document types
  src/catalogue/        compatibility re-export of the shared catalogue data
  src/export/           compatibility re-exports and the Kotlin round-trip test
  src/studio/           the page (page.ts) and its address synchronisation (address-sync.ts)
  src/connect-page.ts   the Connect an agent page: copy buttons and host tabs
  src/analytics.ts      the only module that imports Firebase (§10)
.github/workflows       ci.yml (every PR), deploy.yml (main -> GitHub Pages)
```

`npm install` works without a Gradle build because the package exists before its `dist/` is built.

An agent's link opens through the same address codec as the editor, then the engine validates it
before it replaces the current editor document. Imported documents have no catalogue identity and
retain their own reset baseline. The user can copy the current JSON after editing and return it to
an agent. An invalid link opens the default shape with the same dismissible notice as any other
undecodable hash; shapes outside the unit square show a warning near the preview.
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
  | { type: "startAngle"; degrees: integer }    // as Compose's toShape(startAngle); last only
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
  from the polygon's centre, as Compose's `toShape(startAngle)` does; `0` leaves the shape alone,
  as there. It changes the geometry, so it is a real transform. Compose then recentres every
  `toShape()` outline by its bounds when it draws; the engine does not recentre, and the preview
  does that step (§6).
- `fillSquare` refuses a shape flatter than the library's 1e-4 distance epsilon. The library's
  `calculateBounds` starts its maxima at `Float.MIN_VALUE`, so for a shape lying wholly at negative
  coordinates `bounds` and `normalize` differ from the true extent; the engine keeps that for them, as
  Compose does, and a fixture pins it. `fillSquare` is the engine's own transform, so it measures the
  true extent and always reaches the unit square.
- Transforms apply in order after the shape is built. Documents in the studio start from a catalogue
  shape and keep its closing `normalize`, so their bounds stay in the unit square. Later, when a
  document can arrive from a link, the export panel warns when its final bounds leave the unit
  square, because Compose's `toShape()` scales the unit square to the component size.
- Validation is in the engine (common Kotlin) and rejects: fewer than three vertices, a rounding
  array of the wrong length, `smoothing` outside 0..1, `repeat.count < 1`, a `startAngle` not last,
  an unknown `kind`, `name` or `type`, a `v` other than 1. The message names the field.

### Catalogue equality

A document *is* a catalogue entry when its `shape.kind` is `catalogue`, or when the engine's
`matchCatalogue` finds a vendored entry whose cubics equal the document's within 1e-4 after the
document's own transforms. The Kotlin exporter then emits `MaterialShapes.Name` instead of a
constructor. Any other document, including an edited catalogue shape, exports as a constructor.

### URL codec

The hash holds human-readable named parameters, for example
`#shape=Heart&rotate=45&roundness=125&colour=123456&tab=svg`. `shape` names the catalogue origin;
control parameters use the displayed units, so roundness, softness, depth and squash use percentages,
and rotate uses degrees. Controls at their catalogue defaults are omitted. Colour is a hex value
without its leading `#`, and `tab` names the export format. `selected` preserves the selected dot.
Optional `geometry`, `base` and `transforms` parameters carry ordinary URL-escaped JSON for edits
that the named controls cannot reproduce, including custom dot positions and base corner radii.
Named control values apply after that geometry, so editing a value in the address bar takes effect.

The address updates synchronously during edits, including undo, redo and reset, using
`history.replaceState` to preserve browser history. Copying the browser address shares the current
state; no share button is needed. Opening or editing the hash restores the editor. Removing the
hash restores the default shape, colour and export tab, and clears any link notice. The parameters
can optionally declare `v=1`; other versions are rejected.

A shape without a catalogue origin, such as a document from an agent, replaces `shape` with
`document`: the URL-escaped JSON of the document it was opened from, which is also its reset
baseline. Its edits use the same named parameters and `geometry`, `base` and `transforms` overrides
as a catalogue shape, so the address follows every edit. Exactly one of `shape` and `document` is
present. The CLI and MCP build their links with this codec from `@material-shape-studio/core`: an
unedited catalogue document links as `shape=Name`, anything else as `document`, with the colour in
lowercase and the preview theme and context left out because the Studio has no use for them.

Older agents linked a compressed `#doc=` fragment: base64url-encoded deflate-raw JSON of the
document and its presentation. The Studio still opens one, decoding it asynchronously with bounded
decompression, and then rewrites the address in the readable form. A shape edit made before decoding
finishes wins, while a tab change keeps the chosen tab.

A hash the codec cannot decode opens the default shape with a dismissible notice, never a blank
page. Decoding bounds the address length, rejects unknown or duplicate parameters, validates control
ranges and editor metadata, and limits geometry before passing the document to the engine's validation. The codec has its own tests;
only its address synchronisation module reads the URL hash or writes the browser address.

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
morphBounds(handle: number): Float32Array      // [left, top, right, bottom] holding the outline at any progress
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
the whole public surface of the engine for JavaScript. On the JVM the same engine is ordinary Kotlin,
`ShapeEngine.parse` and `ShapeEngine.build` returning a `BuiltShape`, used by the tests and a possible
later CLI.

## 5. Catalogue

The 35 shapes are vendored as 35 documents in the engine (Apache 2.0, with a NOTICE entry naming the
upstream file), for example Sunny as a `star` with eight vertices per radius, inner radius 0.8 and
rounding 0.15, then `normalize`; Oval as a `circle`, `scale`, `rotate`, `normalize`. Opening a
catalogue shape in the editor therefore shows Material's own parameters, and a JVM test compares each
vendored document's cubics with `androidx.compose.material3.MaterialShapes` from the Compose
Multiplatform desktop artifact, so an upstream change fails the build. Names are the Compose names
(`Cookie12Sided`); the Java exporter maps them to the Views constants (`COOKIE_12_SIDED`).

## 6. User interface

One page in three steps, framework-free TypeScript over the page's own markup in `web/index.html`.
Every piece exists because one of the three jobs needs it: pick a shape, adjust it, take it into an
app. It follows the system's light or dark setting.

The focused canvas places the catalogue on the left, the preview in the centre, and adjustments on
the right in a wider panel that gives labels and numeric inputs room. Export actions sit below the adjustments, with full code behind **Show code**. Smaller
screens stack these sections in reading order. On phones, **Change shape** toggles the catalogue;
picking a shape closes it and returns focus to the toggle. The compact canvas stays visible while
adjustments scroll. The canvas names the selected shape and distinguishes Material's original from an
edited shape; Reset lives beside that name.

- **Pick a shape**: the 35 catalogue shapes as thumbnails; hovering names one, and
  picking one replaces the current shape.
- **Preview**: the shape at full size in the chosen colour. Polygon shapes immediately show their
  slice dots and faint construction guides, explaining vertices outside the rounded outline;
  dragging a dot moves that vertex, and the repeated pattern follows. Arrow keys nudge the selected
  dot, Shift for larger steps. Transparent pointer targets extend beyond the visible dots without
  shrinking with the preview. Below it, **In use** shows the shape as a photo, an icon button and an
  avatar.
- **Adjust shape**: sliders and editable numeric values that change the selected shape. Numeric
  values use the displayed units, commit on Enter or blur, clamp to the control's range, and
  reject empty values without changing the shape. Each control but Rotate includes a short
  reason: Repeats for patterns that repeat, Points and Depth for stars, Sides for n-gons, Proportion
  for rectangles, Squash for circles, Roundness, and Rotate where it shows. Roundness scales every
  corner of Material's recipe together; sharp shapes start at 0%. Then Colour, used in the preview
  and the exports. **Reset** appears once the shape differs from Material's. Polygon shapes show
  all relevant properties in one list, including Softness and the roundness of the selected dot,
  with **Add a dot** and **Remove the selected dot** directly below. Removal never leaves fewer than
  three corners or changes a one-off shape's repeats.
- **Take it into your app**: tabs for Compose, SVG, PNG and CSS (§7), each with a one-line description, its
  copy or download buttons, and the code where there is code.
- **Undo and Redo** in the header, and Ctrl+Z / Ctrl+Shift+Z, step through every edit.

A document that cannot be built keeps the last good preview and says why under it, and an export
that fails says so on its button. The studio works without a mouse: every control is a labelled
native input that keeps focus while it changes the shape, Tab reaches each dot and selects it, and
the arrow keys move between export tabs. Dragging dots is a second way in.

Restoring focus after an edit never scrolls the page. The canvas reserves space for Reset and the
dot hint, and the code preview keeps a stable height as a slider updates the export, so edits near
the bottom do not jump the page upward. Circle adjustments reserve space for Rotate while it is
unavailable, so introducing or removing it does not change the page height. Slider commits also
preserve the viewport when their edit changes the controls, as do numeric value commits.
Numeric blur commits allow native focus navigation to finish before rebuilding controls, so Tab
continues to the next input instead of losing focus when its previous input is replaced.

## 7. Exporters

Exporters are pure functions in `packages/core/src/export/`, one module per target, taking a document or its
normalized cubics and returning text:

| Target | Emits |
|---|---|
| Compose | A paste-ready Kotlin file whose `ShapedBox` clips a box to the shape. An untouched catalogue shape is `MaterialShapes.Name`; anything else is a `private val MyShape` built with the `graphics-shapes` constructor for its kind, then `.transformed { x, y -> TransformResult(...) }` for each rotation or scale and `.normalized()`. A repeated polygon is emitted with its expanded vertices, since no platform exposes Material's slice helper; one `rounding` replaces the per-vertex list when every corner is alike, and transforms that change nothing are left out. The file's first line says it needs Compose Material 3 with the Expressive API, which `MaterialShapes` and `toShape()` belong to. |
| SVG | `<svg viewBox="0 0 100 100">` with one `<path>` in the chosen colour |
| PNG | Not an exporter: the studio fills the path on a 1024 × 1024 canvas with a transparent background |
| CSS | One `clip-path: shape(...)` in percentages, so the clip follows the element's size |

`fillSquare` and `startAngle` have no Compose export yet and raise an error; the studio never
produces them. Planned targets: Java for Views with `MaterialShapes.COOKIE_12_SIDED` constants and
`createShapeDrawable`, Dart for the chosen Flutter package, Swift `UIBezierPath` and SwiftUI `Path`,
TypeScript against this project's engine package, and a Compose `Morph` snippet for the press
animation.

Coordinates in the Compose export are rounded to five decimals, so its geometry equals the engine's
within 1e-4 rather than exactly; a compiled check proves that bound for every catalogue shape.

## 8. Fidelity and tests

- **Engine parity**: `engine/fixtures/documents/` holds the fixture documents and
  `engine/fixtures/expected/` their JVM-built output, both committed. A JVM test requires the output
  to match exactly, so drift fails instead of being rewritten; only `./gradlew :engine:jvmTest
  -PupdateFixtures` regenerates. A vitest suite runs the JS engine over the same documents and
  compares cubics within 1e-5, with the same count. That guarantee holds away from the library's
  1e-4 epsilon: Kotlin/JS keeps the library's `Float` constants as doubles while arrays store
  float32, so a feature whose length or cut sits within float rounding of 1e-4 can be dropped on one
  target and kept on the other. Fixtures therefore stay clear of such degenerate edges.
- **Catalogue sync**: the JVM test of section 5.
- **Kotlin round trip**: `npm run round-trip -w web` writes the Compose expression for every
  catalogue shape, every exportable engine fixture and a set of edited shapes into
  `engine/src/jvmTest/.../export/ExportCases.kt`. The JVM test compiles them against `graphics-shapes`
  and requires the engine's cubics within 1e-4, and a web test fails when the committed file no
  longer matches the exporter. It covers the expressions, not the Compose wrapper around them, which
  needs Compose on the classpath.
- **Other exporters**: snapshot tests; Dart gets a `dart test` job once its package is chosen.
- **UI**: vitest for the exporters, the editing model, the page in jsdom and the URL codec; a
  Playwright smoke test against the built site that opens a catalogue shape, moves a slider and
  copies the Kotlin output.
- **Positive controls**: every parity test is shown to fail once by breaking a vendored constant, and
  the evidence goes into that slice's PR body.

## 9. Build, CI and hosting

`./gradlew build` runs the engine's tests and packages it; `npm test` runs vitest in each workspace; `npm run build`
produces `web/dist`. `ci.yml` runs all three on every pull request from a clean checkout; `deploy.yml`
builds on every push to `main` and publishes with `actions/deploy-pages`, packaging the engine with `./gradlew :engine:jsPackage` before building the site. Vite's `base` is `./`:
the app routes only through the URL hash, so relative asset URLs work under any path, nothing
depends on the Pages URL, and a custom domain is a Pages setting with no code change; only the
analytics key's allowed referrers (§10) must then list the new domain. The engine's
production size is measured by `npm run size -w packages/engine` and recorded in the README after
each change that affects it.

## 10. Usage analytics

The published site reports how it is used to Google Analytics 4 through Firebase (project
`material-shape-studio`, its web app and the GA4 property linked to it). Events are sent only after
the action succeeded:

| Event | Sent when | Parameters |
|---|---|---|
| `page_view` | the studio or the Connect page opens | `page_title`, `page_location` |
| `select_shape` | a catalogue shape is picked | `shape`: its Compose name |
| `export_shape` | code is copied or a file downloaded | `format`: `compose`, `svg`, `png` or `css`; `method`: `copy` or `download`; `shape`: the catalogue name or `custom`; `edited` |
| `copy_shape_document` | **Copy shape document** copied the JSON | none |
| `connect_open` | the Connect page opens | none |
| `plugin_install` | an install command or the agent prompt is copied, or **Add to Cursor** is clicked | `host`: `agent`, `claude-code`, `codex`, `cursor` or `cli`; `method`: `copy` or `link` |
| `plugin_verify` | the check command is copied | none |

`page_location` is the origin and path only. The hash carries the whole shape document, so it is
never reported, and nor are the document, the code, the colour or any edit. Automatic page views are
off, so editing, which rewrites the address, adds no page views. Google Analytics sets its own
first-party cookies.

`web/src/analytics.ts` is the only module that imports Firebase, and only `firebase/app` and
`firebase/analytics`. The pages receive its typed `track` function, so their tests pass a spy. It
loads the SDK lazily, and only in a production build, when `isSupported()` holds, when the browser is
not driven by automation (`navigator.webdriver`, which covers the Playwright checks), and when the
build was not made with `VITE_ANALYTICS=off`. Anywhere else `track` does nothing. The web config,
API key included, is public by design and committed. The key is limited to Firebase's APIs and to
the Pages origin as its referrer.

Data appears under Analytics in the Firebase console for the project, or in its GA4 property;
the Realtime report shows events within seconds of a visit. To build the site without analytics,
for a fork or a mirror, run `VITE_ANALYTICS=off npm run build -w web`. A visitor who blocks Google
Analytics, with a content blocker or Google's opt-out add-on, sends nothing; the studio works the
same.

Tests: a unit test of the wrapper (off outside production, `isSupported()` respected, early events
delivered once and in order, the address without its hash), DOM tests of both pages with a spy for
every event, and a Playwright check that the built site makes no request to Google Analytics or
Firebase under automation.
