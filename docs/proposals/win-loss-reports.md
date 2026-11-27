# Proposal: "won / lost" reports that build rough odds per show

**Why.** The most-asked lottery question is "what are my chances?" Nobody
publishes odds, and Matinee already has the substrate: the "I entered" and
"I won" taps in each visitor's lottery log.

**What.**
1. **Your own odds (no server).** On the profile: "You've entered Wicked 14
   times and won once." It's computed from the log in the browser, so it
   stores nothing new. This is the smallest version, and it needs nothing
   from Charlie.
2. **Everyone's rough odds (opt-in).** "Send my results anonymously" posts
   (show, program, day, won or lost) with no identifier. A show page then
   says "Reported odds: about 1 in 40 (212 reports since Dec 1)" once it
   has 50 or more reports.

**What it needs (for 2).**
- A table in the existing Supabase project, the existing rate limiter on the
  write route, and a line on /about saying what is stored.
- Charlie's decision that Matinee may store visitor reports at all. Today it
  stores nothing about people except push subscriptions.

**Costs.** $0 on the free tiers.

**Risks.**
- **Accuracy:** self-reported results skew toward winners, who report more.
  Show it as "reported" odds with the count, never as a fact, and hide it
  under 50 reports.
- **Abuse:** fake reports can move small numbers. Mitigate with the rate
  limit, one report per device per program per day, and outlier trimming.
- **Privacy:** no identifiers, no IPs stored (the limiter already hashes
  them), and reports deleted after a season.

**Recommendation.** Build version 1 now; it's local and safe. Decide on
version 2 after launch, when there are enough users for the numbers to mean
anything.

**Status (2026-11-27): built (`8531ff7`) and tested, then reverted
(`fdbb80d`) so it stays out of the push go-live until Charlie says yes. To
ship it: `git revert fdbb80d`.
