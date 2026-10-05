import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsEnabled, createAnalytics, loadFirebase, track, trackPageView, type Sink } from "./analytics";

const firebase = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: "app" })),
  initializeAnalytics: vi.fn(() => ({ name: "analytics" })),
  isSupported: vi.fn(async () => true),
  logEvent: vi.fn(),
}));
vi.mock("firebase/app", () => ({ initializeApp: firebase.initializeApp }));
vi.mock("firebase/analytics", () => ({
  initializeAnalytics: firebase.initializeAnalytics, isSupported: firebase.isSupported, logEvent: firebase.logEvent,
}));

const settled = () => new Promise((resolve) => setTimeout(resolve));
beforeEach(() => vi.clearAllMocks());

describe("deciding whether to collect", () => {
  it("collects only in a production build that is not switched off or driven by automation", () => {
    expect(analyticsEnabled({ production: true, automated: false })).toBe(true);
    expect(analyticsEnabled({ production: false, automated: false })).toBe(false);
    expect(analyticsEnabled({ production: true, setting: "off", automated: false })).toBe(false);
    expect(analyticsEnabled({ production: true, automated: true })).toBe(false);
  });

  it("never touches Firebase under the test runner, which is not a production build", async () => {
    expect(import.meta.env.PROD).toBe(false);
    track("connect_open", {});
    await settled();
    expect(firebase.isSupported).not.toHaveBeenCalled();
    expect(firebase.initializeApp).not.toHaveBeenCalled();
    expect(firebase.logEvent).not.toHaveBeenCalled();
  });
});

describe("loading Firebase", () => {
  it("initialises nothing when the browser does not support analytics", async () => {
    firebase.isSupported.mockResolvedValueOnce(false);
    expect(await loadFirebase()).toBeNull();
    expect(firebase.initializeApp).not.toHaveBeenCalled();
    expect(firebase.initializeAnalytics).not.toHaveBeenCalled();
  });

  it("sends nothing through the wrapper when the browser does not support analytics", async () => {
    firebase.isSupported.mockResolvedValueOnce(false);
    const send = createAnalytics(loadFirebase);
    send("connect_open", {});
    await settled();
    send("plugin_verify", {});
    expect(firebase.logEvent).not.toHaveBeenCalled();
    expect(firebase.isSupported).toHaveBeenCalledOnce();
  });

  it("turns off automatic page views and reports the address without its hash", async () => {
    window.history.replaceState(null, "", "/material-shape-studio/#shape=Heart");
    const sink = await loadFirebase();
    expect(firebase.initializeApp).toHaveBeenCalledWith(expect.objectContaining({ projectId: "material-shape-studio", measurementId: expect.stringMatching(/^G-/) }));
    expect(firebase.initializeAnalytics).toHaveBeenCalledWith({ name: "app" }, {
      config: { send_page_view: false, page_location: `${window.location.origin}/material-shape-studio/` },
    });
    sink!("select_shape", { shape: "Heart" });
    expect(firebase.logEvent).toHaveBeenCalledWith({ name: "analytics" }, "select_shape", { shape: "Heart" });
  });
});

describe("the wrapper", () => {
  it("does nothing without a loader", () => {
    expect(() => createAnalytics(null)("plugin_verify", {})).not.toThrow();
  });

  it("drops events when the loader reports no support or fails", async () => {
    for (const load of [async () => null, () => Promise.reject(new Error("blocked"))]) {
      const send = createAnalytics(load);
      send("connect_open", {});
      await settled();
      expect(() => send("plugin_verify", {})).not.toThrow();
    }
  });

  it("delivers events sent before it is ready once, in order, then sends the rest directly", async () => {
    const sink = vi.fn<Sink>();
    let ready!: (sink: Sink) => void;
    const send = createAnalytics(() => new Promise((resolve) => { ready = resolve; }));
    send("select_shape", { shape: "Heart" });
    send("export_shape", { format: "svg", method: "download", shape: "Heart", edited: false });
    expect(sink).not.toHaveBeenCalled();
    ready(sink);
    await settled();
    send("plugin_install", { host: "claude-code", method: "copy" });
    expect(sink.mock.calls).toEqual([
      ["select_shape", { shape: "Heart" }],
      ["export_shape", { format: "svg", method: "download", shape: "Heart", edited: false }],
      ["plugin_install", { host: "claude-code", method: "copy" }],
    ]);
  });
});

it("reports a page view with the title and the address without its hash", () => {
  window.history.replaceState(null, "", "/material-shape-studio/#shape=Heart&rotate=45");
  document.title = "Material Shape Studio";
  const send = vi.fn();
  trackPageView(send, document);
  expect(send).toHaveBeenCalledWith("page_view", {
    page_title: "Material Shape Studio",
    page_location: `${window.location.origin}/material-shape-studio/`,
  });
});
