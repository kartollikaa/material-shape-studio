import { describe, expect, it } from "vitest";
import { CATALOGUE_NAMES } from "../src/catalogue";
import { CATALOGUE, catalogueNameOf } from "../src/catalogue";
import type { ShapeDocument } from "../src/document";
import { addDot, fromDocument, mainControls, moreControls, moveDot, pick } from "../src/studio/editor";
import { decodeState, encodeState, studioAddress } from "../src/studio/address";

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

  const customDocuments: ShapeDocument[] = [
    { v: 1, shape: { kind: "ngon", vertices: 7 } },
    { v: 1, shape: { kind: "rectangle", width: 2, height: 1.2, rounding: { radius: 0.3, smoothing: 0.6 } }, transforms: [{ type: "normalize" }] },
    { v: 1, shape: { kind: "star", verticesPerRadius: 5, innerRadius: 0.7, rounding: { radius: 0.5 }, innerRounding: { radius: 0 } }, transforms: [{ type: "rotate", degrees: -90 }, { type: "normalize" }] },
    { v: 1, name: "Pebble", shape: { kind: "polygon", vertices: [[0.95, 0.45], [0.3, 0.95], [0.05, 0.55], [0.65, 0.05]], perVertexRounding: [{ radius: 0.4 }, { radius: 0.2 }, { radius: 0.45 }, { radius: 0.15 }] }, transforms: [{ type: "normalize" }] },
    { v: 1, shape: { kind: "pill", width: 3, height: 1 } },
    { v: 1, shape: { kind: "circle" }, transforms: [{ type: "scale", x: 1, y: 0.5 }, { type: "normalize" }] },
  ];

  it("gives a catalogue document the same named address the website writes for that shape", () => {
    for (const name of CATALOGUE_NAMES) {
      expect(studioAddress({ document: CATALOGUE[name], presentation: { colour: "#6750a4", theme: "light", context: "button" } })).toBe(`#shape=${name}`);
    }
    expect(studioAddress({ document: CATALOGUE.Heart, presentation: { colour: "#ABCDEF", theme: "dark", context: "avatar" } })).toBe("#shape=Heart&colour=abcdef");
  });

  it("recognises a catalogue document whatever its key order, and opens it as that shape", () => {
    const reordered = { transforms: CATALOGUE.Heart.transforms, shape: { ...CATALOGUE.Heart.shape }, v: 1 } as ShapeDocument;
    expect(catalogueNameOf(reordered)).toBe("Heart");
    expect(studioAddress({ document: reordered, presentation: { colour: "#6750a4", theme: "light", context: "button" } })).toBe("#shape=Heart");
    expect(decodeState(`document=${encodeURIComponent(JSON.stringify(reordered))}`).editor.name).toBe("Heart");
  });

  it("reopens a shape the editor can build past the agent document budget", () => {
    const saved = { ...state(), editor: pick("Cookie4Sided") };
    mainControls(saved.editor).find((c) => c.label === "Repeats")!.set(16);
    for (let i = 0; i < 40; i++) addDot(saved.editor);
    expect(decodeState(encodeState(saved))).toEqual(JSON.parse(JSON.stringify(saved)));
  });

  it("gives a custom document a readable address that reopens it as the reset baseline", () => {
    for (const document of customDocuments) {
      const address = studioAddress({ document, presentation: { colour: "#123456", theme: "light", context: "button" } });
      expect(address.startsWith("#document=")).toBe(true);
      expect(new URLSearchParams(address.slice(1)).get("document")).toBe(JSON.stringify(document));
      const decoded = decodeState(address.slice(1));
      expect(decoded).toEqual(JSON.parse(JSON.stringify({ v: 1, editor: fromDocument(document), colour: "#123456", tab: "compose" })));
      expect(encodeState(decoded)).toBe(address.slice(1));
    }
  });

  it("keeps a custom shape's edits in named parameters on top of its original document", () => {
    for (const document of customDocuments) {
      for (const end of ["min", "max"] as const) {
        const saved = { ...state(), editor: fromDocument(document) };
        for (const control of [...mainControls(saved.editor), ...moreControls(saved.editor)]) control.set(control[end]);
        if (saved.editor.doc.shape.kind === "polygon") {
          addDot(saved.editor);
          moveDot(saved.editor, 0, [0.9, 0.4]);
        }
        const encoded = encodeState(saved);
        expect(new URLSearchParams(encoded).get("document"), `${document.shape.kind} ${end}`).toBe(JSON.stringify(document));
        expect(decodeState(encoded), `${document.shape.kind} ${end}`).toEqual(JSON.parse(JSON.stringify(saved)));
      }
    }
  });

  it.each([
    "shape=Heart&v=2", "shape=Missing", "shape=Heart&colour=bad", "shape=Heart&tab=unknown",
    "shape=Heart&selected=999", "shape=Heart&repeats=1e9", "shape=Heart&rotate=NaN",
    "shape=Heart&roundness=300", "shape=Heart&roundness=", "shape=Heart&rotate=45&rotate=60",
    "shape=Heart&unknown=1", "shape=Heart&geometry={}", "shape=Heart&base={}",
    "shape=Heart&geometry=%7B%22kind%22%3A%22circle%22%7D", "broken", "", "A".repeat(131_073),
    `shape=Heart&document=${encodeURIComponent(JSON.stringify(CATALOGUE.Heart))}`, "document=%7B%7D", "document=null", "document=%5B%5D",
    `document=${encodeURIComponent(JSON.stringify({ v: 2, shape: { kind: "ngon", vertices: 5 } }))}`,
    `document=${encodeURIComponent(JSON.stringify({ v: 1, shape: { kind: "teapot" } }))}`,
    `document=${encodeURIComponent(JSON.stringify({ v: 1, shape: { kind: "ngon", vertices: 5 } }))}&geometry=${encodeURIComponent(JSON.stringify({ kind: "star", verticesPerRadius: 5 }))}`,
    `document=${encodeURIComponent(JSON.stringify({ v: 1, shape: { kind: "ngon", vertices: 100_000 } }))}`,
  ])("rejects an invalid address: %.70s", async (value) => {
    expect(() => decodeState(value)).toThrow();
  });
});
