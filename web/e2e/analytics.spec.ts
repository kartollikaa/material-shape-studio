import { expect, test } from "@playwright/test";

const ANALYTICS_HOSTS = /google-analytics\.com|googletagmanager\.com|firebase[a-z]*\.googleapis\.com/;

test("sends nothing to analytics from a browser driven by automation", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (ANALYTICS_HOSTS.test(request.url())) requests.push(request.url()); });
  await page.goto("./#shape=Heart");
  await page.getByRole("button", { name: "Copy code" }).click();
  await page.getByRole("link", { name: "Connect an agent" }).click();
  await expect(page).toHaveURL(/\/connect\/$/);
  await page.waitForLoadState("networkidle");
  expect(requests).toEqual([]);
});
