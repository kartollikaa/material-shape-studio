import type { ShapeDocument } from "../document";
import data from "./catalogue.json";

export const CATALOGUE_SOURCE: string = data.source;
export const CATALOGUE = data.shapes as unknown as Record<string, ShapeDocument>;
export const CATALOGUE_NAMES = Object.keys(CATALOGUE);

const canonical = (value: unknown): string => JSON.stringify(value, (_, node) =>
  node && typeof node === "object" && !Array.isArray(node) ? Object.fromEntries(Object.entries(node).sort(([a], [b]) => (a < b ? -1 : 1))) : node);
const NAME_BY_DOCUMENT = new Map(CATALOGUE_NAMES.map((name) => [canonical(CATALOGUE[name]), name]));

export const catalogueNameOf = (doc: ShapeDocument): string | null => NAME_BY_DOCUMENT.get(canonical(doc)) ?? null;
