# Empty Feed → "Start something" (final)

Intent's second brand moment. `/auth` says *people with shared goals exist*. This screen says *your intent reveals those people*. The network doesn't get created and nothing travels — the right people were already there; the intent just makes them visible.

## New file

**`src/components/feed/EmptyFeed.tsx`** — self-contained hero.

## Reused brand primitives

`AmbientNetwork`, `IntentExampleCard`, `ConnectionLine`, `PersonAvatar` (or a small silhouette component if `PersonAvatar` doesn't support glyph mode — see §avatars), `examples.ts`. No new deps. Pure CSS transitions + one `useEffect` timer.

## Layout

```text
┌────────────────────────────────────────┐
│  <AmbientNetwork /> (opacity 0.08–0.12)│
│                                         │
│      •─────•        •                   │
│         [ IntentExampleCard ]           │
│              (🏔 shimmers once)         │
│              (card breathes slowly)     │
│                                         │
│      ◐           ╭─────╮ ◒              │
│                     Connected           │
│                                         │
│   Start something.                      │
│                                         │
│   One intent can lead to                │
│      your next flatmate.                │
│      your next co-founder.              │
│      your next mentor.                  │
│      your next community.               │
│                                         │
│         [ Post an Intent ]              │
│         Explore Anywhere (if filtered)  │
│                                         │
│   Start with…                           │
│   [ Weekend Trek ] [ Coffee & Work ]    │
│   [ Study Together ] [ Photo Walk ]     │
└────────────────────────────────────────┘
```

Animated cluster is the visual focus on mobile and desktop.

## The story — the network reveals itself

One ~13s loop, driven by a single `useEffect` timer advancing `stage` + `exampleIndex`. Pure CSS.

**Pre-frame (always visible):** ~6–8 sleeping nodes at fixed positions, already **faintly connected to each other** by hairline segments at ~0.05 opacity. The network exists before the intent does.

**Card breathing (always on, subliminal):** `translateY(-1px) → translateY(0)` over ~7–8s, looping. Almost imperceptible. Not glow, not scale — just presence.

1. **Card arrives.** `IntentExampleCard` fades in with the current example.
2. **Emoji shimmer.** A soft highlight sweeps across just the leading emoji, once, ~600ms. Not the title, not the card.
3. **Ripple (physical, off-center).** Ripple origin is offset by 3–6px from center — different each loop. Ring expands, opacity decreases, stroke thins, ring stretches ~2% vertically. Behaves like water, not a circle.
4. **Reveal.** Nodes the ripple passes brighten from 0.05 → full and gently pulse. The faint segments between them brighten with them. Nothing moves.
5. **Emergence in place.** `avatarCount` of the awakened nodes transform *at their existing position* through: `dot → outline circle → silhouette`, ~300ms per step, staggered. Nothing travels. The person reveals themselves where they always were.
6. **Curved line settles.** Only *after* a silhouette resolves does its `ConnectionLine` fade in with 2–3px of subtle curvature. `avatarCount === 1` → one line. `2` → two on opposite sides. Non-resolving awakened nodes stay bright but unlinked.
7. **Quiet confirmation.** The card's subtitle/status area replaces its current line with a small, quiet, green **"Connected"** label for ~1.2s. No overlay, no separate tag, no numeric metric.
8. **Hold.** Fully composed state holds ~700ms — the moment registers.
9. **Morph, don't dissolve.** Only the card's *content* crossfades to the next example: emoji, title, subtitle. The card frame, the awakened network, the silhouettes, and lines remain in place through the crossfade, then gently ease back to sleep (nodes to 0.05, segments back to hairline, silhouettes fade to dots) as the new emoji shimmer begins. The network keeps living — the animation is not a slideshow.

Explicit no-ops: no "Searching…", no "Match found", no numeric badge, no straight lines, no traveling avatars, no card-wide glow, no random initials, no full dissolve between loops.

**`prefers-reduced-motion`:** render the final composed state statically — card, resolved silhouettes per `avatarCount`, curved lines, quiet "Connected" label, awakened network. No timers, no shimmer, no ripple, no breathing.

## Silhouettes, not initials

Arriving people are abstract silhouettes drawn from a small glyph set — `○ ◐ ◒ ◓ ◑` or an equivalent simple head-and-shoulder SVG — not letter avatars. If `PersonAvatar` already supports a glyph/silhouette mode, use it; otherwise render a tiny local `<Silhouette variant=… />` inside `EmptyFeed`. No random initials, no fake user identity.

## Data-driven example shape

Extend `src/components/brand/examples.ts`:

```ts
type IntentExample = {
  emoji: string;
  title: string;
  subtitle?: string;
  avatarCount: 1 | 2;
};
```

Seed:

- 🏔 Weekend Trek — 2
- 🏠 Looking for Flatmate — 1
- 🚀 Looking for Co-founder — 1
- 🎓 Looking for Mentor — 1
- 📷 Photography Walk — 2
- 🚴 Weekend Cycling — 2
- 🎲 Board Games — 2
- ☕ Coffee & Work — 1
- 📚 Study Together — 2
- ✈ Weekend Trip — 2

## Copy (fixed)

- Headline: **"Start something."**
- Body:
  ```
  One intent can lead to
    your next flatmate.
    your next co-founder.
    your next mentor.
    your next community.
  ```
  Stacked, indented, no bullets — rhythm from the repeated "your next".
- Primary CTA: **"Post an Intent"** → `Link to="/intents/new"`
- Secondary (only when `label !== "Anywhere"`): **"Explore Anywhere"** → existing `onReset`
- Suggestions section label: **"Start with…"**
- In-animation label (on the card, ~1.2s): **"Connected"** — small, quiet green.

Never used anywhere in the illustration: "Match found", "You're not doing it alone anymore", "Searching…", "Nothing has started", numeric counts.

## CTA hover

Button itself doesn't animate. On hover, the button subtly signals through the existing button token treatment only — no new card interaction (the card's slow breathing is already its life; a second ripple on hover would compete with it).

