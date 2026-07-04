import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkle, MessageCircle, Hourglass, MapPin, X } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { BlockReportMenu } from "@/components/safety/block-report-menu";
import { toast } from "sonner";
import { randomPick, CONNECTION_SENT_MESSAGES } from "@/lib/personality";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReputationPanel } from "@/components/reputation-panel";
import { ActiveIntentCard, type ActiveIntentCardData } from "@/components/profile/active-intent-card";
import { PromoCard } from "@/components/profile/promo-card";
import { interestEmoji } from "@/lib/interest-emoji";
import { motion } from "@/lib/motion";

const CONNECT_LIMIT_24H = 10;


export const Route = createFileRoute("/_authenticated/profile/$userId")({
  head: ({ params }) => ({ meta: [{ title: `Profile — ${params.userId.slice(0, 6)}` }] }),
  component: PublicProfile,
});

function PublicProfile() {
  const { userId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, name, photo_url, city, profession, bio, languages, interests, linkedin_url, instagram_url, locality, state, country, onboarded, created_at, updated_at")
        .eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Viewer's own profile — reused from /profile/me query cache when available.
  const { data: viewerProfile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_profile");
      if (error) throw error;
      return data;
    },
    enabled: userId !== user.id,
  });

  const { data: intents } = useQuery({
    queryKey: ["public-intents", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents")
        .select("id, title, category_slug, intent_categories(label), created_at, starts_at, ends_at, people_needed, locality, city")
        .eq("creator_id", userId).eq("visibility", "public")
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: connection } = useQuery({
    queryKey: ["connection-status", user.id, userId],
    queryFn: async () => {
      if (userId === user.id) return null;
      const [a, b] = user.id < userId ? [user.id, userId] : [userId, user.id];
      const { data, error } = await supabase.from("connections")
        .select("id, state, requested_by, thread_id")
        .eq("user_a", a).eq("user_b", b)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: userId !== user.id,
  });

  // Rate limit: how many pending outbound requests I've sent in the last 24h.
  // Respectful default — prevents spam-connecting.
  const { data: recentSent = 0 } = useQuery({
    queryKey: ["connect-rate", user.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase.from("connections")
        .select("id", { count: "exact", head: true })
        .eq("requested_by", user.id).eq("state", "requested")
        .gte("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: userId !== user.id,
  });
  const rateLimited = recentSent >= CONNECT_LIMIT_24H;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const connect = useMutation({
    mutationFn: async () => {
      if (userId === user.id) return;
      const [a, b] = user.id < userId ? [user.id, userId] : [userId, user.id];
      const { error } = await supabase.from("connections")
        .upsert({ user_a: a, user_b: b, requested_by: user.id, state: "requested" },
          { onConflict: "user_a,user_b" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(randomPick(CONNECTION_SENT_MESSAGES));
      qc.invalidateQueries({ queryKey: ["connections", user.id] });
      qc.invalidateQueries({ queryKey: ["connection-status", user.id, userId] });
      qc.invalidateQueries({ queryKey: ["connect-rate", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const withdraw = useMutation({
    mutationFn: async () => {
      if (userId === user.id) return;
      const [a, b] = user.id < userId ? [user.id, userId] : [userId, user.id];
      const { error } = await supabase.from("connections")
        .delete().eq("user_a", a).eq("user_b", b);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request withdrawn");
      qc.invalidateQueries({ queryKey: ["connections", user.id] });
      qc.invalidateQueries({ queryKey: ["connection-status", user.id, userId] });
      qc.invalidateQueries({ queryKey: ["connect-rate", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const sharedInterests = useMemo(() => {
    if (!profile?.interests || !viewerProfile?.interests || userId === user.id) return 0;
    const mine = new Set(viewerProfile.interests as string[]);
    return (profile.interests as string[]).filter((i) => mine.has(i)).length;
  }, [profile?.interests, viewerProfile?.interests, userId, user.id]);

  if (!profile) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-[color:var(--surface-warm)] px-5 pt-4 pb-8">
      <div className="-ml-2 flex items-center justify-between">
        <BackButton fallback="/home" className="grid size-9 place-items-center rounded-full hover:bg-[color:color-mix(in_oklab,var(--accent-peach)_35%,white)]" />
        <BlockReportMenu userId={userId} />
      </div>

      <header className="mt-2 flex items-center gap-4">
        <div className="relative shrink-0">
          {profile.photo_url ? (
            <img src={profile.photo_url} alt="" className="relative size-16 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <span className="relative grid size-16 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--accent-peach)_45%,white)] text-xl font-semibold text-[color:var(--accent-orange)] ring-2 ring-white">
              {(profile.name?.[0] ?? "·").toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="display truncate text-2xl font-semibold tracking-tight">{profile.name ?? "Someone"}</h1>
          {profile.profession && <p className="text-[13px] text-muted-foreground">{profile.profession}</p>}
          {profile.city && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
              <MapPin className="size-3" />
              {profile.city}
            </p>
          )}
          {sharedInterests > 0 && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {sharedInterests} shared {sharedInterests === 1 ? "interest" : "interests"} with you
            </p>
          )}
        </div>
      </header>

      {profile.bio && <p className="mt-5 text-[14px] leading-relaxed">{profile.bio}</p>}

      {profile.interests?.length > 0 && (
        <section className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.interests.map((i: string) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-warm)] bg-white px-2.5 py-1 text-[12.5px] font-medium"
              >
                <span>{interestEmoji(i)}</span> {i}
              </span>
            ))}
          </div>
        </section>
      )}

      {userId !== user.id && (
        connection?.state === "accepted" && connection.thread_id ? (
          <Link to="/inbox/$threadId" params={{ threadId: connection.thread_id }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--accent-orange)" }}>
            <MessageCircle className="size-4" /> Chat
          </Link>
        ) : connection?.state === "requested" ? (
          <Button disabled className="mt-6 w-full gap-2 rounded-2xl border-[color:var(--border-warm)]" variant="outline">
            <Hourglass className="size-4" />
            {connection.requested_by === user.id ? "Request sent" : "Respond in your Inbox"}
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => connect.mutate()}
            disabled={connect.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--accent-orange)" }}
          >
            <Sparkle className="size-4" /> Connect
          </button>
        )
      )}

      <ReputationPanel userId={userId} />

      <section className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active intents</p>
        <div className="mt-3 space-y-2.5">
          {(intents ?? []).map((i) => {
            const row = i as unknown as {
              id: string; title: string; category_slug: string;
              intent_categories: { label: string } | null;
              starts_at: string | null; ends_at: string | null;
              people_needed: number | null; locality: string | null; city: string | null;
            };
            const data: ActiveIntentCardData = {
              id: row.id,
              title: row.title,
              category_slug: row.category_slug,
              category_label: row.intent_categories?.label ?? null,
              starts_at: row.starts_at,
              ends_at: row.ends_at,
              people_needed: row.people_needed,
              locality: row.locality,
              city: row.city,
            };
            return <ActiveIntentCard key={row.id} intent={data} />;
          })}
          {(intents?.length ?? 0) === 0 && (
            <p className="rounded-2xl border border-dashed border-[color:var(--border-warm)] bg-[color:var(--surface-card)] p-4 text-center text-sm text-muted-foreground">
              No active intents.
            </p>
          )}
        </div>
      </section>

      <PromoCard />
    </div>
  );
}
