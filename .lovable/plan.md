
# Organizer Journey Builder (MVP)

**Architectural principle:** Personal Intents and Organizer Intents share the **same** `intents` row and lifecycle. What differs is the **participant journey** attached to each intent. The Journey Builder is a **generic workflow engine** composed of reusable typed step modules (like Notion blocks). A registration form is one step type; payment and approval are others. New step types drop in as modules with no schema redesign.

Defaults by category:
- **Personal Intents** (flatmate, co-founder, mentor) → journey = `[interested → connect → chat → confirm]`. Mode = `conversation_first`.
- **Organizer Intents** (trek, workshop, marathon, expo) → journey = `[interested → registration → payment? → approval? → joined]`. Mode = `registration_first`.

Mode is a default-picker; organizers can edit any journey regardless of category.

## Participation Style picker (UX)

In Create Intent, the toggle is labelled **Participation Style** with two options:
- **Conversation Based** — "1:1 chat decides participation. Best for flatmate, co-founder, mentor."
- **Registration Based** — "Participants fill a form (and optionally pay / get approved). Best for treks, workshops, events."

Stored internally as `participation_mode` = `conversation_first | registration_first`.

## Scope this round

In:
1. Participation Style toggle on Create + Edit Intent (category-based default).
2. **Normalized journey engine**: `intent_journeys` → `journey_steps` → `journey_step_config`.
3. Initial step modules: `registration_form`, `payment_manual`, `approval_manual`. Built-in `interested`, `connect`, `chat`, `confirm`, `joined` modeled as step types for Conversation Based.
4. Drag-and-drop step ordering, enable/disable, duplicate step.
5. **Journey Templates, grouped by category** (seeded, system-owned): Blank + Adventure (Weekend Trek, Camping, Cycling), Business (Workshop, Meetup, Networking), Education (College Event, Hackathon), Community (Volunteer Drive), Sports (Marathon, Sports Tournament). One click → copies template steps + config into the new intent's journey.
6. **Save as Template** (organizer-owned): from any intent the organizer created, "Save journey as template" copies the current journey into a `journey_templates` row owned by them (`scope = 'organizer'`, `owner_id = user`). It appears in their gallery under "My Templates" alongside the seeded groups. Reusable across their future intents; never shown to other organizers in this round.
7. Registration form step with all field types and per-field config.
8. Smart Auto-Fill (3 levels: Profile / Community / Intent).
9. Manual Payment step (UPI/bank, screenshot + reference, organizer marks Verified).
10. Manual Approval queue.
11. **First-class Communities** (`communities`, `community_members`, `community_member_history`).
12. **Kanban Pipeline** for organizers: columns = enabled steps, cards = participants, auto-moved by the engine. Funnel counts shown as a strip above the board.
13. **Discussion Space as a permission**, not a workflow step. Unlocked automatically when a participant reaches **Joined**.

Out (roadmap):
- **Organizations** (B2B teams that own communities and templates). Schema is shaped to allow a later `organization_id` on `communities` and `journey_templates` without a rewrite, but no UI or table this round.
- Sharing organizer-owned templates publicly or with other organizers.
- Integrated payment gateway.
- Segment broadcast messaging.
- Browse communities + invite previous members into a new intent (schema lands now; UI later).
- Additional step types (waiver, QR check-in, attendance, feedback).
- Journey version history UI (schema supports it; UI later).
- AI-generated journeys.

## Flows

```text
Conversation Based (Personal)
Discover → Interested → Connect → 1:1 Chat → Confirm → Joined → Discussion unlocked

Registration Based (Organizer)
Discover → Interested → Registration → [Payment] → [Approval] → Joined → Discussion unlocked
```

In Registration Based, tapping Interested opens the runner at the first incomplete step.

## Workflow engine

A journey is a row in `intent_journeys` with ordered children in `journey_steps`. Each step's config is in `journey_step_config` (1:1). Per-participant progress lives in `journey_progress` keyed by `(intent_id, user_id, step_id)`.

Each step type ships as a module exporting:
- `OrganizerEditor` — config UI in the builder
- `ParticipantRunner` — UI shown to the participant
- `PipelineCell` — what the organizer sees on the Kanban card for this step
- `advance(progress)` — pure function returning next status
- `validate(config)` — on builder save

New step types = new module + register in `src/lib/journey/registry.ts`. Schema changes only when a step needs its own side-table for fast queries (payment, approval).

**Discussion is not a step.** It's a permission flipped on when a participant reaches `Joined`. Engine writes nothing; access is gated by RLS on the intent group thread.

## Communities (first-class)

