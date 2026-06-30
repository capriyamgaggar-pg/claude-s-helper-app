# Mutual-Consent Participation Lifecycle (MVP)

Three independent concepts: **Intent**, **Connection** (person-to-person, persists beyond the intent), **Participation** (per-intent progress). Nothing auto-advances; every transition needs explicit action.

**Interested is not a private bookmark.** Creator sees the full list of interested users (photo, name, profession, city), not a count. Each interested user may attach an **optional short note (≤ 250 characters)** that only the creator sees in the Interested list — enough context to decide whom to connect with, without turning Interested into a heavy commitment.

## User journey

```
Discover → Interested (+ optional note) → Request to Connect → Chat → Confirm Participation → Joined
```

| Stage | Meaning | Action | Effect |
|---|---|---|---|
| Interested | Public signal to creator | Tap Interested; optional ≤250-char note | Saved in user's Interested tab; creator sees user + note in Interested list; no chat; not a participant |
| Request to Connect | Either side asks to talk | Tap Request to Connect | Other side gets Accept / Decline |
| Chat | Conversation opens after Accept | Other taps Accept | Private chat created; both become Connections (persistent) |
| Confirm Participation | Either side proposes inside the chat | Tap Confirm Participation | Other must Accept; skipped when intent is Open Join |
| Joined | Confirmed by both sides | Other taps Accept | Participant count ↑, appears on intent and in Joined tab |

Default join mode = **Mutual Confirmation**. Creator can pick **Open Join** per intent (connected users join in one tap).

## Profile (`/profile/me`)

Four tabs:
1. **My Intents** — existing dashboard (Active / Fulfilled / Closed / Expired).
2. **Interested** — intents I bookmarked. Each card: Request to Connect, Remove Interest.
3. **Joined** — confirmed participations, grouped Upcoming / Past.
4. **Connections** — mutual connections. Row shows photo, name, profession, city, "Connected through: {Category} • {City}", with Open Chat / View Profile.

## Intent detail

Stage-aware primary CTA:
Show Interest → Request to Connect → Connection Pending → Open Chat → Confirm Participation → Joined ✓

Tapping **Show Interest** opens a small sheet with an optional textarea (max 250 chars, counter shown).

Creator view: new **Interested** section listing each interested user with avatar, name, profession, city, the optional note (truncated, tap to expand), "Interested 2h ago", and a **Send Connect Request** button. Creator never sees the note for users who didn't write one.

## Chat (intent-linked threads)

Sticky **Participation card** at the top:
- Status: Not Joined / Awaiting Confirmation / Confirmation pending — your turn / Joined
- Actions: Confirm Participation (or Join now in Open Join), Accept, Decline
- On Accept: insert system message, participant count updates.

## Database (already applied)

- `participant_state` enum gains `left`. Existing values reused: `interested`, `joining` (= confirm pending), `confirmed` (= joined), `declined`.
- `intent_participants` adds `interest_message text` (CHECK ≤ 250 chars), `interest_at`, `confirm_initiated_by`, `confirm_initiated_at`, `joined_at`, `left_at`.
- `intents` adds `join_mode text` default `mutual_confirm` (`mutual_confirm | open_join`).
- `connections` adds `origin_category`, `origin_city` (existing `intent_id` reused).
- Existing RLS already lets the intent creator SELECT the interested list and lets each user manage their own row; no policy changes needed for MVP.

## Code changes

- `src/lib/participation.ts` — stage machine + label/CTA mapping + canonical pair key for connections.
- `src/components/intent/participation-button.tsx` — stage-aware CTA, owns the Show Interest dialog with the 250-char note.
- `src/components/intent/interested-list.tsx` — creator-only list with note display and Send Connect Request.
- `src/components/chat/participation-card.tsx` — sticky chat header card; Confirm / Accept / Decline transitions.
- `src/routes/_authenticated/intents.$intentId.tsx` — replace the three buttons with `ParticipationButton`; mount `InterestedList` for creator; include `join_mode`, `interest_message`, `interest_at`, `confirm_initiated_by` in the existing query; fetch the user's connection with the creator.
- `src/routes/_authenticated/inbox.$threadId.tsx` — mount `ParticipationCard` when the thread has an `intent_id`.
- `src/routes/_authenticated/intents.new.tsx` — add **Join Mode** toggle (Mutual Confirmation default / Open Join) and pass `join_mode` on insert.
- `src/routes/_authenticated/profile.me.tsx` — restructure into four sections: My Intents (existing), Interested, Joined (grouped Upcoming/Past), Connections (with "Connected through:" subtitle from `origin_category`/`origin_city`).

## Out of scope this round

- Public "X people interested" count for non-creator viewers (interest stays creator-visible).
- Bulk-confirm multiple users at once.
- Reputation / ratings based on confirm history.

> Database migration already approved and applied. Approving this plan moves the project into build mode so the UI changes above can be written.
