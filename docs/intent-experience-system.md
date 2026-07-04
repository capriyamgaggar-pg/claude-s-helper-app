# Intent Experience System v1.0

> **North Star** — Intent helps strangers become trusted connections through shared intentions.

This document is the constitution for every screen, interaction, and word in
the app. It is the source of truth that Phase 1–8 implementation work refers
back to. Read it before designing or building anything.

## 1. Guiding Principles

1. **Real-world first.** Digital surfaces exist to make an offline moment
   happen. If a feature does not move two people closer to meeting, it does
   not ship.
2. **Intentions first, identity second.** People are introduced by what they
   want to do next, not by title, follower count, or resume.
3. **Consumer, not enterprise.** The tone is warm, personal, and human — not
   dashboards, not analytics, not "workflows."
4. **Trust over engagement.** We do not optimise time-in-app. We optimise for
   the number of respectful, reciprocated connections.
5. **Clarity over cleverness.** Prefer the obvious label. Copy is plain, in
   the user's language, and never coy.
6. **Small surfaces, big consistency.** One button style, one card style, one
   empty state pattern — used everywhere.
7. **Privacy by default.** Sensitive fields are opt-in to show, never leaked
   in listings, never used for ranking.
8. **Inclusive language.** No assumed gender, no assumed profession, no jargon
   from a single industry.
9. **Feedback is visible.** Every state change (sent, received, expired,
   fulfilled) is acknowledged with a small, calm confirmation.
10. **Mobile-native posture.** Thumb-reach, bottom actions, single-column
    reading. Desktop is a graceful superset, never the design target.
11. **Async-friendly.** Nothing requires both people to be online at once.
12. **Serendipity, not spam.** Discovery surfaces intent, not people.
13. **Finish the loop.** Every intent must have a definite ending — fulfilled,
    expired, or closed — with a moment of closure for both sides.

## 2. Decision Framework

When two options conflict, pick in this order:

1. **Trust > engagement.** A safer flow beats a stickier one.
2. **Clarity > novelty.** A boring pattern that users already understand beats
   a beautiful new one.
3. **Depth for one use case > breadth across many.** A specific verb ("host a
   dinner") beats a generic one ("meet people").
4. **Remove, unless it protects safety.** Default is to delete a control, a
   sentence, a screen. Additions must earn their place.

## 3. Visual System (Phase 1 tokens)

All color, radius, shadow, and typography decisions live in
`src/styles.css` as CSS custom properties. Components must consume tokens —
never hard-coded colours.

- **Type** — `Fraunces` (display, 500) for headings; `Inter` (400/500/600) for
  body and UI.
- **Palette** — warm off-white paper (`--background`), near-black ink
  (`--foreground`), single warm-orange accent (`--accent`).
- **Radius** — `--radius: 0.875rem`. Cards use `--radius-lg`, chips use
  `--radius-sm`.
- **Shadow** — `--shadow-ambient` only. No hard drop shadows.
- **Motion** — durations and easings from `src/lib/motion.ts`. Reduced-motion
  users get instant transitions.

## 4. Motion Primitives

Defined in `src/lib/motion.ts`:

- `motion.duration.instant` — 0ms (reduced motion default).
- `motion.duration.quick` — 140ms (chips, buttons, hovers).
- `motion.duration.base` — 240ms (cards, sheets, transitions).
- `motion.duration.slow` — 380ms (page-level, celebration).
- `motion.easing.standard` — `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- `motion.easing.entrance` — `cubic-bezier(0, 0, 0.2, 1)`.
- `motion.easing.exit` — `cubic-bezier(0.4, 0, 1, 1)`.

Every animated component must call `motion.prefersReducedMotion()` and
degrade gracefully.

## 5. Empty State Pattern

Every list, feed, and inbox uses the shared `<EmptyState />` component
(`src/components/ui/empty-state.tsx`). An empty state is not a failure — it is
an invitation. It always includes:

1. A calm illustration or icon (never an error glyph).
2. A one-line title in Fraunces that names the situation plainly.
3. A one-sentence body in Inter that explains what to do next.
4. Exactly one primary action, or none.

## 6. Roadmap

| Phase | Scope |
|-------|-------|
| 1     | Shared design tokens, motion primitives, `EmptyState`, this doc. |
| 2     | Intent authoring — the verb-first composer. |
| 3     | Discovery feed — intent cards, category chips, filters. |
| 4     | Request-to-connect — respectful, revocable, rate-limited. |
| 5     | Ephemeral chat — bounded to the intent, expires on close. |
| 6     | Safety and reporting — block, report, mute, appeal. |
| 7     | Profile and settings — public identity, private preferences. |
| 8     | Celebration and polish — fulfilment moments, micro-animations. |

## 7. How to use this document

- Every PR description references the principle or decision it upholds.
- New components ship with a note in this document if they establish a
  pattern.
- If you find yourself violating a principle to ship a feature, stop and
  propose an update to this document instead.
