# Material Shape Studio

A web editor for the shapes of Material 3 Expressive: browse the catalogue, create
new shapes in Material's own vocabulary, imitate a shape from an SVG path, preview morphs, and export
code for the platforms that have a port of `androidx.graphics.shapes`, plus SVG, PNG and CSS.

An independent open-source project, not affiliated with or endorsed by Google. Material Design is a
trademark of Google LLC.

The engine builds `ngon` and `polygon` shape documents, including Material's repeat-and-mirror
slices, on the JVM and in JavaScript. The site is still a placeholder page; the editor arrives slice
by slice. Read in this order:

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

Installs the npm workspaces: `packages/engine` and `web`.

```bash
npm test
```

Runs the engine's JS tests, including parity with the JVM fixtures, and the web tests. It refuses to
run until `./gradlew build` has packaged the engine.

```bash
npm run build
```

Builds the static site into `web/dist`. Asset URLs are relative, so it can be served from any path.

```bash
npm run dev -w web
```

Starts a local development server.

## The engine package

`@material-shape-studio/engine` exports `version()`, `build(doc)` and `buildCubics(doc)`. A document
is JSON as described in [docs/spec.md](docs/spec.md); `buildCubics` returns a `Float32Array` with
eight numbers per cubic Bézier. Fixture documents live in `engine/fixtures/documents`, and their
JVM-built output in `engine/fixtures/expected`. After a deliberate change to the engine's output,
regenerate them:

```bash
./gradlew :engine:jvmTest -PupdateFixtures
```

Production size of the engine, measured when S1 landed: 333.5 KB minified, 83.1 KB gzipped.
Re-measure it with:

```bash
npm run size -w packages/engine
```

## Licence

Apache License 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
