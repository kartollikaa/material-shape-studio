import type { ShapeDocument } from "../document";
import data from "./catalogue.json";

export const CATALOGUE_SOURCE: string = data.source;
export const CATALOGUE = data.shapes as unknown as Record<string, ShapeDocument>;
export const CATALOGUE_NAMES = Object.keys(CATALOGUE);