- On first organizer intent, auto-create a `communities` row owned by the user (`name = profile.name + "'s Community"`, editable).
- **A participant becomes a `community_member` only after successfully reaching the Joined stage. Registration, payment, approval, or any intermediate workflow step must never create community membership. Community membership represents successful participation in at least one completed journey and is the reusable audience for future intents.**
- `community_member_history` records every joined participation (`community_id`, `user_id`, `intent_id`, `joined_at`, `completed_at`) so the community can later show "Rahul — joined 14 treks".
- `community_answers` keys to `community_id`, so two organizers sharing a community (future) would share answers; today each organizer has one community.
- This round: data model + auto-membership on Joined + history rows. Browsing communities and inviting members into a new intent ships later.

## Templates: seeded vs organizer-owned

`journey_templates` has a `scope` column:
- `scope = 'system'`, `owner_id null` — the curated, grouped gallery (Adventure / Business / Education / Community / Sports / Blank). Read-only.
- `scope = 'organizer'`, `owner_id = auth.uid()` — saved by an organizer from any of their intents. Visible only to that owner.

Template gallery UI groups: **My Templates** (organizer-owned, newest first), then the seeded category groups. Each card shows name, step summary, and source intent (for owned ones).

**Save flow:** from an organizer intent → menu "Save journey as template" → name + optional description → copies steps + per-step config into a new `journey_templates` row + `journey_template_steps` rows (denormalized snapshot, same shape used for seeded templates). Future edits to the source intent's journey don't mutate the template.

## Smart Auto-Fill (3 levels)

| Level | Source | Lifetime |
|---|---|---|
| Profile | extended `profiles` | Permanent |
| Community | `community_answers (community_id, user_id, field_key)` | Across that community's future intents |
| Intent | `journey_progress.data` for prior submissions on the same intent | This intent only |

Form fields declare `autofill_scope` + `field_key`. Runner resolves highest-scope match and shows "Pre-filled from your last registration — review and edit." Submit writes back to Profile/Community where scope allows.

## Kanban Pipeline

Creator-only tab on the intent detail page.

```text
[ Views 210 | Interested 87 | Registered 48 | Paid 31 | Approved 28 | Joined 28 ]

┌── Interested ──┐ ┌── Registration ──┐ ┌── Payment ──┐ ┌── Approval ──┐ ┌── Joined ──┐
│ [card]         │ │ [card]           │ │ [card]      │ │ [card]       │ │ [card]     │
│ [card]         │ │                  │ │             │ │              │ │            │
└────────────────┘ └──────────────────┘ └─────────────┘ └──────────────┘ └────────────┘
```

Cards auto-move as the engine advances participants — no drag required. Card shows avatar, name, "in this column 2h", and the active step's `PipelineCell` (e.g. "Payment ref ABC123, screenshot →"). Tap card → side sheet with full submission + actions (Mark Paid, Approve, Reject, Message, View profile).

## Discussion Space (permission, not step)

- Reuses `threads` + `messages` with `kind = 'intent_group'`.
- Auto-created when the first participant reaches Joined.
- Members = participants currently in Joined + the creator.
- RLS on `messages` insert checks `intent_participants.state = 'confirmed'` for the thread's intent — if someone leaves, write access drops; if they re-join, it returns.
- Read-only when the intent's status is `fulfilled`, `closed`, or `expired`.

## Technical section

### Database migration

New tables (each with grants + RLS + updated_at trigger):

- `intent_journeys` — `id`, `intent_id unique`, `version int default 1`.
- `journey_steps` — `id`, `journey_id`, `position int`, `type text`, `enabled boolean`. Unique `(journey_id, position)`.
- `journey_step_config` — `step_id pk fk`, `config jsonb`.
- `journey_progress` — `id`, `intent_id`, `user_id`, `step_id`, `step_type`, `status (pending|in_progress|completed|rejected)`, `data jsonb`, `started_at`, `completed_at`. Unique `(step_id, user_id)`.
- `intent_payments` — `intent_id`, `user_id`, `amount_inr`, `reference`, `screenshot_path`, `status`, `verified_by`, `verified_at`, `note`.
- `intent_approvals` — `intent_id`, `user_id`, `status`, `decided_by`, `decided_at`, `note`.
- `communities` — `id`, `organizer_id`, `name`, `description`, `visibility text default 'private'`. (Future-proofing: an `organization_id` column can be added later without breaking this round.)
- `community_members` — `community_id`, `user_id`, `joined_at`, `last_active_at`. Unique `(community_id, user_id)`. Inserted **only** when a participant transitions to Joined.
- `community_member_history` — `id`, `community_id`, `user_id`, `intent_id`, `joined_at`, `completed_at nullable`. One row per joined participation.
- `community_answers` — `community_id`, `user_id`, `field_key`, `value jsonb`. Unique `(community_id, user_id, field_key)`.
- `intent_views` — `intent_id`, `viewer_id nullable`, `viewed_at`.
- `journey_templates` — `id`, `slug nullable`, `name`, `description`, `group text` (Adventure / Business / Education / Community / Sports / Blank / My Templates), `scope text` (`system | organizer`), `owner_id uuid nullable references auth.users`, `source_intent_id nullable`, `recommended_mode`. Unique `(scope, slug)` where `slug not null`.
- `journey_template_steps` — `id`, `template_id`, `position`, `type`, `config jsonb`. Replaces the denormalized `steps jsonb`; same shape used for both seeded and organizer-saved templates.

