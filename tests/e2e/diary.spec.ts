import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    indexedDB.deleteDatabase("matinee-diary");
  });
});

test("creates, edits, deletes, and restores a diary entry", async ({ page }) => {
  await page.goto("/log/the-outsiders");
  await page.getByLabel("Performance date").fill("2026-07-16");
  await page.getByPlaceholder(/Orchestra/).fill("Orchestra Row B Seat 8");
  await page.getByLabel("Public thoughts").fill("Electric staging.");
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText("Electric staging.")).toBeVisible();
  await expect(page.getByText("Orchestra Row B Seat 8")).toBeVisible();

  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await page.getByPlaceholder(/Orchestra/).fill("Mezzanine Row C Seat 12");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Mezzanine Row C Seat 12")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Electric staging.")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Electric staging.")).toBeVisible();
});

test("validates and restores a versioned diary backup", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "matinee-diary.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "matinee-diary",
        version: 2,
        exportedAt: "2026-07-22T12:00:00.000Z",
        diary: [
          {
            id: "d-imported",
            slug: "the-outsiders",
            loggedAt: "2026-07-22T12:00:00.000Z",
            performanceDate: "2026-07-16",
            seat: "Imported Balcony Seat 4",
            sentiment: "recommend",
            thoughts: "Restored from backup.",
            tags: [],
            visibility: "public",
            note: null,
            photo: null,
          },
        ],
      }),
    ),
  });

  await expect(
    page.getByRole("heading", { name: "Restore diary backup?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replace" }).click();
  await expect(page.getByText("Imported Balcony Seat 4")).toBeVisible();
  await expect(page.getByText("Restored from backup.")).toBeVisible();
});

test("has no serious automated accessibility violations on Discover", async ({
  page,
}) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
});
