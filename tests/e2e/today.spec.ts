import { expect, test } from "@playwright/test";

// 10:30 AM in New York on a Tuesday, four days after the Nov 27 check.
const TUESDAY = new Date("2026-12-01T15:30:00Z");
const WEDNESDAY = new Date("2026-12-02T15:30:00Z");

test("Today: every open window links out, and a tick lasts the day only", async ({
  page,
}) => {
  await page.clock.setFixedTime(TUESDAY);
  await page.goto("/today");
  await expect(
    page.getByRole("heading", { name: "Enter today's lotteries" }),
  ).toBeVisible();
  await expect(page.getByText(/^Tuesday, December 1 · 0 of \d+ done$/)).toBeVisible();

  // Wicked's lottery (9 AM–3 PM) is open, and links to the official entry page.
  const open = page.locator("section", {
    has: page.getByRole("heading", { name: "Lotteries open now" }),
  });
  const wicked = open.locator("li", { hasText: "Digital lottery · $55" }).filter({
    hasText: "Wicked",
  });
  await expect(wicked).toContainText("closes 3 PM");
  const link = wicked.getByRole("link");
  await expect(link).toHaveAttribute(
    "href",
    "https://lottery.broadwaydirect.com/show/wicked/",
  );
  await expect(link).toHaveAttribute("target", "_blank");

  // Every link on the list leaves for an https page; nothing is entered here.
  for (const href of await page
    .locator("main li a")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")))) {
    expect(new URL(href!).protocol).toBe("https:");
  }
  await expect(page.locator("main form")).toHaveCount(0);

  // The tick is the visitor's own note: it survives a reload...
  const tick = wicked.getByRole("button", { name: /^Entered: Wicked/ });
  await tick.click();
  await expect(tick).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/· 1 of \d+ done$/)).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator("li", { hasText: "Wicked" })
      .filter({ hasText: "Digital lottery" })
      .getByRole("button"),
  ).toHaveAttribute("aria-pressed", "true");

  // ...and is gone the next day.
  await page.clock.setFixedTime(WEDNESDAY);
  await page.reload();
  await expect(page.getByText(/^Wednesday, December 2 · 0 of \d+ done$/)).toBeVisible();
});
