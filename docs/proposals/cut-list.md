# Cut list: whole features (2026-11-20)

Nothing here has been removed. Each feature has its cost, what a visitor
would lose, and one recommendation. Answer yes or no on each **Decision**
line. Line counts are from `wc -l` on this branch.

The core is not on this list: Discover, Rush, show pages, TKTS, alerts.

## 1. Diary (log a show, timeline, backup, shared profile link)

- **Code:** about 1,300 lines. `LogScreen.tsx` 547, `persistence.ts` 289,
  `shareProfile.ts` 160, `/p` 181, `diaryPhotos.ts` 95, `/log/[slug]` 37,
  plus the stub card in `shareCards.ts`. Tests: 236 lines of persistence
  unit tests and the only original Playwright journey.
- **Upkeep:** low. No server. The schema is versioned, and imports are
  validated.
- **How finished:** the most finished personal feature. Edit, delete, undo,
  photo storage, export and restore, keyboard fixes on 2026-11-12, covered in
  CI on Chromium and WebKit.
- **Linked from:** the Log tab, "Log a show" in the web nav, and Profile.
- **A visitor loses:** the only thing they can create, and the reason to come
  back after a show. An interviewer loses the one flow that writes and
  restores data.
- **Recommendation: keep.**
- **Decision:** keep? yes / no

## 2. Season recap (`/wrapped`)

- **Code:** about 370 lines. `WrappedScreen.tsx` 350, the page 16, plus
  `renderWrappedCard` in `shareCards.ts`. No tests.
- **Upkeep:** low; the season boundary (June) is computed. Last changed
  2026-07-17.
- **How finished:** works, but it now opens to "A season at the theater:
  0 / 0 / 0" with a full-width Share button for every new visitor. The
  seeded profile used to hide that, and it is gone.
- **Linked from:** one pill in the profile header.
- **A visitor loses:** a share card at the end of a season. A new visitor
  has nothing to recap.
- **Recommendation: hide until there is something to recap.** Show the pill
  only once a show is logged or an entry is recorded, and give `/wrapped` an
  empty state. About 30 minutes. If you'd rather carry less, delete it
  (about 370 lines plus the card renderer).
- **Decision (2026-11-21):** hidden behind data. The pill shows once a show
  is logged or an entry is recorded, and `/wrapped` has an empty state.

## 3. Trip mode (`/trip`)

- **Code:** about 570 lines. `TripPlanner.tsx` 429, `trip.ts` 83, the page
  19. Tests: 35 lines.
- **Upkeep:** low. It reads the same schedule engine as everything else.
  The TKTS hours were corrected on 2026-11-20.
- **How finished:** works, with one visible bug. A multi-day window prints
  as one day: Hamilton's Friday-to-Thursday lottery reads "Fri, Nov 20 ·
  10 AM–12 PM". About an hour to fix.
- **Linked from:** a Discover quick link and the web nav.
- **A visitor loses:** the only answer to "I'm in town Friday to Sunday,
  what do I enter and when?", which is the visitor most likely to need
  Matinee. It also shows off the schedule engine.
- **Recommendation: keep, and fix the multi-day label.**
- **Decision (2026-11-21):** kept. The label now names the closing day
  ("10 AM–Thu 12 PM"), with a unit test.

## 4. District map (`/district`)

- **Code:** about 650 lines. `DistrictMap.tsx` 616, the page 36. The
  theater data (`theaters.ts`, 158) stays regardless: show pages' "The
  house" block, About and `/api/theaters.json` use it. `scripts/trace-district/`
  (24 KB) is the retired street-trace pipeline, and nothing runs it.
- **Upkeep:** low. The houses rarely change. Venue strings must match
  theater names, and a catalog test checks that.
- **How finished:** finished. A hand-drawn grid, colored by who sells each
  house, with live halos for open windows. Its stamp reads "verified
  November 11".
- **Linked from:** a Discover quick link, every Broadway show page (twice),
  and About.
- **A visitor loses:** the clearest picture of the app's main insight (who
  sells which house), and the most visual page.
- **Recommendation: keep.** Separately: delete `scripts/trace-district/`
  unless you plan to bring back the traced map.
- **Decision:** keep the map? yes / no. Delete the trace scripts? yes / no

## 5. Profile (`/profile`)

- **Code:** about 2,000 lines. `profile/page.tsx` 1,190, `EntryHeatmap.tsx`
  338, `RankSheet.tsx` 311, `CollectionEditorSheet.tsx` 146,
  `FollowSpot.tsx` 46. `WinCardSheet.tsx` (207) is shared with the rush
  rows.
- **Upkeep:** medium, mostly from the 1,190-line page. W8 suggested splitting
  it by tab.
- **How finished:** the three tabs work. Since 2026-11-20 a new profile
  starts empty ("Add your name", empty states) instead of a demo persona.
  The ranking's binary matchups (`RankSheet`) are the least connected part:
  they rank attended shows, and a new visitor has none.
- **Linked from:** the tab bar and the web nav. It is the home for the diary,
  the lottery record and the collection.
- **A visitor loses:** the place their diary, entries, wins and Interested
  shows live. Without it, the diary has no home.
- **Recommendation: keep.** Split the page by tab (1–2 hours, no behavior
  change). Optionally cut Ranking (about 330 lines) if you want the profile
  smaller.
- **Decision:** keep? yes / no. Split by tab? yes / no. Cut Ranking? yes / no
