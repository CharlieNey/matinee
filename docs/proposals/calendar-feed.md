# Proposal: a calendar feed for followed shows

**Why.** People already use calendar reminders for lotteries (Broadway
Scorecard suggests it; Ware on the Globe sets alarms). A subscribed calendar
works on every phone without Add to Home Screen, and needs no account.

**What.** `/api/calendar.ics?shows=wicked,six`: an iCalendar feed of the next
14 days of entry windows for those shows, one event per window ("Wicked
lottery: 9 AM–3 PM, $55, Broadway Direct"), each with the official link and
a 5-minute alert. `/notify` gets "Subscribe in your calendar", which opens a `webcal://` link,
so the calendar app subscribes and keeps refreshing it.

- Only checked rows. Unverified and stale rows are left out, the same rule
  as push.
- No accounts: the followed shows are in the URL, so the server stores
  nothing.
- Times are exact instants (UTC), so the calendar shows them in the viewer's
  own time zone and DST needs no handling.

**Costs.** $0. One cached route on the existing Vercel project. Calendar apps
poll on their own schedule (often hours apart), so the feed suits planning,
not to-the-minute alerts; push stays the alert.

**Risks.** A calendar copy can lag a correction by hours. Each event says
"Check the official page before you go" and links to it.

**Smallest version.** One route plus one button, with unit tests for the
iCalendar output and a check that unverified rows never appear. About a day.

**Status (2026-11-27): built on `get-users-1`, not deployed.**
- **Feed:** `src/lib/calendar.ts` and `/api/calendar.ics`.
- **Subscribe section:** on `/notify`, with "Subscribe in your calendar" and
  "Copy link".
- **Same rules as push:** events sit exactly where the push alert would, in
  its words, with a 5-minute reminder.
- **Tested:** unit and route tests, a Playwright journey, and QA at phone and
  desktop sizes in Chromium and WebKit.
- **To leave it out of the go-live,** revert its commit. It ships if Charlie
  says yes.
