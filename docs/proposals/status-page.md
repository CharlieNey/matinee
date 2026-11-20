# Proposal: a public /status page

**Why.** The reliability work (a verification date on every row, the hourly
health check, deduplicated pushes) is invisible to someone clicking around
for 30 seconds. A status page makes it visible, and it is a natural page to
open in an interview: "here is how I know the data is right today."

**What.** `/status`, linked from About and the footer of Rush:

- Health now, from the same checks as `/api/health` (catalog, database, TKTS).
- Every program with its verification age as a small bar: under 7 days,
  7 to 14, over 14 (unverified). Rows kept at an older date show the reason.
- The last 48 hourly health results.
- The last data refresh, linking to its commit.

**Size.** 1 to 2 days.

**Needs from Charlie.** Where health history lives: a small Supabase table
the health workflow writes to (one row an hour), or the GitHub Actions API
(needs a token, rate limited). I'd use the table.
