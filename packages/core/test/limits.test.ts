import { describe, expect, it } from "vitest";
import { assertDocumentBudget, DEFAULT_LIMITS } from "../src/limits";

describe("document budget", () => {
  it("counts vertices after repeated polygon expansion", () => {
    const document = {
      v: 1,
      shape: {
        kind: "polygon",
        vertices: [[0, 0], [1, 0], [0, 1]],
        repeat: { count: DEFAULT_LIMITS.maxVertices, mirror: false },
      },
    };
    expect(() => assertDocumentBudget(document)).toThrow(/vertices/i);
    expect(() => assertDocumentBudget({ ...document, shape: { ...document.shape, repeat: { count: 1, mirror: false } } })).not.toThrow();
  });
});
