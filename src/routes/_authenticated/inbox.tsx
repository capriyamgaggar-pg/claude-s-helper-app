import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Intent" }] }),
  component: Inbox,
});

function Inbox() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"requests" | "chats">("requests");

  const requests = useQuery({
    queryKey: ["connections", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("connections").select(`
        *,
        a:profiles!connections_user_a_fkey(id, name, photo_url, city),
        b:profiles!connections_user_b_fkey(id, name, photo_url, city),
        intent:intents!connections_intent_id_fkey(id, title, category_slug)
      `).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });


  const threads = useQuery({
    queryKey: ["threads", user.id],
    queryFn: async () => {
      const { data: tms, error } = await supabase.from("thread_members")
        .select("thread_id").eq("user_id", user.id);
      if (error) throw error;
      const ids = (tms ?? []).map((t) => t.thread_id);
      if (ids.length === 0) return [];
      const { data, error: e2 } = await supabase.from("threads")
        .select(`id, kind, created_at, thread_members(user_id, profiles(id, name, photo_url))`)
        .in("id", ids).order("created_at", { ascending: false });
      if (e2) throw e2;
      return data ?? [];
    },
  });

  const accept = useMutation({
    mutationFn: async (c: { id: string; user_a: string; user_b: string }) => {
      const { error } = await supabase.from("connections")
        .update({ state: "accepted" }).eq("id", c.id);
      if (error) throw error;
      // Create thread + add both members
      const { data: t, error: et } = await supabase.from("threads")
        .insert({ kind: "dm" }).select("id").single();
      if (et) throw et;
      const { error: em } = await supabase.from("thread_members").insert([
        { thread_id: t.id, user_id: c.user_a },
        { thread_id: t.id, user_id: c.user_b },
      ]);
      if (em) throw em;
      return t.id as string;
    },
    onSuccess: () => {
      toast.success("Connected — chat is open");
      qc.invalidateQueries({ queryKey: ["connections", user.id] });
      qc.invalidateQueries({ queryKey: ["threads", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="px-5 pt-8">
      <h1 className="display text-3xl">Inbox</h1>

      <div className="mt-4 inline-flex rounded-full border border-border bg-surface p-1 text-[13px]">
        {(["requests", "chats"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={"rounded-full px-4 py-1.5 " + (tab === t ? "bg-foreground text-background" : "text-muted-foreground")}>
            {t === "requests" ? "Requests" : "Chats"}
          </button>
        ))}
      </div>

      {tab === "requests" && (
        <div className="mt-5 space-y-3 pb-8">
          {(requests.data ?? []).map((c) => {
            const cn = c as unknown as {
              id: string; user_a: string; user_b: string; requested_by: string; state: string;
              origin_category: string | null; origin_city: string | null;
              a: { id: string; name: string | null; photo_url: string | null; city: string | null } | null;
              b: { id: string; name: string | null; photo_url: string | null; city: string | null } | null;
              intent: { id: string; title: string | null; category: string | null } | null;
            };
            const other = cn.user_a === user.id ? cn.b : cn.a;
            if (!other) return null;
            const incoming = cn.requested_by !== user.id && cn.state === "requested";
            const outgoing = cn.requested_by === user.id && cn.state === "requested";
            const statusLabel = cn.state === "accepted"
              ? "Connected"
              : incoming ? "Wants to connect with you" : "Request sent";
            const contextLabel = cn.intent?.title
              ?? [cn.origin_category, cn.origin_city].filter(Boolean).join(" · ")
              ?? null;
            return (
              <div key={cn.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3">
                {other.photo_url ? (
                  <img src={other.photo_url} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
                    {(other.name?.[0] ?? "·").toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{other.name ?? "Someone"}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">· {statusLabel}</span>
                  </div>
                  {contextLabel && (
                    cn.intent?.id ? (
                      <Link
                        to="/intents/$intentId"
                        params={{ intentId: cn.intent.id }}
                        className="mt-1 block truncate rounded-lg bg-secondary/60 px-2 py-1 text-[12px] font-medium hover:bg-secondary"
                      >
                        {outgoing ? "On: " : incoming ? "About: " : ""}{contextLabel}
                      </Link>
                    ) : (
                      <p className="mt-1 truncate text-[12px] text-muted-foreground">{contextLabel}</p>
                    )
                  )}
                </div>
                {incoming ? (
                  <Button size="sm" className="rounded-full"
                    onClick={() => accept.mutate({ id: cn.id, user_a: cn.user_a, user_b: cn.user_b })}>
                    Accept
                  </Button>
                ) : cn.state === "accepted" ? (
                  <Link to="/inbox" className="shrink-0 text-[12px] text-muted-foreground">Open</Link>
                ) : null}
              </div>
            );
          })}
          {(requests.data?.length ?? 0) === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">No requests yet.</p>
          )}

        </div>
      )}

      {tab === "chats" && <ChatList user={user} threads={threads.data ?? []} />}
    </div>
  );
}

function ChatList({ user, threads }: { user: { id: string }; threads: unknown[] }) {
  return (
    <div className="mt-5 space-y-3 pb-8">
      {threads.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Chats appear here once you mutually connect with someone.
        </p>
      )}
      {(threads as Array<{ id: string; thread_members: Array<{ user_id: string; profiles: { id: string; name: string | null; photo_url: string | null } | null }> }>).map((t) => {
        const other = t.thread_members.find((m) => m.user_id !== user.id)?.profiles;
        return (
          <Link key={t.id} to="/inbox/$threadId" params={{ threadId: t.id }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-secondary/60">
            {other?.photo_url ? (
              <img src={other.photo_url} alt="" className="size-12 rounded-full object-cover" />
            ) : (
              <span className="grid size-12 place-items-center rounded-full bg-muted text-sm font-semibold">
                {(other?.name?.[0] ?? "·").toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{other?.name ?? "Chat"}</p>
              <p className="text-[12px] text-muted-foreground">Tap to open</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function _useEffectShim() { useEffect(() => {}, []); }
