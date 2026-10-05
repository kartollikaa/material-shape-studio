import { deflateRawSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const legacyLink = (document: object) => `#doc=${deflateRawSync(JSON.stringify({ document, presentation: { colour: "#6750a4", theme: "light", context: "button" } })).toString("base64url")}`;

const address = (document: object) => `#${new URLSearchParams({ document: JSON.stringify(document) })}`;

test("opens a legacy link and rewrites it as the readable address", async ({ page }) => {
  const original = { v: 1, shape: { kind: "ngon", vertices: 7 } };
  await page.goto(`./${legacyLink(original)}`);
  await expect(page.locator("#shape-name")).toHaveText("Custom shape");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe(address(original));
});

test("opens, edits, copies, and resets a custom linked shape", async ({ page }) => {
  const original = { v: 1, shape: { kind: "ngon", vertices: 7 } };
  await page.goto(`./${address(original)}`);
  await expect(page.locator("#shape-name")).toHaveText("Custom shape");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByLabel("Sides", { exact: true }).fill("8");
  await page.getByLabel("Sides", { exact: true }).dispatchEvent("change");
  await expect(page.locator("#shape-status")).toHaveText("Edited shape");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe(`${address(original)}&sides=8`);
  await page.getByRole("button", { name: "Copy shape document" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied)).toEqual({ v: 1, shape: { kind: "ngon", vertices: 8 } });
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByLabel("Sides", { exact: true })).toHaveValue("7");
});

test("opens the default shape with a dismissible notice for a malformed link", async ({ page }) => {
  await page.goto("./#doc=bad");
  await expect(page.locator("[data-url-notice]")).toBeVisible();
  await page.locator("[data-url-notice]").getByRole("button", { name: "Dismiss" }).click();
  await expect(page.locator("[data-url-notice]")).toBeHidden();
  await page.getByRole("button", { name: "Heart" }).click();
  await expect(page.locator("#shape-name")).toHaveText("Heart");
});
