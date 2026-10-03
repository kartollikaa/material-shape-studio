---
name: material-shapes
description: Use when a developer asks an agent to create, compare, refine, or export Material 3 Expressive shapes for Compose, SVG, or CSS.
---

# Material shapes

Use the local `shape-studio` CLI to make deterministic geometry, then show the resulting preview and editable Studio link to the developer. The CLI requires Node.js 24 or newer. It needs no hosted service or API key.

Run the published version advertised at https://kartollikaa.github.io/material-shape-studio/connect/ with `npm exec --yes --package=material-shape-studio-mcp@VERSION -- shape-studio ...`. Ask for any installation or shell approval your host requires. If the site says the package is unpublished, explain that CLI integration is unavailable and let the developer use the web Studio.

1. Run `shape-studio list --filter NAME` to discover a preset, or prepare a complete versioned shape document JSON file.
2. Run `shape-studio create --name NAME` or `shape-studio create --document shape.json`. Use its returned document as the source of truth and give the developer its editable `studioUrl`.
3. To compare variants, write an array of up to four objects with `document`, `presentation` (`colour`, `theme`, `context`), and `label`, then run `shape-studio preview --input variants.json --output variants.png`. Show the image and links.
4. After the developer chooses or edits a shape, use the exact returned or copied document with `shape-studio export --document shape.json --target compose|svg|css`.

The CLI prints JSON to stdout and errors to stderr. Preview refuses to overwrite an existing PNG path. The Studio does not automatically send browser edits back to the agent; ask the developer for the copied shape document when they refine it there.
