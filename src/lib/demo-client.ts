import { supabase } from "@/integrations/supabase/client";
import { demoSignIn, type DemoPersona, DEMO_PERSONAS } from "@/lib/demo.functions";

export { DEMO_PERSONAS };
export type { DemoPersona };

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

const DEMO_HOST_HINTS = [".lovable.app", ".lovable.dev", ".lovableproject.com"];

export function isDemoHostBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "localhost" || h.startsWith("127.")) return true;
  return DEMO_HOST_HINTS.some((s) => h.endsWith(s));
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