RLS on `journey_templates` / `journey_template_steps`: anyone authenticated can SELECT where `scope = 'system'`; an organizer can SELECT/INSERT/UPDATE/DELETE their own (`owner_id = auth.uid()`).

Extend `intents`:
- `participation_mode text default 'conversation_first'` check (`conversation_first | registration_first`).
- `community_id` fk (set on insert for organizer intents).
- `payment_required boolean`, `approval_required boolean`, `price_inr integer`, `payment_instructions text`.
- `group_discussion_enabled boolean default true`.

Extend `profiles`: `phone`, `dob`, `blood_group`, `emergency_contact_name`, `emergency_contact_phone`, `address_line1`, `address_line2`, `pincode` (all nullable).

Extend `threads.kind` to allow `'intent_group'`. Private storage bucket `registration-uploads` with RLS so only the participant + intent creator can read.

**Joined trigger**: on `intent_participants` update where `state` transitions to `confirmed`, insert into `community_members` (on conflict do nothing) **and** insert a `community_member_history` row. On intent close/fulfill, set `completed_at` on the participant's open history row.

Seed `journey_templates` (scope = system) grouped: Blank; Adventure (Weekend Trek, Camping, Cycling); Business (Workshop, Meetup, Networking); Education (College Event, Hackathon); Community (Volunteer Drive); Sports (Marathon, Sports Tournament).

### State machine

`src/lib/participation.ts` gets `computeJourneyStage(intent, steps, progress[])` for Registration Based; existing conversation machine unchanged. `ParticipationButton` picks the machine by mode.

### Code changes

- `src/lib/journey/registry.ts` — step type registration.
- `src/lib/journey/engine.ts` — resolve current step, advance, write to `journey_progress` + side-tables.
- `src/lib/journey/autofill.ts` — Profile / Community / Intent resolver + writeback.
- `src/lib/journey/templates.ts` — apply template (system or owned) → normalized rows; save-from-intent → new owned template; gallery query split by scope.
- `src/lib/journey/steps/{registration_form,payment_manual,approval_manual}.tsx` — each exports the 5 module functions.
- `src/components/journey-builder/` — builder shell, step list (`@dnd-kit/sortable`), step picker, duplicate-step, config sheet, grouped template gallery with "My Templates" group, "Save as template" menu action.
- `src/components/journey-runner/` — participant shell with progress bar.
- `src/components/intent/pipeline-board.tsx` — Kanban + funnel strip; subscribed to `journey_progress` changes.
- `src/routes/_authenticated/intents.new.tsx` + `intents.$intentId.edit.tsx` — Participation Style picker; for Registration Based, show grouped template gallery → Journey Builder.
- `src/routes/_authenticated/intents.$intentId.tsx` — branch CTA + main panel by mode; mount Pipeline tab for creator; "Save journey as template" menu item for the creator; record view in `intent_views`.
- `src/routes/_authenticated/intents.$intentId.register.tsx` — full-screen journey runner.
- `src/routes/_authenticated/inbox.$threadId.tsx` — render `intent_group` threads with member list, system join messages, read-only banner when intent closed.
- `src/routes/_authenticated/profile.me.tsx` — "Resume registration" on Interested tab.

### Sequencing

Each milestone independently shippable.

1. **Foundation**: migration (all new tables + extensions + template seed + auto-community + Joined→membership/history trigger), Participation Style toggle, engine scaffolding + step registry. Registration Based shows "Step coming soon" placeholder.
2. **registration_form** step (builder + runner + grouped template gallery including My Templates).
3. **Save as Template** action on organizer intents.
4. **payment_manual** step.
5. **approval_manual** step.
6. **Joined → Discussion Space** (auto-create thread + RLS gating).
7. **Kanban Pipeline** + funnel strip + `intent_views`.
8. **Smart Auto-Fill** end-to-end (extend profile UI, wire community + intent writeback).

## Out of scope reminders

Organizations (B2B teams), public template sharing, integrated payment gateway, segment broadcast, community-browse + invite-into-new-intent UI, journey version history UI, AI-generated journeys, and additional step types are deferred. Communities, history, normalized journey tables, and the `scope`/`owner_id` template model land now so all of those become straightforward additions later.
