import type { Rounding, ShapeDocument, Transform } from "../document";
import { roundTo } from "./numbers";
import { polygonCorners } from "./repeat";

export const KOTLIN_DIGITS = 5;

const kt = (x: number, digits = KOTLIN_DIGITS) => `${roundTo(x, digits)}f`;

function corner(r: Rounding | undefined): string {
  if (!r || (!r.radius && !r.smoothing)) return "CornerRounding.Unrounded";
  return r.smoothing ? `CornerRounding(${kt(r.radius)}, ${kt(r.smoothing)})` : `CornerRounding(${kt(r.radius)})`;
}

function linear(terms: [number, string][]): string {
  const parts: string[] = [];
  for (const [coefficient, name] of terms) {
    const c = roundTo(coefficient, 6);
    if (c === 0) continue;
    const magnitude = Math.abs(c) === 1 ? name : `${kt(Math.abs(c), 6)} * ${name}`;
    if (parts.length === 0) parts.push(c < 0 ? `-${magnitude}` : magnitude);
    else parts.push(`${c < 0 ? "-" : "+"} ${magnitude}`);
  }
  return parts.length ? parts.join(" ") : "0f";
}

const offset = (name: string, by: number) => {
  const v = roundTo(by, KOTLIN_DIGITS);
  return v === 0 ? name : `${name} ${v < 0 ? "-" : "+"} ${kt(Math.abs(v))}`;
};

const isIdentity = (t: Transform) =>
  (t.type === "rotate" && roundTo(t.degrees % 360, 9) === 0) ||
  (t.type === "scale" && t.x === 1 && t.y === 1) ||
  (t.type === "translate" && t.x === 0 && t.y === 0);

function transformCall(t: Transform): string {
  switch (t.type) {
    case "normalize":
      return ".normalized()";
    case "scale":
      return `.transformed { x, y -> TransformResult(${linear([[t.x, "x"]])}, ${linear([[t.y, "y"]])}) }`;
    case "translate":
      return `.transformed { x, y -> TransformResult(${offset("x", t.x)}, ${offset("y", t.y)}) }`;
    case "rotate": {
      const a = (t.degrees * Math.PI) / 180;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      return `.transformed { x, y -> TransformResult(${linear([[c, "x"], [-s, "y"]])}, ${linear([[s, "x"], [c, "y"]])}) }`;
    }
    default:
      throw new Error(`no Compose export for the ${t.type} transform yet`);
  }
}

