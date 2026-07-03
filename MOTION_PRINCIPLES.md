# Intent — Motion Principles

Not code. Rules. Read this before adding any animation, celebration, or
personality copy to the app.

## The one-sentence identity

**"Not playful because of cartoons. Playful because the network feels alive."**

Intent is where people meet for real things — a flatmate, a co-founder, a
mentor, a trek. The app can have personality, but it can never undercut the
seriousness of what people are actually doing here. Think "a friend who
makes meeting people feel exciting," not "a clown making jokes every screen."

## Rules

1. **Motion communicates meaning, never decorates.** If an animation doesn't
   correspond to a real action someone took or something real that happened,
   don't add it.
2. **Every animation must reinforce a real-world action.** A ripple means a
   new intent went out into the world. A heartbeat means someone showed
   interest. Don't animate things that didn't happen.
3. **The network is always alive, never frantic.** Ambient motion (ripples,
   pulses, breathing) should feel like background life continuing, not like
   something demanding attention.
4. **Fast interactions: under 250ms.** Anything that responds to a tap
   (buttons, toggles, confirmations) must feel instant. Slow, showy motion
   on a direct interaction reads as lag, not delight.
5. **Ambient loops: 6–10 seconds.** Background/idle motion (breathing nodes,
   pulsing connections) should be slow enough to be subconscious, not
   something a user consciously watches.
6. **One celebration at a time.** Never stack multiple hero moments (confetti
   + sound + shake) — pick one. Restraint is what makes the rare ones land.
7. **Respect reduced-motion preferences.** Every animation must have a
   reduced/no-motion fallback via `prefers-reduced-motion`. No exceptions.
8. **No animation should block user interaction.** Never make someone wait
   for an animation to finish before they can tap the next thing.
9. **Funny/surprise copy is rare by design — roughly 10% of the time**, not
   constant. If a line shows every single time, it stops being a surprise
   and starts being noise. See `src/lib/personality.ts` for the
   probability-gated helpers (`maybeJoinReaction`, etc.).
10. **Randomized copy must feel human, not random for its own sake.** Every
    variant in a rotation should sound like it was written by the same
    person in the same mood — warm, a little wry, never sarcastic at the
    user's expense.

## The test for anything new

Before adding a new animation or line of personality copy, ask:

> Does this follow the Motion Principles above? Specifically — does it mean
> something real, is it the right speed for its category (interaction vs.
> ambient), and if it's copy, is it rare enough to still be a surprise?

If the honest answer is no, don't ship it as-is.

## Build phases (current status)

- **Phase 1 — Personality copy.** No dependency, current stack only. Status:
  in progress. See `src/lib/personality.ts`.
- **Phase 2 — Meaningful moment animations** (new intent ripple, interest
  heartbeat, connection line growing). Current stack (CSS) until it becomes
  genuinely cumbersome.
- **Phase 3 — Ambient "breathing" network** (nodes pulsing, connections
  gently animating in the background). The biggest differentiator; the most
  work. Build once Phase 1–2 prove out the current stack, or once CSS
  genuinely can't carry it.
- **Phase 4 — Hero moments** (intent posted flies into feed, acceptance
  celebration). Rare by design — these are memorable specifically because
  they don't happen often.

**On Framer Motion:** not added yet, deliberately. The rule is: add it only
once we've hit real friction (awkward keyframe chains, fighting timers/state)
building Phase 1–2 on the current stack — not preemptively. Design language
drives the technology, not the other way around.
