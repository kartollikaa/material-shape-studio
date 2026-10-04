import { build } from "@material-shape-studio/engine";
import { decodeShare, encodeShare } from "@material-shape-studio/core";
import { CATALOGUE } from "../catalogue";
import type { Rounding } from "../document";
import { fromDocument, mainControls, moreControls, pick, round3, type EditorState, type Radii } from "./editor";

export type SharedState = { v: 1; editor: EditorState; colour: string; tab: "compose" | "svg" | "png" | "css" };

const MAX_ADDRESS_LENGTH = 100_000;
const invalid = () => new Error("This address does not contain a valid editor state.");

const CONTROL_PARAMS: Record<string, string> = {
  Repeats: "repeats", Points: "points", Depth: "depth", Sides: "sides", Proportion: "proportion",
  Squash: "squash", Roundness: "roundness", Rotate: "rotate", Softness: "softness",
  "Roundness of the selected dot": "dot-radius",
};
const controlsOf = (editor: EditorState) => [...mainControls(editor), ...moreControls(editor)];

function readParams(params: URLSearchParams): SharedState {
  const name = params.get("shape");
  const known = new Set(["shape", "v", "selected", "colour", "tab", "geometry", "base", "transforms", ...Object.values(CONTROL_PARAMS)]);
  for (const key of params.keys()) if (!known.has(key) || params.getAll(key).length !== 1) throw invalid();
  if (!name || !Object.hasOwn(CATALOGUE, name) || (params.has("v") && params.get("v") !== "1")) throw invalid();
  const editor = pick(name);
  if (params.has("geometry")) editor.doc.shape = JSON.parse(params.get("geometry")!);
  if (params.has("base")) editor.base = JSON.parse(params.get("base")!);
  if (params.has("transforms")) editor.doc.transforms = JSON.parse(params.get("transforms")!);
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
  return { v: 1, editor, colour: `#${params.get("colour") ?? "6750a4"}`, tab: (params.get("tab") ?? "compose") as SharedState["tab"] };
}

export function encodeState(state: SharedState): string {
  const editor = state.editor;
  if (editor.name === null) throw invalid();
  const params = new URLSearchParams({ shape: editor.name });
  const original = new Map(controlsOf(pick(editor.name)).map((c) => [c.label, c.get()]));
  for (const control of controlsOf(editor)) {
    if (control.label === "Roundness of the selected dot" || control.get() === original.get(control.label)) continue;
    params.set(CONTROL_PARAMS[control.label], String(round3(control.get() * (control.scale ?? 1))));
  }
  if (editor.selected) params.set("selected", String(editor.selected));
  if (state.colour !== "#6750a4") params.set("colour", state.colour.slice(1));
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
  const original = editor?.name != null && Object.hasOwn(CATALOGUE, editor.name) ? CATALOGUE[editor.name] : undefined;
  if (value?.v !== 1 || !original || !/^#[0-9a-f]{6}$/i.test(value.colour) ||
      !["compose", "svg", "png", "css"].includes(value.tab) ||
      editor.doc?.v !== 1 || editor.doc.shape?.kind !== original.shape.kind ||
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
  build(JSON.stringify(editor.doc));
  return value;
}

export function decodeState(payload: string): SharedState {
  if (!payload || payload.length > MAX_ADDRESS_LENGTH) throw invalid();
  return validate(readParams(new URLSearchParams(payload)));
}

async function decodeShapeLink(fragment: string, tab: SharedState["tab"]): Promise<SharedState> {
  const { document, presentation } = await decodeShare(fragment);
  build(JSON.stringify(document));
  return { v: 1, editor: fromDocument(document), colour: presentation.colour, tab };
}

export function syncAddress(view: Window, initial: SharedState, apply: (state: SharedState) => void, notice: (message: string) => void) {
  let disposed = false;
  let revision = 0;
  const defaults = JSON.stringify(initial);
  let previous = defaults;
  const restoreDefaults = () => {
    previous = defaults;
    apply(JSON.parse(defaults));
    notice("This link could not be opened. The default shape is shown.");
  };
  const load = () => {
    if (disposed) return;
    const current = ++revision;
    const hash = view.location.hash;
    if (!hash) {
      previous = defaults;
      apply(JSON.parse(defaults));
      return;
    }
    if (hash.startsWith("#doc=")) {
      decodeShapeLink(hash, initial.tab).then((state) => {
        if (disposed || current !== revision) return;
        previous = JSON.stringify(state);
        apply(state);
      }, () => { if (!disposed && current === revision) restoreDefaults(); });
      return;
    }
    try {
      const state = decodeState(hash.slice(1));
      previous = JSON.stringify(state);
      apply(state);
    } catch {
      if (!disposed) restoreDefaults();
    }
  };
  load();
  view.addEventListener("hashchange", load);
  return {
    update(state: SharedState) {
      const json = JSON.stringify(state);
      if (json === previous || disposed) return;
      previous = json;
      const current = ++revision;
      const write = (payload: string) => {
        const url = new URL(view.location.href);
        url.hash = payload;
        view.history.replaceState(view.history.state, "", url);
      };
      const failed = () => {
        if (disposed) return;
        previous = "";
        notice("The address could not be updated. Your edits are still available here.");
      };
      if (state.editor.name === null) {
        encodeShare({ document: state.editor.doc, presentation: { colour: state.colour, theme: "light", context: "button" } })
          .then((fragment) => { if (!disposed && current === revision) write(fragment); }, failed);
        return;
      }
      try {
        write(encodeState(state));
      } catch {
        failed();
      }
    },
    dispose() { disposed = true; view.removeEventListener("hashchange", load); },
  };
}