export function kotlinExpression(doc: ShapeDocument): { code: string; imports: Set<string> } {
  const s = doc.shape;
  const imports = new Set(["androidx.graphics.shapes.RoundedPolygon"]);
  const args: string[] = [];
  const cornerList = (list: Rounding[]) => {
    imports.add("androidx.graphics.shapes.CornerRounding");
    return `listOf(\n${list.map((r) => `        ${corner(r)},`).join("\n")}\n    )`;
  };
  const rounding = (name: string, r: Rounding | undefined) => {
    if (!r) return;
    imports.add("androidx.graphics.shapes.CornerRounding");
    args.push(`${name} = ${corner(r)}`);
  };
  const perVertex = (list: Rounding[] | undefined) => {
    if (list) args.push(`perVertexRounding = ${cornerList(list)}`);
  };
  const center = (c: [number, number] | undefined) => {
    if (c) args.push(`centerX = ${kt(c[0])}`, `centerY = ${kt(c[1])}`);
  };
  const float = (name: string, value: number | undefined) => {
    if (value !== undefined) args.push(`${name} = ${kt(value)}`);
  };
  const int = (name: string, value: number | undefined) => {
    if (value !== undefined) args.push(`${name} = ${value}`);
  };
  const builder = (name: string) => {
    imports.add(`androidx.graphics.shapes.${name}`);
    return `RoundedPolygon.${name}`;
  };
  let call: string;
  switch (s.kind) {
    case "circle":
      call = builder("circle");
      int("numVertices", s.vertices);
      float("radius", s.radius);
      center(s.center);
      break;
    case "rectangle":
      call = builder("rectangle");
      float("width", s.width);
      float("height", s.height);
      rounding("rounding", s.rounding);
      perVertex(s.perVertexRounding);
      center(s.center);
      break;
    case "star":
      call = builder("star");
      int("numVerticesPerRadius", s.verticesPerRadius);
      float("radius", s.radius);
      float("innerRadius", s.innerRadius);
      rounding("rounding", s.rounding);
      rounding("innerRounding", s.innerRounding);
      perVertex(s.perVertexRounding);
      center(s.center);
      break;
    case "pill":
      call = builder("pill");
      float("width", s.width);
      float("height", s.height);
      float("smoothing", s.smoothing);
      center(s.center);
      break;
    case "pillStar":
      call = builder("pillStar");
      float("width", s.width);
      float("height", s.height);
      int("numVerticesPerRadius", s.verticesPerRadius);
      float("innerRadiusRatio", s.innerRadiusRatio);
      rounding("rounding", s.rounding);
      rounding("innerRounding", s.innerRounding);
      perVertex(s.perVertexRounding);
      float("vertexSpacing", s.vertexSpacing);
      float("startLocation", s.startLocation);
      center(s.center);
      break;
    case "ngon":
      call = "RoundedPolygon";
      int("numVertices", s.vertices);
      float("radius", s.radius);
      center(s.center);
      rounding("rounding", s.rounding);
      perVertex(s.perVertexRounding);
      break;
    case "polygon": {
      call = "RoundedPolygon";
      const { corners, center: c } = polygonCorners(s);
      args.push(`vertices = floatArrayOf(\n${corners.map(({ point: [x, y] }) => `        ${kt(x)}, ${kt(y)},`).join("\n")}\n    )`);
      const roundings = corners.map((e) => corner(e.rounding));
      if (roundings.every((r) => r === roundings[0])) {
        if (roundings[0] !== "CornerRounding.Unrounded") rounding("rounding", corners[0].rounding);
      } else {
        args.push(`perVertexRounding = ${cornerList(corners.map((e) => e.rounding))}`);
      }
      center(c);
      break;
    }
    case "features":
      call = "RoundedPolygon";
      imports.add("androidx.graphics.shapes.FeatureSerializer");
      args.push(`features = FeatureSerializer.parse("${s.serialized.replace(/[\\"$]/g, (ch) => `\\${ch}`)}")`);
      center(s.center);
      break;
  }
  const transforms = (doc.transforms ?? []).filter((t) => !isIdentity(t));
  if (transforms.some((t) => t.type !== "normalize")) imports.add("androidx.graphics.shapes.TransformResult");
  const head = args.length ? `${call}(\n${args.map((a) => `    ${a},`).join("\n")}\n)` : `${call}()`;
  return { code: head + transforms.map(transformCall).join(""), imports };
}

const COMPOSE_IMPORTS = [
  "androidx.compose.foundation.background",
  "androidx.compose.foundation.layout.Box",
  "androidx.compose.foundation.layout.size",
  "androidx.compose.material3.ExperimentalMaterial3ExpressiveApi",
  "androidx.compose.material3.toShape",
  "androidx.compose.runtime.Composable",
  "androidx.compose.ui.Modifier",
  "androidx.compose.ui.draw.clip",
  "androidx.compose.ui.graphics.Color",
  "androidx.compose.ui.unit.dp",
];

const argbOf = (colour: string) => {
  const hex = colour.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return `0xFF${full.toUpperCase()}`;
};

export function kotlinFile(doc: ShapeDocument, options: { catalogueName: string | null; colour: string }): string {
  const argb = argbOf(options.colour);
  const imports = new Set(COMPOSE_IMPORTS);
  let declaration = "";
  let shape: string;
  if (options.catalogueName) {
    imports.add("androidx.compose.material3.MaterialShapes");
    shape = `MaterialShapes.${options.catalogueName}`;
  } else {
    const expression = kotlinExpression(doc);
    expression.imports.forEach((i) => imports.add(i));
    declaration = `private val MyShape = ${expression.code}\n\n`;
    shape = "MyShape";
  }
  return `// Needs Compose Material 3 with the Expressive API (MaterialShapes and toShape)${options.catalogueName ? "" : " and androidx.graphics:graphics-shapes"}.
${[...imports].sort().map((i) => `import ${i}`).join("\n")}

${declaration}@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ShapedBox() {
    Box(
        Modifier
            .size(96.dp)
            .clip(${shape}.toShape())
            .background(Color(${argb})),
    )
}
`;
}
