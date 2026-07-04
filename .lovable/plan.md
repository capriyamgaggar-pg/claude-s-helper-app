## Alive & addictive intent cards — final plan

### Design philosophy

Every interaction should feel intentional and rewarding. Motion communicates responsiveness, hierarchy, and delight — not distraction. The interface stays calm at rest, becomes expressive on interaction, and never sacrifices readability or performance. Favor shared layout transitions, spring physics, and subtle depth over decorative animations. Maintain a consistent motion language across the entire application.

### Implementation principle (non-negotiable)

**Animation must never delay interaction.** All navigation, clicks, and input handling occur immediately. Motion is purely visual and must not block user actions — no `await` on animation completion before route changes, no disabled state during exit animations, no pointer-events gating during ripples.

### Performance budget (measurable)

- Maintain 60 FPS on modern desktop browsers on `/explore` with 30+ cards.
- No new object allocation inside pointer-move handlers — reuse `MotionValue` instances.
- At most one active `requestAnimationFrame` loop per hovered card (tilt + spotlight share a single frame subscription).
- No animations on off-screen elements — every ambient loop and pointer subscription is gated by `useInView`.
- Pointer tracking uses `MotionValue` / `useTransform`, never React state — zero re-renders during hover.
- GPU-only transforms (`translate`, `scale`, `rotate`, `opacity`). No animated `box-shadow`, `filter`, or `width/height`.

---

### Shared foundations (PR 1)

- **Install `motion`** (framer-motion v11, edge-safe).
- **`src/lib/card-motion.ts`** — spring tokens reused everywhere:
  - `gentle` `{170, 22}` — card lift, chip scale
  - `snappy` `{320, 26}` — pointer tilt
  - `bounce` `{400, 12}` — motif click bursts
  - `press` `{500, 30}` — future button feedback
  - `stagger` config (`0.04s`, `0.02s` for lists >20)
  - `useReducedMotion()` wrappers → all effects degrade to opacity-only or no-op.
- **CSS variable convention** — each card sets `--card-accent` at its own scope; hover ring, spotlight, ripple, chip glow all read `var(--card-accent)`. PR 1 uses a neutral accent; PR 2 overrides per slug. Theming stays trivial with no prop drilling.

---

## PR 1 — Interaction system

### Card (`src/components/intent-card.tsx`)

1. **Entrance stagger** — parent `motion.ul` with `staggerChildren`; each card fades+rises (`y: 12 → 0`), `gentle` spring.
2. **Exit via `AnimatePresence`** — filter / sort / delete / publish / refresh: removed cards fade+shrink (`scale → 0.96`, 180ms), remaining cards glide via `layout`.
3. **`layout` on every card** — smooth reordering within feeds. **No `layoutId`** on the card itself for PR 1 (see "Scoped shared transitions" below).
4. **Hover lift** — `whileHover={{ y: -4, scale: 1.005 }}`, `gentle`.
5. **Border glow ring** — pre-composited `::after` in `var(--card-accent)`, opacity 0 → 0.35 on hover.
6. **Pointer tilt** — motion values → ±3° `rotateX/rotateY`, `snappy`. Disabled on `pointer: coarse` + reduced motion.
7. **Spotlight** — radial gradient positioned by pointer motion values, `soft-light` blend, tinted with `var(--card-accent)`, opacity 0 → 0.35 on hover. Shares tilt's rAF subscription.
8. **Click ripple** — pointer-anchored `motion.span` in `var(--card-accent)`, `scale 0 → 4`, `opacity 0.4 → 0`, 500ms. **Navigation happens immediately on click** — the ripple animates against the exit.
9. **Category chip** — `whileHover` scale 1 → 1.04, `gentle`.

### Motif tile bridge to PR 2

- **`src/components/motifs/motif-tile.tsx`** — 56px rounded gradient tile. Renders a **Lucide icon per slug** on `--motif-fallback`. No per-slug motion yet.

### Scoped shared transitions (only where they reinforce context)

Shared `layoutId` is applied **only** on these paths — not app-wide:

- **Explore → Intent detail → Back**: tapped card's motif tile carries `layoutId={"motif-" + intent.id}` and morphs into the detail page's hero element, and back.
- **Home → Intent detail → Back**: same pattern.
- **Modal open/close** (Approvals sheet, filter sheet): `layoutId` on the trigger element → sheet header, so the modal appears to expand from its trigger.

Unrelated cross-route navigation (Settings ↔ Profile ↔ Inbox) uses **no page transition** — instant. Do NOT wrap `<Outlet />` in a global `AnimatePresence`.

