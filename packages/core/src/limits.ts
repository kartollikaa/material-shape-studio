export const DEFAULT_LIMITS = {
  maxDocumentBytes: 32_768,
  maxEncodedBytes: 32_768,
  maxVertices: 512,
  maxTransforms: 32,
  maxSerializedFeatureBytes: 16_384,
} as const;

export function assertDocumentBudget(value: unknown): void {
  if (!value || typeof value !== "object") throw new Error("document must be an object");
  const doc = value as Record<string, unknown>;
  const json = JSON.stringify(value);
  if (!json || new TextEncoder().encode(json).length > DEFAULT_LIMITS.maxDocumentBytes) {
    throw new Error("document exceeds size limit");
  }
  const transforms = doc.transforms;
  if (transforms !== undefined && (!Array.isArray(transforms) || transforms.length > DEFAULT_LIMITS.maxTransforms)) {
    throw new Error("transforms exceed limit");
  }
  const shape = doc.shape as Record<string, unknown> | undefined;
  if (!shape || typeof shape !== "object") throw new Error("shape must be an object");
  let vertices = 0;
  switch (shape.kind) {
    case "polygon": {
      const points = shape.vertices;
      if (!Array.isArray(points)) throw new Error("shape.vertices must be an array");
      const repeat = shape.repeat as Record<string, unknown> | undefined;
      const count = repeat?.count ?? 1;
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1) throw new Error("shape.repeat.count is invalid");
      vertices = points.length * count * (repeat?.mirror ? 2 : 1);
      break;
    }
    case "ngon":
      vertices = Number(shape.vertices);
      break;
    case "circle":
      vertices = Number(shape.vertices ?? 10);
      break;
    case "star":
    case "pillStar":
      vertices = 2 * Number(shape.verticesPerRadius ?? 8);
      break;
    case "rectangle":
    case "pill":
      vertices = 4;
      break;
    case "features":
      if (typeof shape.serialized !== "string" || shape.serialized.length > DEFAULT_LIMITS.maxSerializedFeatureBytes) {
        throw new Error("shape.serialized exceeds size limit");
      }
      break;
    default:
      throw new Error("shape.kind is unsupported");
  }
  if (!Number.isFinite(vertices) || vertices > DEFAULT_LIMITS.maxVertices) {
    throw new Error("shape exceeds vertices limit");
  }
}
