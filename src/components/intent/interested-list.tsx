import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { pairKey } from "@/lib/participation";
import { formatDistanceToNow } from "date-fns";

export interface InterestedRow {
  user_id: string;
  state: string;
  interest_message: string | null;
  interest_at: string;
  profiles: {
    id: string;
    name: string | null;
    photo_url: string | null;
    city: string | null;
    profession: string | null;
  } | null;
}

interface Props {
  intentId: string;
  creatorId: string;
  categorySlug: string;
  city: string | null;
  rows: InterestedRow[];
  existingConnections: Record<string, { id: string; state: string; requested_by: string }>;
}

export function InterestedList({ intentId, creatorId, categorySlug, city, rows, existingConnections }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const interestedOnly = rows.filter(
    (r) => (r.state === "interested" || r.state === "joining") && r.user_id !== creatorId,
  );

  const sendConnect = useMutation({
    mutationFn: async (userId: string) => {
      const [a, b] = pairKey(creatorId, userId);
      const { error } = await supabase.from("connections").upsert({
        user_a: a, user_b: b,
        requested_by: creatorId,
        state: "requested",
        intent_id: intentId,
        origin_category: categorySlug,
        origin_city: city,
      }, { onConflict: "user_a,user_b" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Connection request sent"); qc.invalidateQueries({ queryKey: ["intent", intentId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (interestedOnly.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Interested
        </h2>
        <p className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          When someone shows interest, they'll appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
        {interestedOnly.length} interested
      </h2>
      <ul className="mt-3 space-y-3">
        {interestedOnly.map((r) => {
          const conn = existingConnections[r.user_id];
          const hasConn = !!conn;
          const connLabel = !conn
            ? null
            : conn.state === "accepted"
              ? "Connected"
              : conn.requested_by === creatorId
                ? "Request sent"
                : "Wants to connect";
          const showFull = expanded === r.user_id;
          const msg = r.interest_message ?? "";
          const truncated = msg.length > 120 && !showFull ? msg.slice(0, 120) + "…" : msg;
          return (
            <li key={r.user_id} className="rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-center gap-3">
                <Link to="/profile/$userId" params={{ userId: r.user_id }}>
                  {r.profiles?.photo_url ? (
                    <img src={r.profiles.photo_url} alt="" className="size-11 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-11 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {(r.profiles?.name?.[0] ?? "·").toUpperCase()}
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/profile/$userId" params={{ userId: r.user_id }} className="block truncate font-medium">
                    {r.profiles?.name ?? "Someone"}
                  </Link>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {[r.profiles?.profession, r.profiles?.city].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {!hasConn ? (
                  <Button size="sm" className="rounded-full" onClick={() => sendConnect.mutate(r.user_id)} disabled={sendConnect.isPending}>
                    <Sparkle className="mr-1 size-3.5" /> Connect
                  </Button>
                ) : (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">{connLabel}</span>
                )}
              </div>
              {msg && (
                <button
                  type="button"
                  className="mt-3 block w-full rounded-xl bg-secondary/60 px-3 py-2 text-left text-[13px] leading-relaxed text-foreground"
                  onClick={() => setExpanded(showFull ? null : r.user_id)}
                >
                  “{truncated}”
                </button>
              )}
              <p className="mt-2 text-right text-[11px] text-muted-foreground">
                Interested {formatDistanceToNow(new Date(r.interest_at), { addSuffix: true })}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
