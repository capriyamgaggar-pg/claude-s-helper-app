## Scope

Home's animated EmptyFeed is complete and remains unchanged. This update ships the final two empty-state copy revisions.

---

## 1. Profile → My Intents

**File:** `src/routes/_authenticated/profile.me.tsx`

Replace the current empty state with:

- Headline: **You haven't posted your first intent yet.**
- Body: *Every connection starts with one intent. Create yours and let the right people find you.*
- CTA: **Create your first Intent** → `/intents/new`

Only show this when the selected **My Intents** tab (Active / Expired / Closed / Fulfilled) has no items. No animation.

---

## 2. Explore

**File:** `src/routes/_authenticated/explore.tsx`

Replace the current empty state with:

- Headline: **Nothing matched your search.**
- Body: *Try another location or category. Or be the first to post here.*
- CTA: **Post an Intent** → `/intents/new`

No animation.

---

## Out of scope

- Home EmptyFeed (already finalized)
- Interested / Joined / Connections empty states
- Routing, backend, business logic, or data changes

## Technical

- Inline implementations in existing files (no new components).
- Use existing `Button` + TanStack Router `Link` to `/intents/new`.
- Reuse existing surface, dashed border, spacing, and typography tokens.

## Success criteria

- Home → Inspire the user (animated brand moment)
- My Intents → Encourage the first post
- Explore → Help the user recover from an empty search
