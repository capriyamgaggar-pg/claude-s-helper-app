# Creator Visibility & Reputation Infrastructure (MVP) — v5 (approved)

Two coordinated features: per-intent **Creator Visibility** (show / anonymous) and **Reputation infrastructure** — raw stats + event log. Badge/level rules are intentionally deferred until real usage data exists.

---

## 1. Creator Visibility

### Data
Add to `intents`:
- `creator_visibility` text — `'public'` (default) | `'anonymous'`
- `visibility_locked_at` timestamptz — stamped on the **first participant interaction of any kind**.

### Lock trigger (any interaction)
Set `visibility_locked_at = now()` on the parent intent (if null) from triggers on:
- `intent_participants` insert (any state, including `interested`)
- `journey_form_submissions` insert (registration started)
- `connections` insert referencing this intent

Server fn updating visibility rejects when `visibility_locked_at IS NOT NULL`; UI disables the radio with a helper line.

### Redaction helper
`public.can_see_creator(_intent_id uuid, _viewer uuid) returns boolean` — true when the intent is `public`, viewer is the creator, viewer has `connected`/`confirmed` participation on this intent, or viewer + creator have an accepted connection.

App read layer maps the creator to a redacted DTO when false:
`{ display_name: 'Anonymous Creator', photo_url: null, profession: null }`.

Used in intent detail, cards, submissions list, chat headers, and SSR `head()` og:tags/preview.

### UI
- `intents.new.tsx` and `intents.$intentId.edit.tsx` (Advanced): **Creator Visibility** radio — *Show my profile* / *Anonymous*.
- `intent-card.tsx`: `Created by {name}` / `Organized by {name}`. Redacted → `Anonymous Creator`, neutral avatar.
- Auto-reveal on connection accept — helper flips true, identity appears for that participant.

---

## 2. Reputation Infrastructure (data only, no derivation yet)

### 2a. `user_reputation_stats` (one row per user, trigger-maintained)

Counters:
- `intents_created`, `intents_fulfilled`, `intents_closed`, `intents_expired`
- `total_interested_received`, `total_connections`, `total_joined_participants`
- `repeat_participants`, `repeat_connections`, `returning_members`
- `response_count`, `response_total_seconds`
- `organizer_intents_total`, `organizer_intents_completed`
- `fulfilled_by_category` (jsonb)
- `updated_at`

Grants: `SELECT` to `authenticated` and `anon`; writes `service_role` only. RLS on, public read policy. Triggers idempotent, state-transition guarded.

### 2b. `reputation_events` (append-only log)
- `id`, `user_id`, `event_type`, `intent_id` (nullable), `metadata` jsonb, `created_at`
- `event_type` values: `intent_created`, `intent_fulfilled`, `intent_closed`, `intent_expired`, `participant_joined`, `repeat_participant`, `connection_created`, `community_member_returned`, `response_sent`

Written by the same triggers that update `user_reputation_stats`. Grants: `SELECT` to `authenticated` for own rows; writes `service_role` only. No UI in MVP.

### 2c. Derivation — intentionally deferred

> Reputation derivation is intentionally deferred. This milestone captures all raw metrics (`user_reputation_stats`) and event history (`reputation_events`) required to build a robust reputation system later. Badge rules, levels, and profile achievements will be designed after sufficient production usage data has been collected, ensuring the reputation system rewards real user behaviour rather than assumptions.

`src/lib/reputation.ts` ships as scaffolding only:
```ts
export type Badge = { slug: string; label: string; icon: string };
export function computeBadges(stats: UserReputationStats): Badge[] { return []; }
export function computeLevel(stats: UserReputationStats): number | null { return null; }
```

No badge rules. No scoring weights. No `Level N` in the UI.

### 2d. Profile Reputation section (what ships today)

```
Reputation
  Intents Created          42
  Successful Intents       31
  People Interested       612
  People Connected        284
  Returning Participants  127
  Avg. Response Time       2h
```

- Renamed *Successfully Fulfilled* → **Successful Intents** (clearer, shorter).
- Added **People Interested** (exposes existing `total_interested_received`) — gives organizers immediate feedback on whether their titles/descriptions attract attention, even before badges exist.
- **No Fulfillment %** — the definition of "fulfilled" varies too much across categories to be meaningful at this stage.
- Empty state: "Reputation builds as you create and fulfill intents."

Intent cards and creator cards show **no badge/level chip** in this milestone. When rules land later, `computeBadges`/`computeLevel` return real values and the same components light up — no schema change.

---

## Technical details

- **New files**: `src/lib/reputation.ts` (stub types + no-op functions), `src/components/reputation-panel.tsx`, `src/lib/creator-visibility.ts`.
- **Migrations**:
  1. Alter `intents` — add `creator_visibility`, `visibility_locked_at`; lock triggers across `intent_participants` / `journey_form_submissions` / `connections`.
  2. Create `user_reputation_stats`, `reputation_events`, `can_see_creator`, and counter/event triggers on `intents`, `intent_participants`, `connections`, `messages`, `community_member_history`.
- **Server fns** (`src/lib/reputation.functions.ts`): `getUserStats(userId)` → raw stats row.
- **RLS**: creator columns stay on `intents`; redaction handled at read layer via `can_see_creator`. Visibility updates go through a server fn that enforces the lock.
- **No `pg_cron`** — trigger-maintained.

---

## Out of scope (MVP)
- No badge rules, no level scoring, no chips on cards.
- No Fulfillment % on the profile.
- No "Verified" label, no manual verification, no admin overrides.
- No mid-journey manual reveal (auto-reveal on connection accept only).
- No timeline UI — `reputation_events` captured, not displayed.
- Nothing derived is ever persisted.
