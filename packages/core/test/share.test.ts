import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { decodeShare } from "../src/share";
import type { SharedShape } from "../src/share";

const legacyLink = (value: unknown) => `#doc=${deflateRawSync(JSON.stringify(value)).toString("base64url")}`;

describe("legacy share links", () => {
  it("restores custom geometry and presentation without changing either", async () => {
    const value: SharedShape = {
      document: {
        v: 1,
        shape: { kind: "ngon", vertices: 5 },
        transforms: [{ type: "translate", x: 2, y: 0 }],
      },
      presentation: { colour: "#6750a4", theme: "dark", context: "avatar" },
    };
    expect(await decodeShare(legacyLink(value))).toEqual(value);
  });

  it("rejects a compressed payload that expands beyond the input budget", async () => {
    const value: SharedShape = {
      document: { v: 1, shape: { kind: "features", serialized: "V1" + "A".repeat(100_000) } },
      presentation: { colour: "#6750a4", theme: "light", context: "button" },
    };
    await expect(decodeShare(legacyLink(value))).rejects.toThrow(/size|large|limit/i);
  });
});
