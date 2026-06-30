## Intent Lifecycle & Fulfillment System (MVP) — Final Approved

### 1. Database migration

**`intents` — add columns:**
- `expires_at timestamptz NOT NULL` (default `now() + 24h`)
- `status text NOT NULL DEFAULT 'active'` — `active | fulfilled | closed | expired`
- `fulfilled_at timestamptz NULL`
- `fulfilled_note text NULL`
- `closure_reason_code text NULL` — one of: `found_elsewhere | no_longer_needed | not_enough_responses | wrong_timing | other` (CHECK constraint)
- `closure_reason_note text NULL` — optional free-text, used especially when code = `other`
- Index `(status, expires_at)`.
- Backfill legacy `status='open'` → `'active'`; `expires_at = created_at + 24h` for existing rows.

**New `intent_fulfillments`:** `intent_id`, `user_id`, `created_at`; unique `(intent_id, user_id)`. RLS: creator inserts/deletes; creator + credited user can SELECT.

**Hourly pg_cron (SQL only):**
```sql
UPDATE intents SET status='expired' WHERE status='active' AND expires_at < now();
-- + one-shot notification per expired intent
```

### 2. Discovery filter

Home / Explore / Search / Recommendations queries get `.eq('status','active').gt('expires_at', now)`. Chats / participants / connections never filtered.

### 3. Create intent

**Visible for** chips above submit: `24h (default) · 3d · 7d · 30d · Custom` (90-day cap). Writes `expires_at`.

### 4. Intent detail page

**Everyone:** countdown pill (`5d left` → amber `23h left` → grey `Expired`). Non-creators see soft "no longer active" state when expired.

**Creator only:**

- **Mark as fulfilled** → dialog:
  1. *Has your intent been fulfilled?* → **Yes, I found what I needed** / **No, just closing it**
  2. **If Yes** → optional helper multi-select + optional note. Writes `status='fulfilled'`, `fulfilled_at`, `fulfilled_note`, helpers → `intent_fulfillments`.
  3. **If No** → optional closure feedback (skippable). Preset chips map to `closure_reason_code`:
       - Found it elsewhere → `found_elsewhere`
       - No longer needed → `no_longer_needed`
       - Not enough responses → `not_enough_responses`
       - Wrong timing → `wrong_timing`
       - Other → `other` (reveals a free-text input → `closure_reason_note`)
     Writes `status='closed'` plus `closure_reason_code` / `closure_reason_note` when provided.

- **Reactivate Intent** (only when `status='expired'`) → sheet:
  1. Pick new visibility: `24h · 3d · 7d · 30d · Custom` (90-day cap)
  2. **Reactivate now** (sets `expires_at = now + chosen`, `status='active'`) **or** **Edit & reactivate** (prefilled form; saves edits + new `expires_at` + `status='active'` in one update).

`fulfilled` and `closed` are terminal.

### 5. Expiry prompt

Cron inserts one notification per newly expired intent: *"Did '…' work out?"* → opens the same fulfillment dialog (Yes path or No path with optional closure reason). No repeat reminders.

### 6. My Intents (inside Profile)

`profile.me.tsx` gets a tabbed section: **Active · Fulfilled · Closed · Expired**. Creator's own intents per status, recency-sorted. Cards always tappable.

### 7. Card pill

`intent-card.tsx` adds one small chip — countdown when active, status badge otherwise.

### 8. Profile (public)

No public fulfillment stats in MVP. Closure reasons stay private to the creator; structured codes enable future category-level insights with no schema change.

### Implementation order
1. Migration (columns incl. `closure_reason_code` + `closure_reason_note` with CHECK, table, RLS, backfill, indexes)
2. Hourly cron + expiry notification
3. Create flow Visible-for chips
4. Discovery query filters
5. Card countdown pill
6. Detail page: countdown, Mark-as-fulfilled dialog (Yes + No-with-coded-closure paths), Reactivate sheet (Reactivate now / Edit & reactivate)
7. Profile → My Intents tabs
8. Smoke-test full lifecycle

Ready to build.