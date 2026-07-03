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
        <dl className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
          <StatRow label="Intents created" value={stats.intents_created} />
          <StatRow label="Intents joined" value={intentsJoined ?? 0} />
          <StatRow label="People interested" value={stats.total_interested_received} />
          <StatRow label="People connected" value={stats.total_connections} />
          <StatRow label="Returning participants" value={wouldJoinAgain} />
          <StatRow label="Avg. response time" value={avgResponseLabel(stats)} last />
        </dl>
      )}
    </section>
  );
}

function StatRow({ label, value, last }: { label: string; value: number | string; last?: boolean }) {
  return (
    <div className={"flex items-center justify-between px-3.5 py-2.5 " + (last ? "" : "border-b border-border")}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[14px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
