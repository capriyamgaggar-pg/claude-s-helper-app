import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Intent" }] }),
  component: Inbox,
});

type TabId = "chats" | "received" | "sent";

interface ConnectionRow {
  id: string; user_a: string; user_b: string; requested_by: string; state: string;
  origin_category: string | null; origin_city: string | null;
  a: { id: string; name: string | null; photo_url: string | null; city: string | null } | null;
  b: { id: string; name: string | null; photo_url: string | null; city: string | null } | null;
  intent: { id: string; title: string | null; category_slug: string | null } | null;
}

function Inbox() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("chats");
  const location = useLocation();
  const isThreadOpen = location.pathname !== "/inbox" && location.pathname.startsWith("/inbox/");

  const connections = useQuery({
    queryKey: ["connections", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("connections").select(`
        *,
        a:profiles!connections_user_a_fkey(id, name, photo_url, city),
        b:profiles!connections_user_b_fkey(id, name, photo_url, city),
        intent:intents!connections_intent_id_fkey(id, title, category_slug)
      `).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConnectionRow[];
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
    mutationFn: async (c: { id: string }) => {
      const { data: threadId, error } = await supabase.rpc("accept_connection", {
        _connection_id: c.id,
      });
      if (error) throw error;
      return threadId as string;
    },
    onSuccess: () => {
      toast.success("Connected — chat is open");
      qc.invalidateQueries({ queryKey: ["connections", user.id] });
      qc.invalidateQueries({ queryKey: ["threads", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = connections.data ?? [];
  const received = rows.filter((c) => c.state === "requested" && c.requested_by !== user.id);
  const sent = rows.filter((c) => c.state === "requested" && c.requested_by === user.id);

  const tabs: { id: TabId; label: string; badge: number | null }[] = [
    { id: "chats", label: "Chats", badge: null },
    { id: "received", label: "Received", badge: received.length > 0 ? received.length : null },
    { id: "sent", label: "Sent", badge: null },
  ];

  if (isThreadOpen) {
    return <Outlet />;
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="display text-3xl">Inbox</h1>

      <div className="mt-4 inline-flex rounded-full border border-border bg-surface p-1 text-[13px]">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 " +
              (tab === t.id ? "bg-foreground text-background" : "text-muted-foreground")}>
            {t.label}
            {t.badge !== null && (
              <span className={"inline-flex min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold " +
                (tab === t.id ? "bg-background/20 text-background" : "bg-foreground text-background")}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "chats" && <ChatList user={user} threads={threads.data ?? []} />}

      {tab === "received" && (
        <RequestList
          rows={received}
          userId={user.id}
          emptyText="No pending requests."
          onAccept={(c) => accept.mutate({ id: c.id })}
        />
      )}

      {tab === "sent" && (
        <RequestList
          rows={sent}
          userId={user.id}
          emptyText="You haven't sent any requests yet."
          onAccept={null}
        />
      )}
    </div>
  );
}

function RequestList({
  rows, userId, emptyText, onAccept,
}: {
  rows: ConnectionRow[];
  userId: string;
  emptyText: string;
  onAccept: ((c: ConnectionRow) => void) | null;
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="mt-5 space-y-3 pb-8">
      {rows.map((cn) => {
        const other = cn.user_a === userId ? cn.b : cn.a;
        if (!other) return null;
        const incoming = cn.requested_by !== userId;
        const statusLabel = incoming ? "Wants to connect with you" : "Waiting for reply";
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
                    {incoming ? "About: " : "On: "}{contextLabel}
                  </Link>
                ) : (
                  <p className="mt-1 truncate text-[12px] text-muted-foreground">{contextLabel}</p>
                )
              )}
            </div>
            {onAccept && incoming ? (
              <Button size="sm" className="rounded-full" onClick={() => onAccept(cn)}>
                Accept
              </Button>
            ) : !incoming ? (
              <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Pending
              </span>
            ) : null}
          </div>
        );
      })}
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
