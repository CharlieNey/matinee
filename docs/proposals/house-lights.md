**Declined by Charlie on 2026-11-20. Nothing from this proposal will be built.**

# Proposal: House Lights

A dark-stage look borrowed from the personal-site concept: the house at
blackout, one warm spot on the title, a lighting pipe drawn as a light plot
across the top, a large high-contrast serif.

Stills (phone width, 2026-11-20 data):
[Discover](house-lights/discover.png) ·
[The Outsiders](house-lights/show.png).
The static HTML beside them is throwaway; it uses the app's own fonts and
posters. Compare with today's [Discover](../screenshots/01-discover.png) and
[show page](../screenshots/03-show-detail.png).

**What it adds.** A stronger first second: it looks like a theater at curtain,
not a utility. Posters glow on black, so the art becomes the light. The spot
gives each page one focal point, which DESIGN.md §11 already asks for ("stage
light is directional"). The cue label ("Q 31") and the light plot are specific
to theater, not a generic dark mode.

**What it costs.**
- *A dense board on a dark stage.* Rush shows about 60 rows of small captions,
  countdowns and platform names. Contrast can pass (the frames' secondary text
  is 6.7:1 on cards), but glare and halation over long scanning do not go
  away, and Bodoni's hairlines thin out on black below display sizes.
- *The accent.* Crimson `#A61E33` on the house black is 2.7:1, so it can't be
  text, a link or a status dot there; it survives only as a button fill (white
  on crimson is 7.4:1). Either lift it to something like `#D4485E` (4.7:1), a
  different red, or make amber the accent, which breaks §12's "gilt never
  fills".
- *The design system.* §1 and §11–13 assume paper: dot leaders, double rules
  and the ticket tear are "paper surfaces only". Share cards, the OG image and
  both shaders are tuned for a cream wash.
- *Poster art.* Dark posters (The Outsiders, The Lost Boys, 860) lose their
  edges on black and need a frame (the still uses an ivory hairline). The
  third-party art would carry even more of the identity, which cuts against
  the open poster-rights question.
- *Size.* A token swap gets most of the way; the profile header, shaders,
  share PNGs and a full visual and accessibility pass make it 4–6 days.

**What I'd adopt.**
1. The pipe as a decorative header on Discover and About, the lit instrument
   over the page title. Half a day.
2. A dark "house" hero on show pages only: poster and title under one spot,
   then the page returns to ivory for the program. One day; `HeroBackdrop`
   already does a version of this on cream.
3. The cue label for the live count on Discover and Rush. An hour.

Not a dark board for Rush: anything people scan stays on paper.

**Would I do it?** Not as a full redesign before interviews. Today's ivory and
crimson look is coherent, documented and passes the accessibility checks, and
a half-finished dark mode is worse than either look. I'd build items 1–3 if
you want a visible link between the personal site and Matinee, after the
site's own direction is settled.
