# Theatr Design Language

Reverse-engineered from the live iOS app (see `reference/theatr-screens/`, captured 2026-07-15).
This file is the source of truth for every screen we build. When in doubt, match the screenshots;
when the screenshots are silent, follow the rules here.

**Essence in one line:** a warm, poster-forward marketplace that feels like a playbill, not a stock app —
cream paper, espresso ink, one loud vermilion, and show art doing all the decorating.

---

## 1. Color

### Core palette

Hex values are **pixel-sampled from the screenshots** (PIL, solid fill regions), not estimates.

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
| `gold` | `#F4AA1B` | Praise/recommend accents ("Recommend it" 👍), ratings |
| `sage` / `sage-ink` | `#DEE8DA` / `#3F5C46` | Positive/quiet-confirmation tint: "Public" visibility pill (log screen), "Below face" price chips. Never a CTA |
| `line` | `#E7E4E3` | Hairline dividers on light; use `#FFFFFF14` on espresso |

### Rules

- **One accent.** Vermilion appears at most twice per screen (one primary CTA + the Sell tab). Everything else earns attention through type weight and poster art.
- **Warm grays only.** Every neutral carries a brown/red cast. No cool grays, no blue-grays.
- **Dark surfaces are brown, not black.** The profile header is *top-lit*: a vertical gradient from `espresso-glow #43230C` at the very top down to `espresso #220C06` where the light sheet begins — like stage lighting falling off. White text at 100%, secondary at 60% white.
- **Poster art is the color system.** UI chrome stays quiet so show art (any palette) never clashes.

---

## 2. Typography

iOS app uses SF Pro. Web equivalent: **Inter** (or Geist, already in the scaffold) with `-0.01em` tracking on headings. No serifs, no display faces — hierarchy comes from weight and size only.

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
- Ticket motif is the brand's recurring glyph: empty states, Sell button, Orders tab.

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

### Marketplace listing card
2-col grid, 12px gap. Square poster top with `r-card` upper corners; sold state = 35% `espresso` scrim over art + centered white "**Sold** / in 5 minutes" (22/700 over 17/400). Body on white: title 20/700, seat line 17 `ink-soft` ("Left MEZZ / Row D"), price row (**$49** 24/700 + "each" 14 `ink-soft`), footer avatar 20px + relative time 14 `ink-soft`.

### Tab bar
White floating bar, hairline top edge. Five slots: Marketplace, Discover, **Sell**, Orders, Profile. Sell is a 64px vermilion circle raised ~20px above the bar with a notch cut beneath it — white ticket icon + "Sell" 12/600 inside the circle. Active tab: `ink` icon + label; inactive: `ink-faint`. No badges on tabs.

### Banner (tinted info)
`blush` fill, `r-card`, 20px padding: title 22/700 `ink`, sub 17/400 `ink-soft`. Informational only — whole banner may be tappable but contains no buttons.

### Tabs (in-page: Activity · Listing · Collection)
17/600, active `ink` with 2px `ink` underline sitting on the container's hairline; inactive `ink-soft`. 32px gaps, left-aligned.

### Timeline (activity feed)
Left rail: 10px dot + 1.5px vertical line in `line` color. Entries: date 20/700 → action line ("Marked as attended" 17 `ink-soft`, optional gold suffix chip "👍 Recommend it" 15/600 `gold`) → inset row(s). Year marker 17 `ink-faint` when it changes. Milestones close the rail: "First day on Theatr! 🎉".

### Empty state
Centered, upper-third: outline glyph 64px `ink-faint` → "Nothing here yet…" 20/400 `ink-faint` → underlined `ink` link to the escape action ("See all tickets on Marketplace"). No illustration sets, no mascots.

### Log screen (diary entry — from live app, July 2026)
Back arrow left, **Publish** as bare vermilion text top-right (no pill — text-button is the exception for editor screens). Stacked white cards with hairline-divided rows: what-you-saw (44px poster thumb + title 20/700 + venue 17 `ink-soft`; calendar + date row; seat row). "Share Your Thoughts" card: 3-option sentiment row (gold thumbs-up+star = Recommend it, gray-circle faces for Mixed feelings / Didn't like it; active = full-color icon + 17/600 `ink` label, inactive = muted icon + `ink-soft`), free-text area, outlined `# Tag` chips (rounded-lg 8px — squarer than control pills; selected = espresso fill), 130px Upload Photo bordered box, sage "Public" visibility pill (rounded-lg, eye icon). Separate "Private Note" card. Sentiment/tags/visibility state lives in color, never layout.

### Status pipeline (Orders, seller side)
Three steps — Listed → Sold → Paid — as a dot rail inside the listing card, below a hairline. Completed/current: espresso-filled dot + `ink` label; future: hollow `ink-faint` dot, `line` connector. State changes are 200ms color transitions only — no layout shift. One-line helper caption (`caption`, `ink-soft`) under the rail states what happens next. Tapping opens a sheet with the same rail larger plus one espresso (never vermilion) action pill.

### Diary card (timeline "ticket stub")
Diary-logged attendance renders richer than static feed entries: white `r-card` wrapping the inset show row, italic quoted public thoughts, photo (3:4, `r-thumb`, max ~220px), read-only `# tag` chips (outlined, caption, `ink-soft`), armchair + seat caption, and — when present — a hairline-divided private-note row: EyeOff icon + "Only you · …" in `ink-faint`. Sentiment: gold "Recommend it" chip; "Mixed feelings" / "Didn't like it" are quiet `inset` chips, never vermilion.

### Accordion (Orders)
Chevron (rotates open) + 20/700 label, 24px vertical rhythm; collapsed sections show nothing else. Empty section body: "Nothing here yet." 17 `ink-faint`, indented to label start.

---

## 6. Patterns & principles

1. **Poster-first.** Every show reference carries its art. Text-only show mentions are a bug.
2. **Social proof as overlay.** Outcomes stamp themselves on art ("Sold in 3 minutes") — the marketplace brags in place, not in copy.
3. **Warm authority, light celebration.** Copy is plain and warm ("Nothing here yet…", "First day on Theatr! 🎉"). Exactly one emoji allowed per screen, only for milestones.
4. **Dark = identity, light = commerce.** Espresso surfaces frame *you* (profile); cream/white frames *inventory*. Keep that split when inventing screens.
5. **Controls are pills, content is cards.** If it's tappable chrome it's a pill; if it's a thing it's a rounded card.
6. **One thumb, one action.** A screen gets at most one full-width vermilion CTA, always reachable one-handed.
7. **State lives in color, not layout.** Active/inactive never reflows — only ink shifts (see tabs, Buy/Sell).

---

## 7. Motion

Nothing in the screenshots suggests exuberant motion; keep it iOS-quiet:
- Standard transitions 200–250ms, `ease-out`; sheet slide-ups 300ms.
- Toggle thumb 150ms; press states scale 0.98.
- Sold-badge and match-count may count up once on first render (400ms), never loop.
- Respect `prefers-reduced-motion`: swap movement for opacity fades.

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

Viewport: design mobile-first at 390px (iPhone frame); desktop gets a centered 430px column on `cream` — this is a phone product and should present as one.
