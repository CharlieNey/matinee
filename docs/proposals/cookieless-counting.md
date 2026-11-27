# Proposal: counting visits without cookies

**Why.** The research's launch test needs numbers: return visits on weekday
mornings, taps out to official entry pages, push opt-ins. Matinee counts
nothing today. /about says nothing about counting, because there is none.
The CSP allows connections only to the site itself (`connect-src 'self'`, in
`next.config.ts`).

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

## Status (2026-11-27): ready for one click and one deploy

Built on `get-users-1`, and on the branch `ship/5-counting`, which is cut
from `main` and ready to merge. Nothing is enabled anywhere.

**What's built:**
- `@vercel/analytics@2.0.1`.
- `src/components/PageCounter.tsx` in the root layout.
- `src/lib/pageCounting.ts`, which turns counting on only in Vercel
  production builds (`NEXT_PUBLIC_VERCEL_ENV`).
- A filter that sends only the page's address, never a query or the `/p#`
  diary fragment.

**The CSP is unchanged.** Checked on 2026-11-27 with a production-flag
build: the script loads from `/_vercel/insights/script.js` (same origin). A
stand-in script at that path ran and sent its beacon to
`/_vercel/insights/view` with no Content-Security-Policy violation.

**The wording on /about** appears under "What we count" only when counting
is on:

> Matinee counts page views with Vercel Web Analytics. It uses no cookies:
> Vercel recognizes a visit by a hash of the request that it resets every
> day, so no one is followed from one day to the next. Only the page's
> address is sent, never anything after it, so a shared diary link is never
> counted with what is in it.

It rests on Vercel's docs
([privacy](https://vercel.com/docs/analytics/privacy-policy),
[overview](https://vercel.com/docs/analytics)).

**To switch it on, in this order:**
1. **Charlie:** in the Vercel dashboard (personal account), open project
   `matinee`, then Analytics, then Enable Web Analytics. It's free on Hobby,
   up to 50,000 events a month.
2. **Deploy:** merge `ship/5-counting` into `main` and push. Or ship it with
   the whole-branch go-live.

The order matters: before step 1, the script path returns 404 and the
browser logs "Be sure to enable Web Analytics…" on every page.

**To switch it off:** revert the commit and deploy, or disable Web
Analytics in the dashboard.

