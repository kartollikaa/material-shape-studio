import { deflateRawSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const fragment = (document: object) => `#doc=${deflateRawSync(JSON.stringify({ document, presentation: { colour: "#6750a4", theme: "light", context: "button" } })).toString("base64url")}`;

test("opens, edits, copies, and resets a custom linked shape", async ({ page }) => {
  const original = { v: 1, shape: { kind: "ngon", vertices: 7 } };
  await page.goto(`./${fragment(original)}`);
  await expect(page.locator("#shape-name")).toHaveText("Custom shape");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByLabel("Sides", { exact: true }).fill("8");
  await page.getByLabel("Sides", { exact: true }).dispatchEvent("change");
  await expect(page.locator("#shape-status")).toHaveText("Edited shape");
  await page.getByRole("button", { name: "Copy shape document" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied)).toEqual({ v: 1, shape: { kind: "ngon", vertices: 8 } });
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByLabel("Sides", { exact: true })).toHaveValue("7");
});

test("rejects a malformed link and retains the editor", async ({ page }) => {
  await page.goto("./#doc=bad");
  await expect(page.locator("[data-url-notice]")).toBeVisible();
  await page.locator("[data-url-notice]").getByRole("button", { name: "Dismiss" }).click();
  await expect(page.locator("[data-url-notice]")).toBeHidden();
  await page.getByRole("button", { name: "Heart" }).click();
  await expect(page.locator("#shape-name")).toHaveText("Heart");
});
