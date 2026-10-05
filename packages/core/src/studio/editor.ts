import { CATALOGUE, catalogueNameOf } from "../catalogue";
import type { Point, Rounding, Shape, ShapeDocument, Transform } from "../document";

export type Radii = { rounding?: Rounding; innerRounding?: Rounding; perVertexRounding?: Rounding[] };

export type EditorState = {
  name: string | null;
  doc: ShapeDocument;
  initial: ShapeDocument;
  base: Radii;
  roundness: number;
  selected: number;
};

export type Control = {
  label: string;
  why: string;
  min: number;
  max: number;
  step: number;
  scale?: number;
  unit?: string;
  get: () => number;
  set: (value: number) => void;
  show: (value: number) => string;
};

type Polygon = Extract<Shape, { kind: "polygon" }>;

const SHARP_SHAPE_RADIUS = 0.04;

export const round3 = (x: number) => Math.round(x * 1000) / 1000;
const percent = (v: number) => `${Math.round(v * 100)}%`;
const radiiOf = (shape: Shape): Radii => ("rounding" in shape || "perVertexRounding" in shape ? (shape as Radii) : {});
const cornersOf = (radii: Radii): Rounding[] =>
  [radii.rounding, radii.innerRounding, ...(radii.perVertexRounding ?? [])].filter((r): r is Rounding => !!r);

function fromBaseline(source: ShapeDocument, name: string | null): EditorState {
  const doc = structuredClone(source);
  const r = radiiOf(doc.shape);
  const base = structuredClone({ rounding: r.rounding, innerRounding: r.innerRounding, perVertexRounding: r.perVertexRounding });
  if (!cornersOf(base).length && ["polygon", "ngon", "star", "rectangle"].includes(doc.shape.kind)) {
    base.rounding = { radius: SHARP_SHAPE_RADIUS };
  }
  const corners = cornersOf(base);
  const sharp = !r.rounding && !r.innerRounding && !r.perVertexRounding || corners.length > 0 && corners.every((c) => !c.radius);
  if (sharp) corners.forEach((c) => { c.radius = SHARP_SHAPE_RADIUS; });
  return { name, doc, initial: structuredClone(source), base, roundness: sharp ? 0 : 1, selected: 0 };
}

export function pick(name: string): EditorState {
  const source = CATALOGUE[name];
  if (!source) throw new Error(`Unknown catalogue shape: ${name}`);
  return fromBaseline(source, name);
}

export function fromDocument(doc: ShapeDocument): EditorState {
  return fromBaseline(doc, null);
}

export function openDocument(doc: ShapeDocument): EditorState {
  const name = catalogueNameOf(doc);
  return name ? pick(name) : fromDocument(doc);
}

export const isEdited = (s: EditorState) => JSON.stringify(s.doc) !== JSON.stringify(s.initial);

export function applyRoundness(s: EditorState) {
  const shape = s.doc.shape as Radii;
  for (const key of ["rounding", "innerRounding"] as const) {
    const base = s.base[key];
    if (base) shape[key] = { ...shape[key], radius: round3(base.radius * s.roundness) };
  }
  if (s.base.perVertexRounding) {
    shape.perVertexRounding = s.base.perVertexRounding.map((c, i) => ({ ...(shape.perVertexRounding?.[i] ?? {}), radius: round3(c.radius * s.roundness) }));
  }
}

export const findTransform = <T extends Transform["type"]>(doc: ShapeDocument, type: T) =>
  (doc.transforms ?? []).find((t): t is Extract<Transform, { type: T }> => t.type === type);

function ensureTransform<T extends Transform["type"]>(doc: ShapeDocument, type: T, make: () => Extract<Transform, { type: T }>) {
  const list = doc.transforms ?? (doc.transforms = []);
  const existing = findTransform(doc, type);
  if (existing) return existing;
  const created = make();
  const before = type === "scale" ? ["rotate", "normalize"] : ["normalize"];
  const at = list.findIndex((x) => before.includes(x.type));
  list.splice(at < 0 ? list.length : at, 0, created);
  return created;
}

