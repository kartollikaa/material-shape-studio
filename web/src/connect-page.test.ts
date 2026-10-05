import { afterEach, beforeEach, expect, it, vi, type Mock } from "vitest";
import type { Track } from "./analytics";
import { connectionHtml, connectionInstructions } from "./connection.mjs";
import { mountConnect } from "./connect-page";

const click = (element: Element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
const copyButton = (panel: string) => document.querySelector(`#${panel} button[data-copy]`)!;
let track: Mock<Track>;
let writeText: Mock<(text: string) => Promise<void>>;

beforeEach(() => {
  document.body.innerHTML = `<main>${connectionHtml(connectionInstructions("0.1.0"))}<p id="copy-status"></p></main>`;
  writeText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  track = vi.fn<Track>();
  mountConnect(document, track);
});
afterEach(() => Reflect.deleteProperty(navigator, "clipboard"));

it("reports opening the page", () => {
  expect(track.mock.calls).toEqual([["connect_open", {}]]);
});

it("reports a copied install step or prompt with its host", async () => {
  for (const panel of ["ask-agent", "claude-code", "codex", "cursor", "cli"]) click(copyButton(panel));
  await vi.waitFor(() => expect(track).toHaveBeenCalledTimes(6));
  expect(track.mock.calls.slice(1)).toEqual(["agent", "claude-code", "codex", "cursor", "cli"].map((host) => ["plugin_install", { host, method: "copy" }]));
});

it("reports Add to Cursor as an install link", () => {
  document.addEventListener("click", (event) => event.preventDefault(), { once: true });
  click(document.querySelector("#cursor a[data-install]")!);
  expect(track).toHaveBeenLastCalledWith("plugin_install", { host: "cursor", method: "link" });
});

it("reports the copied check command, and nothing for a failed copy", async () => {
  click(copyButton("verify"));
  await vi.waitFor(() => expect(track).toHaveBeenLastCalledWith("plugin_verify", {}));
  writeText.mockRejectedValueOnce(new Error("denied"));
  click(copyButton("claude-code"));
  await vi.waitFor(() => expect(document.getElementById("copy-status")!.textContent).toContain("Copy failed"));
  expect(track).toHaveBeenCalledTimes(2);
});
