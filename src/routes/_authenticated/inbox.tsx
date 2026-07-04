import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { randomPick, NO_PENDING_REQUESTS_MESSAGES, CONNECTION_ACCEPTED_MESSAGES } from "@/lib/personality";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "@/lib/motion";
import { celebrateOnce } from "@/lib/celebrate";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — Intent" },
      { name: "description", content: "Your conversations and connection requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
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
  const noPendingMessage = useMemo(() => randomPick(NO_PENDING_REQUESTS_MESSAGES), []);

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
        .select("thread_id, last_read_at").eq("user_id", user.id);
      if (error) throw error;
      const ids = (tms ?? []).map((t) => t.thread_id);
      if (ids.length === 0) return [];
      const lastReadByThread = new Map((tms ?? []).map((t) => [t.thread_id, t.last_read_at as string]));

      const { data, error: e2 } = await supabase.from("threads")
        .select(`id, kind, created_at, thread_members(user_id, profiles(id, name, photo_url))`)
        .in("id", ids).order("created_at", { ascending: false });
      if (e2) throw e2;

      // Latest message per thread, to determine unread status per row.
      const { data: latest, error: e3 } = await supabase.from("messages")
        .select("thread_id, sender_id, created_at")
        .in("thread_id", ids).order("created_at", { ascending: false });
      if (e3) throw e3;
      const latestByThread = new Map<string, { sender_id: string; created_at: string }>();
      for (const m of latest ?? []) {
        if (!latestByThread.has(m.thread_id)) latestByThread.set(m.thread_id, m);
      }

      return (data ?? []).map((t) => {
        const lastMsg = latestByThread.get(t.id);
        const myLastRead = lastReadByThread.get(t.id);
        const unread = !!lastMsg && lastMsg.sender_id !== user.id &&
          (!myLastRead || new Date(lastMsg.created_at) > new Date(myLastRead));
        return { ...t, unread };
      });
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
      toast.success(randomPick(CONNECTION_ACCEPTED_MESSAGES));
      celebrateOnce(user.id, "first-connection-accepted");
      qc.invalidateQueries({ queryKey: ["connections", user.id] });
      qc.invalidateQueries({ queryKey: ["threads", user.id] });
      qc.invalidateQueries({ queryKey: ["inbox-badge-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: counts } = useQuery({
    queryKey: ["inbox-badge-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_inbox_counts").single();
      if (error) throw error;
      return data as { received_count: number; unread_messages: number };
    },
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const rows = connections.data ?? [];
  const received = rows.filter((c) => c.state === "requested" && c.requested_by !== user.id);
  const sent = rows.filter((c) => c.state === "requested" && c.requested_by === user.id);

  const tabs: { id: TabId; label: string; badge: number | null }[] = [
    { id: "chats", label: "Chats", badge: counts?.unread_messages ? counts.unread_messages : null },
    { id: "received", label: "Received", badge: received.length > 0 ? received.length : null },
    { id: "sent", label: "Sent", badge: null },
  ];

  if (isThreadOpen) {
    return <Outlet />;
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="display text-3xl">Inbox</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Conversations and connection requests, in one calm place.
      </p>

      <div
        className="mt-5 inline-flex rounded-full border border-border/70 bg-surface p-1 text-[13px] shadow-sm"
        style={{ transition: motion.transition("background-color, border-color", "quick") }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={"inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 " +
              (tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            style={{ transition: motion.transition("background-color, color", "quick") }}
          >
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
          emptyText={noPendingMessage}
          emptyIcon={<UserPlus className="size-6" aria-hidden />}
          onAccept={(c) => accept.mutate({ id: c.id })}
        />
      )}

      {tab === "sent" && (
        <RequestList
          rows={sent}
          userId={user.id}
          emptyText="You haven't sent any requests yet."
          emptyIcon={<UserPlus className="size-6" aria-hidden />}
          onAccept={null}
        />
      )}
    </div>
  );
}

function RequestList({
  rows, userId, emptyText, emptyIcon, onAccept,
}: {
  rows: ConnectionRow[];
  userId: string;
  emptyText: string;
  emptyIcon?: React.ReactNode;
  onAccept: ((c: ConnectionRow) => void) | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState icon={emptyIcon} title="Nothing waiting" description={emptyText} />
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-4 pb-10">
      {rows.map((cn) => {
        const other = cn.user_a === userId ? cn.b : cn.a;
        if (!other) return null;
        const incoming = cn.requested_by !== userId;
        const statusLabel = incoming ? "Wants to connect with you" : "Waiting for reply";
        const contextLabel = cn.intent?.title
          ?? [cn.origin_category, cn.origin_city].filter(Boolean).join(" · ")
          ?? null;
        return (
          <div
            key={cn.id}
            className="flex items-start gap-3 rounded-3xl border border-border/60 bg-surface p-4 shadow-sm"
            style={{ transition: motion.transition("box-shadow, border-color", "quick") }}
          >
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
                    className="mt-1.5 block truncate rounded-lg bg-secondary/60 px-2 py-1 text-[12px] font-medium hover:bg-secondary"
                    style={{ transition: motion.transition("background-color", "quick") }}
                  >
                    {incoming ? "About: " : "On: "}{contextLabel}
                  </Link>
                ) : (
                  <p className="mt-1.5 truncate text-[12px] text-muted-foreground">{contextLabel}</p>
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
  if (threads.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<MessageCircle className="size-6" aria-hidden />}
          title="No chats yet"
          description="Chats open here once you and someone else both accept a connection."
        />
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-4 pb-10">
      {(threads as Array<{ id: string; unread: boolean; thread_members: Array<{ user_id: string; profiles: { id: string; name: string | null; photo_url: string | null } | null }> }>).map((t) => {
        const other = t.thread_members.find((m) => m.user_id !== user.id)?.profiles;
        return (
          <Link
            key={t.id}
            to="/inbox/$threadId"
            params={{ threadId: t.id }}
            className="flex items-center gap-3 rounded-3xl border border-border/60 bg-surface p-4 shadow-sm hover:bg-secondary/40"
            style={{ transition: motion.transition("background-color, border-color", "quick") }}
          >
            <div className="relative shrink-0">
              {other?.photo_url ? (
                <img src={other.photo_url} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <span className="grid size-12 place-items-center rounded-full bg-muted text-sm font-semibold">
                  {(other?.name?.[0] ?? "·").toUpperCase()}
                </span>
              )}
              {t.unread && (
                <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-surface bg-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={"truncate " + (t.unread ? "font-semibold" : "font-medium")}>{other?.name ?? "Chat"}</p>
              <p className={"text-[12px] " + (t.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                {t.unread ? "New message" : "Tap to open"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function _useEffectShim() { useEffect(() => {}, []); }
