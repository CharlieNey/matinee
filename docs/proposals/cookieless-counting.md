# Proposal: counting visits without cookies

**Why.** The research's launch test needs numbers: return visits on weekday
mornings, taps out to official entry pages, push opt-ins. Matinee counts
nothing today. /about promises no tracking unless analytics is switched on,
and the CSP allows connections only to the site itself (`connect-src 'self'`,
in `next.config.ts`).

**Options, checked 2026-11-27.**

| Option | Cookies | CSP change | Account | Free allowance |
|---|---|---|---|---|
| **Vercel Web Analytics** | none ([docs](https://vercel.com/docs/analytics)) | none: its script and endpoint are on the site's own origin (`/_vercel/insights/*`) | none, it's the existing Vercel project | 50,000 events a month on Hobby; collection pauses when exceeded ([pricing](https://vercel.com/docs/analytics/limits-and-pricing)) |
| PostHog, cookieless (already wired on `get-users-1`, off until a key is set) | none in cookieless mode | adds the PostHog host to `connect-src` | a new PostHog account | generous; custom events such as `seller_click` and `push_opt_in` |
| Count on our own server | none | none | none | free, but page views only, and logs on Hobby are kept briefly |

**Recommendation.** Vercel Web Analytics for page views and returning
visitors. It needs no new account, no CSP change and no cookie, and it fits
the promise on /about. Keep the PostHog wiring for the custom events (taps
out to sellers, push opt-ins) only if Charlie wants those numbers enough to
open an account.

**What it needs.**
- Charlie turns on Web Analytics in the Vercel dashboard (one click on the
  `matinee` project).
- I add the `@vercel/analytics` component to the root layout and one
  sentence to /about ("Matinee counts page views with Vercel Web Analytics,
  which uses no cookies").

**Risks.**
- A launch spike could pass 50,000 events. Collection then pauses for the
  rest of the month; the site is unaffected.
- The one-month reporting window on Hobby means exporting numbers for the
  day-14 review before they age out.

**Smallest version.** That's it: one component, one sentence, one dashboard
toggle. Under an hour.

**Status (2026-11-27): built (`d71c5ea`) and tested, then reverted
(`6b2f8e5`) so it stays out of the push go-live until Charlie says yes. To
ship it: `git revert 6b2f8e5`. Or, after the dashboard click, merge `ship/5-counting`.
