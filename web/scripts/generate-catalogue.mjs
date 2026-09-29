import { readFileSync, writeFileSync } from "node:fs";

const COMMIT = "080d2b3e5326ba80392d93442c4a51a02dc22650";
const PATH = "compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt";
const OUTPUT = new URL("../src/catalogue/catalogue.json", import.meta.url);

async function upstream() {
  const response = await fetch(`https://raw.githubusercontent.com/androidx/androidx/${COMMIT}/${PATH}`);
  if (!response.ok) throw new Error(`fetching ${PATH} failed: ${response.status}`);
  return response.text();
}
const localFile = process.argv[2];
const source = localFile ? readFileSync(localFile, "utf8") : await upstream();

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

function callArguments(body, call) {
  const start = body.indexOf(`${call}(`);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start + call.length; i < body.length; i++) {
    if (body[i] === "(") depth++;
    if (body[i] === ")" && --depth === 0) return body.slice(start + call.length + 1, i);
  }
  throw new Error(`unbalanced ${call}(`);
}

function namedArguments(name, args, allowed) {
  const found = {};
  let depth = 0;
  let current = "";
  for (const ch of `${args},`) {
    if (ch === "(" || ch === "{") depth++;
    if (ch === ")" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      const m = /^\s*(\w+)\s*=\s*([\s\S]+?)\s*$/.exec(current);
      if (current.trim() && !m) throw new Error(`${name}: unnamed argument ${current.trim()}`);
      if (m && !allowed.includes(m[1])) throw new Error(`${name}: unsupported argument ${m[1]}`);
      if (m) found[m[1]] = m[2];
      current = "";
    } else current += ch;
  }
  return found;
}

function shapeOf(name, params, body) {
  if (body.includes("customPolygon(")) {
    if (body.includes("center =")) throw new Error(`${name}: custom centres are not supported`);
    const points = [...body.matchAll(/PointNRound\(Offset\(([-\d.]+)f, ([-\d.]+)f\)(?:, (CornerRounding\([^)]*\)|cornerRound\w+))?\)/g)];
    const declared = body.split("PointNRound(").length - 1;
    if (points.length !== declared) throw new Error(`${name}: parsed ${points.length} of ${declared} points`);
    const reps = /\),\s*(?:reps = )?(\d+)\s*,/.exec(body.slice(body.lastIndexOf("PointNRound")));
    if (!reps) throw new Error(`${name}: no repeat count`);
    return {
      kind: "polygon",
      vertices: points.map((m) => [num(m[1]), num(m[2])]),
      perVertexRounding: points.map((m) => (m[3] ? rounding(m[3]) : { radius: 0 })),
      repeat: { count: Number(reps[1]), mirror: body.includes("mirroring = true") },
    };
  }
  const star = callArguments(body, "RoundedPolygon.star");
  if (star !== null) {
    const a = namedArguments(name, star, ["numVerticesPerRadius", "innerRadius", "rounding"]);
    const shape = { kind: "star", verticesPerRadius: Number(a.numVerticesPerRadius) };
    if (a.innerRadius) shape.innerRadius = num(a.innerRadius);
    if (a.rounding) shape.rounding = rounding(a.rounding);
    return shape;
  }
  const withRounding = (shape, a) => {
    if (a.perVertexRounding) shape.perVertexRounding = roundingList(/^listOf\(([\s\S]*)\)$/.exec(a.perVertexRounding)[1]);
    else if (a.rounding) shape.rounding = rounding(a.rounding);
    return shape;
  };
  const rectangle = callArguments(body, "RoundedPolygon.rectangle");
  if (rectangle !== null) {
    const a = namedArguments(name, rectangle, ["width", "height", "rounding", "perVertexRounding"]);
    return withRounding({ kind: "rectangle", width: num(a.width), height: num(a.height) }, a);
  }
  const circle = callArguments(body, "RoundedPolygon.circle");
  if (circle !== null) {
    const a = namedArguments(name, circle, ["numVertices"]);
    if (!a.numVertices) return { kind: "circle" };
    const fallback = /numVertices: Int = (\d+)/.exec(params);
    const vertices = a.numVertices === "numVertices" ? fallback?.[1] : a.numVertices;
    if (!/^\d+$/.test(vertices ?? "")) throw new Error(`${name}: unknown circle vertex count ${a.numVertices}`);
    return { kind: "circle", vertices: Number(vertices) };
  }
  const ngon = callArguments(body, "RoundedPolygon");
  if (ngon !== null) {
    const a = namedArguments(name, ngon, ["numVertices", "rounding", "perVertexRounding"]);
    return withRounding({ kind: "ngon", vertices: Number(a.numVertices) }, a);
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
