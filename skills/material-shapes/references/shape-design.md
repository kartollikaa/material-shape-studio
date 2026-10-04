# Designing shapes

How a shape document turns into a silhouette, what every field does to the look, and how to invent
good shapes from a mood or a "surprise me". Every example here builds without warnings; copy one and
change it rather than starting from an empty file.

## How a shape is built

1. The `shape` object picks a `kind` that builds a polygon: a list of corners, each with its own
   rounding.
2. `transforms` run in order on that polygon.
3. `normalize` scales and moves the result into the unit square, keeping its aspect ratio. Compose's
   `toShape()` then stretches the unit square to the component, so a wide shape stays wide inside a
   square button.

Screen coordinates: x grows right, y grows **down**. Angles start at the right (0°) and grow
**clockwise** on screen, so −90° is straight up. `ngon`, `star`, and `circle` sit on a radius of 1
around (0, 0); `rectangle`, `pill`, and `pillStar` are 2 wide by default; a `polygon` uses whatever
coordinates you write, and Material's own polygons use the unit square with the centre at (0.5, 0.5).

### Rounding

`rounding` is `{"radius": R, "smoothing": S}` and applies to every corner of the shape.

- `radius` is a length in the shape's own units, not a fraction. On a radius-1 `ngon` or `star`,
  0.1 is a barely softened corner, 0.3 is friendly, 0.5 is plump, and 1 or more makes a convex
  shape read as a circle. A unit-square `polygon` is half that size, so halve those numbers.
- A radius larger than the neighbouring edges allow is shrunk to fit; it never overshoots. A huge
  radius just means "as round as possible".
- `smoothing` (0 to 1) changes the curve, not its size. 0 is a circular arc that meets the edge with
  a visible kink in curvature; 1 starts the curve further along the edge and blends it in, giving a
  squircle-like, more expensive-looking softness. 0.5 to 1 suits soft UI; 0 suits crisp,
  geometric shapes.
- `perVertexRounding` gives each corner its own rounding. Its length must equal the number of
  corners the kind builds (listed per kind below); `rounding` is ignored where it is given.
- Mixing radii is where character comes from: big on the corners that should feel soft, near 0 on
  notches and tips that should stay crisp (Material's `Heart` uses 0.016 at the top notch and about
  1 on the lobes).

## Kinds

| `kind` | Fields (default) | Corners for `perVertexRounding` |
|---|---|---|
| `circle` | `vertices` (8), `radius` (1) | none |
| `ngon` | `vertices` (≥ 3), `radius` (1) | `vertices`; first at 0° (right), then clockwise |
| `rectangle` | `width` (2), `height` (2) | 4: bottom-right, bottom-left, top-left, top-right |
| `star` | `verticesPerRadius` (≥ 2), `radius` (1), `innerRadius` (0.5), `innerRounding` | 2 × `verticesPerRadius`, alternating tip, valley; first tip at 0° |
| `pill` | `width` (2), `height` (1), `smoothing` (0) | none |
| `pillStar` | `width` (2), `height` (1), `verticesPerRadius` (8), `innerRadiusRatio` (0.5), `innerRounding`, `vertexSpacing` (0.5), `startLocation` (0) | 2 × `verticesPerRadius` |
| `polygon` | `vertices` (list of `[x, y]`), `repeat` | one per listed vertex, before `repeat` |
| `features` | `serialized` | none |

All kinds except `circle`, `pill`, and `features` take `rounding` and `perVertexRounding`. All take
`center`, which only matters as the pivot of a `polygon` `repeat` (default `[0.5, 0.5]`), because
`normalize` recentres everything else.

- **`circle`**: `vertices` only changes how the circle is approximated for morphing; leave it.
- **`ngon`**: a regular polygon. With rounding 0.4 to 0.6 it becomes a soft triangle, square, or
  pentagon. Odd counts point right; rotate −90 to point a corner up.