export const viewTransforms = (doc: ShapeDocument) => (doc.transforms ?? []).filter((t) => t.type !== "normalize");

function minRepeats(shape: Polygon) {
  const perCopy = shape.repeat?.mirror ? 2 * shape.vertices.length - 1 : shape.vertices.length;
  return Math.max(2, Math.ceil(3 / perCopy));
}

function setSides(s: EditorState, sides: number) {
  const shape = s.doc.shape;
  if (shape.kind !== "ngon") return;
  if (s.base.perVertexRounding) {
    const radii = s.base.perVertexRounding.map((c) => c.radius);
    s.base.rounding = { radius: round3(radii.reduce((a, b) => a + b, 0) / radii.length) };
    delete s.base.perVertexRounding;
    shape.rounding = { radius: round3(s.base.rounding.radius * s.roundness), smoothing: shape.perVertexRounding?.[0]?.smoothing ?? 0 };
    delete shape.perVertexRounding;
  }
  shape.vertices = sides;
}

export function mainControls(s: EditorState): Control[] {
  const shape = s.doc.shape;
  const list: Control[] = [];
  const roundness: Control = {
    label: "Roundness", why: "100% keeps Material’s original corner recipe. Originally sharp shapes start at 0%.", min: 0, max: 2.5, step: 0.01, scale: 100, unit: "%", show: percent,
    get: () => s.roundness,
    set: (v) => { s.roundness = v; applyRoundness(s); },
  };
  if (shape.kind === "polygon") {
    const original = s.initial.shape;
    if (original.kind === "polygon" && (original.repeat?.count ?? 1) > 1 && shape.repeat) {
      const repeat = shape.repeat;
      list.push({
        label: "Repeats", why: "How many times the pattern goes around the centre.", min: minRepeats(shape), max: 16, step: 1, show: String,
        get: () => repeat.count,
        set: (v) => { repeat.count = v; },
      });
    }
    list.push(roundness);
  }
  if (shape.kind === "star") {
    list.push(
      {
        label: "Points", why: "How many points the shape has.", min: 3, max: 20, step: 1, show: String,
        get: () => shape.verticesPerRadius,
        set: (v) => { shape.verticesPerRadius = v; },
      },
      {
        label: "Depth", why: "How deep the dips between the points go.", min: 0.05, max: 0.9, step: 0.01, scale: 100, unit: "%", show: percent,
        get: () => 1 - (shape.innerRadius ?? 0.5),
        set: (v) => { shape.innerRadius = round3(1 - v); },
      },
      roundness,
    );
  }
  if (shape.kind === "ngon") {
    list.push(
      { label: "Sides", why: "How many corners the shape has.", min: 3, max: 12, step: 1, show: String, get: () => shape.vertices, set: (v) => setSides(s, v) },
      roundness,
    );
  }
  if (shape.kind === "rectangle") {
    list.push(
      {
        label: "Proportion", why: "Width compared to height.", min: 0.5, max: 3, step: 0.01, unit: ": 1", show: (v) => `${v.toFixed(2)} : 1`,
        get: () => (shape.width ?? 2) / (shape.height ?? 2),
        set: (v) => { shape.width = round3(v); shape.height = 1; },
      },
      roundness,
    );
  }
  const squash = findTransform(s.doc, "scale")?.y ?? 1;
  if (shape.kind === "circle") {
    list.push({
      label: "Squash", why: "Flattens the circle into an oval.", min: 0.3, max: 1, step: 0.01, scale: 100, unit: "%", show: percent,
      get: () => findTransform(s.doc, "scale")?.y ?? 1,
      set: (v) => { ensureTransform(s.doc, "scale", () => ({ type: "scale", x: 1, y: 1 })).y = v; },
    });
  }
  if (shape.kind !== "circle" || squash < 1) {
    list.push({
      label: "Rotate", why: "", min: -180, max: 180, step: 1, unit: "°", show: (v) => `${v}°`,
      get: () => findTransform(s.doc, "rotate")?.degrees ?? 0,
      set: (v) => { ensureTransform(s.doc, "rotate", () => ({ type: "rotate", degrees: 0 })).degrees = v; },
    });
  }
  return list;
}

