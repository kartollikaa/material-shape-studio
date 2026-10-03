import type { ShapeDocument } from "./document";
import { assertDocumentBudget, DEFAULT_LIMITS } from "./limits";

export type ShapePresentation = {
  colour: string;
  theme: "light" | "dark";
  context: "photo" | "button" | "avatar";
};

export type SharedShape = { document: ShapeDocument; presentation: ShapePresentation };

const bytes = (value: string) => new TextEncoder().encode(value);

function blobOf(data: Uint8Array): Blob {
  const copy = new Uint8Array(data.length);
  copy.set(data);
  return new Blob([copy.buffer]);
}

function validate(value: SharedShape): void {
  assertDocumentBudget(value.document);
  const { colour, theme, context } = value.presentation;
  if (!/^#[\da-fA-F]{6}$/.test(colour)) throw new Error("presentation.colour must be a six-digit hex colour");
  if (theme !== "light" && theme !== "dark") throw new Error("presentation.theme is invalid");
  if (context !== "photo" && context !== "button" && context !== "avatar") throw new Error("presentation.context is invalid");
}

async function collect(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) throw new Error("shape link exceeds size limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function encodeBase64(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("shape link payload is invalid");
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function encodeShare(value: SharedShape): Promise<string> {
  validate(value);
  const payload = bytes(JSON.stringify(value));
  if (payload.length > DEFAULT_LIMITS.maxDocumentBytes) throw new Error("shape link exceeds size limit");
  const compressed = await collect(blobOf(payload).stream().pipeThrough(new CompressionStream("deflate-raw")), DEFAULT_LIMITS.maxEncodedBytes);
  return `#doc=${encodeBase64(compressed)}`;
}

export async function decodeShare(fragment: string): Promise<SharedShape> {
  const match = /^#doc=([A-Za-z0-9_-]+)$/.exec(fragment);
  if (!match || match[1].length > DEFAULT_LIMITS.maxEncodedBytes * 2) throw new Error("shape link payload is invalid or too large");
  const compressed = decodeBase64(match[1]);
  if (compressed.length > DEFAULT_LIMITS.maxEncodedBytes) throw new Error("shape link exceeds size limit");
  const inflated = await collect(blobOf(compressed).stream().pipeThrough(new DecompressionStream("deflate-raw")), DEFAULT_LIMITS.maxDocumentBytes);
  const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(inflated)) as SharedShape;
  if (!value || typeof value !== "object" || !value.presentation) throw new Error("shape link document is invalid");
  validate(value);
  return value;
}
