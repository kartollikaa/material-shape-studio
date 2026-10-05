import { expect, test } from "@playwright/test";

test("offers an honest unavailable state and a plain-text agent file", async ({ page }) => {
  test.skip(!!process.env.VITE_MCP_PACKAGE_VERSION, "configured package build");
  await page.goto("./");
  await expect(page.locator('link[rel="alternate"][type="text/plain"]')).toHaveAttribute("href", "./connect/agent.txt");
  await page.getByRole("link", { name: "Connect an agent" }).click();
  await expect(page.locator("#connection-unavailable")).toContainText("not published yet");
  await expect(page.locator("#install")).toHaveCount(0);
  const text = await page.locator('a[href="./agent.txt"]').getAttribute("href");
  expect(text).toBe("./agent.txt");
  const response = await page.request.get(new URL(text!, page.url()).href);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("not published yet");
});

test("uses one configured package in the page and agent file", async ({ page }) => {
  test.skip(!process.env.VITE_MCP_PACKAGE_VERSION, "unavailable package build");
  const packageSpec = `material-shape-studio-mcp@${process.env.VITE_MCP_PACKAGE_VERSION}`;
  await page.goto("./connect/");
  await expect(page.locator("#package-spec")).toHaveText(packageSpec);
  const response = await page.request.get(new URL("./agent.txt", page.url()).href);
  expect(await response.text()).toContain(packageSpec);
});

test("serves every install method in the HTML without scripts", async ({ request, baseURL }) => {
  test.skip(!process.env.VITE_MCP_PACKAGE_VERSION, "unavailable package build");
  const html = await (await request.get(new URL("./connect/", baseURL).href)).text();
  for (const command of ["/plugin install material-shape-studio --marketplace", "codex plugin marketplace add", "cursor://anysphere.cursor-deeplink/mcp/install"]) {
    expect(html).toContain(command);
  }
});

test("shows one host at a time, selected by the address", async ({ page }) => {
  test.skip(!process.env.VITE_MCP_PACKAGE_VERSION, "unavailable package build");
  await page.goto("./connect/#codex");
  await expect(page.getByRole("tab", { name: "Codex" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#codex")).toBeVisible();
  await expect(page.locator("#claude-code")).toBeHidden();
  await page.getByRole("tab", { name: "Cursor" }).click();
  await expect(page.getByRole("link", { name: "Add to Cursor" })).toBeVisible();
  await expect(page).toHaveURL(/#cursor$/);
});
