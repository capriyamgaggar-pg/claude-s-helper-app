import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  avgResponseLabel,
  EMPTY_STATS,
  type UserReputationStats,
} from "@/lib/reputation";

interface Props {
  userId: string;
}

export function ReputationPanel({ userId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["user-reputation-stats", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reputation_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as UserReputationStats | null) ?? { ...EMPTY_STATS, user_id: userId };
    },
  });

  const { data: intentsJoined, isLoading: joinedLoading } = useQuery({
    queryKey: ["intents-joined-count", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_intents_joined_count", { target_user_id: userId });
      if (error) throw error;
      return data ?? 0;
    },
  });

  if (isLoading || joinedLoading) return null;

  const stats = data ?? { ...EMPTY_STATS, user_id: userId };
  const wouldJoinAgain = stats.would_participate_again_definitely + stats.would_participate_again_probably;
  const hasAny =
    stats.intents_created > 0 ||
    (intentsJoined ?? 0) > 0 ||
    stats.total_interested_received > 0 ||
    stats.total_connections > 0;

  return (
    <section className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Reputation
      </p>

      {!hasAny ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-4 text-center text-[13px] text-muted-foreground">
          Reputation builds as you create and fulfill intents.
        </p>
      ) : (
        <dl className="mt-3 grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-surface">
          <StatCell label="Created" value={stats.intents_created} col={1} row={1} />
          <StatCell label="Joined" value={intentsJoined ?? 0} col={2} row={1} />
          <StatCell label="Interested" value={stats.total_interested_received} col={3} row={1} />
          <StatCell label="Connected" value={stats.total_connections} col={1} row={2} />
          <StatCell label="Returning" value={wouldJoinAgain} col={2} row={2} />
          <StatCell label="Response" value={avgResponseLabel(stats)} col={3} row={2} />
        </dl>
      )}
    </section>
  );
}

function StatCell({ label, value, col, row }: { label: string; value: number | string; col: 1 | 2 | 3; row: 1 | 2 }) {
  return (
    <div className={
      "px-2 py-2.5 text-center " +
      (row === 2 ? "border-t border-border " : "") +
      (col !== 3 ? "border-r border-border" : "")
    }>
      <dd className="text-[15px] font-semibold tabular-nums">{value}</dd>
      <dt className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{label}</dt>
    </div>
  );
}
