## Scope

Only `src/routes/_authenticated/profile.me.tsx` needs changes.

The Explore empty state is already finalized.

The Home EmptyFeed is finalized and must not be touched.

---

## Change: Profile → My Intents empty state

Replace the current empty-state block with logic based on whether the user has ever created an intent, not just whether the current filter is empty.

## Logic

```ts
const hasEverCreatedIntent =
  (stats?.intentsCreated ?? (mine?.length ?? 0)) > 0;

if (!hasEverCreatedIntent) {
  // Variant A
} else if (mineFiltered.length === 0) {
  // Variant B
} else {
  // Render intent cards
}
```

This uses the lifetime count when available, falls back to the loaded list if stats isn't loaded, and avoids future bugs if the stats query changes.

---

## Variant A — First-time user

Only render when the user has never created an intent.

### Headline

Your first intent starts here.

### Body

Every connection starts with one intent.

Create yours and let the right people find you.

### CTA

Create your first intent

Links to:

```
/intents/new
```

---

## Variant B — Empty filter

Render when the user has created intents, but the current sub-tab is empty.

Use a lookup object:

```ts
const EMPTY_COPY = {
  active: {
    title: "No active intents.",
    body: "Your active intents will appear here.",
  },
  fulfilled: {
    title: "No fulfilled intents yet.",
    body: "Completed intents will appear here.",
  },
  closed: {
    title: "No closed intents yet.",
    body: "Closed intents will appear here.",
  },
  expired: {
    title: "No expired intents.",
    body: "Expired intents will appear here.",
  },
} as const;

const copy = EMPTY_COPY[mineSub];
```

Display:

- Headline → `copy.title`
- Body → `copy.body`

No CTA.

---

## Styling

Reuse the existing:

- dashed border
- surface background
- spacing
- typography
- Button component

No new components.

No design-token changes.

---

## Out of scope

- Home EmptyFeed
- Explore
- Interested tab
- Joined tab
- Connections tab
- Backend
- Routing
- Database
- Business logic beyond this empty-state condition

---

## Success criteria

- Users who have never created an intent see an encouraging first-time experience with a CTA.
- Users who already have intents never see "Create your first intent."
- Empty filters display contextual messages.
- Existing users are never told they've never posted.
- Visual styling remains consistent with the rest of Intent.