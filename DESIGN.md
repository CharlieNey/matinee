# Theatr Design Language

Reverse-engineered from the live iOS app (see `reference/theatr-screens/`, captured 2026-07-15).
This file is the source of truth for every screen we build. When in doubt, match the screenshots;
when the screenshots are silent, follow the rules here.

**Essence in one line:** a warm, poster-forward interface that feels like a playbill, not a stock app —
cream paper, espresso ink, one loud vermilion, and show art doing all the decorating.

---

## 1. Color

### Core palette

Hex values are **pixel-sampled from the screenshots** (PIL, solid fill regions), not estimates.

> **Theme note (2026-07-16):** these espresso values are the *reference* palette
> from the iOS screenshots. The live app now wears **House Velvet in both layout
> modes** (§12) — the tokens below are semantic roles, and their current values
> are the velvet column of §12's table. The clone palette is retired.

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#F4F3F2` | App background (light surfaces). Never pure white page bg |
| `paper` | `#FFFFFF` | Cards, sheets, tab bar, filter pills — anything that "sits on" cream |
| `ink` | `#200604` | Primary text, active icons, toggle-on track. A near-black espresso red — never `#000` |
| `ink-soft` | `#8A8380` | Secondary text: criteria lines, timestamps, "Broadway · Musical" |
| `ink-faint` | `#B9B4B1` | Placeholders, disabled, empty-state text |
| `espresso` | `#220C06` | Dark surface base (profile header); pairs with `espresso-glow` gradient |
| `espresso-glow` | `#43230C` | Top of the profile-header gradient (see rule below) |
| `espresso-raised` | `#4E3D38` | Pills/buttons sitting on espresso (Orders / Wallet / Notify) |
| `vermilion` | `#D7492B` | THE accent. Primary CTA fill, Sell button. Measured identical on both |
| `blush` | `#F7EAE7` | Tinted info banner bg ("Your Notify Matches") |
| `card-inset` | `#E9E6E6` | Inset cards on white (show rows inside timeline cards) |
| `gold` | `#F4AA1B` | Praise/recommend accents ("Recommend it" 👍), ratings — icons & fills only |
| `gold-ink` | `#8F6600` | Gold for **text** on light grounds (gold itself is ~2:1 there; gold-ink holds ≥4.5:1) |
| `sage` / `sage-ink` | `#DEE8DA` / `#3F5C46` | Positive/quiet-confirmation tint: "Public" visibility pill (log screen), "Below face" price chips. Never a CTA |
| `line` | `#E7E4E3` | Hairline dividers on light; use `#FFFFFF14` on espresso |

### Rules

- **One accent.** Vermilion appears at most twice per screen (one primary CTA + the Log FAB). Everything else earns attention through type weight and poster art.
- **Warm grays only.** Every neutral carries a brown/red cast. No cool grays, no blue-grays.
- **Dark surfaces are brown, not black.** The profile header is *top-lit*: a vertical gradient from `espresso-glow #43230C` at the very top down to `espresso #220C06` where the light sheet begins — like stage lighting falling off. White text at 100%, secondary at 60% white.
- **Poster art is the color system.** UI chrome stays quiet so show art (any palette) never clashes.

---

## 2. Typography

iOS app uses SF Pro. Web equivalent: **Inter** (or Geist, already in the scaffold) with `-0.01em` tracking on headings. House Velvet adds a serif display tier in **both modes** (see §12): `display` and `title` set in Playfair Display with tracking reset to 0; everything from `heading` down stays grotesque — hierarchy still comes from weight and size.

| Style | Size / weight / line-height | Where seen |
|---|---|---|
| `display` | 34px / 800 / 1.1 | Page-level toggles ("Buy" on Orders), profile name |
| `title` | 22px / 700 / 1.2 | Card titles ("The Lost Boys"), section heads ("Notify Alerts") |
| `heading` | 20px / 700 / 1.25 | Screen titles ("Your Notify"), date markers ("Dec 30") |
| `body` | 17px / 400 / 1.4 | Criteria lines, descriptions |
| `body-strong` | 17px / 600 / 1.4 | Prices ("$49"), stat numbers, tab labels |
| `caption` | 14px / 400 / 1.35 | Timestamps ("1h ago"), "each", helper text |
| `label` | 12px / 500 / 1.2 | Tab-bar labels, badges |

