// Helpers for the Intent lifecycle (expiry, status, closure reasons).

export type IntentStatus = "active" | "fulfilled" | "closed" | "expired";

export const MAX_VISIBILITY_DAYS = 90;

export interface VisibilityPreset {
  id: "24h" | "3d" | "7d" | "30d" | "custom";
  label: string;
  hours: number | null; // null = custom
}

export const VISIBILITY_PRESETS: VisibilityPreset[] = [
  { id: "24h", label: "24 hours", hours: 24 },
  { id: "3d", label: "3 days", hours: 24 * 3 },
  { id: "7d", label: "7 days", hours: 24 * 7 },
  { id: "30d", label: "30 days", hours: 24 * 30 },
  { id: "custom", label: "Custom", hours: null },
];

export const REACTIVATE_PRESETS = VISIBILITY_PRESETS;

/** Compute an ISO expires_at from a preset + optional custom date. */
export function computeExpiresAt(
  preset: VisibilityPreset["id"],
  customISO?: string | null,
): string {
  const now = Date.now();
  const cap = now + MAX_VISIBILITY_DAYS * 24 * 60 * 60 * 1000;
  if (preset === "custom") {
    if (!customISO) throw new Error("Pick a custom date");
    const t = new Date(customISO).getTime();
    if (Number.isNaN(t)) throw new Error("Invalid date");
    if (t <= now) throw new Error("Date must be in the future");
    return new Date(Math.min(t, cap)).toISOString();
  }
  const p = VISIBILITY_PRESETS.find((x) => x.id === preset);
  if (!p || !p.hours) throw new Error("Pick a duration");
  return new Date(now + p.hours * 60 * 60 * 1000).toISOString();
}

export function maxCustomDateInputValue(): string {
  // datetime-local format: YYYY-MM-DDTHH:mm
  const d = new Date(Date.now() + MAX_VISIBILITY_DAYS * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function minCustomDateInputValue(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000); // at least 1h ahead
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Countdown / status display
// ---------------------------------------------------------------------------

export interface StatusPill {
  text: string;
  tone: "muted" | "amber" | "grey" | "green";
}

export function statusPill(
  status: IntentStatus | string,
  expiresAt: string | null,
  now = Date.now(),
): StatusPill {
  if (status === "fulfilled") return { text: "Fulfilled", tone: "green" };
  if (status === "closed") return { text: "Closed", tone: "grey" };
  if (status === "expired") return { text: "Expired", tone: "grey" };
  // active
  if (!expiresAt) return { text: "Active", tone: "muted" };
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return { text: "Expired", tone: "grey" };
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  if (hours <= 6) {
    const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
    return { text: hours < 1 ? `${mins}m left` : `${hours}h left`, tone: "amber" };
  }
  if (hours < 24) return { text: `${hours}h left`, tone: "amber" };
  if (days < 7) return { text: `${days}d left`, tone: "muted" };
  return { text: `${days}d left`, tone: "muted" };
}

export const STATUS_TAB_FILTERS: { value: IntentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
];

// ---------------------------------------------------------------------------
// Closure reasons
// ---------------------------------------------------------------------------

export type ClosureReasonCode =
  | "found_elsewhere"
  | "no_longer_needed"
  | "not_enough_responses"
  | "wrong_timing"
  | "other";

export const CLOSURE_REASONS: { code: ClosureReasonCode; label: string }[] = [
  { code: "found_elsewhere", label: "Found it elsewhere" },
  { code: "no_longer_needed", label: "No longer needed" },
  { code: "not_enough_responses", label: "Not enough responses" },
  { code: "wrong_timing", label: "Wrong timing" },
  { code: "other", label: "Other" },
];
