# Handoff: W24 final pass (stopped 2026-11-21, about 00:40 ET)

Brief: `~/Projects/job-search/orchestration/briefs/w24-matinee-final-omen.md`
(on the laptop, `~/Documents/job-search-2026-11/orchestration/briefs/`).
I ran it on the Omen until the orchestrator moved the work back to the
laptop. Branch `showcase/polish`. Nothing pushed, deployed or changed on any
hosted service. The working tree is clean and no servers or browsers are
running.

## Done (item 1 of 9: the cut list)

Four commits on top of `7237e61`. Each is its own cut-list decision, so any
one can be dropped:

| Commit | What |
|---|---|
| `b4946e3` cut | Season recap hidden until there's data. The Wrapped pill shows once a show is logged or an entry recorded. `/wrapped` has an empty state instead of "0 / 0 / 0" and Share. |
| `4c6fee9` fix | Trip mode names the closing day of a multi-day window: Hamilton reads "10 AM–Thu 12 PM" (it used to read "10 AM–12 PM"), and an overnight window reads "5 PM–Sat 9 AM". The label moved to `tripWindowLabel` in `src/lib/trip.ts`, with a unit test. |
| `dd89441` cut | Deleted `scripts/trace-district/`. Updated the `theaters.ts` header and added one line to PLAN.md. |
| `8db47f4` refactor | Split `profile/page.tsx` (1,190 lines → 234). Each tab, the header and the settings/backup sheets moved to `src/app/(tabs)/profile/_components/`. Code moved unchanged. I checked with a line-by-line diff: nothing was lost except imports and renames. |

`docs/proposals/cut-list.md` now records each decision.

Verified: lint, `tsc`, and Vitest (118 tests; W11 had 117) pass after each
commit. **Not yet verified:** `next build`, Playwright, and loading the
changed pages in a browser. Do this first on the laptop.

Revert notes: the recap commit and the split both touch the profile header,
so reverting `b4946e3` after `8db47f4` conflicts. Revert the split first,
or edit `_components/ProfileHeader.tsx` (the `hasRecap` line) by hand.

## Decisions already made (keep them unless Charlie says otherwise)

- **One commit per cut-list line**, not one commit for all of item 1, so
  Charlie can drop a single decision.
- **The profile split goes in a private folder** (`_components/`), as the
  Next 16 project-structure docs recommend, not `src/components/`.
- **No contact address exists in the app.** I grepped for `mailto`, emails,
  `.env.example` and the TKTS user agent. The only email-like strings are
  the `VAPID_SUBJECT` placeholders. Plan for item 2: one constant in
  `src/lib/contact.ts` with a clear `TODO(Charlie)`, flagged in the report
  and GO-LIVE. Charlie's GitHub noreply address and the employer address
  must not be used. A matinee.nyc mailbox would need forwarding set up at
  the registrar, which is a hosted step for Charlie.
- **Skip "one sentence about building with AI"** (W13 suggested it). It's
  not in the brief, and the wording is Charlie's call. List it under Needs
  Charlie.

## Learned the hard way (the Omen only; the laptop shouldn't have these)

- **OpenSnitch blocks the nvm `node` binary.** It has no rule, popups time
  out after 30 s and the default is deny, so every Node TCP connection
  fails, even to localhost. `curl`, `python3`, `gh` and Brave are allowed.
  I didn't touch the firewall. Workarounds I used:
  - npm: downloaded every lockfile tarball with Python (sha512 checked),
    then `npm cache add --offline *.tgz` and `npm ci --offline`. That worked.
  - `npx` hangs, because it tries the registry. Use `./node_modules/.bin/<tool>`
    or the `npm run` scripts.
  - `next/font/google`: `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` (pointed at
    locally fetched CSS and woff2) gets past the font fetch, **but `next
    build` still fails**: Turbopack spawns Node workers that connect back
    over TCP ("timed out waiting for the Node.js process to connect"). So
    no build, Playwright, Lighthouse or dev server is possible on the Omen
    without a firewall rule for `~/.nvm/versions/node/*/bin/node`. That's
    Charlie's call.
- **A killed `npm ci` can still finish later and roll back, deleting
  `node_modules`.** Make sure the old process is gone before reinstalling.
- **`pkill -f` with a pattern that appears in your own shell command kills
  your own shell.**