- **`rectangle`**: `width` and `height` set the proportions. Rounding up to half the short side; a
  square with `{"radius": 0.8, "smoothing": 1}` is a squircle.
- **`star`**: `verticesPerRadius` is the number of points. `innerRadius` (must stay below `radius`)
  is the depth of the valleys and decides the character:

  | `innerRadius` | Reads as |
  |---|---|
  | 0.3 | spiky star or splat with thin arms |
  | 0.5 | classic star |
  | 0.7 | badge, seal, or gear |
  | 0.8 to 0.9 | gently scalloped circle (cookie) |

  `rounding` rounds the tips; `innerRounding` rounds the valleys and defaults to `rounding`. Big tip
  rounding with `innerRounding` 0 gives puffy lobes with crisp creases: a cloud or flower.
  With 3 to 5 points, big tip rounding swallows the valleys and the shape reads as a blob; for
  clearly separate lobes or petals use a mirrored `polygon` with the valley about 0.2 from the centre.
- **`pill`**: a capsule. `smoothing` 1 squares off the ends slightly.
- **`pillStar`**: a star whose points run around a pill outline; good for wide, energetic badges.
  `innerRadiusRatio` (above 0, at most 1) is the valley depth like `innerRadius`; near 1 it is a
  pill with small bumps. `vertexSpacing` (0 to 1) decides how points crowd around the round ends:
  0 spaces the valleys like the straight edges, 1 spaces the tips that way. `startLocation` (0 to 1)
  slides every point along the outline; with few points it visibly changes the silhouette.
- **`polygon`**: free-form outline. List corners in drawing order (clockwise on screen). This is the
  kind for organic blobs, hearts, arrows, and anything asymmetric; most of Material's catalogue is
  built this way.
- **`features`**: an opaque string the Studio produces. Never write one; only pass one through
  unchanged.

### `repeat` and `mirror`

`repeat` turns a short `polygon` slice into a symmetric shape, spun around `center`.

- `{"count": N, "mirror": false}` copies the slice N times, rotating each copy by 360/N degrees.
- `{"count": N, "mirror": true}` draws half of one symmetric unit. Put the first vertex on a symmetry
  axis, continue clockwise for at most 180/N degrees, and the engine reflects and repeats the slice.
  The result has N × (2 × slice − 1) corners; without mirror it has N × slice. The total must be at
  least 3.
- Within a slice, each vertex must sit at a larger angle than the one before (clockwise on screen)
  and stay inside its wedge: 360/N degrees without mirror, 180/N with it. A slice that runs
  counter-clockwise or overruns its wedge makes the outline cross itself. Neither `create` nor
  `preview` reports that, so only the image shows it.
- Ending a mirrored slice exactly on the next axis, as Material's `Heart` does, is fine.
- To place a point at angle θ and distance d from the centre: `[0.5 + d·cos θ, 0.5 + d·sin θ]`.
  Keep d about 0.5 for the outermost points; `normalize` rescales anyway.

Five round petals: a tip at −90° (top) at distance 0.5, a valley 36° clockwise from it at
distance 0.3, big rounding on the tip, small in the valley.

```json
{"v": 1, "name": "FivePetals", "shape": {"kind": "polygon", "vertices": [[0.5, 0], [0.676, 0.257]], "perVertexRounding": [{"radius": 0.2}, {"radius": 0.05}], "repeat": {"count": 5, "mirror": true}}, "transforms": [{"type": "normalize"}]}
```

A shield: `count` 1 with `mirror` traces the right half from top centre to the bottom tip.

```json
{"v": 1, "name": "Shield", "shape": {"kind": "polygon", "vertices": [[0.5, 0.04], [0.95, 0.15], [0.9, 0.6], [0.5, 0.98]], "perVertexRounding": [{"radius": 0.1}, {"radius": 0.15}, {"radius": 0.3}, {"radius": 0.1}], "repeat": {"count": 1, "mirror": true}}, "transforms": [{"type": "normalize"}]}
```

