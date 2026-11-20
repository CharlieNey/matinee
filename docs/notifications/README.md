# Push, proven locally (2026-11-20)

A real browser subscription and real pushes, end to end on a laptop:
Google Chrome 157 (headed, driven by Playwright), a subscription at
`fcm.googleapis.com`, local VAPID keys, the production build
(`next build` + `next start`), and the in-process store
(`PUSH_STORE=memory`) instead of Supabase. Nothing hosted was touched.
The run log is [`local-proof.json`](local-proof.json); the script is
[`scripts/push-proof/run.mjs`](../../scripts/push-proof/run.mjs).

| Still | What it shows |
|---|---|
| [01](01-following-alerts-off.png) | Followed Chicago from its show page; this device isn't subscribed yet, so the card offers "Turn on" |
| [02](02-following-alerts-on.png) | After "Turn on": a real `PushManager` subscription, saved; the card says when the next alert buzzes |
| [03](03-test-push-delivered.png) | "Send a test push" on `/notify`: the server sends the next real alert for a followed show through Google's push service, and the service worker reports it displayed |
| [04](04-tap-opens-the-show.png) | The alert's link, `/shows/chicago#ways-to-save`, opened: the page lands on the ways to save |

What the log records, in order:

1. The subscription endpoint's host: `fcm.googleapis.com`.
2. The test push, as displayed by the service worker:
   **Test: Chicago rush opens at 10:00 AM** · "$49 at the box office, first
   come, first served. Preview of the alert due 9:55 AM Saturday."
3. A scheduler run evaluated at **9:55 AM Saturday** (`?at=`, honored only
   by the in-process store): `pairs: 1, sent: 1`. The device displayed
   **Chicago rush opens at 10:00 AM** · "$49 at the box office, first come,
   first served." with tag `chicago|opening|2026-11-21T15:00:00.000Z`.
4. The same run again (a doubled scheduler): `deduped: 1, sent: 0`.
5. A run at 9:58: `deduped: 1, sent: 0`.
6. A run at 10:30, too late for a heads-up: nothing due for this follower.
7. One Chicago notification on the device, not three.
8. `/api/health`: `scheduler: ok`, `rateLimit: ok`, last push and last run
   in real time, one subscription.
9. No console errors.

Reproduce (port 3417, any free port works):

```bash
npx web-push generate-vapid-keys   # put both keys in an env file with
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=…, VAPID_PRIVATE_KEY=…, VAPID_SUBJECT=mailto:…,
# CRON_SECRET=<random>, PUSH_STORE=memory  (one `export` line each)
source local-push.env && npm run build && npx next start -p 3417 &
node scripts/push-proof/run.mjs local-push.env
```

The script grants the notification permission up front, because Playwright
can't click Chrome's permission bubble. In the app, that prompt appears
when you tap Follow, if the browser has never asked.

## Verified only in production

- **Apple's push service** (`web.push.apple.com`) on an installed iPhone,
  and Safari on macOS. The iOS install-first state is covered by the UI, not
  by a delivery.
- **The OS banner itself.** The stills show what the page and the service
  worker see; macOS draws the banner outside the browser.
- **Supabase**: the ledger functions run here in PGlite (CI), not against the
  hosted project.
- **Supabase Cron** firing every minute and `pg_net` reaching Vercel.
- **The deployed health check** going 503 when the scheduler stops.

The go-live checklist covers each of these.
