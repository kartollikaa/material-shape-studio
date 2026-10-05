# Material Shape Studio CLI and local MCP

`material-shape-studio-mcp` runs the Material Shape Studio geometry engine locally. It does not need a hosted API, account, token, JDK, or model subscription. Node.js 24 or newer is required.

The package provides `shape-studio` for coding agents with shell access and `material-shape-studio-mcp` for agents that support local stdio MCP. Both use the same compiled Kotlin/JS geometry engine as the [Studio website](https://kartollikaa.github.io/material-shape-studio/).

The CLI accepts JSON documents from files and returns JSON on stdout. It writes a preview PNG only to an explicitly supplied new output path.

```sh
shape-studio list --filter Heart
shape-studio create --name Heart
shape-studio create --document shape.json
shape-studio preview --input comparison.json --output comparison.png
shape-studio export --document shape.json --target svg
```

`comparison.json` is an array of one to four objects with exactly `document`, `presentation` (`colour` as `#rrggbb`, `theme` `light` or `dark`, `context` `photo`, `button`, or `avatar`), and a `label` of at most 60 characters. Invalid input fails with the offending field on stderr and a nonzero exit. The create result includes the document and editable Studio URL. Export targets are `compose`, `svg`, and `css`.

To register the MCP in Claude Code after publication:

```sh
claude mcp add --transport stdio material-shape-studio -- npx --yes material-shape-studio-mcp@0.1.3
```

See the [website's connection page](https://kartollikaa.github.io/material-shape-studio/connect/) for current published version and other hosts. Installation and configuration may require user approval. Do not use an unpublished version from these example commands.