### Reduced motion + perf guardrails

- `useReducedMotion()` disables lift, tilt, spotlight, ripple, stagger, and shared morphs (falls back to opacity).
- `will-change: transform` only during hover; cleared on leave.
- Tilt/spotlight subscribers unmount off-screen (`useInView`).

### PR 1 files

- `bun add motion`
- new `src/lib/card-motion.ts`
- new `src/components/motifs/motif-tile.tsx`
- edit `src/components/intent-card.tsx` — motion wrapper, tilt, spotlight, ripple, glow ring, motif slot, `layout`
- edit `src/routes/_authenticated/{explore,home,profile.activity}.tsx` — `<AnimatePresence>` + `motion.ul` around card lists
- edit `src/routes/_authenticated/intents.$intentId.tsx` — matching `layoutId` on the hero for the scoped morph
- edit `src/styles.css` — `--motif-fallback`, `--card-accent` (neutral default)

### Explicitly deferred (Future primitives)

- **Magnetic buttons** — no CTAs on the card yet, land with Join / Interested / Publish.
- **Haptics** — reintroduce when the app becomes a PWA / mobile shell.
- **Global page transitions** — only add case-by-case if a specific pair of pages benefits.
- Detail-page hero motif polish.
- Per-intent uploaded imagery.

---

## PR 2 — Category personalities

Builds inside the tile from PR 1; card container untouched.

### Visual language cohesion (non-negotiable)

The 11 motifs must feel like one set, not eleven unrelated icons. Every motif shares:

- **Stroke width**: 1.75px, single value across all glyphs.
- **Corner radius**: 2px on joins, 4px on containers.
- **Icon proportions**: fits within a 32×32 optical box inside the 56px tile with 12px padding.
- **Palette**: monochrome glyph in `--motif-glyph`, single accent in `var(--card-accent)`.
- **Animation timing**: hover-in 220ms / hover-out 160ms; click 300–500ms; all use `bounce` or `gentle` from the shared spring tokens.
- **Resting state**: perfectly centered, no rotation, no offset — the glyph returns to identity at rest.

### Motion rule

Every motif hover settle and click burst **completes within ~500ms and returns to a stable resting state**. Ambient loops permitted only on `hobby`, `other`, `cofounder`, gated by `useInView`, amplitude ≤0.15 opacity, period ≥4s.

### Per-slug motifs

| Slug | Idle | Hover | Click |
|---|---|---|---|
| sports | still bike | wheels rotate to rest, frame rocks 2° | 300ms lunge + wheel spin |
| travel | parked plane | plane flies diagonal, trail fades | trail wipes, resets |
| trekking | mountain + cloud | cloud drifts, peaks parallax | sun peeks, retracts |
| networking | 3 dots | one outward pulse ring, settle | converge + burst |
| study | closed book | tilts open 20°, page flip | opens fully, settles |
| hobby | one note | note bounces, 2 tiny notes fade up | 4-note burst |
| event | flat streamers | confetti burst, drifts, settles | second burst |
| shopping | still bag | 8° pendulum swing | one bounce |
| cofounder | rocket on pad | exhaust pulse, rocket +3px | ignition lift + fade |
| flatmate | dark house | windows glow, door cracks | door opens fully |
| other | 3 sparkles | shimmer flash | radial shimmer |

### Category tinting via `--card-accent`

- `src/styles.css` — `--motif-<slug>` gradient + `--accent-<slug>` per category.
- `intent-card.tsx` sets `style={{ ["--card-accent"]: `var(--accent-${slug})` }}` on the root; every PR 1 effect picks it up automatically.

### PR 2 files

- new `src/components/motifs/{sports,travel,trekking,networking,study,hobby,event,shopping,cofounder,flatmate,other}.tsx`
- new `src/components/motifs/index.ts` — slug → component map (fallback to Lucide tile)
- edit `src/components/motifs/motif-tile.tsx` — accept `children` motif, keep morph target
- edit `src/components/intent-card.tsx` — set `--card-accent` from slug
- edit `src/styles.css` — 11 `--motif-<slug>` + `--accent-<slug>` pairs

### PR 2 out of scope

- Bespoke commissioned illustrations (swappable inside the same tile later).
- Detail-page hero motif.

---

### Delivery

Ship PR 1 first. After merge: spot-check `/explore`, `/home`, `/profile/me/activity` at mobile + desktop, verify the Explore → Intent → Back scoped morph, toggle `prefers-reduced-motion` in devtools, verify 60 FPS with 30+ cards in the browser performance profiler. Then start PR 2.