## "Start with…" chips

`EmptyFeed` receives `interests: string[]` (already fetched in `home.tsx` around line 151). Local `getSuggestionsForInterests(interests)` returns up to 4 chips via a static map:

- **Trekking** → 🌄 Weekend Trek · 🏕 Camping · 🥾 Morning Hike
- **Travel** → ✈ Weekend Trip · 🚗 Road Trip · 🌅 Sunrise Drive
- **Startups** → 🚀 Looking for Co-founder · ☕ Founder Meetup · 💡 Startup Brainstorm
- **Sports** → ⚽ Football · 🏃 Evening Run · 🏸 Badminton
- **Photography** → 📷 Photo Walk · 🌇 Sunset Shoot · 🌿 Nature Photography
- **Fallback** → ☕ Coffee & Work · 📚 Study Together · 🎲 Board Games · 🚴 Weekend Ride

Each chip → `/intents/new?title=<label>`.

## Small addition — `intents.new.tsx`

Add optional `title` search-param via `Route.useSearch()` (validated to `{ title?: string }`). If present, seed the existing `title` state on mount. Purely additive.

## Wire-in — `home.tsx`

Replace the inline `EmptyState` usage (~line 225) with `<EmptyFeed label={label} interests={viewerInterests} onReset={() => setPlace(null)} />` and delete the old `EmptyState`. Pass `interests` from the viewer profile already loaded above.

## Visual language

Continues `/auth`: warm background tokens, editorial typography (`display` for headline), glass surface via existing tokens, thin 1px connectors, soft shadow, generous whitespace. No new colors — the "Connected" green reuses an existing success token. No illustrations, no stock assets.

## Scope guardrails

- Files touched: `src/components/feed/EmptyFeed.tsx` (new), `src/components/brand/examples.ts` (extend type + data), `src/routes/_authenticated/home.tsx`, `src/routes/_authenticated/intents.new.tsx`
- Optional minor addition to `PersonAvatar` for silhouette mode, only if needed
- No backend, routing, schema, or dependency changes
- No changes to other empty states (Received/Sent/Chats)

## Success check

On `/home` with an empty feed: faint pre-connected sleeping network + slowly-breathing card → card fades in → emoji shimmers once → off-center water-like ripple wakes surrounding nodes and their segments → `avatarCount` nodes transform *in place* into silhouettes (dot → outline → silhouette) → 1 or 2 curved lines settle in → quiet green "Connected" appears on the card → hold → card content crossfades to the next example while the network stays alive → loop. Chips prefill the composer via `?title=`. "Explore Anywhere" appears only when filtered. Reduced-motion users see the completed state statically.
