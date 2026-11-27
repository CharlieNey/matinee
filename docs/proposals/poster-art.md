# Proposal: what to do about poster art before announcing

**Checked 2026-11-27.** I looked at all 48 images in `public/posters/` on a
contact sheet. **None is a Playbill cover**: none carries Playbill's yellow
masthead. The two that were (Operation Mincemeat, Ragtime) were replaced with
the generated tile on 2026-11-21.

Every one of the 48 is the production's own marketing key art, and **none is
Matinee's to use**. No license was granted. They're included as
non-commercial portfolio reference with credit (README, LICENSE, /about), and
/about now gives a takedown address. The market research rated this risk LOW
for official key art and MEDIUM for Playbill covers; with the covers gone,
what's left is the LOW case.

**The 48 files** (one per show): a-walk-on-the-moon, accomplice-the-show, aladdin, and-juliet, broad-strokes, buena-vista-social-club, cats-jellicle-ball, chess, chicago, death-of-a-salesman, disruption, drunk-shakespeare, every-brilliant-thing, gazillion-bubble-show, giulia-poison-queen, hadestown, hamilton, harry-potter-cursed-child, heathers, joe-turners-come-and-gone, just-in-time, little-shop-of-horrors, maybe-happy-ending, mj-the-musical, moulin-rouge, oh-mary, perfect-crime, proof, rocky-horror-show, schmigadoon, shifters, six, spelling-bee, stranger-things-first-shadow, the-book-of-mormon, the-gin-game, the-great-gatsby, the-lion-king, the-lost-boys, the-outsiders, the-play-that-goes-wrong, the-potluck, the-saviors, the-whoopi-monologues, the-winters-tale, titanique, two-strangers, wicked.

**The only images that are clearly ours** are the generated typographic tiles
that `Poster.tsx` draws for shows without art. Nothing else qualifies:
- press-kit images are licensed to press, not to apps;
- Wikimedia Commons has almost no current Broadway key art.

**Options.**
1. **Keep them, as now (my recommendation for launch).** Credit stays on
   /about and in the README, takedowns are honored the same day, and the
   images are excluded from the MIT license. That's how BroadwayCheapSeats
   and most guides run.
2. **Switch every show to the generated tile.** Zero image risk, but the
   app loses most of its visual identity, and the Discover page and show
   pages read as a list. About 1 hour: empty `posters.json` and delete
   `public/posters/`.
3. **Ask the productions' press offices for permission.** The cleanest
   answer, but it means sending emails, which is Charlie's call.

**If a takedown request comes in:**
- Delete that show's file and its `posters.json` entry. The tile replaces
  it automatically.
- Commit and push to `main`.
- Check that `/shows/<slug>` shows the tile.
