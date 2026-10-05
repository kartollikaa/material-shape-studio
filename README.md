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
the right, with export actions beside the editor and full code behind **Show code**. On phones,
**Change shape** opens the catalogue and a compact preview stays visible during adjustment.
Construction dots and guides are available immediately on polygon shapes. Slider values are also editable:
type an angle or percentage directly. Adjustments keep keyboard focus and the page's scroll
position, so editing a value does not pull the page back up.

The browser address updates automatically as you edit. Copy its URL to share or save the shape:
opening it restores the adjustments, edited dots, colour and export tab. Named parameters such as
`#shape=Heart&rotate=45&roundness=125&colour=123456&tab=svg` can be edited directly in the address bar.
Values use the controls' displayed units; custom dot geometry is included as JSON when needed.
No account or server is needed. An invalid link opens the default shape with a
dismissible notice.

The live site counts page views and a few actions, such as picking a shape, exporting it, and
copying an install command on the Connect page, with Google Analytics through Firebase. It never
sends the shape or the address hash. Development servers, tests and automated browsers send
nothing. The events are listed in [docs/spec.md §10](docs/spec.md#10-usage-analytics), and the
data is under Analytics in the Firebase console of project `material-shape-studio`. A fork should
build without it: `VITE_ANALYTICS=off npm run build -w web`.

A shape from outside the catalogue, such as one an agent made, carries its whole document in a
`document` parameter instead of `shape`, and its edits follow as the same named parameters. It can be
adjusted and reset to its imported version, and the agent CLI links use exactly this address.
Older `#doc=` links still open and are rewritten in the readable form. **Copy shape document** copies
the current JSON, which is how edits travel back to an agent or developer. A malformed link opens the
default shape with the same dismissible notice.

The [Connect an agent](https://kartollikaa.github.io/material-shape-studio/connect/) page installs the
free local tools: a prompt to paste into any agent, the plugin from this repository's marketplace for
Claude Code and Codex, an Add to Cursor link for the stdio MCP, and the plain CLI. Before the package is
published it shows an honest unavailable state. The CLI and MCP expose listing, creation, PNG comparison previews, and
Compose/SVG/CSS export; see [docs/mcp.md](docs/mcp.md). A remote HTTP prototype exists but is not the
selected release path.

In a Claude Code session, the plugin installs in one line:

```
/plugin install material-shape-studio --marketplace kartollikaa/material-shape-studio
```

In Codex, add the marketplace, then install Material Shape Studio from `/plugins`:

```bash
codex plugin marketplace add kartollikaa/material-shape-studio
```

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

Installs the npm workspaces: `packages/engine`, `packages/core`, `web`, and `server`.

```bash
npm test
```

Runs the engine's JS tests, including parity with the JVM fixtures, and the web tests. It refuses to
run until `./gradlew build` has packaged the engine.

```bash
npm run build
```

Builds the static site into `web/dist` and the local CLI/MCP into `server/dist`. Both depend on the
engine package, so this also needs `./gradlew build` first. Site asset URLs are relative, so it can
be served from any path. `npm run test:e2e -w web` checks the built site in Chrome at root and
repository subpaths.

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

`@material-shape-studio/core` owns the versioned shape document, generated catalogue, pure Compose/SVG/CSS exporters, the editor model, and the Studio address codec. The Studio, the CLI and the MCP all import them from this package, so an agent's link is the address the website writes. The core also keeps the decoder for older compressed `#doc=` links, which bounds the compressed and decompressed payload before parsing. Engine validation still decides whether a shape's geometry is valid.

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
