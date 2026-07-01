# Feedback & Trust System (MVP) — v3 (frozen)

Post-intent feedback as a reusable **journey step**, serving two purposes: private **intent creator** improvement feedback and long-term **community trust** data. Anonymous to creators, identifiable internally for integrity.

Architecture uses **"intent creator"** as the generic term; UI may render "Organizer" for event-style categories.

---

## 1. Data model

### New table `intent_feedback`
- `id` uuid pk
- `intent_id` uuid → `intents.id` (cascade)
- `creator_id` uuid — denormalized intent creator (was "organizer_id")
- `participant_id` uuid — stored, never surfaced to creator
- `met_expectations` int 1–5 — **the universal signal** (required)
- `would_participate_again` enum `feedback_participate_again`: `definitely | probably | maybe | probably_not | never`
- `would_recommend` enum `feedback_recommend` (same 5 values) — collected, never displayed in MVP
- `answers` jsonb — dynamic per-question responses keyed by `question_key`, values `{ rating?: 1..5, text?: string }`
- `submitted_at` timestamptz default now()
- **Unique** `(intent_id, participant_id)`

### New table `intent_feedback_requests` (analytics + "still available" state)
- `id` uuid pk
- `intent_id` uuid
- `participant_id` uuid
- `feedback_requested_at` timestamptz default now() — when the prompt/notification fired
- `feedback_submitted_at` timestamptz nullable — set when the matching `intent_feedback` row lands
- **Unique** `(intent_id, participant_id)`

Rationale: keeping request/submit timestamps in a sibling table (instead of on `intent_feedback`) means the row exists even before submission — enabling "avg time to submit", completion rate, and reminder effectiveness without touching the feedback row itself.

### RLS
- `intent_feedback` INSERT: `auth.uid() = participant_id` AND participant `confirmed` in `intent_participants` AND intent `status IN ('fulfilled','closed','expired')`.
- `intent_feedback` SELECT own: `auth.uid() = participant_id`.
- `intent_feedback` SELECT creator: `auth.uid() = creator_id` — but the app never reads raw rows client-side; goes through anonymized server fns.
- `intent_feedback_requests` SELECT: own row (`auth.uid() = participant_id`) or creator (`auth.uid() = creator_id`, aggregated only via server fn).
- No public SELECT. No UPDATE / DELETE (immutable in MVP).

### Grants
```
GRANT SELECT, INSERT ON public.intent_feedback TO authenticated;
GRANT ALL ON public.intent_feedback TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.intent_feedback_requests TO authenticated;
GRANT ALL ON public.intent_feedback_requests TO service_role;
```

### `user_reputation_stats` extension (raw counters only)
- `feedback_received`
- `met_expectations_sum`, `met_expectations_count` (for future avg)
- `would_participate_again_definitely / probably / maybe / probably_not / never`
- `would_recommend_definitely / probably / maybe / probably_not / never`

### Triggers
- `on_feedback_insert`: bump counters on creator's stats row, add to `met_expectations_sum/count`, stamp `intent_feedback_requests.feedback_submitted_at = now()` (or insert the row if missing), append `reputation_events` (`feedback_received`, metadata excludes `participant_id`).
- `on_intent_completed`: when `intents.status` transitions to `fulfilled` / `closed` / `expired`, insert one `intent_feedback_requests` row per confirmed participant (idempotent, ON CONFLICT DO NOTHING), and enqueue a `notifications` row `feedback_requested` per participant.

---

## 2. Eligibility & lifecycle

**Feedback is permanently available** on completed intents — no time window. The initial notification is a prompt, not a gate.

Submittable when:
- Viewer's `intent_participants.state = 'confirmed'`.
- Intent `status IN ('fulfilled','closed','expired')`.
- No existing `intent_feedback` row for `(intent_id, viewer)`.

Enforced in DB (RLS + unique) and mirrored in `submitFeedback`.

---

## 3. Journey step: `feedback` (config-driven questions)

New reusable step type `feedback`. Default position: last step.

### Step config (`journey_step_config.config`)
```jsonc
{
  "questions": [
    { "key": "communication", "label": "Communication",  "type": "rating", "required": true },
    { "key": "accuracy",      "label": "Description Accuracy", "type": "rating" },
    { "key": "liked_most",    "label": "What did you like most?", "type": "text" },
    { "key": "improvements",  "label": "What could be improved?", "type": "text" },
    { "key": "comments",      "label": "Additional comments", "type": "text" }
  ]
}
```

**Platform-fixed questions** (not in `questions`, always shown, always stored):
1. **Did this intent meet your expectations?** → `met_expectations` (1–5) — **rendered first**.
2. **Overall experience** → stored in `answers.overall.rating` seeded into every preset.
3. **Would you participate in another intent by this creator?** → `would_participate_again`.
4. **Would you recommend this creator to a friend?** → `would_recommend` (stored only).

### Category presets (`src/lib/journey/steps/feedback-presets.ts`)
Maps `category_slug` → default `questions`. Every preset gets `overall` seeded automatically.

