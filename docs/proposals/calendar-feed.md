# Proposal: a calendar feed for followed shows

**Why.** People already use calendar reminders for lotteries (Broadway
Scorecard suggests it; Ware on the Globe sets alarms). A subscribed calendar
works on every phone without Add to Home Screen, and needs no account.

**What.** `/api/calendar.ics?shows=wicked,six`: an iCalendar feed of the next
14 days of entry windows for those shows, one event per window ("Wicked
lottery: 9 AM–3 PM, $55, Broadway Direct"), each with the official link and
a 5-minute alert. The Follow card gets "Add to calendar", which opens a
`webcal://` link, so the calendar app subscribes and keeps refreshing it.

- Only checked rows. Unverified and stale rows are left out, the same rule
  as push.
- No accounts: the followed shows are in the URL, so the server stores
  nothing.
- Times are written in New York time with the time zone, so DST and
  travellers are handled by the calendar app.

**Costs.** $0. One cached route on the existing Vercel project. Calendar apps
poll on their own schedule (often hours apart), so the feed suits planning,
not to-the-minute alerts; push stays the alert.

**Risks.** A calendar copy can lag a correction by hours. Each event says
"Check the official page before you go" and links to it.

**Smallest version.** One route plus one button, with unit tests for the
iCalendar output and a check that unverified rows never appear. About a day.

**Recommendation.** Build it. It's free, private by design, and it covers
iPhone users who won't install the app. Waiting on Charlie's yes.