Rules:
- Numbers get emphasis, words around them don't: **$49** each · **16** matches · **1** Following.
- Inactive siblings of an active element drop to `ink-soft` at the *same* size/weight-1 (see Buy/Sell, Activity/Listing/Collection) — selection is shown by color + underline, not size change.
- Sentence case everywhere. No ALL-CAPS labels anywhere in the app.

---

## 3. Spacing, radius, elevation

**Base unit: 4px.** Common rhythm: 16px screen gutters, 12px between cards, 20–24px card padding, 32px between sections.

| Radius token | Value | Usage |
|---|---|---|
| `r-thumb` | 12px | Poster thumbnails |
| `r-card` | 20px | Cards, banners, list containers |
| `r-pill` | 999px | Buttons, filter chips, toggles, Edit Profile |
| `r-sheet` | 24px top corners | Light sheet sliding over espresso header |

Elevation: essentially **flat**. Cards separate from cream by being white, not by shadow. Max allowed: `0 1px 3px rgb(43 29 22 / 0.06)` on floating elements (tab bar, raised Sell button). Never stack shadows.

---

## 4. Iconography

- Outline style, ~1.8px stroke, rounded caps — **Lucide** matches well on web.
- 24px default, 20px inside pills, 28px in tab bar.
- Icons always accompany their label in pills/CTAs (calendar + "Date & Time", plus + "Add Notify Alert"); icons stand alone only in the top utility row (mail, gear, share) and card action corners (trash, pencil, bookmark).
- Ticket motif is the brand's recurring glyph: empty states, the wordmark, Orders tab.

---

## 5. Core components

### Primary CTA ("Add Notify Alert")
Full-width pill. `vermilion` fill, white 17px/600 text, leading icon, 56px tall, 16px side margins. One per screen, pinned near the thumb zone. Press state: darken 8%, scale 0.98.

### Filter chip ("Date & Time ▾")
White pill on cream, 48px tall, 16px side padding, `ink` 17px/600, leading icon + trailing chevron. No border; separation from bg is the white fill alone. Horizontal row, 8–10px gaps, scrolls if overflowing.

### Card (Notify alert, listing)
White, `r-card`, 16–20px padding. Anatomy: poster thumb left (72px, `r-thumb`) → text block (title 22/700, meta 17/400 `ink-soft`, max 2 lines, ellipsis) → control right (toggle, top-aligned). Card-level actions (trash, pencil) sit bottom-right *below* a full-width hairline `line`, 24px icons in `ink-soft`, 24px apart.

### Inset row (show inside a timeline/list)
`card-inset` fill, `r-card` 16px, poster thumb 56px, title 17/600, meta 14 `ink-soft` ("Broadway · Musical" — always `Venue-tier · Genre` with a middot), bookmark icon right in `ink-soft`.

### Toggle
iOS-style, 52×32px. On: `espresso` track, white thumb. Off: `#D9D4CF` track. Never vermilion — the accent is reserved for actions, not state.

### Catalog card (Discover browse grid)
The big card the Marketplace grid pioneered, now answering with curated data (`ShowCard`, Phase 14): 2-col grid (web: 3 ≥768px, 4 ≥1024px), 12px gap. Square poster top with `r-card` upper corners (web hover: art zooms 1.03 inside its static frame); body on white: title 20/700 truncated, tier · genre 14 `ink-soft`, then the **answer row** — program kind 14 `ink-soft` + **$40** 24/700 (fallbacks: "face value **$119**", bold "Free") with a quiet right-aligned caption ("On TKTS today" / "+2 more ways"). The answer row is schedule-agnostic: whether a window is open lives on /rush and the show page, never here.

> Retired with the marketplace (Phase 14, 2026-07-17): the listing card, the perforated ticket stub ("Below face" chip, sold scrims), the seller status pipeline, and the Orders accordion. Their specs live in this file's git history.