- **Trek**: safety, communication, organization, value, liked_most, improvements
- **Workshop**: content, venue, speaker, value, liked_most, improvements
- **Event (default)**: communication, organization, value, liked_most, improvements, comments
- **Flatmate**: communication, compatibility, accuracy, comments
- **Co-founder / Mentor / Investor**: communication, responsiveness, accuracy, comments
- **Fallback**: communication, accuracy, comments

Organizers can't edit questions in MVP UI, but schema supports it later.

---

## 4. Server functions (`src/lib/feedback.functions.ts`)

All `.middleware([requireSupabaseAuth])`. All creator-facing fns verify `auth.uid() = intents.creator_id`.

- `submitFeedback({ intentId, metExpectations, overall, wouldParticipateAgain, wouldRecommend, answers })` — validates eligibility + question keys against step config, inserts row.
- `getMyFeedback({ intentId })` — viewer's own submission or null (drives "already submitted" state).
- `getMyFeedbackEligibility({ intentId })` — returns `{ eligible, alreadySubmitted, requestedAt }` for CTA logic.
- `getFeedbackSummary({ intentId })` — creator-only. Returns: response count, request count (for completion rate), avg `met_expectations`, per-question averages + 1–5 distribution, `would_participate_again` distribution. **`would_recommend` intentionally excluded.**
- `getCreatorFeedback({ intentId, cursor })` — creator-only, paginated **anonymized** rows: `submitted_at`, `met_expectations`, per-question rating/text values, `would_participate_again`. No `participant_id`, name, avatar, or `would_recommend`.

---

## 5. UI

### Participant
- `src/components/feedback/feedback-form.tsx` — order:
  1. **Did this intent meet your expectations?** ★★★★★ (required)
  2. **Overall experience** ★★★★★
  3. Preset rating questions (from step config)
  4. Preset text questions
  5. **Would you participate in another intent by this creator?** (5-radio)
  6. **Would you recommend this creator to a friend?** (5-radio, stored only)
- Copy: "Your response is anonymous to the intent creator."
- Route: `src/routes/_authenticated/intents.$intentId.feedback.tsx`.
- Entry points:
  - **Notification** on intent completion → deep link into the form.
  - **Intent detail (completed)**: replace the terminal "Completed / Fulfilled" pill CTA with **"Share Feedback"** for eligible non-submitters; permanent, no expiry.
  - Profile → completed intents list: "Share feedback" affordance per eligible intent.
  - Journey progress: `feedback` step becomes actionable.

### Intent Creator
- Intent detail: new **Feedback** tab, visible when intent is `fulfilled` / `closed` / `expired`.
- `src/components/feedback/feedback-summary.tsx`:
  - Responses received / requests sent (completion rate)
  - Avg **Met Expectations** (headline metric)
  - Per-question average + 1–5 distribution
  - `would_participate_again` distribution
- `src/components/feedback/feedback-list.tsx`:
  - Header: **"Anonymous Participant · Joined"** · ★★★★☆ · relative time
  - Renders each non-empty text answer with its question label.
  - No avatar, no link, no name. No `would_recommend`.
- Terminology: internal architecture / server fns / DB columns use **"creator"**; UI labels may render "Organizer" for organizer-mode categories (Event, Trek, Workshop) and "Creator" elsewhere via a small `roleLabel(category)` helper.

---

## 6. Out of scope (explicit)
- No trust %, badges, levels, scores, AI summaries.
- No public reviews / ratings / participant identities.
- No creator-editable question UI (schema-ready).
- No creator replies. No editing / deleting feedback.
- `would_recommend` never displayed anywhere in MVP.
- No time-limited feedback window; no automated reminder cadence (single notification on completion; permanent CTA thereafter).

---

## Product principles

- **Operational data is identifiable. Feedback data is anonymous to creators.**
- **Feedback serves two purposes**: helping intent creators improve, and helping the platform learn what creates successful communities. Later milestones can derive badges, recommendations, search ranking, creator insights, spam detection, and trust metrics from these raw signals — without a schema change.
- Public trust metrics (future) only surface after a minimum response threshold (~20+).

---

## Technical summary

- **Migration**:
  1. Enums `feedback_participate_again`, `feedback_recommend`.
  2. Create `intent_feedback` (+ grants, RLS, unique).
  3. Create `intent_feedback_requests` (+ grants, RLS, unique).
  4. Add counter columns to `user_reputation_stats`.
  5. Triggers: `on_feedback_insert` (counters + stamp submitted_at + rep_events), `on_intent_completed` (fan out request rows + notifications).
- **New files**:
  - `src/lib/feedback.functions.ts`
  - `src/lib/journey/steps/feedback.tsx`
  - `src/lib/journey/steps/feedback-presets.ts`
  - `src/components/feedback/{feedback-form,feedback-summary,feedback-list}.tsx`
  - `src/routes/_authenticated/intents.$intentId.feedback.tsx`
- **Edits**:
  - `src/routes/_authenticated/intents.$intentId.tsx` — swap terminal CTA for "Share Feedback" (participant) + add creator Feedback tab.
  - Journey step registry — register `feedback`.
  - Notification renderer — handle `feedback_requested` kind.
- **RLS discipline**: creator clients never read raw rows; server fns project anonymized DTOs, always stripping `participant_id` and `would_recommend`.
