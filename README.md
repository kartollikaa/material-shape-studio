# Material Shape Studio

A web editor for the shapes of Material 3 Expressive: start from one of Material's shapes, reshape
it, see it in use, and export it as code for the platforms that have a port of
`androidx.graphics.shapes`, plus SVG, PNG and CSS.

An independent open-source project, not affiliated with or endorsed by Google. Material Design is a
trademark of Google LLC.

The studio is live at https://kartollikaa.github.io/material-shape-studio/. Pick one of Material's 35
shapes, adjust it with a few plain sliders or by dragging its dots, see it on a photo, an icon
button and an avatar, and export it as Compose code, SVG, PNG or CSS. An untouched shape exports
as Material's own `MaterialShapes` entry.

The focused canvas keeps the catalogue on the left, the shape in the centre, and its controls on
the right, with exports below. On smaller screens those sections stack. Adjustments keep keyboard
focus and the page's scroll position, so editing a slider does not pull the page back up.

Under it, the engine runs Google's `graphics-shapes` in the browser, so what you see is what
Compose draws. Read in this order:

1. [docs/spec.md](docs/spec.md): what the app does and how its parts fit.
2. [docs/decomposition.md](docs/decomposition.md): the delivery plan, one pull request per slice.
3. [docs/research/feasibility.md](docs/research/feasibility.md): why this design, and the prior art.

## Development

The shape engine is Google's Kotlin library compiled to JavaScript, so the build needs a JDK as well
as Node. Gradle runs only at build time; the published site is static files.

Prerequisites: a JDK 17 or newer, and Node at the version in [`.nvmrc`](.nvmrc). If JDK 17 itself
is not installed, Gradle downloads it on the first build.

```bash
./gradlew build
```

Runs the engine's tests on the JVM and on Kotlin/JS under Node, and packages the engine as an ES
module with TypeScript declarations into `packages/engine/dist`.

```bash
npm ci
```

Installs the npm workspaces: `packages/engine`, `packages/core`, and `web`.

```bash
npm test
```

Runs the engine's JS tests, including parity with the JVM fixtures, and the web tests. It refuses to
run until `./gradlew build` has packaged the engine.

```bash
npm run build
```

Builds the static site into `web/dist`. The web workspace depends on the engine package, so this also
needs `./gradlew build` first. Asset URLs are relative, so the site can be served from any path.

```bash
npm run dev -w web
```

Starts the studio on a local development server.

```bash
npm run catalogue -w web
```

Regenerates `packages/core/src/catalogue/catalogue.json` from Compose's `MaterialShapes.kt` at the pinned
androidx commit in `web/scripts/generate-catalogue.mjs`. Change the commit there to follow upstream.

## The shared package

`@material-shape-studio/core` owns the versioned shape document, generated catalogue, pure Compose/SVG/CSS exporters, and the browser-compatible share-link codec. The Studio imports them through this package. The codec carries a complete document and presentation fields in a compressed `#doc=` fragment. It bounds the compressed and decompressed payload before parsing. Engine validation still decides whether a shape's geometry is valid.

## The engine package

`@material-shape-studio/engine` exports `version()`, `build(doc)`, `buildCubics(doc)`,
`createMorph(start, end)`, `morphCubics(handle, progress)`, `morphBounds(handle)` and
`releaseMorph(handle)`. A document is JSON as described in [docs/spec.md](docs/spec.md);
`buildCubics` and `morphCubics` return a `Float32Array` with eight numbers per cubic Bézier.
Fixture documents live in `engine/fixtures/documents` and morph fixtures in `engine/fixtures/morphs`;
their JVM-built output is in `engine/fixtures/expected` and `engine/fixtures/expected-morphs`. After a deliberate change to the engine's output,
regenerate them:

```bash
./gradlew :engine:jvmTest -PupdateFixtures
```

Production size of the engine, measured when S1b landed: 394.6 KB minified, 96.7 KB gzipped.
Re-measure it with:

```bash
npm run size -w packages/engine
```

## Licence

Apache License 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
