## Goal

Ship v1 of Intent's visual identity on `/auth`. Timeless over trendy. Restrained over decorative. Every element earns its place by reinforcing one idea: **people with shared goals finding one another in the real world.** If motion doesn't tell that story, it doesn't ship.

## Design principles (locked)

1. **One story, one moment.** At any instant, at most one connection is forming. No parallel loops, no ambient sparkle competing for attention.
2. **Motion serves meaning.** The only choreographed motion on the page is: card → line → person. That is the product, drawn.
3. **Everything else is still.** Ambient nodes: static. Background: static warm wash, no drift. Wordmark dot: single slow pulse only.
4. **Editorial, not app-y.** Serif display, generous whitespace, hairline rules, muted palette. No gradients-of-the-year, no glassmorphism theatrics.
5. **Reusable primitives.** Everything built here is a component so onboarding, landing, splash, empty states, and marketing inherit the same language.

## Reusable brand primitives — `src/components/brand/`

- `examples.ts` — data source (single source of truth for example intents).
- `IntentExampleCard.tsx` — the example card. Presentational, one `IntentExample` in.
- `ConnectionLine.tsx` — the SVG stroke-dash connector. Standalone.
- `PersonAvatar.tsx` — circular initial on a tinted surface.
- `AmbientNetwork.tsx` — orchestrates the sequenced pairings. Props: `examples`, `variant: "full" | "compact"`.
- `Wordmark.tsx` — "Intent" + dot. Props: `size`, `tagline`.

```ts
// examples.ts
export type IntentExample = {
  emoji: string;
  title: string;      // location-neutral
  interested: number; // illustrative, rendered as secondary caption
  avatar: string;     // single initial
};

export const defaultIntentExamples: IntentExample[] = [
  { emoji: "🏔", title: "Weekend Trek",           interested: 23, avatar: "K" },
  { emoji: "🚀", title: "Looking for Co-founder", interested: 8,  avatar: "P" },
  { emoji: "🏠", title: "Looking for Flatmate",   interested: 12, avatar: "A" },
];
```

The animation engine iterates the array — no hardcoded titles, emojis, or counts. Swapping in Photography Walk / Chess Partner / Startup Meetup / Volunteer Drive later is a one-file edit.

## Ambient background — restrained

- **Warm wash:** two soft radial gradients baked into a static layer. No drift, no breathing, no parallax.
- **Ambient nodes:** ~8 small dots + 4 hairline connectors at opacity ~0.10. **Static.** They're the quiet suggestion of a network; they don't animate.
- **Staged pairings:** the only motion in the background. Positioned around the form on desktop, centered above the wordmark on mobile.

## The one meaningful animation — connection choreography

Single shared timeline, `examples.length × 8s` (default 24s). Per pairing:

| ms | event |
| --- | --- |
| 0 → 500 | Card fades in (opacity 0 → 1, no translate). |
| 500 → 1400 | Line draws (stroke-dashoffset 120 → 0). |
| 1400 → 1800 | Avatar appears (opacity 0 → 1, scale 0.96 → 1). |
| 1800 → 7000 | Hold. |
| 7000 → 8000 | Whole pairing fades to 0. Next begins. |

Ease: `cubic-bezier(0.22, 0.61, 0.36, 1)` throughout — calm, not springy. No bounces, no overshoots, no shimmer, no glow trails, no particles.

`prefers-reduced-motion`: no keyframes. Render the first pairing in its final connected state; leave others hidden. The story still reads.

## Responsive — pairings on every device

- **≥640px (`full`):** three pairings anchored top-left, mid-right, bottom-left of the viewport around the form.
- **<640px (`compact`):** one pairing at a time in a dedicated `h-24` slot centered above the wordmark. Slightly smaller card (12.5px title, 9.5px caption), 56px line. Same choreography cycles through the same array — mobile users see all three pairings across the loop.

Route reads `useIsMobile` and passes `variant`.

## Wordmark

`<Wordmark size="lg" tagline="A network for shared real-world goals" />`

- "Intent" — Fraunces 500, 44px, tracking `-0.02em`.
- Filled 8px dot after the "t".
- **Single slow pulse** every 6s: opacity `0.7 → 1 → 0.7`, no scale. Reduced-motion disables.
- Below: `h-px w-8 bg-foreground/20` rule + 10px uppercase tracked tagline.

## Copy (final)

| Slot | Copy |
| --- | --- |
| Wordmark tagline | `A network for shared real-world goals` |
| Headline (Fraunces, 44px) | `Find your people.` |
| Sub-list (Inter, 15px, muted, one per line) | `Flatmates.` / `Co-founders.` / `Travel buddies.` / `Treks.` / `Communities.` |
| Supporting line | `Real people. Shared goals.` |
| Google button | `Continue with Google` |
| Divider | `or use email` |
| Submit — signin | `Sign in` |
| Submit — signup | `Create account` |
| Toggle — signin view | `First time? Create your account` |
| Toggle — signup view | `Already have an account? Sign in` |
| Whisper | `Your next connection could change everything.` |
| Legal | `By continuing you agree to our Terms and Privacy.` |

## Form card — quiet, not glassy

- `bg-surface border border-foreground/8 rounded-2xl p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_20px_60px_-30px_rgba(20,20,40,0.10)]`.
- **No backdrop-blur.** Solid surface reads more premium and remains legible over any background.
- Google button `h-11` outline. No hover-lift — hover state is a subtle background shift only.
- Inputs: `focus-visible:ring-1 focus-visible:ring-ring`. No animated glow.
- Container `max-w-[440px]`, `pt-14`.

## Meta

- title: `Intent — find your people`
- description: `A network for shared real-world goals. Flatmates, co-founders, travel buddies, treks, communities.`

## Files

- **New** `src/components/brand/examples.ts`
- **New** `src/components/brand/IntentExampleCard.tsx`
- **New** `src/components/brand/ConnectionLine.tsx`
- **New** `src/components/brand/PersonAvatar.tsx`
- **New** `src/components/brand/AmbientNetwork.tsx`
- **New** `src/components/brand/Wordmark.tsx`
- **Edit** `src/routes/auth.tsx` — restructure JSX, mount brand primitives, update head, new copy.

No new dependencies, no token changes, no backend, no other routes touched.

## Explicitly cut (in service of restraint)

- Background drift / parallax on the node field.
- "Breathing" opacity on the ambient connectors.
- Card hover-lifts, ring glows, gradient shimmers.
- `backdrop-blur` on the form card.
- Double-beat heartbeat on the dot (replaced with a single slow pulse).
- Any live-stats implication on the "N interested" caption — it stays 10px, uppercase-tracked, `foreground/40`, unmistakably illustrative.

## Out of scope

- Applying primitives to onboarding / landing / empty states — deferred; primitives are ready when we get there.
- Auth logic, OAuth, sessions.
- New fonts or color tokens.

## Verification

- `/auth` at 320 / 375 / 636 / 1280 — layout holds, one pairing at a time, all three cycle on every device.
- Flatmate card reads `Looking for Flatmate` (no city). "N interested" is visually secondary.
- Supporting line is `Real people. Shared goals.`
- `prefers-reduced-motion` freezes into the first pairing's connected state.
- Editing `defaultIntentExamples` requires no changes to `AmbientNetwork.tsx`.
- Build passes.
