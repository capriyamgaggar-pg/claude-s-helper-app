## Plan: make `/auth` quiet, open, and minimal

### Current problem
The auth page currently shows a 5-line vertical category list (Flatmates, Co-founders, Travel buddies, Treks, Communities) under the headline. This:
- Consumes a large share of the page above the fold
- Frames Intent as only those five use cases
- Competes with the form card and ambient background for attention

### Goal
Replace the restrictive list with a single open-ended tagline, tighten the layout, and let the rotating background examples communicate breadth instead.

### What will change

1. **Remove the category list** from `src/routes/auth.tsx` (lines 107–113).
   - Replace it with one concise, open tagline under the headline.
   - Proposed copy: **"Anyone. Any goal. Anywhere."**
   - Alternative if you want it warmer: **"Post what you need. Someone nearby wants the same."**

2. **Tighten the hero copy block**.
   - Keep headline: **"Find your people."**
   - Drop the separate "Real people. Shared goals." line to avoid redundancy with the tagline and the wordmark's "A network for shared real-world goals".
   - Reduce top margins so the form card sits higher and the page feels more contained.

3. **Broaden the background example set** in `src/components/brand/examples.ts`.
   - Keep concrete, relatable examples: `Looking for Flatmate`, `Looking for Co-founder`, `Weekend Trek`.
   - Add open/community examples: `Photography Walk`, `Volunteer Together`, `Learn Spanish`, `Startup Meetup`, `Chess Partner`, `Sunday Cycling`.
   - The animation engine stays data-driven; no change to `AmbientNetwork.tsx`.

4. **Update metadata** in `src/routes/auth.tsx`.
   - Remove the literal list from the meta description so it doesn't echo the restrictive categories.
   - Proposed description: **"A network for shared real-world goals. Post what you need and find people nearby who want the same."**

5. **Keep the visual system intact**.
   - No new colors, fonts, or dependencies.
   - Reuse the existing `Wordmark`, `AmbientNetwork`, and form card styling.
   - Preserve the `prefers-reduced-motion` behavior.

### Verification
- `/auth` renders at 320 / 375 / 636 / 1280 widths without the category list.
- The form card is visible without scrolling on common desktop heights.
- Background examples cycle through the new mixed set.
- Build passes and no hydration errors appear.

### Out of scope
- Redesigning the form card, wordmark, or ambient animation.
- Changing fonts, colors, or the overall warm-minimal theme.
- Altering auth logic or OAuth behavior.

