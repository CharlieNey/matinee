# Proposal: a morning email of what opens today

**Why.** The market research (2026-11-20) found the one rival with a daily
habit is Born in the City's "every open lottery, once each morning" email.
An email reaches people who won't install a home-screen app for push.

**What.** One email at 8 AM New York time: the lotteries and rush windows
opening or open today for the shows you follow (or all of them), each with
its official link: the same list as `/today`. Only checked rows; unverified
ones are named at the bottom without times. Double opt-in, one-click
unsubscribe, no tracking pixels.

**What it needs.**
- An email service. Resend's free plan allows 3,000 emails a month and
  **100 a day**, with no overage on the free plan
  ([pricing](https://resend.com/pricing),
  [quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits),
  checked 2026-11-27). So the free tier tops out at about 100 subscribers.
  Beyond that it's $20 a month (Pro).
- An account (Charlie's), and SPF/DKIM DNS records on matinee.nyc so mail
  isn't junked. The DNS is on Vercel, and `hello@matinee.nyc` still has no MX
  record, so replies need forwarding too.
- A subscribers table in the existing Supabase project, holding the address,
  follows and a confirmation token. This is the first personal data Matinee
  would store: /about and a short privacy note must say so.
- The send runs from the Supabase Cron tick that push already uses, at 8 AM.

**Costs and risks.**
- $0 up to about 100 subscribers, then $20 a month.
- A wrong fact now lands in an inbox; the no-unverified-rows rule applies.
- US anti-spam law (CAN-SPAM) expects a postal address in commercial mail.
  A free informational email arguably isn't commercial, but that's worth a
  quick check before launch.

**Smallest version.** Free tier, all-shows only (no per-follow lists), a
plain-text email, capped at 100 subscribers with a waitlist message after.
About 1.5 days.

**Recommendation.** Wait until push is live and see whether opt-ins pass the
research's 25-person bar. If they do, build the smallest version.
