import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkle, Clock, Lock } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startersFor } from "@/lib/categories";
import { ParticipationCard } from "@/components/chat/participation-card";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { BlockReportMenu } from "@/components/safety/block-report-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "@/lib/motion";

export const Route = createFileRoute("/_authenticated/inbox/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — Intent" },
      { name: "description", content: "A conversation bounded to your shared intent." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatThread,
});

const ENDED_STATUSES = new Set(["fulfilled", "closed", "expired", "cancelled", "completed"]);

interface Message { id: string; thread_id: string; sender_id: string; body: string; created_at: string }

function ChatThread() {
  const { threadId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx = useQuery({
    queryKey: ["thread-ctx", threadId],
    queryFn: async () => {
      const { data: thread, error: et } = await supabase.from("threads")
        .select(`id, kind, intent_id, intents(id, title, category_slug, creator_id, status, expires_at, ends_at, intent_categories(label)),
          thread_members(user_id, profiles(id, name, photo_url, interests))`)
        .eq("id", threadId).single();
      if (et) throw et;
      return thread;
    },
  });




  // initial messages
  useEffect(() => {
    supabase.from("messages").select("*").eq("thread_id", threadId)
      .order("created_at").then(({ data }) => setMessages((data ?? []) as Message[]));
  }, [threadId]);

  // realtime
  useEffect(() => {
    const channel = supabase.channel(`messages:${threadId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  // Mark as read whenever we open the thread, and again whenever a new
  // message arrives while we're actively viewing it.
  useEffect(() => {
    supabase.from("thread_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("thread_id", threadId).eq("user_id", user.id)
      .then(() => qc.invalidateQueries({ queryKey: ["inbox-badge-counts"] }));
  }, [threadId, user.id, messages.length, qc]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBody("");
    const { error } = await supabase.from("messages")
      .insert({ thread_id: threadId, sender_id: user.id, body: trimmed });
    if (error) toast.error(error.message);
    // Constitution §5: feedback visible + finish the loop — keep focus in the composer.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // Focus composer on mount + thread change (chat-agent-ui-contract).
  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId]);

  const ctxData = ctx.data as unknown as {
    intent_id: string | null;
    intents: {
      id: string; title: string; category_slug: string; creator_id: string;
      status: string | null; expires_at: string | null; ends_at: string | null;
      intent_categories: { label: string } | null;
    } | null;
    thread_members: Array<{ user_id: string; profiles: { id: string; name: string | null; photo_url: string | null; interests: string[] } | null }>;
  } | undefined;

  const otherMember = ctxData?.thread_members.find((m) => m.user_id !== user.id);
  const other = otherMember?.profiles;
  const me = ctxData?.thread_members.find((m) => m.user_id === user.id)?.profiles;
  const sharedInterests = (me?.interests ?? []).filter((i) => (other?.interests ?? []).includes(i));
  const starters = startersFor(ctxData?.intents?.category_slug, ctxData?.intents?.creator_id === user.id);

  // Ephemeral chat: bounded to the intent. Closes when the intent ends.
  const intent = ctxData?.intents;
  const isBounded = !!ctxData?.intent_id && !!intent;
  const ended = useMemo(() => {
    if (!intent) return false;
    if (intent.status && ENDED_STATUSES.has(intent.status)) return true;
    const now = Date.now();
    if (intent.expires_at && new Date(intent.expires_at).getTime() < now) return true;
    if (intent.ends_at && new Date(intent.ends_at).getTime() < now) return true;
    return false;
  }, [intent]);

  const showOpener = messages.length === 0 && !!ctxData && !ended;


  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <BackButton fallback="/inbox" />
        {otherMember && (
          <Link to="/profile/$userId" params={{ userId: otherMember.user_id }}
            className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
            {other?.photo_url ? (
              <img src={other.photo_url} alt="" className="size-9 rounded-full object-cover" />
            ) : (
              <span className="grid size-9 place-items-center rounded-full bg-muted text-[12px] font-semibold">
                {(other?.name?.[0] ?? "·").toUpperCase()}
              </span>
            )}
            <p className="truncate font-medium">{other?.name ?? "Chat"}</p>
          </Link>
        )}
        {otherMember && (
          <BlockReportMenu
            userId={otherMember.user_id}
            threadId={threadId}
            intentId={ctxData?.intent_id ?? undefined}
            onBlocked={() => navigate({ to: "/inbox" })}
          />
        )}
      </header>

      {ctxData?.intent_id && ctxData.intents && other && (
        <ParticipationCard
          intentId={ctxData.intent_id}
          meId={user.id}
          otherId={other.id}
          creatorId={ctxData.intents.creator_id}
        />
      )}


      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {showOpener && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Sparkle className="size-3.5" /> Why you matched
              </div>
              {ctxData?.intents ? (
                <p className="mt-2 text-[14px] leading-relaxed">
                  Both of you are interested in <span className="font-medium">{ctxData.intents.title}</span>
                  {" "}— {ctxData.intents.intent_categories?.label ?? ctxData.intents.category_slug}.
                </p>
              ) : (
                <p className="mt-2 text-[14px] leading-relaxed">You've connected. Say hi.</p>
              )}
              {sharedInterests.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Shared interests</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {sharedInterests.map((i) => (
                      <span key={i} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px]">{i}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Conversation starters
              </p>
              <div className="mt-2 space-y-2">
                {starters.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="block w-full rounded-2xl border border-dashed border-border bg-surface px-4 py-3 text-left text-[14px] hover:bg-secondary/60">
                    {s}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        <div className="space-y-2">
          {messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                <div className={"max-w-[78%] rounded-2xl px-3.5 py-2 text-[14px] " +
                  (mine ? "bg-foreground text-background" : "bg-secondary text-foreground")}>
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(body); }}
        className="border-t border-border bg-surface px-3 py-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        <div className="flex items-center gap-2">
          <EmojiPicker onSelect={(emoji) => setBody((b) => b + emoji)} />
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message"
            className="h-11 flex-1 rounded-full bg-background" />
          <Button type="submit" size="icon" className="size-11 rounded-full" disabled={!body.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
