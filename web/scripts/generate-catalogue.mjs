import { writeFileSync } from "node:fs";

const COMMIT = "080d2b3e5326ba80392d93442c4a51a02dc22650";
const PATH = "compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt";
const OUTPUT = new URL("../src/catalogue/catalogue.json", import.meta.url);

const response = await fetch(`https://raw.githubusercontent.com/androidx/androidx/${COMMIT}/${PATH}`);
if (!response.ok) throw new Error(`fetching ${PATH} failed: ${response.status}`);
const source = await response.text();

const num = (text) => Number(text.replace(/f$/, ""));
const constants = Object.fromEntries(
  [...source.matchAll(/private val (cornerRound\w+) = CornerRounding\(radius = ([-\d.]+)f\)/g)].map((m) => [m[1], { radius: num(m[2]) }]),
);
const rotations = Object.fromEntries(
  [...source.matchAll(/private val (rotate\w+) = Matrix\(\)\.apply \{ rotateZ\(([-\d.]+)f\) \}/g)].map((m) => [m[1], num(m[2])]),
);

function rounding(text) {
  const t = text.trim();
  if (constants[t]) return { ...constants[t] };
  if (t === "CornerRounding.Unrounded") return { radius: 0 };
  const m = /^CornerRounding\((?:radius = )?([-\d.]+)f(?:,\s*(?:smoothing = )?([-\d.]+)f)?\)$/.exec(t);
  if (!m) throw new Error(`unknown rounding ${t}`);
  return m[2] === undefined ? { radius: num(m[1]) } : { radius: num(m[1]), smoothing: num(m[2]) };
}
const roundingList = (text) => text.split(",").map((x) => x.trim()).filter(Boolean).map(rounding);

function shapeOf(name, params, body) {
  if (body.includes("customPolygon(")) {
    if (body.includes("center =")) throw new Error(`${name}: custom centres are not supported`);
    const points = [...body.matchAll(/PointNRound\(Offset\(([-\d.]+)f, ([-\d.]+)f\)(?:, (CornerRounding\([^)]*\)|cornerRound\w+))?\)/g)];
    const reps = /\),\s*(?:reps = )?(\d+)\s*,/.exec(body.slice(body.lastIndexOf("PointNRound")));
    if (!reps) throw new Error(`${name}: no repeat count`);
    return {
      kind: "polygon",
      vertices: points.map((m) => [num(m[1]), num(m[2])]),
      perVertexRounding: points.map((m) => (m[3] ? rounding(m[3]) : { radius: 0 })),
      repeat: { count: Number(reps[1]), mirror: body.includes("mirroring = true") },
    };
  }
  if (body.includes("RoundedPolygon.star(")) {
    const args = /RoundedPolygon\.star\(([\s\S]*?)\)(?:\s*\.transformed|\s*$)/.exec(body)[1];
    const shape = { kind: "star", verticesPerRadius: Number(/numVerticesPerRadius = (\d+)/.exec(args)[1]) };
    const inner = /innerRadius = ([-\d.]+)f/.exec(args);
    if (inner) shape.innerRadius = num(inner[1]);
    const r = /rounding = (\w+|CornerRounding\([^)]*\))/.exec(args);
    if (r) shape.rounding = rounding(r[1]);
    return shape;
  }
  const perVertex = /perVertexRounding = listOf\(([^)]*)\)/.exec(body);
  const uniform = /\brounding = (\w+)/.exec(body);
  const withRounding = (shape) => {
    if (perVertex) shape.perVertexRounding = roundingList(perVertex[1]);
    else if (uniform) shape.rounding = rounding(uniform[1]);
    return shape;
  };
  if (body.includes("RoundedPolygon.rectangle(")) {
    return withRounding({ kind: "rectangle", width: num(/width = ([-\d.]+)f/.exec(body)[1]), height: num(/height = ([-\d.]+)f/.exec(body)[1]) });
  }
  if (body.includes("RoundedPolygon.circle(")) {
    const fallback = /numVertices: Int = (\d+)/.exec(params);
    return body.includes("circle(numVertices = numVertices)") && fallback ? { kind: "circle", vertices: Number(fallback[1]) } : { kind: "circle" };
  }
  if (body.includes("RoundedPolygon(")) {
    return withRounding({ kind: "ngon", vertices: Number(/numVertices = (\d+)/.exec(body)[1]) });
  }
  throw new Error(`${name}: unrecognised recipe`);
}

const shapes = {};
for (const [, name, fn] of source.matchAll(/public val (\w+): RoundedPolygon\s*get\(\) = _\w+ \?: (\w+)\(\)/g)) {
  const m = new RegExp(`internal fun ${fn}\\(([^)]*)\\): RoundedPolygon \\{([\\s\\S]*?)\\n        \\}`).exec(source);
  if (!m) throw new Error(`${name}: no recipe for ${fn}`);
  const body = m[2].replace(/\/\/[^\n]*/g, "").replace(/\s+/g, " ").trim();
  const scales = Object.fromEntries(
    [...body.matchAll(/val (\w+) = Matrix\(\)\.apply \{ scale\(([-\d.]+)f, ([-\d.]+)f\) \}/g)].map((s) => [s[1], [num(s[2]), num(s[3])]]),
  );
  const transforms = [...body.matchAll(/\.transformed\((\w+)\)/g)].map(([, matrix]) => {
    if (matrix in rotations) return { type: "rotate", degrees: rotations[matrix] };
    if (matrix in scales) return { type: "scale", x: scales[matrix][0], y: scales[matrix][1] };
    throw new Error(`${name}: unknown matrix ${matrix}`);
  });
  shapes[name] = { v: 1, shape: shapeOf(name, m[1], body), transforms: [...transforms, { type: "normalize" }] };
}

writeFileSync(OUTPUT, `${JSON.stringify({ source: `androidx/androidx@${COMMIT}:${PATH}`, shapes }, null, 2)}\n`);
console.log(`wrote ${Object.keys(shapes).length} shapes to ${OUTPUT.pathname}`);
