import { supabase } from "@/integrations/supabase/client";
import { demoSignIn } from "@/lib/demo.functions";

export const DEMO_PERSONAS = ["discoverer", "creator", "organizer", "community"] as const;
export type DemoPersona = (typeof DEMO_PERSONAS)[number];

export const DEMO_PERSONA_LABELS: Record<DemoPersona, { label: string; blurb: string }> = {
  discoverer: {
    label: "Discoverer",
    blurb: "Browses the feed, joins others' plans.",
  },
  creator: {
    label: "Creator",
    blurb: "Posts 24-hour intents. Chats to confirm.",
  },
  organizer: {
    label: "Organizer",
    blurb: "Runs events with registration + approvals.",
  },
  community: {
    label: "Community Member",
    blurb: "Recurring participant across intents.",
  },
};

// IMPORTANT: Lovable's published (public, live) apps also live on *.lovable.app —
// the same domain family as ephemeral preview links. Matching on domain suffix
// alone would expose demo/one-tap-login on the real production site. Ephemeral
// preview links use a distinct "id-preview--" hostname prefix, so we match on
// that instead of the domain suffix.
const DEMO_PREVIEW_PREFIX = "id-preview--";

export function isDemoHostBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "localhost" || h.startsWith("127.")) return true;
  return h.startsWith(DEMO_PREVIEW_PREFIX);
}

export async function signInAsDemoPersona(persona: DemoPersona): Promise<void> {
  const { token_hash } = await demoSignIn({ data: { persona } });
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash,
  });
  if (error) throw error;
}

export function currentDemoPersona(user: { user_metadata?: Record<string, unknown> } | null): DemoPersona | null {
  const p = user?.user_metadata?.demo_persona;
  if (typeof p === "string" && (DEMO_PERSONAS as readonly string[]).includes(p)) {
    return p as DemoPersona;
  }
  return null;
}
