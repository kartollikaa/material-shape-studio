import type { InstallHost, Track } from "./analytics";

export function mountConnect(page: Document, track: Track = () => {}) {
  const view = page.defaultView!;
  const copyStatus = page.getElementById("copy-status")!;
  const reportCopy = (button: HTMLElement) => {
    if (button.dataset.install) track("plugin_install", { host: button.dataset.install as InstallHost, method: "copy" });
    if (button.hasAttribute("data-verify")) track("plugin_verify", {});
  };

  for (const button of page.querySelectorAll<HTMLButtonElement>("button[data-copy]")) {
    button.addEventListener("click", async () => {
      const text = button.parentElement!.querySelector("pre")!.textContent ?? "";
      try {
        await view.navigator.clipboard.writeText(text);
        button.textContent = copyStatus.textContent = "Copied";
        setTimeout(() => { button.textContent = "Copy"; }, 1500);
        reportCopy(button);
      } catch {
        copyStatus.textContent = "Copy failed. Select and copy the text instead.";
      }
    });
  }
  for (const link of page.querySelectorAll<HTMLAnchorElement>("a[data-install]")) {
    link.addEventListener("click", () => track("plugin_install", { host: link.dataset.install as InstallHost, method: "link" }));
  }

  const tablist = page.querySelector<HTMLElement>(".host-tabs");
  if (tablist) {
    const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const select = (tab: HTMLButtonElement, focus = false) => {
      for (const other of tabs) {
        const selected = other === tab;
        other.setAttribute("aria-selected", String(selected));
        other.tabIndex = selected ? 0 : -1;
        page.getElementById(other.getAttribute("aria-controls")!)!.hidden = !selected;
      }
      if (focus) tab.focus();
    };
    const fromHash = () => tabs.find((tab) => `#${tab.getAttribute("aria-controls")}` === view.location.hash);
    tablist.hidden = false;
    select(fromHash() ?? tabs[0]);
    view.addEventListener("hashchange", () => { const tab = fromHash(); if (tab) select(tab); });
    for (const tab of tabs) {
      tab.addEventListener("click", () => {
        select(tab);
        view.history.replaceState(null, "", `#${tab.getAttribute("aria-controls")}`);
      });
      tab.addEventListener("keydown", (event) => {
        const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (step) select(tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length], true);
      });
    }
  }
  track("connect_open", {});
}
