// Personality copy — small, human variations on otherwise flat system text.
// See MOTION_PRINCIPLES.md for the rules governing when and how these are used.
//
// Two flavors:
// - randomPick(): true randomness, for one-time events (toasts) where a
//   different line each time is delightful, not disorienting.
// - seededPick(): deterministic per-item, for persistent UI (labels, empty
//   states tied to a specific card/connection) so the same item doesn't
//   flicker between variants on every re-render, while different items
//   still naturally show different lines.

export function randomPick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function seededPick<T>(seed: string, items: readonly T[]): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length];
}

export const CONNECTION_SENT_MESSAGES = [
  "🤞 Fingers crossed.",
  "Sent into the wild.",
  "Let's see who finds you.",
  "Little note, on its way.",
] as const;

export const CONNECTION_ACCEPTED_MESSAGES = [
  "You're in — chat is open.",
  "Connected. Say hi.",
  "Nice — the chat just opened.",
] as const;

export const INTENT_POSTED_MESSAGES = [
  "You're in.",
  "Out in the world.",
  "Nicely put.",
] as const;

export const EVENT_CREATED_MESSAGES = [
  "Event is live.",
  "You've set the stage.",
  "Doors are open.",
] as const;

export const PROFILE_SAVED_MESSAGES = [
  "Saved.",
  "All set.",
  "Looking good.",
] as const;

export const FEEDBACK_THANKS_MESSAGES = [
  "Thanks — this helps everyone.",
  "Noted. Kind of you.",
  "Appreciated.",
] as const;

export const WELCOME_MESSAGES = [
  "Welcome to Intent.",
  "Glad you're here.",
  "You're in — welcome.",
] as const;

export const NO_PENDING_REQUESTS_MESSAGES = [
  "Nothing brewing.",
  "The world is busy.",
  "Quiet... for now.",
  "Your future notifications are stretching.",
] as const;

export const NO_INTEREST_YET_MESSAGES = [
  "When someone shows interest, they'll appear here.",
  "The first one is always the hardest.",
  "Every great plan started with one person.",
] as const;

export const PENDING_LABEL = "Waiting to hear back…";

// Small, rare (~10%) reaction lines shown after a category-specific
// moment (e.g. someone joins). Never guaranteed -- see callers for the
// probability roll. Keyed by category_slug; falls back to a generic set.
export const JOIN_REACTIONS: Record<string, readonly string[]> = {
  flatmate: ["Hope they don't steal your snacks."],
  study: ["Time to pretend you'll actually study."],
  cofounder: ["Please don't build the next unfinished startup."],
  hobby: ["Someone finally appreciates golden hour."],
  trekking: ["Mosquitoes not included."],
};
export const JOIN_REACTIONS_GENERIC = [
  "Looks like you've got company.",
] as const;

/** Returns a reaction line ~10% of the time, otherwise null (caller shows nothing extra). */
export function maybeJoinReaction(categorySlug: string): string | null {
  if (Math.random() > 0.1) return null;
  const pool = JOIN_REACTIONS[categorySlug] ?? JOIN_REACTIONS_GENERIC;
  return randomPick(pool);
}
