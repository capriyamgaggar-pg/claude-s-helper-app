import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IntentCard, type IntentCardData } from "@/components/intent-card";
import { toast } from "sonner";
import { STATUS_TAB_FILTERS, type IntentStatus } from "@/lib/intent-lifecycle";
import { pairKey } from "@/lib/participation";
import { canSeeCreator } from "@/lib/creator-visibility";

type TopTab = "mine" | "interested" | "joined" | "connections";

export const Route = createFileRoute("/_authenticated/profile/activity")({
  head: () => ({ meta: [{ title: "Activity — Intent" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: TopTab } => ({
    tab: (["mine", "interested", "joined", "connections"] as const).includes(search.tab as TopTab)
      ? (search.tab as TopTab)
      : undefined,
  }),
  component: Activity,
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
  creator_visibility: string | null;
  intent_categories: { label: string } | null;
  intent_participants: { user_id: string }[];
}

interface ParticipationRow {
  intent_id: string;
  state: string;
  intent: {
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
    creator_id: string;
    creator_visibility: string | null;
    intent_categories: { label: string } | null;
    profiles: { name: string | null; photo_url: string | null } | null;
    intent_participants: { user_id: string }[];
  } | null;
}

interface ConnectionRow {
  id: string;
  user_a: string;
  user_b: string;
  state: string;
  origin_category: string | null;
  origin_city: string | null;
  intent_id: string | null;
  a: { id: string; name: string | null; photo_url: string | null; profession: string | null; city: string | null } | null;
  b: { id: string; name: string | null; photo_url: string | null; profession: string | null; city: string | null } | null;
  intent: { intent_categories: { label: string } | null } | null;
}

function rowToCard(
  i: MyIntentRow | ParticipationRow["intent"],
  creatorName: string | null,
  creatorPhoto: string | null,
  creatorVisible: boolean,
): IntentCardData {
  if (!i) return {} as IntentCardData;
  return {
    id: i.id,
    title: i.title,
    category_slug: i.category_slug,
    category_label: i.intent_categories?.label ?? i.category_slug,
    city: i.locality && i.city ? `${i.locality}, ${i.city}` : i.city,
    starts_at: i.starts_at,
    people_needed: i.people_needed,
    interested_count: i.intent_participants.length,
    creator_name: creatorName,
    creator_photo: creatorPhoto,
    creator_visible: creatorVisible,
    created_at: i.created_at,
    status: i.status,
    expires_at: i.expires_at,
  };
}

function Activity() {
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [topTab, setTopTab] = useState<TopTab>(search.tab ?? "mine");
  const [mineSub, setMineSub] = useState<IntentStatus>("active");

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_profile");
      if (error) throw error;
      return data;
    },
  });

  const { data: mine } = useQuery({
    queryKey: ["my-intents", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents")
        .select(`id, title, category_slug, status, expires_at, starts_at, people_needed, city, locality, created_at, creator_visibility,
          intent_categories(label),
          intent_participants(user_id)`)
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MyIntentRow[];
    },
  });

  const { data: newResponseCounts } = useQuery({
    queryKey: ["new-response-counts", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_new_response_counts");
      if (error) throw error;
      return new Map((data ?? []).map((r: { intent_id: string; new_count: number }) => [r.intent_id, r.new_count]));
    },
    refetchInterval: 20_000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-reputation-stats", user.id, "created-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reputation_stats")
        .select("user_id, intents_created")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { user_id: string; intents_created: number } | null;
    },
  });

  const { data: participations } = useQuery({
    queryKey: ["my-participations", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("intent_participants")
        .select(`intent_id, state,
          intent:intents!intent_participants_intent_id_fkey(
            id, title, category_slug, status, expires_at, starts_at, people_needed,
            city, locality, created_at, creator_id, creator_visibility,
            intent_categories(label),
            profiles!intents_creator_id_fkey(name, photo_url),
            intent_participants(user_id)
          )`)
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as unknown as ParticipationRow[];
    },
  });

  const { data: connections } = useQuery({
    queryKey: ["my-connections", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("connections").select(`
        id, user_a, user_b, state, origin_category, origin_city, intent_id,
        a:profiles!connections_user_a_fkey(id, name, photo_url, profession, city),
        b:profiles!connections_user_b_fkey(id, name, photo_url, profession, city),
        intent:intents!connections_intent_id_fkey(intent_categories(label))
      `).eq("state", "accepted").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConnectionRow[];
    },
  });

  const removeInterest = useMutation({
    mutationFn: async (intentId: string) => {
      const { error } = await supabase.from("intent_participants")
        .delete().eq("intent_id", intentId).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Interest removed"); qc.invalidateQueries({ queryKey: ["my-participations", user.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openOrCreateThread = useMutation({
    mutationFn: async (otherUserId: string) => {
      const [a, b] = pairKey(user.id, otherUserId);
      const { data: conn } = await supabase.from("connections").select("intent_id")
        .eq("user_a", a).eq("user_b", b).maybeSingle();
      const intentId = conn?.intent_id ?? null;
      let tid: string | undefined;
      if (intentId) {
        const { data: t } = await supabase.from("threads").select("id").eq("intent_id", intentId).maybeSingle();
        tid = t?.id;
      }
      if (!tid) {
        const { data: mineThreads } = await supabase.from("thread_members").select("thread_id").eq("user_id", user.id);
        const myIds = (mineThreads ?? []).map((r) => r.thread_id);
        if (myIds.length > 0) {
          const { data: other } = await supabase.from("thread_members")
            .select("thread_id").eq("user_id", otherUserId).in("thread_id", myIds);
          tid = other?.[0]?.thread_id;
        }
      }
      if (!tid) {
        const { data: t, error: et } = await supabase.from("threads")
          .insert({ kind: intentId ? "intent" : "dm", intent_id: intentId }).select("id").single();
        if (et) throw et;
        tid = t.id;
        const { error: em } = await supabase.from("thread_members").insert([
          { thread_id: tid, user_id: user.id },
          { thread_id: tid, user_id: otherUserId },
        ]);
        if (em) throw em;
      }
      return tid;
    },
    onSuccess: (tid) => { if (tid) navigate({ to: "/inbox/$threadId", params: { threadId: tid } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const now = Date.now();
  const mineFiltered = (mine ?? []).filter((i) => {
    if (mineSub === "active") return i.status === "active" && new Date(i.expires_at).getTime() > now;
    return i.status === mineSub;
  });

  const EMPTY_COPY = {
    active: { title: "No active intents.", body: "Your active intents will appear here." },
    fulfilled: { title: "No fulfilled intents yet.", body: "Completed intents will appear here." },
    closed: { title: "No closed intents yet.", body: "Closed intents will appear here." },
    expired: { title: "No expired intents.", body: "Expired intents will appear here." },
  } as const;

  const interestedRows = (participations ?? []).filter((p) => p.state === "interested" && p.intent);
  const joinedRows = (participations ?? []).filter((p) => p.state === "confirmed" && p.intent);
  const upcoming = joinedRows.filter((p) => p.intent!.starts_at && new Date(p.intent!.starts_at).getTime() >= now);
  const past = joinedRows.filter((p) => !p.intent!.starts_at || new Date(p.intent!.starts_at).getTime() < now);

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-center gap-3">
        <Link to="/profile/me" className="grid size-9 place-items-center rounded-full hover:bg-secondary">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="display text-2xl">Activity</h1>
      </div>

      <Tabs value={topTab} onValueChange={(v) => setTopTab(v as TopTab)} className="mt-6">
        <TabsList className="grid h-9 w-full grid-cols-4">
          <TabsTrigger value="mine" className="text-[12px]">My Intents</TabsTrigger>
          <TabsTrigger value="interested" className="text-[12px]">Interested</TabsTrigger>
          <TabsTrigger value="joined" className="text-[12px]">Joined</TabsTrigger>
          <TabsTrigger value="connections" className="text-[12px]">Connections</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          <Tabs value={mineSub} onValueChange={(v) => setMineSub(v as IntentStatus)}>
            <TabsList className="grid h-9 w-full grid-cols-4">
              {STATUS_TAB_FILTERS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="text-[12px]">{t.label}</TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={mineSub} className="mt-4 space-y-3">
              {(() => {
                if (!mine || statsLoading) return null;
                const hasEverCreatedIntent = ((stats?.intents_created ?? 0) > 0) || mine.length > 0;
                if (!hasEverCreatedIntent) {
                  return (
                    <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                      <p className="font-semibold text-foreground">Your first intent starts here.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Every connection starts with one intent. Create yours and let the right people find you.
                      </p>
                      <Link to="/intents/new">
                        <Button className="mt-4" size="sm">Create your first intent</Button>
                      </Link>
                    </div>
                  );
                }
                if (mineFiltered.length === 0) {
                  const copy = EMPTY_COPY[mineSub];
                  return (
                    <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                      <p className="font-semibold text-foreground">{copy.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
                    </div>
                  );
                }
                return null;
              })()}
              {mineFiltered.map((i) => (
                <IntentCard key={i.id} intent={{
                  ...rowToCard(i, profile?.name ?? null, profile?.photo_url ?? null, true),
                  newResponses: newResponseCounts?.get(i.id) ?? 0,
                }} />
              ))}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="interested" className="mt-4 space-y-3">
          {interestedRows.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              You haven't shown interest in anything yet.
            </p>
          )}
          {interestedRows.map((p) => {
            const visible = canSeeCreator({
              creator_id: p.intent!.creator_id,
              creator_visibility: p.intent!.creator_visibility,
              viewer_id: user.id,
              viewer_participant_state: p.state,
            });
            return (
              <div key={p.intent_id} className="space-y-2">
                <IntentCard intent={rowToCard(p.intent, p.intent!.profiles?.name ?? null, p.intent!.profiles?.photo_url ?? null, visible)} />
                <button
                  type="button"
                  onClick={() => removeInterest.mutate(p.intent_id)}
                  className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" /> Remove interest
                </button>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="joined" className="mt-4 space-y-6">
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</p>
            <div className="space-y-3">
              {upcoming.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
                  Nothing upcoming.
                </p>
              )}
              {upcoming.map((p) => (
                <IntentCard key={p.intent_id} intent={rowToCard(p.intent, p.intent!.profiles?.name ?? null, p.intent!.profiles?.photo_url ?? null, true)} />
              ))}
            </div>
          </section>
          {past.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Past</p>
              <div className="space-y-3">
                {past.map((p) => (
                  <IntentCard key={p.intent_id} intent={rowToCard(p.intent, p.intent!.profiles?.name ?? null, p.intent!.profiles?.photo_url ?? null, true)} />
                ))}
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="connections" className="mt-4 space-y-3">
          {(connections ?? []).length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              No connections yet. Connections appear when both sides accept.
            </p>
          )}
          {(connections ?? []).map((c) => {
            const other = c.user_a === user.id ? c.b : c.a;
            if (!other) return null;
            const categoryLabel = c.intent?.intent_categories?.label ?? c.origin_category ?? null;
            const context = [categoryLabel, c.origin_city].filter(Boolean).join(" • ");
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                <Link to="/profile/$userId" params={{ userId: other.id }}>
                  {other.photo_url ? (
                    <img src={other.photo_url} alt="" className="size-12 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {(other.name?.[0] ?? "·").toUpperCase()}
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/profile/$userId" params={{ userId: other.id }} className="block truncate font-medium">
                    {other.name ?? "Someone"}
                  </Link>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {[other.profession, other.city].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {context && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      Connected through: {context}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={() => openOrCreateThread.mutate(other.id)}>
                  <MessageCircle className="mr-1 size-3.5" /> Chat
                </Button>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
