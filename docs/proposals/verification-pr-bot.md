# Proposal: a weekly verification run that opens a pull request

**Why.** Stale data is Matinee's main failure mode; it is the one thing the
hourly health check exists to catch. The 2026-11-20 refresh re-checked 57
programs by hand across official sites, TDF and roundups, and still left 7
rows unconfirmed. A careful automated check turns the product's biggest
operating risk into a visible engineering system, and shows judgment about
what may and may not be fetched.

**What.** A GitHub Actions workflow, weekly and on demand:

1. For each program, fetch only sources whose robots.txt and terms allow it
   (the shows' own sites, TDF show pages), with an honest user agent. Never
   Telecharge, Broadway Direct, Lucky Seat or Playbill.
2. Extract the policy: schema.org `offers` where a site publishes them
   (DATA.md found these on some show sites), otherwise a small structured
   extraction step given the page text and the current row.
3. Diff against `src/lib/programCatalog.ts` and open a pull request: each proposed
   edit carries its source URL and the quoted sentence; `lastVerified` moves
   only on rows whose facts matched; rows with no allowed source are listed
   as needing a person.
4. A person reviews and merges. Nothing merges itself. CI's catalog tests
   still guard the data.

**Size.** 3 to 5 days.

**Needs from Charlie.** Whether an LLM extraction step is acceptable (an API
key in Actions secrets, cents per run), and a bot identity for the pull
requests.