## Transforms

A document is `{"v": 1, "name": "...", "shape": {...}, "transforms": [...]}`: `v` is always 1 and
`name` is an optional label. Transforms apply in array order, each an object with a `type`:

| `type` | Fields | Effect |
|---|---|---|
| `rotate` | `degrees` | Rotates about the origin; positive is clockwise on screen. |
| `scale` | `x`, `y` | Stretches about the origin; neither may be 0. `y` 0.8 squashes a circle into an oval. |
| `translate` | `x`, `y` | Moves the shape; `normalize` undoes it, so it rarely matters. |
| `normalize` | none | Fits the unit square, keeping aspect ratio. Put it last. |
| `fillSquare` | none | Stretches to fill the unit square exactly, distorting the aspect ratio. |
| `startAngle` | `degrees` (integer) | Rotates so the first point sits at that angle, as Compose's `toShape(startAngle)`. Must be the very last transform; prefer `rotate`. |

Rotate before `normalize`. Rotating after it swings the shape out of the unit square and the CLI
warns.

## How Material's presets are made

Read a preset with `shape-studio list --filter NAME` and learn from its numbers.

- `Cookie7Sided`: `star`, 7 points, `innerRadius` 0.75, rounding 0.5 (soft scallops), rotated −90
  so a lobe points up. `Cookie9Sided` and `Cookie12Sided` change only the count and use 0.8.
- `Sunny`: `star`, 8 points, `innerRadius` 0.8, rounding 0.15: shallow rays that keep their points.
- `Arch`: `ngon` 4 with two corners at radius 1 and two at 0.2, rotated −135 so the round pair is on
  top.
- `Oval`: `circle` scaled to `y` 0.64, then rotated −45.
- `Heart`: `polygon` with `mirror` and `count` 1: the right half from the top notch (radius 0.016)
  over two lobes (about 1) to the bottom tip (0.129).
- `Clover4Leaf`: `polygon`, 4 mirrored units of two points: a valley at radius 0 and a leaf at 0.476.
- `Burst`, `Boom`: `polygon` slices of two points repeated 12 and 15 times with almost no rounding.

## From a mood to parameters

| The developer says | Start from | Push these |
|---|---|---|
| soft, calm, friendly | `rectangle` or `ngon` 3 to 5 | rounding 0.4 to 0.8, `smoothing` 0.6 to 1 |
| organic, pebble, blob, hand-made | `polygon`, 5 to 7 irregular points, no `repeat` | rounding 0.25 to 0.45 (already unit-square units), uneven `perVertexRounding` |
| playful, bouncy, cute | `star` 4 to 7 points | `innerRadius` 0.7 to 0.85, rounding 0.3 to 0.5, or a cloud with `innerRounding` 0 |
| celebratory, sale, "new" | `star` or `pillStar` 10 to 16 points | `innerRadius` 0.6 to 0.8, rounding at most 0.05 |
| floral, natural | `polygon` with `mirror`, 5 to 8 petals | big tip rounding, valley near 0 |
| sharp, technical, precise | `ngon` or `polygon` | rounding 0 to 0.05, `smoothing` 0 |
| motion, direction, forward | asymmetric `polygon` | one sharp corner, the rest round; `rotate` |
| trust, protection | `polygon` shield, `count` 1 with `mirror` | rounding 0.1 to 0.3 |
| retro, pixel | `polygon` stair steps | rounding 0 |

Starting points to copy into a document file. They are not catalogue entries, so `list` and
`create --name` do not know them:

```json
{"v": 1, "name": "Pebble", "shape": {"kind": "polygon", "vertices": [[0.95, 0.45], [0.75, 0.92], [0.3, 0.95], [0.05, 0.55], [0.2, 0.12], [0.65, 0.05]], "perVertexRounding": [{"radius": 0.4}, {"radius": 0.2}, {"radius": 0.45}, {"radius": 0.15}, {"radius": 0.4}, {"radius": 0.3}]}, "transforms": [{"type": "normalize"}]}
```

