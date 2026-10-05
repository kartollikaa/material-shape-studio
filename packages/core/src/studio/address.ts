import { CATALOGUE, catalogueNameOf } from "../catalogue";
import type { Rounding, ShapeDocument } from "../document";
import { assertDocumentBudget, DEFAULT_LIMITS } from "../limits";
import type { SharedShape } from "../share";
import { fromDocument, mainControls, moreControls, pick, round3, type EditorState, type Radii } from "./editor";

export type SharedState = { v: 1; editor: EditorState; colour: string; tab: "compose" | "svg" | "png" | "css" };

export const DEFAULT_COLOUR = "#6750a4";
const MAX_ADDRESS_LENGTH = 4 * DEFAULT_LIMITS.maxDocumentBytes;
const SHAPE_KINDS = ["polygon", "ngon", "circle", "rectangle", "star", "pill", "pillStar", "features"];
const invalid = () => new Error("This address does not contain a valid editor state.");

const CONTROL_PARAMS: Record<string, string> = {
  Repeats: "repeats", Points: "points", Depth: "depth", Sides: "sides", Proportion: "proportion",
  Squash: "squash", Roundness: "roundness", Rotate: "rotate", Softness: "softness",
  "Roundness of the selected dot": "dot-radius",
};
const controlsOf = (editor: EditorState) => [...mainControls(editor), ...moreControls(editor)];

function originEditor(params: URLSearchParams): EditorState {
  const name = params.get("shape");
  const source = params.get("document");
  if ((name === null) === (source === null)) throw invalid();
  const editor = name !== null && Object.hasOwn(CATALOGUE, name) ? pick(name) : source !== null ? fromDocument(originDocument(source)) : null;
  if (!editor) throw invalid();
  if (params.has("geometry")) editor.doc.shape = JSON.parse(params.get("geometry")!);
  if (params.has("transforms")) editor.doc.transforms = JSON.parse(params.get("transforms")!);
  return editor;
}

function originDocument(source: string): ShapeDocument {
  const doc = JSON.parse(source);
  if (!doc || typeof doc !== "object" || Array.isArray(doc) || doc.v !== 1 || !SHAPE_KINDS.includes(doc.shape?.kind)) throw invalid();
  assertDocumentBudget(doc);
  return doc;
}

