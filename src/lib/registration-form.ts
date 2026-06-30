// Registration Form — types, field-kind registry, helpers.
// Schema lives in: journey_form_fields / journey_form_submissions / journey_form_answers.

import { supabase } from "@/integrations/supabase/client";
import type { Place } from "@/lib/location";

// ---------------------------------------------------------------------------
// Field kinds
// ---------------------------------------------------------------------------

export type FieldKind =
  | "section"
  | "short_text"
  | "long_text"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "time"
  | "datetime"
  | "dropdown"
  | "radio"
  | "checkbox_multi"
  | "yes_no"
  | "file_upload"
  | "image_upload"
  | "location"
  | "payment_reference"
  | "emergency_contact"
  | "terms";

export type DisplayWidth = "full" | "half" | "third";
export type AutoFillScope = "profile" | "community" | "intent";

export interface AutoFill {
  scope: AutoFillScope | null;
  source_key: string | null;
  editable_after_fill: boolean;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  mimeTypes?: string[];
  maxSizeMB?: number;
  options?: { value: string; label: string }[];
}

export interface FormField {
  id: string;
  step_id: string;
  kind: FieldKind;
  label: string;
  description: string | null;
  field_key: string | null;
  required: boolean;
  placeholder: string | null;
  help_text: string | null;
  default_value: unknown;
  validation: FieldValidation;
  auto_fill: AutoFill;
  display_width: DisplayWidth;
  visible_if: unknown;
  organizer_only: boolean;
  sort: number;
  archived_at: string | null;
}

export interface FieldKindMeta {
  kind: FieldKind;
  label: string;
  group: "layout" | "core" | "organizer";
  isLayout?: boolean;
  defaultLabel: string;
  defaultValidation?: FieldValidation;
}

export const FIELD_KINDS: FieldKindMeta[] = [
  { kind: "section", label: "Section heading", group: "layout", isLayout: true, defaultLabel: "Section" },

  { kind: "short_text", label: "Short text", group: "core", defaultLabel: "Short answer", defaultValidation: { maxLength: 200 } },
  { kind: "long_text", label: "Long text", group: "core", defaultLabel: "Long answer", defaultValidation: { maxLength: 2000 } },
  { kind: "number", label: "Number", group: "core", defaultLabel: "Number" },
  { kind: "email", label: "Email", group: "core", defaultLabel: "Email" },
  { kind: "phone", label: "Phone", group: "core", defaultLabel: "Phone" },
  { kind: "date", label: "Date", group: "core", defaultLabel: "Date" },
  { kind: "time", label: "Time", group: "core", defaultLabel: "Time" },
  { kind: "datetime", label: "Date & time", group: "core", defaultLabel: "Date & time" },
  { kind: "dropdown", label: "Dropdown", group: "core", defaultLabel: "Choose one", defaultValidation: { options: [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }] } },
  { kind: "radio", label: "Radio", group: "core", defaultLabel: "Pick one", defaultValidation: { options: [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }] } },
  { kind: "checkbox_multi", label: "Checkboxes", group: "core", defaultLabel: "Pick any", defaultValidation: { options: [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }] } },
  { kind: "yes_no", label: "Yes / No", group: "core", defaultLabel: "Yes or no" },
  { kind: "file_upload", label: "File upload", group: "core", defaultLabel: "Upload a file", defaultValidation: { maxSizeMB: 10 } },
  { kind: "image_upload", label: "Image upload", group: "core", defaultLabel: "Upload an image", defaultValidation: { maxSizeMB: 5, mimeTypes: ["image/jpeg", "image/png", "image/webp"] } },
  { kind: "location", label: "Location", group: "core", defaultLabel: "Pickup point" },

  { kind: "payment_reference", label: "Payment reference", group: "organizer", defaultLabel: "Payment reference (UTR / txn id)" },
  { kind: "emergency_contact", label: "Emergency contact", group: "organizer", defaultLabel: "Emergency contact" },
  { kind: "terms", label: "Terms acceptance", group: "organizer", defaultLabel: "I accept the terms" },
];

export function kindMeta(kind: FieldKind): FieldKindMeta {
  return FIELD_KINDS.find((k) => k.kind === kind) ?? FIELD_KINDS[1];
}