### Tab bar
White floating bar, hairline top edge. Five slots — four flat tabs, 2+2 around the center FAB (the reference app's balanced silhouette, with evolved contents): Discover, District, **Log**, Rush, Profile. The flat tabs are the four pillars — what, where, when, you (the Marketplace slot went to District when the marketplace retired, Phase 14). Log is a 64px vermilion circle raised ~20px above the bar, sitting in a paper collar — the bar's own white rises in an 88px bump around it (see `profile-overview.png`; a bump, not a notch) — white pen icon + "Log" 12/600 inside the circle, dead-center. The FAB is an *action* (open the diary's show picker), not a destination. Active tab: `ink` icon + label; inactive: `ink-faint`. No badges on tabs.

### Banner (tinted info)
`blush` fill, `r-card`, 20px padding: title 22/700 `ink`, sub 17/400 `ink-soft`. Informational only — whole banner may be tappable but contains no buttons.

### Tabs (in-page: Activity · Record · Collection)
17/600, active `ink` with 2px `ink` underline sitting on the container's hairline; inactive `ink-soft`. 32px gaps, left-aligned.

### Timeline (activity feed)
Left rail: 10px dot + 1.5px vertical line in `line` color. Entries: date 20/700 → action line ("Marked as attended" 17 `ink-soft`, optional gold suffix chip "👍 Recommend it" 15/600 `gold`) → inset row(s). Year marker 17 `ink-faint` when it changes. Milestones close the rail: "First day on Theatr! 🎉".

### Empty state
Centered, upper-third: outline glyph 64px `ink-faint` → "Nothing here yet…" 20/400 `ink-faint` → underlined `ink` link to the escape action ("See today's windows"). No illustration sets, no mascots.

### Log screen (diary entry — from live app, July 2026)
Back arrow left, **Publish** as bare vermilion text top-right (no pill — text-button is the exception for editor screens). Stacked white cards with hairline-divided rows: what-you-saw (44px poster thumb + title 20/700 + venue 17 `ink-soft`; calendar + date row; seat row). "Share Your Thoughts" card: 3-option sentiment row (gold thumbs-up+star = Recommend it, gray-circle faces for Mixed feelings / Didn't like it; active = full-color icon + 17/600 `ink` label, inactive = muted icon + `ink-soft`), free-text area, outlined `# Tag` chips (rounded-lg 8px — squarer than control pills; selected = espresso fill), 130px Upload Photo bordered box, sage "Public" visibility pill (rounded-lg, eye icon). Separate "Private Note" card. Sentiment/tags/visibility state lives in color, never layout.

### Diary card (timeline "ticket stub")
Diary-logged attendance renders richer than static feed entries: white `r-card` wrapping the inset show row, italic quoted public thoughts, photo (3:4, `r-thumb`, max ~220px), read-only `# tag` chips (outlined, caption, `ink-soft`), armchair + seat caption, and — when present — a hairline-divided private-note row: EyeOff icon + "Only you · …" in `ink-faint`. Sentiment: gold "Recommend it" chip; "Mixed feelings" / "Didn't like it" are quiet `inset` chips, never vermilion.

---

## 6. Patterns & principles

1. **Poster-first.** Every show reference carries its art. Text-only show mentions are a bug.
2. **Outcomes as overlay.** State stamps itself on art (the Collection's bookmark/star covers, the win card's price-vs-face) — the app brags in place, not in copy.
3. **Warm authority, light celebration.** Copy is plain and warm ("Nothing here yet…", "First day on Theatr! 🎉"). Exactly one emoji allowed per screen, only for milestones.
4. **Dark = identity, light = commerce.** Espresso surfaces frame *you* (profile); cream/white frames *inventory*. Keep that split when inventing screens.
5. **Controls are pills, content is cards.** If it's tappable chrome it's a pill; if it's a thing it's a rounded card.
6. **One thumb, one action.** A screen gets at most one full-width vermilion CTA, always reachable one-handed.
7. **State lives in color, not layout.** Active/inactive never reflows — only ink shifts (see tabs, filter chips).

---

## 7. Motion

Nothing in the screenshots suggests exuberant motion; keep it iOS-quiet:
- Standard transitions 200–250ms, `ease-out`; sheet slide-ups 300ms.
- Toggle thumb 150ms; press states scale 0.98.
- Count-ups, where used, run once on first render (400ms), never loop.
- Respect `prefers-reduced-motion`: swap movement for opacity fades.

### Navigation (view transitions)

Route changes use the View Transitions API (React `<ViewTransition>`,
`experimental.viewTransition`):
- **Poster morph** — the poster is the shared element. Catalog card / shelf
  tile → show-page hero morphs in 350ms on the iOS ease curve with a 2px
  mid-flight blur (`.poster-morph`, globals.css). Names: `poster-{slug}` —
  **unique per page**; when a show can render twice (Discover's browse grid
  + shelves), the first surface listing it claims the name and the rest stay
  unnamed.
- **Page crossfade** — everything else crossfades in place (old 150ms out,
  new 200ms in, `.page-cross`); group geometry snaps so differing scroll
  offsets never read as a slide.
- **Anchored chrome** — WebNav (`site-nav`) and TabBar (`tab-bar`) never
  animate during navigation.

### Physicality (motion lib)

- Sheets present per layout mode (§10). Mobile: spring up from the bottom
  (visual duration 300ms, slight bounce), dismiss by dragging the grab handle
  down past ~90px or with a flick. Web: the same `Sheet` becomes a centered
  dialog at the 560px "intimate" width — scale/fade in (~250ms), dismissed by
  the close button, backdrop, or Escape.
- Toggle thumbs are springs (150ms), not tweens.
- Poster art zooms 1.03 inside its static frame on hover (web mode only,
  200ms) — the card itself never lifts; flat elevation still rules.

---

## 8. Accessibility

- `ink` on `cream` = ~13:1 ✓. `ink-soft` on `cream` = ~4.6:1 — body-size only, never under 14px.
- Never set text over poster art without the 35% espresso scrim.
- Touch targets ≥ 44px; pills already comply (48–56px).
- White on vermilion `#D7492B` = ~3.9:1 — fine for 17px/600 button text + icon, don't use vermilion for small body text.
- Toggle state must not rely on color alone (thumb position carries it) ✓.

---

## 9. Tailwind mapping (this repo)

```ts
// tailwind: extend
colors: {
  cream: '#F4F3F2',
  ink: { DEFAULT: '#200604', soft: '#8A8380', faint: '#B9B4B1' },
  espresso: { DEFAULT: '#220C06', glow: '#43230C', raised: '#4E3D38' },
  vermilion: { DEFAULT: '#D7492B', pressed: '#BC3C21' },
  blush: '#F7EAE7',
  inset: '#E9E6E6',
  gold: '#F4AA1B',
  line: '#E7E4E3',
},
borderRadius: { thumb: '12px', card: '20px', sheet: '24px' },
boxShadow: { float: '0 1px 3px rgb(43 29 22 / 0.06)' },
fontSize: {
  display: ['34px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.01em' }],
  title:   ['22px', { lineHeight: '1.2', fontWeight: '700' }],
  heading: ['20px', { lineHeight: '1.25', fontWeight: '700' }],
  body:    ['17px', { lineHeight: '1.4' }],
  caption: ['14px', { lineHeight: '1.35' }],
  label:   ['12px', { lineHeight: '1.2', fontWeight: '500' }],
},
```

---

## 10. Layout modes

The app has **two presentations**, switched by a visitor-facing toggle (floating Phone/Web pill, bottom-right, ≥1024px viewports only). A pre-paint script stamps `html[data-layout="mobile"|"web"]` — saved choice (`theatr-layout-v1`) or default: web on ≥1024px viewports, mobile otherwise. All mode styling hangs off the `web:`/`mobile:` Tailwind variants (see `globals.css`); components, tokens, and theme are 100% shared — **the toggle switches layout only** (unified 2026-07-16; previously mobile carried the espresso clone palette as a before/after switch — that story is retired, the reference screenshots remain in `reference/theatr-screens/`).

**Mobile mode** (the product, phone-sized):
- Centered 430px column on `cream`, hairline side borders; design mobile-first at 390px.
- Floating notched tab bar (four tabs + Log FAB, §5); `BackHeader` on detail screens; compact poster hero on show pages.
- Started as a pixel-faithful clone of the reference screenshots and keeps that structural DNA, but evolves with the product.

**Web mode** (the product):
- Sticky top bar on `cream/95` + blur: ticket mark + wordmark, the tab destinations as in-page-tab-style links (active = `ink` + 2px underline; inactive `ink-soft`), vermilion "Log a show" pill right — the tab bar's raised Log FAB, translated.
- **Inventory pages are wide** (max 1160px): Discover / Rush / show pages. Grids widen instead of stretching: the catalog grid steps 2 → 3 (≥768px) → 4 (≥1024px) columns, rush feed sections 2 columns, shelves show more posters. Show pages swap `BackHeader` for a poster hero (230px art + tier·genre·venue, display title, face value).
- **Identity & utility pages stay narrow** (560px centered): Profile / Watches / log. Dark = identity keeps its phone proportions on purpose — the espresso header reads as a card, not a banner.
- The rule of thumb when adding screens: *commerce breathes, identity stays intimate.*

---

## 11. Shaders — the stage-light layer

Direction (chosen 2026-07-16): **stage light everywhere, marquee scoped to
Rush**. Shaders are materials, not spectacle — they render light and paper,
never compete with poster art, and every one degrades gracefully (CSS
gradient / plain cream) when WebGL is missing. Library:
`@paper-design/shaders-react` (pinned — 0.0.x versioning).

| Surface | Treatment | Component |
|---|---|---|
| Show hero (web) | Show's key art behind fluted glass; palette mesh for typographic tiles; cream wash keeps ink readable | `HeroBackdrop` |
| Profile espresso header | **Follow spot**: elliptical tungsten pool settled over avatar + name, corners in shadow, slow opacity breathing (the CSS gradient is the fallback) | `FollowSpot` |
| Rush closes-soon chips | **Marquee pulse**: warm gold chip + pulsing halo — glow as live urgency signal, not decoration (CSS, not WebGL: many small chips would exhaust GL contexts) | `.marquee-pulse` |
| Cream page background | Static paper-stock grain at 5% opacity, under content — cards stay clean paper on grainy stock | `PaperGrain` |

Rules:
- Poster `bg` values may be CSS gradients — always extract hex stops before
  feeding shader color props (see `hexStops` in `HeroBackdrop`).
- Stage light is *directional*, not ambient: it has a source and a subject
  (the follow spot frames the user; the hero backdrop diffuses the show's
  own art). Ambient color-drift reads as generic gradient mush — avoid.
- Ambient loops (spot breathing, marquee pulse) are the sanctioned exception
  to §7's no-loop rule; they must be slow (≥ 2s cycles) and stop entirely
  under `prefers-reduced-motion`. Static shaders use `speed 0`, which kills
  the render loop — no recurring cost after first paint.
- Shader canvases are `aria-hidden`, `pointer-events-none` where floating,
  and always sit behind a readable wash when text renders above them.
- One glow per screen: the marquee pulse belongs to Rush's live windows;
  commerce surfaces stay quiet.

---

## 12. House Velvet — the theme

Chosen 2026-07-16 (replacing the espresso feel Charlie wasn't sold on), and
extended to **both layout modes** later the same day: the app wears **the
inside of a Broadway house** — ivory program pages for commerce, crimson
velvet for identity, gold leaf where espresso had gold. The reference
espresso palette survives only as documentation (§1) and screenshots.

**Mechanism:** design tokens are *semantic roles*, valued once in
`globals.css` `@theme`. Utilities like `bg-espresso` read as "dark identity
surface" — velvet-colored everywhere. Never hardcode a theme hex in a
component; JS-side colors (shaders, share cards) use the same velvet hexes.

| Role token | Espresso (retired reference) | Current (velvet, both modes) |
|---|---|---|
| `cream` | `#F4F3F2` cream | `#F5EFE3` ivory |
| `ink` | `#200604` espresso ink | `#241418` wine ink |
| `espresso` / `-glow` / `-raised` | `#220C06` / `#43230C` / `#4E3D38` | `#3A0D19` / `#5A1A2A` / `#6B2A3A` velvet |
| `vermilion` / `-pressed` | `#D7492B` / `#BC3C21` | `#A61E33` / `#8C1729` crimson |
| `gold` / `gold-ink` | `#F4AA1B` / `#8F6600` | `#C9A227` gilt / `#8A6D1C` |
| `line` / `inset` / `blush` | cool-cream tints | ivory-warm tints (`#E6DECF` / `#ECE4D4` / `#F6E7E3`) |

**Type:** a serif display tier in both modes — Playfair Display
(`--font-display`, Didot fallback) on `.text-display` and `.text-title`
with tracking reset to 0; everything else stays Geist. Big moments serif,
workaday UI grotesque. Arbitrary-size display text opts in with
`font-display`.

**Kitsch guard:** red + gold turns discount-ticket fast. Ivory dominates;
crimson obeys the one-accent rule; gilt is reserved for praise, light, and
live urgency (never fills, never body text).
