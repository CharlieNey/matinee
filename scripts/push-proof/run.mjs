// Local end-to-end push proof (docs/notifications/README.md): real Chrome, a
// real subscription through Google's push service, local VAPID keys and the
// in-process store. Writes stills and a JSON log to docs/notifications/.
// usage, from the repo root: node scripts/push-proof/run.mjs <env-file>
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const repo = process.cwd();
const require = createRequire(path.join(repo, "package.json"));
const { chromium } = require("@playwright/test");

const BASE = process.env.BASE ?? "http://localhost:3417";
const OUT = path.join(repo, "docs/notifications");
mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(
  readFileSync(process.argv[2], "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.replace(/^export /, "").split(/=(.*)/s).slice(0, 2)),
);

const log = { base: BASE, startedAt: new Date().toISOString(), steps: [] };
const step = (name, data = {}) => {
  log.steps.push({ name, at: new Date().toISOString(), ...data });
  console.log(`• ${name}`, JSON.stringify(data));
};
const hostOnly = (endpoint) => (endpoint ? new URL(endpoint).host : null);

async function runScheduler(at) {
  const url = `${BASE}/api/notify/run${at ? `?at=${encodeURIComponent(at)}` : ""}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      "X-Matinee-Scheduler": "local-proof",
    },
  });
  const summary = await response.json();
  delete summary.runId;
  return { status: response.status, summary };
}

const profile = mkdtempSync(path.join(os.tmpdir(), "matinee-push-proof-"));
const context = await chromium.launchPersistentContext(profile, {
  channel: "chrome",
  headless: false,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  // Chrome's push channel (GCM/FCM) runs as background networking.
  ignoreDefaultArgs: ["--disable-background-networking"],
  args: ["--window-size=430,960"],
});
const consoleErrors = [];
try {
  await context.grantPermissions(["notifications"], { origin: BASE });
  const page = context.pages()[0] ?? (await context.newPage());
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));

  const notifications = () =>
    page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return (await registration.getNotifications()).map((n) => ({
        title: n.title,
        body: n.body,
        tag: n.tag,
        url: n.data?.url ?? null,
      }));
    });
  const waitForNotification = async (predicate, timeoutMs = 30_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = (await notifications()).find(predicate);
      if (found) return found;
      await page.waitForTimeout(500);
    }
    return null;
  };

  // 1. A show page, following, alerts not yet on for this device.
  await page.goto(`${BASE}/shows/chicago`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await page.getByText("Alerts are off on this device.").waitFor();
  const card = page.locator("div.rounded-card", { hasText: "Following this show" }).first();
  await card.screenshot({ path: path.join(OUT, "01-following-alerts-off.png") });
  step("followed Chicago; card offers to turn alerts on");

  // 2. Turn on: a real PushManager subscription, saved to the local store.
  await page.getByRole("button", { name: "Turn on", exact: true }).click();
  await page.getByText(/^Alerts on\./).waitFor({ timeout: 30_000 });
  const endpoint = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return (await registration.pushManager.getSubscription())?.endpoint ?? null;
  });
  await card.screenshot({ path: path.join(OUT, "02-following-alerts-on.png") });
  step("subscribed", {
    pushService: hostOnly(endpoint),
    caption: await card.locator("p").nth(1).innerText(),
  });

  // 3. The test push from /notify: a real alert for the followed show.
  await page.goto(`${BASE}/notify`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Send a test push" }).click();
  const result = page.getByText(/^(Delivered to this device|Sent “)/);
  await result.waitFor({ timeout: 30_000 });
  const testLine = await result.innerText();
  await page.screenshot({ path: path.join(OUT, "03-test-push-delivered.png") });
  step("test push", {
    resultLine: testLine,
    displayed: await waitForNotification((n) => n.title.startsWith("Test:")),
  });

  // 4. The scheduler at 9:55 AM Saturday: the heads-up for the 10 AM rush.
  const heads = await runScheduler("2026-11-21T14:55:00.000Z");
  step("scheduler run at Sat 9:55 AM ET", heads);
  const alert = await waitForNotification((n) => n.title.startsWith("Chicago"));
  step("notification displayed by the service worker", { alert });

  // 5. Retries and lateness: the same alert never goes out twice or stale.
  step("scheduler run again at 9:55 (doubled run)", await runScheduler("2026-11-21T14:55:00.000Z"));
  step("scheduler run at 9:58", await runScheduler("2026-11-21T14:58:00.000Z"));
  step("scheduler run at 10:30 (too late for a heads-up)", await runScheduler("2026-11-21T15:30:00.000Z"));
  const chicagoAlerts = (await notifications()).filter((n) => n.title.startsWith("Chicago"));
  step("Chicago notifications on the device", { count: chicagoAlerts.length });

  // 6. The tap target: the show page at its ways to save.
  if (alert?.url) {
    await page.goto(new URL(alert.url, BASE).href, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, "04-tap-opens-the-show.png") });
    step("opened the notification's URL", { url: alert.url, scrollY: await page.evaluate(() => window.scrollY) });
  }

  // 7. Health after real runs.
  const health = await (await fetch(`${BASE}/api/health`)).json();
  step("health", { services: health.services, push: health.push });
} finally {
  log.consoleErrors = consoleErrors;
  log.finishedAt = new Date().toISOString();
  writeFileSync(path.join(OUT, "local-proof.json"), JSON.stringify(log, null, 2) + "\n");
  await context.close();
}
