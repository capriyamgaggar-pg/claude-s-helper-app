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
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Intents Created" value={stats.intents_created} />
          <Stat label="Intents Joined" value={intentsJoined ?? 0} />
          <Stat label="People Interested" value={stats.total_interested_received} />
          <Stat label="People Connected" value={stats.total_connections} />
          <Stat label="Returning Participants" value={wouldJoinAgain} />
          <Stat label="Avg. Response Time" value={avgResponseLabel(stats)} />
        </dl>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[18px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