function readParams(params: URLSearchParams): SharedState {
  const known = new Set(["shape", "document", "v", "selected", "colour", "tab", "geometry", "base", "transforms", ...Object.values(CONTROL_PARAMS)]);
  for (const key of params.keys()) if (!known.has(key) || params.getAll(key).length !== 1) throw invalid();
  if (params.has("v") && params.get("v") !== "1") throw invalid();
  const editor = originEditor(params);
  if (params.has("base")) editor.base = JSON.parse(params.get("base")!);
  if (params.has("selected")) {
    if (!/^\d+$/.test(params.get("selected")!)) throw invalid();
    editor.selected = Number(params.get("selected"));
  }
  for (const key of Object.values(CONTROL_PARAMS)) {
    if (!params.has(key)) continue;
    const control = controlsOf(editor).find((c) => CONTROL_PARAMS[c.label] === key);
    const raw = params.get(key)!;
    if (!control || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw invalid();
    const value = Number(raw) / (control.scale ?? 1);
    if (!Number.isFinite(value) || value < control.min || value > control.max) throw invalid();
    if (value !== control.get()) control.set(value);
  }
  return { v: 1, editor, colour: `#${params.get("colour") ?? DEFAULT_COLOUR.slice(1)}`, tab: (params.get("tab") ?? "compose") as SharedState["tab"] };
}

export function encodeState(state: SharedState): string {
  const editor = state.editor;
  const params = new URLSearchParams(editor.name === null ? { document: JSON.stringify(editor.initial) } : { shape: editor.name });
  const original = new Map(controlsOf(originEditor(params)).map((c) => [c.label, c.get()]));
  for (const control of controlsOf(editor)) {
    if (control.label === "Roundness of the selected dot" || !original.has(control.label) || control.get() === original.get(control.label)) continue;
    params.set(CONTROL_PARAMS[control.label], String(round3(control.get() * (control.scale ?? 1))));
  }
  if (editor.selected) params.set("selected", String(editor.selected));
  if (state.colour !== DEFAULT_COLOUR) params.set("colour", state.colour.slice(1));
  if (state.tab !== "compose") params.set("tab", state.tab);
  const rebuilt = readParams(params).editor;
  for (const [key, value, expected] of [
    ["geometry", editor.doc.shape, rebuilt.doc.shape],
    ["base", editor.base, rebuilt.base],
    ["transforms", editor.doc.transforms, rebuilt.doc.transforms],
  ] as const) {
    if (JSON.stringify(value) !== JSON.stringify(expected)) params.set(key, JSON.stringify(value ?? []));
  }
  const result = params.toString();
  if (result.length > MAX_ADDRESS_LENGTH) throw invalid();
  return result;
}

function validate(value: SharedState): SharedState {
  const editor = value?.editor;
  const origin = editor?.name == null ? editor?.initial : Object.hasOwn(CATALOGUE, editor.name) ? CATALOGUE[editor.name] : undefined;
  assertDocumentBudget(editor?.doc);
  if (value?.v !== 1 || !origin || !/^#[0-9a-f]{6}$/i.test(value.colour) ||
      !["compose", "svg", "png", "css"].includes(value.tab) ||
      editor.doc?.v !== 1 || editor.doc.shape?.kind !== origin.shape.kind ||
      !Number.isFinite(editor.roundness) || editor.roundness < 0 || editor.roundness > 2.5 ||
      !Number.isInteger(editor.selected) || editor.selected < 0 || !editor.base) throw invalid();
  const shape = editor.doc.shape;
  const count = shape.kind === "polygon" ? shape.vertices?.length : shape.kind === "ngon" ? shape.vertices :
    shape.kind === "star" || shape.kind === "pillStar" ? 2 * (shape.verticesPerRadius ?? 8) : shape.kind === "rectangle" ? 4 : 0;
  if (!Number.isFinite(count) || count > 4096 ||
      (shape.kind === "polygon" && (editor.selected >= count || count * (shape.repeat?.count ?? 1) * 2 > 8192)) ||
      (shape.kind !== "polygon" && editor.selected !== 0) ||
      (shape.kind === "circle" && (shape.vertices ?? 8) > 4096)) throw invalid();
  const rounding = (r: Rounding) => {
    if (!r || !Number.isFinite(r.radius) || r.radius < 0 || r.radius > 1e6 ||
        (r.smoothing !== undefined && (!Number.isFinite(r.smoothing) || r.smoothing < 0 || r.smoothing > 1))) throw invalid();
  };
  for (const key of ["rounding", "innerRounding"] as const) {
    if ((shape as Radii)[key] !== undefined && !editor.base[key]) throw invalid();
    if (editor.base[key] !== undefined) rounding(editor.base[key]);
  }
  const perVertex = editor.base.perVertexRounding;
  if (("perVertexRounding" in shape && shape.perVertexRounding !== undefined && !perVertex) ||
      (perVertex && (!Array.isArray(perVertex) || perVertex.length !== count))) throw invalid();
  perVertex?.forEach(rounding);
  const checkNumbers = (node: unknown, depth = 0) => {
    if (depth > 20) throw invalid();
    if (typeof node === "number" && (!Number.isFinite(node) || Math.abs(node) > 1e6)) throw invalid();
    if (node && typeof node === "object") Object.values(node).forEach((child) => checkNumbers(child, depth + 1));
  };
  checkNumbers(editor.doc);
  checkNumbers(editor.initial);
  return value;
}

export function decodeState(payload: string): SharedState {
  if (!payload || payload.length > MAX_ADDRESS_LENGTH) throw invalid();
  return validate(readParams(new URLSearchParams(payload)));
}

export function studioAddress({ document, presentation }: SharedShape): string {
  const name = catalogueNameOf(document);
  const editor = name ? pick(name) : fromDocument(document);
  return `#${encodeState({ v: 1, editor, colour: presentation.colour.toLowerCase(), tab: "compose" })}`;
}
