import type { ShapeDocument } from "../document";
import data from "./catalogue.json";

export const CATALOGUE_SOURCE: string = data.source;
export const CATALOGUE = data.shapes as unknown as Record<string, ShapeDocument>;
export const CATALOGUE_NAMES = Object.keys(CATALOGUE);

const NAME_BY_DOCUMENT = new Map(CATALOGUE_NAMES.map((name) => [JSON.stringify(CATALOGUE[name]), name]));

export const catalogueNameOf = (doc: ShapeDocument): string | null => NAME_BY_DOCUMENT.get(JSON.stringify(doc)) ?? null;
