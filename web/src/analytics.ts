export type InstallHost = "agent" | "claude-code" | "codex" | "cursor" | "cli";

export type AnalyticsEvents = {
  page_view: { page_title: string; page_location: string };
  select_shape: { shape: string };
  export_shape: { format: "compose" | "svg" | "png" | "css"; method: "copy" | "download"; shape: string; edited: boolean };
  copy_shape_document: Record<string, never>;
  connect_open: Record<string, never>;
  plugin_install: { host: InstallHost; method: "copy" | "link" };
  plugin_verify: Record<string, never>;
};

export type Track = <N extends keyof AnalyticsEvents>(name: N, params: AnalyticsEvents[N]) => void;
export type Sink = (name: string, params: object) => void;

// The web config identifies the app to Google; it is public by design and not a secret.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBVlA2u2Y_k3P2b6hiJDcYn1kYB-D88Ik8",
  authDomain: "material-shape-studio.firebaseapp.com",
  projectId: "material-shape-studio",
  storageBucket: "material-shape-studio.firebasestorage.app",
  messagingSenderId: "638551594502",
  appId: "1:638551594502:web:447f04968a76668ef79587",
  measurementId: "G-YBZ9X6ZTT8",
};

// The hash carries the whole shape document, so no event may report it.
export const pageLocation = (location: { origin: string; pathname: string }) => location.origin + location.pathname;

export const analyticsEnabled = (env: { production: boolean; setting?: string; automated: boolean }) =>
  env.production && env.setting !== "off" && !env.automated;

export function createAnalytics(load: (() => Promise<Sink | null>) | null): Track {
  if (!load) return () => {};
  let sink: Sink | null | undefined;
  const pending: [string, object][] = [];
  const settle = (ready: Sink | null) => {
    sink = ready;
    for (const [name, params] of pending.splice(0)) ready?.(name, params);
  };
  load().then(settle, () => settle(null));
  return (name, params) => {
    if (sink === undefined) pending.push([name, params]);
    else sink?.(name, params);
  };
}

export const trackPageView = (track: Track, page: Document) =>
  track("page_view", { page_title: page.title, page_location: pageLocation(page.location) });

export async function loadFirebase(): Promise<Sink | null> {
  const [{ initializeApp }, { initializeAnalytics, isSupported, logEvent }] = await Promise.all([import("firebase/app"), import("firebase/analytics")]);
  if (!(await isSupported())) return null;
  const analytics = initializeAnalytics(initializeApp(FIREBASE_CONFIG), {
    config: { send_page_view: false, page_location: pageLocation(location) },
  });
  return (name, params) => logEvent(analytics, name, params);
}

export const track: Track = createAnalytics(
  analyticsEnabled({ production: import.meta.env.PROD, setting: import.meta.env.VITE_ANALYTICS, automated: navigator.webdriver })
    ? loadFirebase
    : null,
);
