
# Milestone 2 — Registration Form: Final Build Plan (v4)

v3 approved; this revision adds soft-archive and form versioning.

## Changes from v3

### 1. Soft-archived fields (no hard delete)

`journey_form_fields` gets:

| Column | Type | Notes |
|---|---|---|
| `archived_at` | timestamptz null | Set when organizer "deletes" a field |
| `archived_by` | uuid null | Audit |

Behavior:
- Builder "Delete" → sets `archived_at = now()` (never `DELETE FROM`).
- Builder list, palette, validation, and runner queries filter `archived_at IS NULL`.
- Past `journey_form_answers` keep their `field_id` FK; submissions list and CSV export still resolve the field label and key for archived fields.
- An "Archived fields" collapsible section in the builder lets organizers restore (`archived_at = NULL`) — useful for accidental deletes.
- Hard delete only allowed when a field has zero answers AND was created in the current draft version (safe cleanup).

### 2. Form version number

`journey_step_config` for `kind = 'registration_form'` gains `form_version int default 1`.

Structural edits that bump the version:
- Add / archive / restore a field
- Change a field's `kind`, `required`, `validation`, `field_key`, or options list
- Reorder fields
- Add / remove / reorder section blocks

Non-structural edits do NOT bump the version (label wording, description, help_text, placeholder, display_width, auto_fill scope).

Storage:
- `journey_form_submissions` gets `form_version int not null`. Stamped at submission insert from the current step config.
- The runner reads the latest version; the organizer's submissions list shows the version each entry was completed against.
- CSV export groups by `form_version` so columns line up per cohort.

Bumping is server-side: a trigger on `journey_form_fields` (insert / archive / structural update / sort change) increments `journey_step_config.form_version` atomically. Cosmetic field updates use a `cosmetic_only=true` flag in the update path that bypasses the bump.

### Acceptance additions

11. Deleting a field in the builder hides it but preserves prior answers; archived fields are visible under "Archived fields" with Restore.
12. Structural edits increment `form_version`; cosmetic edits do not. Each submission row records the version it was completed against. Export groups submissions by version.

---

Rest of v3 (location field, sections + description, display_width, signature removed, field_key, duplicate, autosave indicator, registry, runner, profile auto-fill) stands unchanged.

Proceeding: migration first (now includes `archived_at`, `archived_by`, `form_version`, version-bump trigger), then registry, builder, runner, submissions list.
