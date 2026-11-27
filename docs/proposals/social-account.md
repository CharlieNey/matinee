# Proposal: a Bluesky (or Instagram) account that posts when windows open

**Why.** The research found r/Broadway and TikTok creators are where this
audience gathers. A feed that posts "Galileo's lottery is open until 3 PM"
puts Matinee in front of people without them installing anything.

**What.** An automated Bluesky account, labeled as a bot in its bio, that
posts from checked rows only:
- one post at 8 AM: what opens today, with a link to `/today`;
- for a handful of popular shows, a post when the lottery opens;
- never a post from an unverified or stale row.

**What it needs.**
- A public account. Under Charlie's name, or a project handle (my
  recommendation: `@matinee.nyc`, which Bluesky can verify through a DNS TXT
  record on the domain Charlie already owns).
- An app password stored as a Vercel secret.
- The Supabase Cron tick to trigger the posts.

**Costs.** $0 for Bluesky; its API is free. Instagram is not worth it: posting
by API needs a Business account linked to a Facebook Page, plus Meta app
review, for an audience that wants images, not timetables.

**Risks.**
- Everything it posts is public under his name or domain, so a wrong fact is
  public too.
- Posting every window would be 40+ posts a day, which is spam. Hence one
  daily summary plus a few shows.
- Bluesky's community norms favor self-labeled bots that don't reply or
  follow automatically.

**Smallest version.** The 8 AM summary only, posted by a cron route, with a
dry-run mode that logs the post instead of sending it. About a day once the
account exists.

**Recommendation.** After launch, if the r/Broadway post lands. Charlie
creates the account; nothing is posted without his OK.
