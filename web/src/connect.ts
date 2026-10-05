const copyStatus = document.getElementById("copy-status")!;

for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-copy]")) {
  button.addEventListener("click", async () => {
    const text = button.parentElement!.querySelector("pre")!.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = copyStatus.textContent = "Copied";
      setTimeout(() => { button.textContent = "Copy"; }, 1500);
    } catch {
      copyStatus.textContent = "Copy failed. Select and copy the text instead.";
    }
  });
}

const tablist = document.querySelector<HTMLElement>(".host-tabs");
if (tablist) {
  const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (tab: HTMLButtonElement, focus = false) => {
    for (const other of tabs) {
      const selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")!)!.hidden = !selected;
    }
    if (focus) tab.focus();
  };
  const fromHash = () => tabs.find((tab) => `#${tab.getAttribute("aria-controls")}` === location.hash);
  tablist.hidden = false;
  select(fromHash() ?? tabs[0]);
  addEventListener("hashchange", () => { const tab = fromHash(); if (tab) select(tab); });
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      select(tab);
      history.replaceState(null, "", `#${tab.getAttribute("aria-controls")}`);
    });
    tab.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step) select(tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length], true);
    });
  }
}
