import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MapPin, Calendar, Users, Clock, CheckCircle2, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FulfillDialog } from "@/components/fulfill-dialog";
import { ReactivateDialog } from "@/components/reactivate-dialog";
import { statusPill, type IntentStatus, CLOSURE_REASONS } from "@/lib/intent-lifecycle";
import { ParticipationButton } from "@/components/intent/participation-button";
import { InterestedList, type InterestedRow } from "@/components/intent/interested-list";
import { pairKey, type JoinMode, type ParticipationState, type ConnectionState } from "@/lib/participation";

export const Route = createFileRoute("/_authenticated/intents/$intentId")({
  head: ({ params }) => ({ meta: [{ title: `Intent — ${params.intentId.slice(0, 6)}` }] }),
  component: IntentDetail,
});

interface ParticipantRow {
  user_id: string;
  state: string;
  interest_message: string | null;
  interest_at: string;
  confirm_initiated_by: string | null;
  profiles: {
    id: string;
    name: string | null;
    photo_url: string | null;
    city: string | null;
    profession: string | null;
  } | null;
}

function IntentDetail() {
  const { intentId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["intent", intentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents").select(`
        *,
        intent_categories(label),
        profiles!intents_creator_id_fkey(id, name, photo_url, city, bio),
        intent_participants(user_id, state, interest_message, interest_at, confirm_initiated_by,
          profiles(id, name, photo_url, city, profession))
      `).eq("id", intentId).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch the user's connection with the creator (so the stage machine knows what to show)
  const { data: connection } = useQuery({
    enabled: !!data && data.creator_id !== user.id,
    queryKey: ["intent-connection", intentId, user.id],
    queryFn: async () => {
      if (!data) return null;
      const [a, b] = pairKey(user.id, data.creator_id);
      const { data: row } = await supabase.from("connections")
        .select("id, state, requested_by")
        .eq("user_a", a).eq("user_b", b).maybeSingle();
      return row;
    },
  });

  // Creator-only: existing connections with each interested user
  const { data: creatorConnections } = useQuery({
    enabled: !!data && data.creator_id === user.id && Array.isArray(data.intent_participants),
    queryKey: ["intent-creator-connections", intentId, user.id],
    queryFn: async () => {
      const others = (data?.intent_participants ?? [])
        .map((p: { user_id: string }) => p.user_id)
        .filter((id: string) => id !== user.id);
      if (others.length === 0) return {} as Record<string, { id: string; state: string; requested_by: string }>;
      const pairs = others.map((o: string) => pairKey(user.id, o));
      // Fetch all connections where the creator is one side
      const { data: rows } = await supabase.from("connections")
        .select("id, state, requested_by, user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      const map: Record<string, { id: string; state: string; requested_by: string }> = {};
      (rows ?? []).forEach((r) => {
        const otherId = r.user_a === user.id ? r.user_b : r.user_a;
        if (others.includes(otherId)) {
          map[otherId] = { id: r.id, state: r.state, requested_by: r.requested_by };
        }
      });
      void pairs; // (kept for symmetry/debug)
      return map;
    },
  });

  // Thread tied to this intent (used for "Open Chat")
  const { data: thread } = useQuery({
    enabled: !!data && data.creator_id !== user.id,
    queryKey: ["intent-thread", intentId, user.id],
    queryFn: async () => {
      const { data: row } = await supabase.from("threads")
        .select("id").eq("intent_id", intentId).maybeSingle();
      return row;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-5 pt-8">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const isCreator = data.creator_id === user.id;
  const status = data.status as IntentStatus;
  const pill = statusPill(status, data.expires_at);
  const isActive = status === "active" && new Date(data.expires_at).getTime() > Date.now();
  const isExpired = status === "expired" || (status === "active" && !isActive);
  const isTerminal = status === "fulfilled" || status === "closed";

  const participants = (data.intent_participants ?? []) as ParticipantRow[];
  const myRow = participants.find((p) => p.user_id === user.id);
  const joinedCount = participants.filter((p) => p.state === "confirmed").length;

  const toneClass =
    pill.tone === "amber"
      ? "bg-amber-100 text-amber-900"
      : pill.tone === "green"
        ? "bg-emerald-100 text-emerald-900"
        : pill.tone === "grey"
          ? "bg-muted text-muted-foreground"
          : "bg-secondary text-muted-foreground";

  const closureLabel = CLOSURE_REASONS.find((r) => r.code === data.closure_reason_code)?.label;
  const joinMode = (data.join_mode ?? "mutual_confirm") as JoinMode;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-4 pt-4">
        <Link to="/home" className="grid size-9 place-items-center rounded-full hover:bg-secondary">
          <ChevronLeft className="size-5" />
        </Link>
      </header>

      <article className="flex-1 px-5 pt-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {data.intent_categories?.label ?? data.category_slug}
          </span>
          <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium " + toneClass}>
            <Clock className="size-3" /> {pill.text}
          </span>
          {joinMode === "open_join" && (
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-900">
              Open join
            </span>
          )}
        </div>
        <h1 className="display mt-3 text-3xl leading-[1.15]">{data.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          {data.city && <span className="flex items-center gap-1.5"><MapPin className="size-4" />{data.city}</span>}
          {data.starts_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {new Date(data.starts_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          <span className="flex items-center gap-1.5"><Users className="size-4" />{joinedCount} joined · {data.people_needed} needed</span>
        </div>

        {data.description && (
          <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
            {data.description}
          </p>
        )}

        {isCreator && status === "fulfilled" && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-[13px]">
            <p className="font-medium text-emerald-900">Marked as fulfilled</p>
            {data.fulfilled_note && (<p className="mt-1 text-emerald-900/80">{data.fulfilled_note}</p>)}
          </div>
        )}
        {isCreator && status === "closed" && (
          <div className="mt-5 rounded-2xl border border-border bg-muted/60 p-4 text-[13px]">
            <p className="font-medium">Closed{closureLabel ? ` — ${closureLabel}` : ""}</p>
            {data.closure_reason_note && (<p className="mt-1 text-muted-foreground">{data.closure_reason_note}</p>)}
          </div>
        )}

        {!isCreator && !isActive && (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-4 text-center text-[13px] text-muted-foreground">
            This intent is no longer active. Existing chats remain open.
          </div>
        )}

        {/* Registration form entry points */}
        {isCreator && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link to="/intents/$intentId/form" params={{ intentId }}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-[13px] font-medium hover:bg-secondary/60">
              Registration form
            </Link>
            <Link to="/intents/$intentId/submissions" params={{ intentId }}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-[13px] font-medium hover:bg-secondary/60">
              Responses
            </Link>
          </div>
        )}
        {!isCreator && isActive && (
          <Link to="/intents/$intentId/register" params={{ intentId }}
            className="mt-5 block rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-[13px] font-medium hover:bg-secondary/60">
            Open registration form
          </Link>
        )}

        {(() => {
          const visible = canSeeCreator({
            creator_id: data.creator_id,
            creator_visibility: (data as { creator_visibility?: string | null }).creator_visibility ?? "public",
            viewer_id: user.id,
            viewer_connection_state: connection?.state ?? null,
            viewer_participant_state: myRow?.state ?? null,
          });
          const label = isOrganizerCategory(data.category_slug) ? "Organized by" : "Created by";
          const name = visible ? (data.profiles?.name ?? "Someone") : "Anonymous Creator";
          const photo = visible ? data.profiles?.photo_url : null;
          const city = visible ? data.profiles?.city : null;
          const card = (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
              {photo ? (
                <img src={photo} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <span className="grid size-12 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {(name?.[0] ?? "·").toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="truncate font-medium">{name}</p>
                {city && <p className="truncate text-[12px] text-muted-foreground">{city}</p>}
              </div>
            </div>
          );
          return visible ? (
            <Link to="/profile/$userId" params={{ userId: data.profiles!.id }} className="block hover:opacity-90">
              {card}
            </Link>
          ) : card;
        })()}


        {/* Creator-only: Interested list with optional notes */}
        {isCreator && (
          <div className="pb-32">
            <InterestedList
              intentId={intentId}
              creatorId={user.id}
              categorySlug={data.category_slug}
              city={data.city}
              rows={participants as InterestedRow[]}
              existingConnections={creatorConnections ?? {}}
            />
          </div>
        )}

        {/* Visitor: tasteful avatars row showing who has joined */}
        {!isCreator && joinedCount > 0 && (
          <section className="mt-6 pb-32">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              {joinedCount} joined
            </h2>
            <div className="mt-3 flex -space-x-2">
              {participants.filter((p) => p.state === "confirmed").slice(0, 8).map((p) =>
                p.profiles?.photo_url ? (
                  <img key={p.user_id} src={p.profiles.photo_url} alt="" className="size-9 rounded-full border-2 border-background object-cover" />
                ) : (
                  <span key={p.user_id} className="grid size-9 place-items-center rounded-full border-2 border-background bg-muted text-[11px] font-semibold">
                    {(p.profiles?.name?.[0] ?? "·").toUpperCase()}
                  </span>
                ),
              )}
            </div>
          </section>
        )}
        {!isCreator && joinedCount === 0 && <div className="pb-32" />}
      </article>

      {/* Visitor stage-aware CTA */}
      {!isCreator && isActive && (
        <footer className="sticky bottom-16 mx-3 mb-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
          <ParticipationButton
            intentId={intentId}
            creatorId={data.creator_id}
            meId={user.id}
            joinMode={joinMode}
            categorySlug={data.category_slug}
            city={data.city}
            myParticipation={myRow ? { state: myRow.state as ParticipationState, confirm_initiated_by: myRow.confirm_initiated_by } : null}
            connection={connection ? { id: connection.id, state: connection.state as ConnectionState, requested_by: connection.requested_by } : null}
            threadId={thread?.id ?? null}
          />
        </footer>
      )}

      {/* Creator actions */}
      {isCreator && (
        <footer className="sticky bottom-16 mx-3 mb-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
          {isActive && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 rounded-xl gap-1" onClick={() => navigate({ to: "/inbox" })}>
                Manage
              </Button>
              <Button className="h-11 rounded-xl gap-1" onClick={() => setFulfillOpen(true)}>
                <CheckCircle2 className="size-4" /> Mark as fulfilled
              </Button>
            </div>
          )}
          {isExpired && status === "expired" && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => setFulfillOpen(true)}>
                Did it work out?
              </Button>
              <Button className="h-11 rounded-xl gap-1" onClick={() => setReactivateOpen(true)}>
                <RotateCw className="size-4" /> Reactivate
              </Button>
            </div>
          )}
          {isTerminal && (
            <p className="py-2 text-center text-[13px] text-muted-foreground">
              This intent is {status}. Chats remain open.
            </p>
          )}
        </footer>
      )}

      <FulfillDialog
        intentId={intentId}
        open={fulfillOpen}
        onOpenChange={setFulfillOpen}
        onDone={() => qc.invalidateQueries({ queryKey: ["intent", intentId] })}
      />
      <ReactivateDialog
        intentId={intentId}
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        onDone={() => qc.invalidateQueries({ queryKey: ["intent", intentId] })}
      />
    </div>
  );
}
