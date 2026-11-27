import { expect, test } from "@playwright/test";

const WICKED = "wicked/digital-lottery/broadway-direct";
const HAMILTON = "hamilton/digital-lottery/official-site";

test("Record: your own odds per show, from this device's taps", async ({ page }) => {
  // Tuesday Dec 1, 2026, 4 PM in New York.
  await page.clock.setFixedTime(new Date("2026-12-01T21:00:00Z"));
  await page.addInitScript(
    ([wicked, hamilton]) => {
      const entry = (key: string, day: string, won = false) => ({
        key,
        day,
        at: `${day}T15:00:00.000Z`,
        ...(won ? { won: true } : {}),
      });
      localStorage.setItem(
        "matinee-lottery-log-v1",
        JSON.stringify([
          entry(wicked, "2026-11-20"),
          entry(wicked, "2026-11-21", true),
          entry(wicked, "2026-11-23"),
          entry(hamilton, "2026-11-27"),
        ]),
      );
    },
    [WICKED, HAMILTON],
  );
  await page.goto("/profile");
  await page.getByRole("tab", { name: "Record" }).click();

  const byShow = page.locator("section", { hasText: "By show" });
  await expect(byShow).toContainText("Nothing is sent anywhere.");
  const wicked = byShow.getByRole("link", { name: /^Wicked/ });
  await expect(wicked).toContainText("1 win in 3 entries");
  await expect(wicked).toHaveAttribute("href", "/shows/wicked");
  await expect(byShow.getByRole("link", { name: /^Hamilton/ })).toContainText(
    "1 waiting on the draw",
  );
});
