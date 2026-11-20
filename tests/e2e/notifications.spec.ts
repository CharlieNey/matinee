import { expect, test } from "@playwright/test";

// CI builds carry no VAPID key, so this covers the follow flow and the
// honest "not connected" state. Real delivery is exercised locally with
// docs/notifications/ (real Chrome, Google's push service).

test("following from a show page lands on /notify, with an honest device state", async ({
  page,
}) => {
  await page.goto("/shows/chicago");
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(page.getByText("Following this show")).toBeVisible();
  await expect(
    page.getByText("This browser can’t receive alerts. The windows below stay live."),
  ).toBeVisible();

  await page.goto("/notify");
  await expect(page.getByRole("heading", { name: "Chicago" })).toBeVisible();
  await expect(page.getByText("Unavailable here")).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(1); // the show's own pause switch
  await expect(page.getByRole("button", { name: "Send a test push" })).toHaveCount(0);
});

test("a fresh visitor starts with an empty profile, not a demo persona", async ({
  page,
}) => {
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Add your name" })).toBeVisible();
  await expect(page.getByText("John Doe")).toHaveCount(0);
  await expect(page.getByText(/Joined/)).toHaveCount(0);
  await expect(
    page.getByText("Log a show you’ve seen and your diary starts here…"),
  ).toBeVisible();
});

test("a missing show is a titled 404", async ({ page }) => {
  const response = await page.goto("/shows/not-a-real-show");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Show not found — Matinee");
  await expect(page.getByRole("heading", { name: "We don't list that show" })).toBeVisible();
});
