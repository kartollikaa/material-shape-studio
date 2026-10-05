import { build } from "@material-shape-studio/engine";
import { decodeShare, decodeState, encodeState, fromDocument, type SharedState } from "@material-shape-studio/core";

const LEGACY_LINK = "#doc=";

function decodeAddress(payload: string): SharedState {
  const state = decodeState(payload);
  build(JSON.stringify(state.editor.doc));
  return state;
}

async function decodeLegacyLink(fragment: string, current: SharedState): Promise<SharedState> {
  const { document, presentation } = await decodeShare(fragment);
  build(JSON.stringify(document));
  return { ...current, editor: fromDocument(document), colour: presentation.colour.toLowerCase() };
}

export function syncAddress(view: Window, initial: SharedState, apply: (state: SharedState) => void, notice: (message: string) => void) {
  let disposed = false;
  let revision = 0;
  let latest = initial;
  const defaults = JSON.stringify(initial);
  let previous = defaults;
  const write = (payload: string) => {
    const url = new URL(view.location.href);
    url.hash = payload;
    view.history.replaceState(view.history.state, "", url);
  };
  const show = (state: SharedState) => {
    previous = JSON.stringify(state);
    latest = state;
    apply(state);
  };
  const restoreDefaults = () => {
    show(JSON.parse(defaults));
    notice("This link could not be opened. The default shape is shown.");
  };
  const load = () => {
    if (disposed) return;
    const current = ++revision;
    const hash = view.location.hash;
    if (!hash) {
      show(JSON.parse(defaults));
      return;
    }
    if (hash.startsWith(LEGACY_LINK)) {
      const editorAtStart = JSON.stringify(latest.editor);
      decodeLegacyLink(hash, latest).then((state) => {
        if (disposed || current !== revision || JSON.stringify(latest.editor) !== editorAtStart) return;
        const opened = { ...state, tab: latest.tab };
        show(opened);
        write(encodeState(opened));
      }).catch(() => { if (!disposed && current === revision) restoreDefaults(); });
      return;
    }
    try {
      show(decodeAddress(hash.slice(1)));
    } catch {
      if (!disposed) restoreDefaults();
    }
  };
  load();
  view.addEventListener("hashchange", load);
  return {
    update(state: SharedState) {
      latest = state;
      const json = JSON.stringify(state);
      if (json === previous || disposed) return;
      previous = json;
      try {
        write(encodeState(state));
      } catch {
        if (disposed) return;
        previous = "";
        notice("The address could not be updated. Your edits are still available here.");
      }
    },
    dispose() { disposed = true; view.removeEventListener("hashchange", load); },
  };
}
