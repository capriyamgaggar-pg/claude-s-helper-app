# Intent Experience System v1 — First Implementation Pass

This is the first execution pass against the Intent Experience System. Zero changes to database, routing, queries, permissions, business logic, anonymous workflow, or navigation structure. All work stays in frontend components, styles, motion, and copy.

## Guiding principles

- **Real-world first.** Every feature should ultimately encourage meaningful offline interaction.
- **Intentions first, identity second.** Users discover opportunities before they discover people.
- **Anonymous is a feature, not a limitation.** Preserve curiosity without sacrificing trust.
- **Consumer, not enterprise.** Every screen should feel approachable, warm, enjoyable.
- **Editorial, not dashboard.** Larger headings, generous whitespace, clear focal points, calm typography.
- **Human > metrics.** Replace abstract numbers with people wherever possible.
- **Reduce friction.** Reduce decisions, reading, and unnecessary steps.
- **Meaningful motion.** Motion communicates state, reinforces hierarchy, or celebrates meaningful moments.
- **Don't invent UI.** No decorative elements purely to look modern.
- **Use existing data better.** Favor richer presentation of existing data over new UI/data requirements.
- **Avoid social media patterns.** Intent is real-world participation, not content consumption.
- **One primary action per screen.** Competing CTAs demote to secondary or ghost.
- **Thoughtful, not mechanical.** If a screen already serves its purpose, leave it alone.
- **Respect `prefers-reduced-motion`.** Every new motion must honor it.

## Card philosophy

Hierarchy: **Hero → Purpose → Creator → Trust → Metadata.** Purpose is the star.

Every card should answer, in order:

1. What is happening?
2. Why should I care?
3. Can I trust the creator?
4. What do I need to know?
5. What should I do next?

Use a hero band only where it meaningfully strengthens recognition. If the category does not benefit from illustration, prefer a cleaner editorial layout. Memorability, not decoration.

## Phase 1 — Shared design tokens + motion primitives

- Extend `src/styles.css` with category tint tokens + gradient recipes so all cards share one visual language.
- Add motion utilities under `@utility`: ambient breathing glow (for live intents), press compression, card lift. All wrapped in `prefers-reduced-motion` guards.
- No shimmer anywhere. Live intents get a subtle breathing glow / ambient pulse instead.
- Small shared `EmptyState` primitive with human copy.

## Phase 2 — Intent Card + Intent Detail

**Card (`src/components/intent-card.tsx`)**
- Apply the card hierarchy and 5-question test.
- Hero band only where it strengthens recognition.
- Use `cover_image` when present; otherwise deterministic category artwork or editorial variant.
- Replace flat counts with people where creator visibility allows. Anonymous intents keep count and preserve curiosity.
- Warmer shadow, larger radius, softer border.

**Detail (`src/routes/_authenticated/intents.$intentId.tsx`)**
- Same hierarchy: Hero → Purpose → Creator → Trust → Description → Participants → Action.
- Trust row surfaces existing signals only (verification, response time, completed experiences, mutual community). Missing signal → omit.
- Collapse action area to one primary CTA; secondaries become ghost or overflow.

## Phase 3 — Home + Explore

- Increase vertical rhythm between cards.
- Warmer section headers in `--font-display`.
- Human empty states ("Nothing nearby yet.").
- No feed density changes, no algorithmic reordering.

## Phase 4 — Profile

- **Keep the reputation card in the upper half of the profile.** Trust comes before experiences. Refine visual presentation, do not demote it.
- Editorial rework of the "About" block.
- Gentle ambient breathing on the avatar ring (reduced-motion aware). No gamified counters.

## Phase 5 — Communities

- Lead with people + upcoming shared intents, not the message archive.
- Members strip near the top.

## Phase 6 — Inbox

- Softer surfaces, more breathing room. No structural changes.

## Phase 7 — Copy + micro-interactions

- Scoped copy pass on toasts, empty states, status labels via `src/lib/personality.ts` + call sites.
- Human phrasing: "You're in.", "Be the first to join.", "Nobody nearby yet."

## Phase 8 — Celebration motion + final polish

Celebration reserved for genuinely meaningful firsts only:
- ✅ First Intent published
- ✅ First Acceptance
- ✅ First Connection
- ❌ Not community joined (not emotionally significant enough)
- ❌ Not routine actions

Gated by client-side `localStorage` flags. Final coherence sweep to remove anything mechanical or decorative.

## Explicitly out of scope

- No new tables, columns, RLS, migrations, server functions, or edge functions.
- No new routes, renames, or navigation changes.
- No new dependencies unless a tiny confetti helper is truly needed; if so, hand-rolled in CSS/SVG.
- No likes, followers, streaks, ratings, feeds-of-people, vanity metrics.
- No changes to auth, anonymous flow, connection state machine, or navigation structure.
- No shimmer on live content. No decorative floating shapes. No gradient-for-gradient's-sake.

## Technical notes

- Category visuals derived deterministically from `category_slug` — pure function.
- Avatar stacks respect `creator_visible` from `src/lib/creator-visibility.ts` — anonymous intents never leak identity.
- Trust signals read only fields already present in existing queries.
- Motion primitives as Tailwind v4 `@utility` classes in `src/styles.css`.

## Ship test

Before shipping any UI refinement, ask:

- Does this make discovering intentions easier?
- Does this increase trust?
- Does this reduce friction?
- Does this feel warmer and more human?
- Does this preserve anonymity where intended?
- Would this still make sense with one million users?

If the answer to any is "no", reconsider the change.

## Success criterion

Success is not measured by how long users stay in the app. Success is measured by how quickly and confidently users discover meaningful people, participate in real-world experiences, and choose to return because those relationships continue — not because the interface is addictive.
