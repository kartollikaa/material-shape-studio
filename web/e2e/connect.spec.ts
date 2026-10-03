import { expect, test } from "@playwright/test";

test("offers an honest unavailable state and a plain-text agent file", async ({ page }) => {
  test.skip(!!process.env.VITE_MCP_PACKAGE_VERSION, "configured package build");
  await page.goto("./");
  await expect(page.locator('link[rel="alternate"][type="text/plain"]')).toHaveAttribute("href", "./connect/agent.txt");
  await page.getByRole("link", { name: "Connect an agent" }).click();
  await expect(page.locator("#connection-state")).toHaveText("Agent plugin and CLI are not published yet.");
  await expect(page.locator("#connection-details")).toBeHidden();
  const text = await page.locator('a[href="./agent.txt"]').getAttribute("href");
  expect(text).toBe("./agent.txt");
  const response = await page.request.get(new URL(text!, page.url()).href);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("not published yet");
});

test("uses one configured package in the page and agent file", async ({ page }) => {
  test.skip(!process.env.VITE_MCP_PACKAGE_VERSION, "unavailable package build");
  await page.goto("./connect/");
  await expect(page.locator("#package-spec")).toHaveText(`material-shape-studio-mcp@${process.env.VITE_MCP_PACKAGE_VERSION}`);
  const response = await page.request.get(new URL("./agent.txt", page.url()).href);
  expect(await response.text()).toContain(`material-shape-studio-mcp@${process.env.VITE_MCP_PACKAGE_VERSION}`);
});