- `next dev` and `next build` may rewrite `AGENTS.md` (W11's note). Restore
  it before committing.

## Remaining plan, in order (brief items 2–9, then the report)

Each item is one commit.

2. **Report a wrong fact, and "checked on" dates.**
   - Add `src/lib/contact.ts` (above).
   - Add a "Report a problem with this listing" mailto link:
     - in each expanded program row (`src/components/ProgramRows.tsx`,
       next to the entry button), prefilled with the show, the program
       kind, platform, price, `programKey`, `lastVerified` and the page URL;
     - once on each show page (`src/app/shows/[slug]/page.tsx`, or the
       bottom of `ShowPrograms.tsx`).
   - Show "Checked Nov 20" per row in the expanded row. Rows currently show
     a date only once stale.
   - Also fix the `/rush` header (`src/app/(tabs)/rush/page.tsx`). It shows
     the *newest* `programsLastVerified()`, which overstates freshness (W13).
     Show the oldest date, or "checked Nov 11–20".
3. **Posters.** `src/lib/posters.json` maps slug to file in
   `public/posters/`. Find each Playbill cover or file with the Playbill
   cover mark: check the images by eye, and look for "playbill" in the
   filenames and sources. Remove those mappings so the generated
   typographic tile (`src/components/Poster.tsx`) renders. Delete the
   files, list them in the commit and the report, and update the README's
   "Poster art" paragraph, which says some are Playbill covers.
4. **Origin wording.** Use `~/Documents/job-search-2026-11/projects-showcase.md`
   §5 (on the Omen, `~/Projects/job-search/`):
   - the long version in README.md (the "Matinee began in July 2026…"
     paragraph) and DESIGN.md line 3;
   - the short version in the About colophon (`src/app/about/page.tsx`,
     "The visual design began as a study of the Theatr iOS app…").
   Do all three in one commit. Leave PLAN.md alone.
5. **Analytics, off by default.** PostHog's cookieless setup: check
   current docs (`persistence: "memory"`, or the newer cookieless mode;
   `disable_session_recording`, `autocapture: false`). Gate it behind
   `NEXT_PUBLIC_POSTHOG_KEY` (and `_HOST`).
   - Events: outbound click to an official seller (ProgramRows entry
     button, OfficialTicketsCard, Trip and Rush links), follow, push
     opt-in (`src/components/PushProvider.tsx`), push sent (server, in
     `src/lib/push/delivery.ts`, via PostHog's capture HTTP API) and push
     opened (`public/sw.js` notificationclick: post to the page, or beacon
     on landing with a query flag).
   - The CSP in `next.config.ts` is static with no third-party origins.
     Add the PostHog host to `connect-src` (and `script-src` if it's
     loaded from their CDN), only when the key is set at build time.
   - Add one About/privacy line, rendered only when enabled.
   - Add the variables to `.env.example`.
6. **The seven unverified rows** (W8 "Data: not verified"). Retry them from
   official show sites, TDF and TodayTix public pages. Check robots.txt
   first. Playbill disallows Claude's crawlers, and Broadway Direct, Lucky
   Seat and Telecharge are off limits (terms or bot walls). Update the
   rows you confirm (`lastVerified`), and leave the rest commented and
   listed. **Deadline: these go stale at noon ET on Nov 25.**
7. **Final pass:**
   - About: the "community's best tool is a volunteer-run static page" and
     "TodayTix's official advice is to set an alert yourself" lines are
     out of date. W13 found TodayTix now alerts when a lottery opens, and
     new free lists exist. Rewrite them to the real edge: one board of open
     windows plus a push per window across all sellers.
   - The About season figures were already replaced by computed numbers
     (`2f9b11b`); just confirm.
   - W8's "listed, not done":
     - split `programs.ts` into an engine module and a data module;
     - a Rush e2e journey that checks the entry link goes to the official
       seller;
     - the root planning docs (decide, and probably leave them);
     - `theatr-*` fallbacks (wait until 2027).
   - The flaky WebKit diary test (`tests/e2e/diary.spec.ts`, edit step):
     find the cause; don't add retries.
   - After Nov 29, Two Strangers gets `closedOn`. That's a GO-LIVE note
     only.
8. **Verify:**
   - `npm run check`, then `npx playwright test` (both browsers).
   - Every route at iPhone 13 and 1440×900: `/`, `/rush`, `/district`,
     `/trip`, `/profile`, `/wrapped`, `/about`, `/notify`, `/p`,
     `/log/the-outsiders`, four show pages (one closed), the 404s,
     `/api/programs.json`.
   - Lighthouse 12.8.2, mobile and desktop, on Discover, Rush and a show
     page. Compare against W11: mobile 92 / 94 / 94, desktop 100, and 100
     for accessibility, best practices and SEO.
9. **`docs/GO-LIVE.md`:** one ordered list covering everything on the
   branch. Put the Nov 25 data deadline at the top. Fold in W11's go-live
   checklist (in the W11 report: secrets, the two migrations before the
   deploy, deploy, the scheduler, a production test push, a day of
   watching), plus the contact address and the PostHog key. Each step gets
   its exact command or click, what to check, and how to undo it.

Then write `orchestration/reports/w24.md` in the job-search folder, as the
very last step: commits, what was verified and how, what's open and why,
and the three things Charlie must do first. Follow
`orchestration/RULES.md`: write nothing under a Claude memory directory,
and use no employer names.
