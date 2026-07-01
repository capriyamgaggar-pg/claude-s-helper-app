
## Scope

Frontend/UX only. No schema changes. Reuses `journey_form_fields`, `connections`, `threads`.

## 1. Shared readiness helper (`src/lib/registration-form.ts`)

Future-proofed shape so new states slot in without touching callers:

```ts
export type RegistrationState = "not_ready" | "ready";
// Later: "payment_required" | "approval_required" | "unpublished" | "archived"

export interface RegistrationStatus {
  ready: boolean;
  state: RegistrationState;
  stepId: string | null;
  activeFieldCount: number;
}

export async function getRegistrationStatus(intentId: string): Promise<RegistrationStatus>;
// Does NOT create the step — participants must not trigger creation.
// ready === true iff stepId exists AND activeFieldCount > 0.
```

Rich CTA helper (returns everything the button needs):

```ts
export type RegistrationCTA = {
  label: string;                             // "Register", "Registration Submitted ✓", "Approved ✓"
  variant: "primary" | "success" | "muted";
  disabled: boolean;
  href?: string;
};

export function getRegistrationCTA(
  status: RegistrationStatus,
  mySubmissionStatus: "none" | "submitted",
  myParticipationStatus: "none" | "requested" | "approved" | "rejected",
  intentId: string,
): RegistrationCTA;
```

React Query hook `useRegistrationStatus(intentId)` wraps the fetch.

## 2. Post-create success screen (`intents.new.tsx`)

Events / Trekking branch — after successful insert, swap the form for an in-place success card (no navigation):

```
✓ Intent Created
Your trek is now live.
Participants can already discover it.

Next recommended step
☐ Registration Form
Build your registration form so people can register.

[ Build Registration Form ]  → /intents/$intentId/form
[ I'll do it later ]         → /intents/$intentId
```

Personal-category intents keep today's straight-to-detail behavior.

## 3. Registration Status card for creators

New `src/components/registration/status-card.tsx` shown on `intents.$intentId.tsx` when viewer is the creator, driven by `useRegistrationStatus`.

Not ready:
```
Registration Setup
🟡 Registration not ready
Participants can discover your intent,
but they can't register yet.

0 Questions

[ Build Registration Form ]
```

Ready (registration count from `journey_form_submissions` where `status = 'submitted'`):
```
Registration Setup
🟢 Registration Ready

{N} Questions
{M} Registrations

[ Edit Form ]   [ View Responses ]
```

Replaces the current form/responses button row for the creator.

## 4. Participant CTA on intent detail

Non-creator branch on `intents.$intentId.tsx` consumes `getRegistrationCTA(...)`:

- `!ready` → muted line *"Registration will open soon."*, no button.
- `ready`, no submission → primary **`Register`** → `/intents/$intentId/register`.
- Submitted → **`Registration Submitted ✓`** (success variant, still opens read-only runner).
- Approved participant → **`Approved ✓`** (success, disabled).

All label/variant/disabled/href logic lives in the helper so the page stays thin and future states (Waitlisted, Payment Pending, Rejected) plug in without JSX changes.

## 5. Inbox reorder + badges (`inbox.tsx`)

- Tab order: **Chats · Received · Sent** (Chats default).
- Partition the existing `connections` query by `requested_by`:
  - Received = incoming pending (Accept button, existing behavior).
  - Sent = outgoing pending (muted "Waiting for reply" chip, no action).
- Badges (hidden when count is 0):
  - **Chats**: unread thread count if derivable from existing schema; otherwise omit this pass.
  - **Received**: pending incoming count, e.g. `Received (3)`.
  - **Sent**: none.
- Intent-context chip on each row stays as-is.

## 6. Verification

- Create Event intent → in-place success card with checklist row and both CTAs routing correctly.
- Creator with 0 fields: yellow "Not ready" card, "0 Questions"; add one field → flips to green with question and registration counts.
- Second user on same intent:
  - Before fields: muted "Registration will open soon."
  - After fields: `Register` button → submit → `Registration Submitted ✓` → creator approves → `Approved ✓`.
- Inbox: Chats first and default; Received shows `(N)` only when N > 0; Sent shows waiting chip, no badge.
- `tsgo`.

## Not in scope

- Chats unread badge if it requires new schema.
- Additional readiness states (payment, approval, unpublished) — API is designed for them but rules aren't built yet.
- Drag-and-drop reorder, template picker, publish toggle.
