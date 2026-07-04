# Phase 10 — Interactive Feed & Motif System (final)

## Design philosophy

Every interaction should feel intentional and rewarding. Motion communicates responsiveness, hierarchy, and delight — never distraction. The interface is calm at rest, expressive on interaction, and never sacrifices readability or performance. Favor shared layout transitions, spring physics, and subtle depth over decorative animation. Maintain a consistent motion language across the entire app.

## Non-negotiable principles

- **Animation must never delay interaction.** No `await` on animation completion, no disabled states during exits, no `pointer-events` gating during ripples. Navigation, clicks, and input handling fire immediately; motion is purely visual.
- **Shared `layoutId` only when both endpoints are simultaneously mounted and visually related.** Current pairs: Explore→Intent, Home→Intent, modal open/close. Do not add new `layoutId` pairs without a clear UX benefit.
- **Performance budget:** Maintain 60 FPS on `/explore` with 30+ cards. Avoid continuous animation loops. Pointer interactions should share `MotionValue` subscriptions and only be active for the currently hovered card. Off-screen cards must not run animations (`useInView` gate). GPU-only transforms (translate, scale, rotate, opacity).

## Changes from previous revision

### 1. Remove hover scale
`IntentCard` currently uses `whileHover={{ y: -4, scale: 1.005 }}`. Change to `whileHover={{ y: -4 }}`. The spotlight, glow ring, and shadow already convey depth; the scale can make dense lists feel unstable.

### 2. Refine reduced-motion behavior
When `useReducedMotion()` is true:
- **Disable:** pointer tilt, spotlight, ripple, shared layout morphs, ambient motif animations.
- **Keep:** simple opacity transitions, small hover elevation (`y: -2` instead of `-4`) so interactive affordances remain clear.

Applies in `card-motion.ts`, `intent-card.tsx`, `motif-tile.tsx`, and the feed `AnimatePresence` wrappers.

### 3. Scope `layoutId` explicitly
Add a comment block in `card-motion.ts` documenting the rule above. Reviewers should reject new `layoutId` pairs without a matched, simultaneously-mounted destination.

## Accessibility

- All hover interactions have equivalent `:focus-visible` states (lift + ring), reachable by keyboard.
- Cards are fully usable without hover (touch, keyboard).
- Focus rings remain visible on `:focus-visible` and are never replaced solely by the glow effect.
- Motion is never the sole signal for a state change — always paired with color, text, or icon change.
- `MotifTile` icons are `aria-hidden`; the card's accessible name comes from its title/link text.

## Files touched (PR 1 refinement only)

- `src/components/intent-card.tsx` — drop `scale` from `whileHover`; add reduced-motion `y: -2` branch; ensure `:focus-visible` mirrors hover lift + ring.
- `src/lib/card-motion.ts` — reduced-motion helper returns `{ y: -2 }` hover variant, disables tilt/spotlight/ripple/ambient/layout; add `layoutId` scoping comment.
- `src/components/motifs/motif-tile.tsx` — respect reduced motion (no ambient loop, no morph), keep opacity transitions, `aria-hidden` on icon.
- `src/routes/_authenticated/explore.tsx`, `home.tsx`, `profile.activity.tsx` — no visual change; verify `AnimatePresence` stagger is skipped under reduced motion (opacity only).

No new dependencies. PR 2 (per-slug SVG motifs + category personalities) unchanged and follows after verification.

## Verification

- Sustain 60 FPS on `/explore` with 30+ cards in the DevTools performance panel.
- Hover rapidly across multiple cards without dropped frames.
- Filter/sort the feed and confirm layout transitions remain smooth.
- No console warnings/errors during repeated mount/unmount.
- Reduced-motion mode removes all decorative motion while preserving usability (hover still lifts `y: -2`, focus rings visible).
- Keyboard navigation (Tab, Shift+Tab, Enter) works across the feed; focus ring visible on every card and matches hover elevation.
