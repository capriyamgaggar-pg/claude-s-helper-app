import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IntentCard, type IntentCardData } from "@/components/intent-card";
import { toast } from "sonner";
import { STATUS_TAB_FILTERS, type IntentStatus } from "@/lib/intent-lifecycle";

export const Route = createFileRoute("/_authenticated/profile/me")({
  head: () => ({ meta: [{ title: "Your profile — Intent" }] }),
  component: MeProfile,
});

interface MyIntentRow {
  id: string;
  title: string;
  category_slug: string;
  status: string;
  expires_at: string;
  starts_at: string | null;
  people_needed: number;
  city: string | null;
  locality: string | null;
  created_at: string;
  intent_categories: { label: string } | null;
  intent_participants: { user_id: string }[];
}

function MeProfile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState<IntentStatus>("active");

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: mine } = useQuery({
    queryKey: ["my-intents", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents")
        .select(`id, title, category_slug, status, expires_at, starts_at, people_needed, city, locality, created_at,
          intent_categories(label),
          intent_participants(user_id)`)
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MyIntentRow[];
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  // For the active tab, only show active+unexpired so the count matches discovery.
  const now = Date.now();
  const filtered = (mine ?? []).filter((i) => {
    if (tab === "active") return i.status === "active" && new Date(i.expires_at).getTime() > now;
    return i.status === tab;
  });

  return (
    <div className="px-5 pt-8 pb-8">
      <header className="flex items-center gap-4">
        {profile?.photo_url ? (
          <img src={profile.photo_url} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
            {(profile?.name?.[0] ?? "·").toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="display truncate text-2xl">{profile?.name ?? "You"}</h1>
          {profile?.profession && <p className="text-[13px] text-muted-foreground">{profile.profession}</p>}
          {profile?.city && <p className="text-[12px] text-muted-foreground">{profile.city}</p>}
        </div>
      </header>

      {profile?.bio && <p className="mt-5 text-[14px] leading-relaxed">{profile.bio}</p>}

      {profile?.interests && profile.interests.length > 0 && (
        <section className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.interests.map((i: string) => (
              <span key={i} className="rounded-full bg-secondary px-2.5 py-0.5 text-[12px]">{i}</span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          My intents
        </p>
        <Tabs value={tab} onValueChange={(v) => setTab(v as IntentStatus)} className="mt-3">
          <TabsList className="grid h-9 w-full grid-cols-4">
            {STATUS_TAB_FILTERS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-[12px]">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-3">
            {filtered.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
                Nothing here yet.
              </p>
            )}
            {filtered.map((i) => {
              const card: IntentCardData = {
                id: i.id,
                title: i.title,
                category_label: i.intent_categories?.label ?? i.category_slug,
                city: i.locality && i.city ? `${i.locality}, ${i.city}` : i.city,
                starts_at: i.starts_at,
                people_needed: i.people_needed,
                interested_count: i.intent_participants.length,
                creator_name: profile?.name ?? null,
                creator_photo: profile?.photo_url ?? null,
                created_at: i.created_at,
                status: i.status,
                expires_at: i.expires_at,
              };
              return <IntentCard key={card.id} intent={card} />;
            })}
          </TabsContent>
        </Tabs>
      </section>

      <Button variant="outline" className="mt-8 w-full gap-2 rounded-xl" onClick={signOut}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </div>
  );
}
