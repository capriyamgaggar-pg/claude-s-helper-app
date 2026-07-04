# Phase 9 — Landing (/auth) warmth pass

The Phases 1–8 changes all live behind sign-in, so the current `/auth` page is the only surface a signed-out visitor sees — and it hasn't been touched. This phase brings the same editorial warmth, motion, and copy language to it. Frontend only, no route or backend changes.

## Scope (file: `src/routes/auth.tsx`)

1. **Real subhead** — replace the empty `<p>{"\n"}</p>` under the h1 with one warm sentence in the plan's voice, e.g. *"Post what you're up for. Meet the people already thinking the same."*

2. **Three-line value strip** — small editorial block above the sign-in card, one line per idea, no icons:
   - *"Intentions first, identity second."*
   - *"Anonymous when you want it. Human when it matters."*
   - *"Built for real-world meetings, not endless scrolling."*

3. **Warmer card surface** — swap the sign-in card to `bg-[color:var(--surface-warm)]` with a softer border (`border-border/60`) and the shared card shadow. Larger radius (`rounded-3xl`) to match the rest of the app after Phase 6.

4. **Motion primitives** — apply `motion.transition("background-color, border-color", "quick")` on the Google button and mode-toggle link. Respects reduced-motion via the existing helper.

5. **Head metadata upgrade** — add `og:title`, `og:description`, `og:type: "website"`, and `twitter:card` on the auth route so the shared link preview matches the rest of the site. Keep the existing title/description.

6. **Micro-copy pass** — tighten the mode toggle ("New here? Create an account" / "Have an account? Sign in") and the footer trust line to match `personality.ts` voice.

## Out of scope

- No changes to auth logic, redirects, providers, or the ambient-network background.
- No new routes or components.
- No changes to the demo auth panel.

## Not planned here — flag only

The session replay showed a Vite error overlay flash right after navigating to `/auth`. If you saw it too, share the exact message and I'll fix it in a follow-up — it's likely unrelated to the phase work.

## Ship test

- Does the /auth page now feel warmer and clearly on-brand? ✓
- Does a signed-out visitor understand what Intent is before signing in? ✓
- Zero changes to auth flow, redirects, or providers? ✓
