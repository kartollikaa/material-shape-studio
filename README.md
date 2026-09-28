# Material Shape Studio

A web editor for the shapes of Material 3 Expressive: browse the catalogue, create
new shapes in Material's own vocabulary, imitate a shape from an SVG path, preview morphs, and export
code for the platforms that have a port of `androidx.graphics.shapes`, plus SVG, PNG and CSS.

An independent open-source project, not affiliated with or endorsed by Google. Material Design is a
trademark of Google LLC.

The build skeleton is in place and the site is a placeholder page; the editor arrives slice by
slice. Read in this order:

1. [docs/spec.md](docs/spec.md): what the app does and how its parts fit.
2. [docs/decomposition.md](docs/decomposition.md): the delivery plan, one pull request per slice.
3. [docs/research/feasibility.md](docs/research/feasibility.md): why this design, and the prior art.

## Development

The shape engine is Google's Kotlin library compiled to JavaScript, so the build needs a JDK as well
as Node. Gradle runs only at build time; the published site is static files.

Prerequisites: a JDK 17 or newer, and Node at the version in [`.nvmrc`](.nvmrc).

```bash
./gradlew check
```

Runs the engine's tests on the JVM and on Kotlin/JS under Node.

```bash
npm ci
```

Installs the npm workspaces: `packages/engine` and `web`.

```bash
npm test
```

Runs the web tests.

```bash
npm run build
```

Builds the static site into `web/dist`. Asset URLs are relative, so it can be served from any path.

```bash
npm run dev -w web
```

Starts a local development server.

## Licence

Apache License 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
