import { parentPort } from "node:worker_threads";
import { build, buildCubics, version } from "@material-shape-studio/engine";
import { assertDocumentBudget, catalogueNameOf, cssRule, kotlinFile, svgFile, type ShapeDocument, type SharedShape } from "@material-shape-studio/core";
import { comparisonPng } from "./preview";

export type ShapeJob =
  | { kind: "create"; document: ShapeDocument }
  | { kind: "preview"; shapes: (SharedShape & { label: string })[] }
  | { kind: "export"; shape: SharedShape; target: "compose" | "svg" | "css" }
  | { kind: "stall" };

function stall(): never {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
  throw new Error("stall interrupted");
}

function geometry(document: ShapeDocument) {
  assertDocumentBudget(document);
  const result = JSON.parse(build(JSON.stringify(document))) as { bounds: [number, number, number, number] };
  const cubics = Array.from(buildCubics(JSON.stringify(document)));
  if (!result.bounds.every(Number.isFinite) || cubics.length === 0 || cubics.length % 8 !== 0 || !cubics.every(Number.isFinite)) {
    throw new Error("document produces invalid geometry");
  }
  return { ...result, cubics };
}

export function performJob(job: ShapeJob) {
  if (job.kind === "stall") return stall();
  if (job.kind === "create") {
    const { bounds } = geometry(job.document);
    const engineVersion = JSON.parse(version()).graphicsShapes as string;
    return { document: job.document, bounds, engineVersion, warnings: bounds.some((v, i) => i < 2 ? v < 0 : v > 1) ? ["Shape extends outside the unit square"] : [] };
  }
  if (job.kind === "preview") {
    const items = job.shapes.map(({ document, label, presentation }, index) => {
      try { return { ...geometry(document), label, presentation }; }
      catch (error) { throw new Error(`shapes[${index}]: ${(error as Error).message}`); }
    });
    return { png: Buffer.from(comparisonPng(items)).toString("base64") };
  }
  const { cubics } = geometry(job.shape.document);
  const { colour } = job.shape.presentation;
  if (job.target === "svg") return { code: svgFile(cubics, colour), mediaType: "image/svg+xml", filename: "shape.svg" };
  if (job.target === "css") return { code: cssRule(cubics), mediaType: "text/css", filename: "shape.css" };
  return { code: kotlinFile(job.shape.document, { catalogueName: catalogueNameOf(job.shape.document), colour }), mediaType: "text/x-kotlin", filename: "MyShape.kt" };
}

parentPort?.on("message", (job: ShapeJob) => {
  try { parentPort!.postMessage({ ok: true, value: performJob(job) }); }
  catch (error) { parentPort!.postMessage({ ok: false, error: (error as Error).message }); }
});
