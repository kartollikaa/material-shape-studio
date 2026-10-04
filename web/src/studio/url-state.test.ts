import { describe, expect, it } from "vitest";
import { CATALOGUE_NAMES } from "../catalogue";
import { addDot, mainControls, pick } from "./editor";
import { decodeState, encodeState } from "./url-state";

describe("readable editor addresses", () => {
  const state = () => ({ v: 1 as const, editor: pick("Cookie4Sided"), colour: "#6750a4", tab: "compose" as const });

  it("uses named parameters instead of an encoded document", async () => {
    const encoded = await encodeState(state());
    expect(encoded).toBe("shape=Cookie4Sided");
    expect(await decodeState(encoded)).toEqual(JSON.parse(JSON.stringify(state())));
  });

  it("opens a hand-written link with editable values in the displayed units", async () => {
    const saved = await decodeState("shape=Heart&rotate=45&roundness=125&colour=123456&tab=svg");
    expect(saved.editor.name).toBe("Heart");
    expect(saved.editor.roundness).toBe(1.25);
    expect(saved.editor.doc.transforms).toContainEqual({ type: "rotate", degrees: 45 });
    expect(saved.colour).toBe("#123456");
    expect(saved.tab).toBe("svg");
  });

  it("preserves editable state for every catalogue shape at both ends of its controls", async () => {
    for (const name of CATALOGUE_NAMES) {
      for (const end of ["min", "max"] as const) {
        const saved = { ...state(), editor: pick(name) };
        for (const control of mainControls(saved.editor)) control.set(control[end]);
        if (saved.editor.doc.shape.kind === "polygon") addDot(saved.editor);
        const decoded = await decodeState(await encodeState(saved));
        expect(decoded, `${name} ${end}`).toEqual(JSON.parse(JSON.stringify(saved)));
      }
    }
  });

  it("preserves repeat counts enabled by adding dots", () => {
    for (const name of CATALOGUE_NAMES) {
      const saved = { ...state(), editor: pick(name) };
      if (saved.editor.doc.shape.kind !== "polygon") continue;
      addDot(saved.editor);
      addDot(saved.editor);
      const repeats = mainControls(saved.editor).find((c) => c.label === "Repeats");
      if (!repeats) continue;
      repeats.set(repeats.min);
      expect(decodeState(encodeState(saved)), name).toEqual(JSON.parse(JSON.stringify(saved)));
    }
  });

  it.each([
    "shape=Heart&v=2", "shape=Missing", "shape=Heart&colour=bad", "shape=Heart&tab=unknown",
    "shape=Heart&selected=999", "shape=Heart&repeats=1e9", "shape=Heart&rotate=NaN",
    "shape=Heart&roundness=300", "shape=Heart&roundness=", "shape=Heart&rotate=45&rotate=60",
    "shape=Heart&unknown=1", "shape=Heart&geometry={}", "shape=Heart&base={}",
    "shape=Heart&geometry=%7B%22kind%22%3A%22circle%22%7D", "broken", "", "A".repeat(100_001),
  ])("rejects an invalid address: %.70s", async (value) => {
    expect(() => decodeState(value)).toThrow();
  });
});
