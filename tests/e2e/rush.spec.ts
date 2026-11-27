import { expect, test } from "@playwright/test";

type ApiProgram = {
  showSlug: string;
  showTitle: string;
  kind: string;
  platform: string;
  name: string | null;
  price: number;
  entryUrl: string;
  lastVerified: string;
  source: string;
  unverified: string | null;
};

/**
 * Where each seller's own entry pages live. Lincoln Center Theater's lottery
 * is Telecharge-run on its own domain. Box-office rows link to a map.
 */
const SELLER_HOSTS: Record<string, readonly string[]> = {
  telecharge: ["rush.telecharge.com", "lctlottery.com"],
  "broadway-direct": ["lottery.broadwaydirect.com"],
  "lucky-seat": ["www.luckyseat.com"],
  todaytix: ["www.todaytix.com"],
};

const KIND_LABELS: Record<string, string> = {
  "digital-lottery": "Digital lottery",
  "in-person-lottery": "In-person lottery",
  rush: "Rush",
  "digital-rush": "Digital rush",
  "student-rush": "Student rush",
  sro: "Standing room",
};

test("Rush: expanding a program reveals the official seller's entry link", async ({
  page,
  request,
}) => {
  const { programs } = (await (
    await request.get("/api/programs.json")
  ).json()) as { programs: ApiProgram[] };

  // Every seller-run row points at that seller's own site.
  for (const program of programs) {
    const hosts = SELLER_HOSTS[program.platform];
    if (hosts) {
      expect(hosts, program.showSlug).toContain(new URL(program.entryUrl).host);
    }
  }

  // Every row names the official page it was checked against.
  for (const program of programs) {
    expect(new URL(program.source).protocol, program.showSlug).toBe("https:");
  }

  const program = programs.find(
    (p) =>
      p.platform === "broadway-direct" &&
      p.kind === "digital-lottery" &&
      p.unverified === null,
  );
  expect(program).toBeDefined();
  if (!program) return;

  await page.goto("/rush");
  await page
    .getByRole("searchbox", { name: "Search programs by show or platform" })
    .fill(program.showTitle);

  const label = (program.name ?? KIND_LABELS[program.kind]).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const row = page.getByRole("button", {
    name: new RegExp(`^${label} · \\$${program.price}\\b`),
  });
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");

  const entry = page.getByRole("link", { name: /^Enter on Broadway Direct/ });
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute("href", program.entryUrl);
  await expect(entry).toHaveAttribute("target", "_blank");

  // The row says when it was checked, links its source, and offers a
  // prefilled report.
  const panel = row.locator("xpath=following-sibling::div[1]");
  await expect(panel.getByText(/^Checked [A-Z][a-z]{2} \d{1,2} ·/)).toBeVisible();
  await expect(panel.getByRole("link", { name: /^Source: / })).toHaveAttribute(
    "href",
    program.source,
  );
  const report = panel.getByRole("link", { name: "Report a wrong fact" });
  await expect(report).toHaveAttribute("href", /^mailto:.*subject=Wrong%20fact/);

  // The header quotes the oldest check, never the newest.
  const oldest = programs.map((p) => p.lastVerified).sort()[0];
  const short = new Date(`${oldest}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
  await expect(page.getByText(`Checked since ${short}`)).toBeVisible();
});
