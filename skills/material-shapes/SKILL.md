---
name: material-shapes
description: Use when a developer asks an agent to create, invent, compare, refine, or export Material 3 Expressive shapes for Compose, SVG, or CSS, including a custom shape described only by a mood, an idea, or "surprise me".
---

# Material shapes

Use the local `shape-studio` CLI to make deterministic geometry, then show the resulting preview and editable Studio link to the developer. Never hand-write shape geometry or Compose shape code instead; if the CLI cannot run, say why and offer the web Studio at https://kartollikaa.github.io/material-shape-studio/.

Run every command as `npm exec --yes --package=material-shape-studio-mcp@0.1.1 -- shape-studio ...`. It needs Node.js 24 or newer, network access to the npm registry on first use, and no API key. Ask for any shell approval your host requires.

1. Run `shape-studio list --filter NAME` to find one of Material's 35 presets (for example `Cookie7Sided`, `Heart`, `Sunny`), or write a shape document file as described below. When the developer describes a mood or idea instead of naming a preset, or asks you to come up with something, read [references/shape-design.md](references/shape-design.md) first and follow its workflow for inventing shapes.
2. Run `shape-studio create --name NAME` or `shape-studio create --document shape.json`. Use its returned document as the source of truth and give the developer its editable `studioUrl`. Mention any `warnings`.
3. To compare variants, write an array of one to four objects with exactly `document`, `presentation` (`colour` as `#rrggbb`, `theme` `light` or `dark`, `context` `photo`, `button`, or `avatar`), and a `label` of at most 60 characters, then run `shape-studio preview --input variants.json --output variants.png`. Show the image and the links, which follow the input order.
4. After the developer chooses or edits a shape, write the exact returned or copied document to a file and run `shape-studio export --document shape.json --target compose|svg|css`. Give the developer the returned `code`.

## Shape documents

A document is `{"v": 1, "shape": {...}, "transforms": [...]}`. End `transforms` with `{"type": "normalize"}` so the shape fits the unit square; without it the shape is centred on the origin and the CLI warns. Rounding is `{"radius": R}` in the shape's own units, with optional `"smoothing"` from 0 to 1.

- Regular polygon: `{"kind": "ngon", "vertices": 7, "rounding": {"radius": 0.3}}`
- Star: `{"kind": "star", "verticesPerRadius": 8, "innerRadius": 0.8, "rounding": {"radius": 0.15}}`
- Also `circle`, `rectangle` (`width`, `height`), `pill`, `pillStar`, and `polygon` (`vertices` as `[x, y]` points, optional `repeat: {"count", "mirror"}`). Copy a preset's document from `list` to start from Material's own geometry.
- Other transforms: `rotate` (`degrees`), `scale` (`x`, `y`), `translate` (`x`, `y`), `startAngle` (`degrees`).

Before writing any document of your own, read [references/shape-design.md](references/shape-design.md): what every field does to the look, coordinate and rounding units, `perVertexRounding` order, how `repeat` and `mirror` build symmetric shapes, and starting points for common moods.

The CLI prints JSON to stdout, and errors naming the offending field to stderr with a nonzero exit. Preview refuses to overwrite an existing PNG path. The Studio does not send browser edits back to the agent; ask the developer for the copied shape document when they refine a shape there.
