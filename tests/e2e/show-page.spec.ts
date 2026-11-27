import { expect, test } from "@playwright/test";

/**
 * A show page is what a search lands on ("wicked lottery"): its answer must
 * be in the server HTML, its metadata must say the same thing, and it must
 * not jump around on a phone while it hydrates.
 */

test("a show page answers the search in its HTML, title and metadata", async ({
  page,
  request,
}) => {
  // The answer is server-rendered: it's in the HTML before any script runs.
  const html = await (await request.get("/shows/wicked")).text();
  expect(html).toContain("Wicked has a $45 rush at the box office");

  await page.goto("/shows/wicked");
  await expect(page).toHaveTitle("Wicked lottery and rush — Matinee");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://matinee.nyc/shows/wicked",
  );
  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  expect(description).toMatch(/^Wicked has a \$45 rush/);

  const ld = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
  );
  expect(ld["@type"]).toBe("BreadcrumbList");
  expect(ld.itemListElement.at(-1).item).toBe("https://matinee.nyc/shows/wicked");

  // The official page each row was checked against is one tap away.
  await expect(
    page.getByRole("link", { name: "Source: wickedthemusical.com" }).first(),
  ).toBeVisible();
});

test("closed shows stay up and say so; the sitemap lists every show", async ({
  page,
  request,
}) => {
  await page.goto("/shows/heathers");
  await expect(page).toHaveTitle("Heathers (closed) — Matinee");
  await expect(page.getByText("This production has closed")).toBeVisible();

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>https://matinee.nyc/shows/wicked</loc>");
  expect(sitemap).toContain("<loc>https://matinee.nyc/shows/heathers</loc>");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://matinee.nyc/sitemap.xml");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the show page doesn't jump as it loads", async ({ page, browserName }) => {
    // Layout Instability API: Chromium only.
    test.skip(browserName !== "chromium", "layout-shift entries are Chromium-only");
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[]) {
          if (!entry.hadRecentInput) {
            (window as unknown as { __cls: number }).__cls += entry.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/shows/wicked", { waitUntil: "networkidle" });
    // Past hydration and the first clock tick that fills in each row's status.
    await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.05);

    // Nothing wider than the screen.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