// ---------------------------------------------------------------------------
// Profile auto-fill source map
// ---------------------------------------------------------------------------

export const PROFILE_SOURCE_KEYS = [
  "full_name", "email", "phone", "photo_url",
  "city", "locality", "state", "country",
  "profession", "bio", "date_of_birth",
] as const;
export type ProfileSourceKey = (typeof PROFILE_SOURCE_KEYS)[number];

export function valueFromProfile(
  profile: Record<string, unknown> | null | undefined,
  key: ProfileSourceKey,
): unknown {
  if (!profile) return null;
  switch (key) {
    case "full_name": return profile.name ?? null;
    default: return profile[key] ?? null;
  }
}

// ---------------------------------------------------------------------------
// Slug / key generation
// ---------------------------------------------------------------------------

export function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "field";
}

export function uniqueKey(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

// ---------------------------------------------------------------------------
// Ensure a Registration Form step exists for an intent.
// Returns step_id.
// ---------------------------------------------------------------------------

export async function ensureRegistrationStep(intentId: string): Promise<string> {
  // 1. journey for intent
  const { data: existingJourney } = await supabase
    .from("intent_journeys")
    .select("id")
    .eq("intent_id", intentId)
    .maybeSingle();

  let journeyId = existingJourney?.id;
  if (!journeyId) {
    const { data, error } = await supabase
      .from("intent_journeys")
      .insert({ intent_id: intentId })
      .select("id")
      .single();
    if (error) throw error;
    journeyId = data.id;
  }

  // 2. registration_form step
  const { data: existingStep } = await supabase
    .from("journey_steps")
    .select("id")
    .eq("journey_id", journeyId)
    .eq("type", "registration_form")
    .maybeSingle();

  if (existingStep?.id) return existingStep.id;

  const { data: stepRow, error: stepErr } = await supabase
    .from("journey_steps")
    .insert({ journey_id: journeyId, type: "registration_form", position: 0, enabled: true })
    .select("id")
    .single();
  if (stepErr) throw stepErr;

  await supabase
    .from("journey_step_config")
    .upsert({ step_id: stepRow.id, config: { form_version: 1, title: "Registration", submit_label: "Submit" } });

  return stepRow.id;
}

// ---------------------------------------------------------------------------
// Validation (participant runner)
// ---------------------------------------------------------------------------

export function validateValue(field: FormField, value: unknown): string | null {
  if (field.kind === "section") return null;
  const v = value;
  const empty =
    v === null || v === undefined || v === "" ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && v !== null && Object.values(v).every((x) => !x));
  if (field.required && empty) return "This field is required.";
  if (empty) return null;

  const rule = field.validation ?? {};
  if (field.kind === "short_text" || field.kind === "long_text") {
    const s = String(v);
    if (rule.minLength && s.length < rule.minLength) return `Must be at least ${rule.minLength} characters.`;
    if (rule.maxLength && s.length > rule.maxLength) return `Must be at most ${rule.maxLength} characters.`;
    if (rule.pattern) {
      try { if (!new RegExp(rule.pattern).test(s)) return "Invalid format."; } catch { /* ignore */ }
    }
  }
  if (field.kind === "number") {
    const n = Number(v);
    if (Number.isNaN(n)) return "Must be a number.";
    if (rule.min !== undefined && n < rule.min) return `Must be ≥ ${rule.min}.`;
    if (rule.max !== undefined && n > rule.max) return `Must be ≤ ${rule.max}.`;
  }
  if (field.kind === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) return "Enter a valid email.";
  }
  if (field.kind === "phone") {
    if (!/^[0-9+\-\s()]{6,}$/.test(String(v))) return "Enter a valid phone.";
  }
  if (field.kind === "location") {
    const p = v as Place | null;
    if (!p?.city && !p?.locality) return "Pick a location.";
  }
  if (field.kind === "emergency_contact") {
    const c = v as { name?: string; phone?: string; relation?: string } | null;
    if (!c?.name || !c?.phone) return "Name and phone are required.";
  }
  if (field.kind === "terms") {
    if (!v) return "You must accept to continue.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

export function gridColsForWidth(width: DisplayWidth): string {
  switch (width) {
    case "half":  return "md:col-span-6";
    case "third": return "md:col-span-4";
    default:      return "md:col-span-12";
  }
}
