# Profile Redesign — Warm Editorial (v1, frozen)

Rework the Profile screen into a premium, warm, editorial identity page. Pure UI/presentation — no schema, no queries, no business logic changes. Applies to `/profile/me` primarily; `/profile/$userId` mirrors the same visual language (no Owner pill, no menu, keeps Connect/Chat CTA).

## Design tokens (src/styles.css)

Add warm palette + soft shadow, layered on existing semantic tokens (no removal):
- `--surface-warm` — cream page background (`oklch(~0.985 0.012 80)`).
- `--surface-card` — off-white card surface (`oklch(~0.995 0.006 80)`).
- `--border-warm` — hairline warm border.
- `--accent-peach` — soft peach fill for badges/promo.
- `--accent-orange` — primary orange (`~oklch(0.72 0.17 55)`).
- 6 stat tint tokens only: `--tint-peach`, `--tint-mint`, `--tint-lavender`, `--tint-coral`, `--tint-blue`, `--tint-amber`. Foregrounds derived via `currentColor` + opacity on the tint fill — no separate fg vars.
- `--shadow-ambient` — single soft ambient shadow.
- `@keyframes ring-pulse` — gentle 3s avatar ring pulse.

## Header (compact horizontal)

- Circular avatar (64px) with warm ring + subtle pulsing outer ring.
- Small orange presence dot (bottom-right, white border).
- Name: display font, bold, tight tracking; inline sparkle icon (own profile only), colored `accent-orange`.
- Profession below name (13px muted).
- City with `MapPin` icon (12px muted).
- **Contextual line** below city — one subtle line, only rendered when meaningful:
  - Public profile: "N shared interests with you" when the viewer and profile owner have ≥1 interest overlap (derived client-side from the viewer's `profile.interests` already in the auth context / cached query — no new query).
  - Own profile: nothing by default. Reserved slot for future signals (e.g., "Complete your profile" once we have a completeness signal); ship empty for v1 on `/me` if no signal is available without new data.
  - Renders as 12px muted text, single line, no icon. Suppress entirely when there is nothing useful to say — never render a placeholder.
- Menu button: 40px circular, thin warm border, hover soft peach tint.
- No large vertical gaps between avatar block and next section.

## Interests

- Small-caps "INTERESTS" label.
- Chips: white bg, `border-warm` hairline, rounded-full, colored emoji, 13px medium text, tight padding. Row wraps.

## Reputation card

- Single rounded card (24px radius, `surface-card`, `shadow-ambient`, no internal borders).
- 3×2 grid of cells, generous internal padding.
- Each cell: circular tinted icon (36px, tint bg + icon inheriting tint color), large bold value (18px, tabular-nums), small muted label (11px) beneath.
- Icons + tints:
  - Created → `FileText` peach
  - Joined → `Users` mint
  - Interested → `Star` lavender
  - Connected → `Link2` coral
  - Returning → `Undo2` blue
  - Response → `Clock` amber
- Data source unchanged: existing `user_reputation_stats` query + `get_intents_joined_count` RPC.
- Empty state: keep current dashed hint but restyled to warm palette.

## Active intents

- Section header row: label + "View all →" link → `/profile/activity?tab=mine` (own profile only; on public profile omit link).
- Each intent card: horizontal, `surface-card`, 20px radius, `shadow-ambient`, hover lifts (`translate-y-[-1px]` + slightly stronger shadow).
- Left: square cover (88–96px) with deterministic gradient derived from `category_slug` hash + centered category emoji. No cover_url field added.
- Right column: category chip (small, tinted by category), title (15px semibold, 2-line clamp), meta row with icons — `Calendar` date, `Users` participants, `MapPin` location.
- Trailing `ChevronRight` on right edge for affordance.
- **Query policy**: reuse fields already fetched. Only extend the `select()` if a required presentation field (e.g., start/end date, location, participants count) is not already returned. Avoid unnecessary query churn.
- Category appearance (gradient + emoji) lives as a small local `getCategoryAppearance(categorySlug)` helper inside `active-intent-card.tsx` — no separate utility file.
- Empty state: warm dashed card, copy unchanged.

## Footer promo card (compact)

- Warm peach card (rounded-2xl, `accent-peach` bg tint, no shadow).
- Fixed compact height ~72–84px — a finishing touch, not a hero.
- Left: small circular tinted `Sparkles` icon.
- Center text: "Good things happen when good people **plan together**." — bold on "plan together" in `accent-orange`. Single line where possible; two lines max on narrow widths.
- Right: pure inline SVG — thin lines, dots, tiny mountain/flag motif at 40–60% opacity. No stock illustration, no imported asset.
- Replaces the current "Tap the menu icon…" helper line.

## Public profile mirror (`/profile/$userId`)

- Same header layout, no menu, no sparkle, no Owner-only affordances.
- Shared-interests line under the city as described above.
- Same interests + reputation card + active intents styling.
- Connect / Chat / Requested CTA restyled to match new button treatment (rounded-2xl, orange primary, soft hover).

## Motion

- Avatar ring: 3s ease-in-out pulse (opacity 0.6→0.9).
- Cards: 150ms transform + shadow transition on hover.
- No entrance animations, no parallax, no flashy effects.

## Files touched

- `src/styles.css` — add tokens + keyframes.
- `src/routes/_authenticated/profile.me.tsx` — new layout/markup; extend intents `select()` only if a required field is missing.
- `src/routes/_authenticated/profile.$userId.tsx` — mirror styling, restyle CTA, compute shared-interests line from cached viewer profile.
- `src/components/reputation-panel.tsx` — new tinted-icon grid layout.
- New `src/components/profile/active-intent-card.tsx` — shared horizontal card + inline `getCategoryAppearance` helper.
- New `src/components/profile/promo-card.tsx` — compact footer promo with inline SVG.

## Out of scope

- No DB migrations, no new columns (no `cover_url`, no completeness field).
- No changes to activity page, connections, inbox, or intent detail.
- Profile drawer visuals unchanged.
