import { expect, test } from "@playwright/test";

test("Following: subscribe to followed shows in a calendar app", async ({
  page,
  request,
  browserName,
  context,
}) => {
  await page.goto("/shows/wicked");
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await page.goto("/shows/chicago");
  await page.getByRole("button", { name: "Follow", exact: true }).click();

  await page.goto("/notify");
  await expect(page.getByRole("heading", { name: "In your calendar" })).toBeVisible();
  const subscribe = page.getByRole("link", { name: "Subscribe in your calendar" });
  const href = await subscribe.getAttribute("href");
  expect(href).toMatch(/^webcal:\/\/127\.0\.0\.1:\d+\/api\/calendar\.ics\?shows=/);
  expect(new URL(href!.replace("webcal:", "http:")).searchParams.get("shows")!.split(",").sort()).toEqual(
    ["chicago", "wicked"],
  );

  // The feed itself: Wicked's openings, and nothing from Chicago, whose rows
  // are all unverified.
  const feed = await request.get("/api/calendar.ics?shows=wicked,chicago");
  expect(feed.headers()["content-type"]).toBe("text/calendar; charset=utf-8");
  const body = await feed.text();
  expect(body).toMatch(/SUMMARY:Wicked (lottery|rush) /);
  expect(body).not.toMatch(/SUMMARY:Chicago/);

  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByText("Calendar link copied")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/calendar\.ics\?shows=/);
  }
});
