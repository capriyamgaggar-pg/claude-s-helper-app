import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MapPin, Calendar, Users, Sparkle, Clock, CheckCircle2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FulfillDialog } from "@/components/fulfill-dialog";
import { ReactivateDialog } from "@/components/reactivate-dialog";
import { statusPill, type IntentStatus, CLOSURE_REASONS } from "@/lib/intent-lifecycle";

export const Route = createFileRoute("/_authenticated/intents/$intentId")({
  head: ({ params }) => ({ meta: [{ title: `Intent — ${params.intentId.slice(0, 6)}` }] }),
  component: IntentDetail,
});

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
        intent_participants(user_id, state, profiles(name, photo_url))
      `).eq("id", intentId).single();
      if (error) throw error;
      return data;
    },
  });

  const myState = data?.intent_participants?.find((p: { user_id: string }) => p.user_id === user.id)?.state as
    | "interested" | "joining" | "confirmed" | "declined" | undefined;

  const setState = useMutation({
    mutationFn: async (state: "interested" | "joining") => {
      const { error } = await supabase.from("intent_participants")
        .upsert({ intent_id: intentId, user_id: user.id, state }, { onConflict: "intent_id,user_id" });
      if (error) throw error;
    },
    onSuccess: (_d, state) => {
      toast.success(state === "joining" ? "You're in" : "Marked as interested");
      qc.invalidateQueries({ queryKey: ["intent", intentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function connectWithCreator() {
    if (!data) return;
    const me = user.id;
    const them = data.creator_id;
    if (me === them) return;
    const [a, b] = me < them ? [me, them] : [them, me];
    const { error } = await supabase.from("connections").upsert({
      user_a: a, user_b: b, requested_by: me, state: "requested", intent_id: intentId,
    }, { onConflict: "user_a,user_b" });
    if (error) { toast.error(error.message); return; }
    toast.success("Connection request sent");
  }

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

  const toneClass =
    pill.tone === "amber"
      ? "bg-amber-100 text-amber-900"
      : pill.tone === "green"
        ? "bg-emerald-100 text-emerald-900"
        : pill.tone === "grey"
          ? "bg-muted text-muted-foreground"
          : "bg-secondary text-muted-foreground";

  const closureLabel = CLOSURE_REASONS.find((r) => r.code === data.closure_reason_code)?.label;

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
          <span className="flex items-center gap-1.5"><Users className="size-4" />{data.people_needed} needed</span>
        </div>

        {data.description && (
          <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
            {data.description}
          </p>
        )}

        {/* Creator-visible outcome details */}
        {isCreator && status === "fulfilled" && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-[13px]">
            <p className="font-medium text-emerald-900">Marked as fulfilled</p>
            {data.fulfilled_note && (
              <p className="mt-1 text-emerald-900/80">{data.fulfilled_note}</p>
            )}
          </div>
        )}
        {isCreator && status === "closed" && (
          <div className="mt-5 rounded-2xl border border-border bg-muted/60 p-4 text-[13px]">
            <p className="font-medium">Closed{closureLabel ? ` — ${closureLabel}` : ""}</p>
            {data.closure_reason_note && (
              <p className="mt-1 text-muted-foreground">{data.closure_reason_note}</p>
            )}
          </div>
        )}

        {/* Soft notice for visitors on an inactive intent */}
        {!isCreator && !isActive && (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-4 text-center text-[13px] text-muted-foreground">
            This intent is no longer active. Existing chats remain open.
          </div>
        )}

        <Link to="/profile/$userId" params={{ userId: data.profiles!.id }}
          className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-secondary/60">
          {data.profiles?.photo_url ? (
            <img src={data.profiles.photo_url} alt="" className="size-12 rounded-full object-cover" />
          ) : (
            <span className="grid size-12 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {(data.profiles?.name?.[0] ?? "·").toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Posted by</p>
            <p className="truncate font-medium">{data.profiles?.name ?? "Someone"}</p>
            {data.profiles?.city && <p className="truncate text-[12px] text-muted-foreground">{data.profiles.city}</p>}
          </div>
        </Link>

        <section className="mt-6 pb-32">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            {data.intent_participants?.length ?? 0} interested
          </h2>
          <div className="mt-3 flex -space-x-2">
            {(data.intent_participants ?? []).slice(0, 8).map((p: { user_id: string; profiles: { name: string | null; photo_url: string | null } | null }) =>
              p.profiles?.photo_url ? (
                <img key={p.user_id} src={p.profiles.photo_url} alt="" className="size-9 rounded-full border-2 border-background object-cover" />
              ) : (
                <span key={p.user_id} className="grid size-9 place-items-center rounded-full border-2 border-background bg-muted text-[11px] font-semibold">
                  {(p.profiles?.name?.[0] ?? "·").toUpperCase()}
                </span>
              ))}
          </div>
        </section>
      </article>

      {/* Visitor actions — only on truly active intents */}
      {!isCreator && isActive && (
        <footer className="sticky bottom-16 mx-3 mb-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={myState === "interested" ? "default" : "outline"}
              className="h-11 rounded-xl"
              onClick={() => setState.mutate("interested")}
              disabled={setState.isPending}
            >
              Interested
            </Button>
            <Button
              className="h-11 rounded-xl"
              variant={myState === "joining" ? "default" : "outline"}
              onClick={() => setState.mutate("joining")}
              disabled={setState.isPending}
            >
              Joining
            </Button>
            <Button variant="secondary" className="h-11 rounded-xl gap-1" onClick={connectWithCreator}>
              <Sparkle className="size-4" /> Connect
            </Button>
          </div>
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