```json
{"v": 1, "name": "Cloud", "shape": {"kind": "star", "verticesPerRadius": 5, "innerRadius": 0.7, "rounding": {"radius": 0.5}, "innerRounding": {"radius": 0}}, "transforms": [{"type": "normalize"}]}
```

```json
{"v": 1, "name": "Seal", "shape": {"kind": "star", "verticesPerRadius": 12, "innerRadius": 0.75, "rounding": {"radius": 0.03}}, "transforms": [{"type": "normalize"}]}
```

```json
{"v": 1, "name": "Squircle", "shape": {"kind": "rectangle", "rounding": {"radius": 0.8, "smoothing": 1}}, "transforms": [{"type": "normalize"}]}
```

```json
{"v": 1, "name": "Leaf", "shape": {"kind": "rectangle", "perVertexRounding": [{"radius": 1}, {"radius": 0.1}, {"radius": 1}, {"radius": 0.1}]}, "transforms": [{"type": "rotate", "degrees": 45}, {"type": "normalize"}]}
```

```json
{"v": 1, "name": "TiltedOval", "shape": {"kind": "circle"}, "transforms": [{"type": "scale", "x": 1, "y": 0.8}, {"type": "rotate", "degrees": -20}, {"type": "normalize"}]}
```

```json
{"v": 1, "name": "SoftTriangle", "shape": {"kind": "ngon", "vertices": 3, "rounding": {"radius": 0.45, "smoothing": 0.6}}, "transforms": [{"type": "rotate", "degrees": -90}, {"type": "normalize"}]}
```

```json
{"v": 1, "name": "WideBadge", "shape": {"kind": "pillStar", "width": 2, "height": 1.2, "verticesPerRadius": 10, "innerRadiusRatio": 0.8, "rounding": {"radius": 0.05}}, "transforms": [{"type": "normalize"}]}
```

## Inventing shapes for an open request

When the developer gives a mood, a metaphor, or "surprise me" instead of a preset name:

1. Pin the use: the component, the brand colour if known, and what sits inside. Pick the preview
   `context` to match: `button` fills the shape with the colour under a white plus, `avatar` under a
   white letter A, and `photo` clips a landscape picture and ignores the colour. The glyphs stay white
   in both themes, so choose a colour dark enough to carry them.
2. Pick three or four **different directions**, not four values of one parameter: for example one
   refined take on a familiar form, one structural (`star` or `pillStar`), one organic (`polygon`),
   and one bolder idea. Two variants that differ only in rounding, squash, or tilt are one direction.
   Give each a `name` and a mood label.
3. Write each document from a starting point above or a preset, then change what defines the
   character (kind, point count, valley depth, rounding mix), not only the rotation.
4. Run `create` on each and fix what stderr names, then render all of them in one `preview`. Look at
   the image yourself before showing it and replace any variant that reads as a plain circle, looks
   lopsided by accident, or has slivers that vanish at icon size.
5. Show the image and one line per variant: the idea and the two or three numbers that create it.
   Ask which direction to push.
6. Refine by changing one or two numbers at a time, previewing the previous and the new version side
   by side.

Checks that separate a good shape from a noisy one:

- **Small sizes.** Buttons and avatars are about 40 to 56 dp. More than about 16 points, arms thinner
  than a fifth of the shape, or rounding near 0 on many tips turn to noise there.
- **Room for content.** An avatar or photo needs a large convex middle: a blob, a squircle, or a
  star with `innerRadius` 0.75 or more. A deep star crops the face.
- **Upright symmetry.** Shapes with an odd count point right as built; rotate −90 so a point or lobe
  faces up, as Material's `Triangle` and `Cookie7Sided` do.
- **Proportions.** `normalize` keeps aspect ratio, so a wide shape leaves empty bands in a square
  component; use `fillSquare` only when the stretch is wanted.