export function moreControls(s: EditorState): Control[] {
  const list: Control[] = [];
  if (cornersOf(radiiOf(s.doc.shape)).length) {
    list.push({
      label: "Softness", why: "Blends each corner smoothly into its sides.", min: 0, max: 1, step: 0.01, scale: 100, unit: "%", show: percent,
      get: () => cornersOf(radiiOf(s.doc.shape))[0]?.smoothing ?? 0,
      set: (v) => { for (const c of cornersOf(radiiOf(s.doc.shape))) c.smoothing = v; },
    });
  }
  if (s.doc.shape.kind === "polygon" && s.base.perVertexRounding) {
    const base = s.base.perVertexRounding;
    list.push({
      label: "Roundness of the selected dot", why: "Click a dot on the shape to select it.", min: 0, max: 1.2, step: 0.005, show: (v) => v.toFixed(2),
      get: () => base[s.selected]?.radius ?? 0,
      set: (v) => { base[s.selected].radius = v; applyRoundness(s); },
    });
  }
  return list;
}

const polygonOf = (s: EditorState): Polygon | null => (s.doc.shape.kind === "polygon" ? s.doc.shape : null);

const repeats = (shape: Polygon) => (shape.repeat?.count ?? 1) > 1;
const cornerCount = (shape: Polygon, dots: number) =>
  shape.repeat ? shape.repeat.count * (shape.repeat.mirror ? 2 * dots - 1 : dots) : dots;

export function canRemoveDot(s: EditorState): boolean {
  const shape = polygonOf(s);
  if (!shape || shape.vertices.length <= 1) return false;
  return repeats(shape) || cornerCount(shape, shape.vertices.length - 1) >= 3;
}

export function addDot(s: EditorState) {
  const shape = polygonOf(s);
  if (!shape?.perVertexRounding || !s.base.perVertexRounding) return;
  const i = s.selected;
  const v = shape.vertices;
  const a = v[i];
  const previous = v[i - 1] ?? [0.5, 0.5];
  const b = v[i + 1] ?? [2 * a[0] - previous[0], 2 * a[1] - previous[1]];
  v.splice(i + 1, 0, [round3((a[0] + b[0]) / 2), round3((a[1] + b[1]) / 2)]);
  s.base.perVertexRounding.splice(i + 1, 0, { ...s.base.perVertexRounding[i] });
  shape.perVertexRounding.splice(i + 1, 0, { ...shape.perVertexRounding[i] });
  s.selected = i + 1;
}

export function removeDot(s: EditorState) {
  const shape = polygonOf(s);
  if (!shape?.perVertexRounding || !s.base.perVertexRounding || !canRemoveDot(s)) return;
  const i = s.selected;
  shape.vertices.splice(i, 1);
  s.base.perVertexRounding.splice(i, 1);
  shape.perVertexRounding.splice(i, 1);
  s.selected = Math.max(0, i - 1);
  if (shape.repeat && repeats(shape)) shape.repeat.count = Math.max(shape.repeat.count, minRepeats(shape));
}

export function moveDot(s: EditorState, index: number, [x, y]: Point) {
  const shape = polygonOf(s);
  if (shape) shape.vertices[index] = [round3(x), round3(y)];
}

export class History {
  private past: string[] = [];
  private future: string[] = [];

  constructor(private readonly limit = 200) {}

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }

  remember(snapshot: string) {
    this.past.push(snapshot);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current: string): string | undefined {
    const previous = this.past.pop();
    if (previous !== undefined) this.future.push(current);
    return previous;
  }

  redo(current: string): string | undefined {
    const next = this.future.pop();
    if (next !== undefined) this.past.push(current);
    return next;
  }
}

export const snapshot = (s: EditorState) => JSON.stringify(s);
export const restore = (json: string): EditorState => JSON.parse(json);
