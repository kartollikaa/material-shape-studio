import { expect, test } from "@playwright/test";

test("offers an honest unavailable state and a plain-text agent file", async ({ page }) => {
  test.skip(!!process.env.VITE_MCP_ENDPOINT, "configured endpoint build");
  await page.goto("./");
  await expect(page.locator('link[rel="alternate"][type="text/plain"]')).toHaveAttribute("href", "./connect/agent.txt");
  await page.getByRole("link", { name: "Connect an agent" }).click();
  await expect(page.locator("#connection-state")).toHaveText("Public MCP connection is not available yet.");
  await expect(page.locator("#connection-details")).toBeHidden();
  const text = await page.locator('a[href="./agent.txt"]').getAttribute("href");
  expect(text).toBe("./agent.txt");
  const response = await page.request.get(new URL(text!, page.url()).href);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("unavailable");
});

test("uses one configured endpoint in the page and agent file", async ({ page }) => {
  test.skip(!process.env.VITE_MCP_ENDPOINT, "unavailable endpoint build");
  await page.goto("./connect/");
  await expect(page.locator("#endpoint")).toHaveText(process.env.VITE_MCP_ENDPOINT!);
  const response = await page.request.get(new URL("./agent.txt", page.url()).href);
  expect(await response.text()).toContain(process.env.VITE_MCP_ENDPOINT!);
});
