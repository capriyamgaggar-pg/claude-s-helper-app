// Creator visibility + redaction helpers.
// Mirrors the SQL `can_see_creator` rule on the client so cards and previews
// can display the correct label without an extra round-trip per row.

export type CreatorVisibility = "public" | "anonymous";

// Category slugs that render as organizer-run experiences.
// Kept here (not in categories.ts) so it stays close to the display rules.
export const ORGANIZER_CATEGORIES = new Set(["event", "trekking"]);

export function isOrganizerCategory(slug: string | null | undefined): boolean {
  return !!slug && ORGANIZER_CATEGORIES.has(slug);
}

export function creatorByline(
  slug: string | null | undefined,
  visible: boolean,
): "Organized by" | "Created by" | "Anonymous Creator" {
  if (!visible) return "Anonymous Creator";
  return isOrganizerCategory(slug) ? "Organized by" : "Created by";
}

export interface VisibleCreatorInput {
  creator_id: string;
  creator_visibility: CreatorVisibility | string | null | undefined;
  viewer_id: string;
  // Viewer's participation state on this intent, if any.
  viewer_participant_state?: string | null;
  // Whether the viewer + creator have an accepted connection.
  viewer_connection_accepted?: boolean;
}

/** Client-side approximation of `public.can_see_creator`. */
export function canSeeCreator(input: VisibleCreatorInput): boolean {
  if (input.creator_visibility !== "anonymous") return true;
  if (input.viewer_id === input.creator_id) return true;
  const s = input.viewer_participant_state;
  if (s === "joining" || s === "confirmed") return true;
  if (input.viewer_connection_accepted) return true;
  return false;
}

export interface RedactedCreator {
  id: string; // still the real id — used for internal keys, never surfaced as a link when redacted
  display_name: string;
  photo_url: string | null;
  profession: string | null;
  city: string | null;
  visible: boolean;
}

export function redactCreator(
  visible: boolean,
  raw: {
    id: string;
    name: string | null;
    photo_url: string | null;
    profession?: string | null;
    city?: string | null;
  } | null,
): RedactedCreator {
  if (!visible || !raw) {
    return {
      id: raw?.id ?? "",
      display_name: "Anonymous Creator",
      photo_url: null,
      profession: null,
      city: null,
      visible: false,
    };
  }
  return {
    id: raw.id,
    display_name: raw.name ?? "Someone",
    photo_url: raw.photo_url,
    profession: raw.profession ?? null,
    city: raw.city ?? null,
    visible: true,
  };
}
