import { useQuery } from "@tanstack/react-query";
import { FileText, Users, Star, Link2, Undo2, Clock, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  avgResponseLabel,
  EMPTY_STATS,
  type UserReputationStats,
} from "@/lib/reputation";

interface Props {
  userId: string;
}

type Tint = "peach" | "mint" | "lavender" | "coral" | "blue" | "amber";

const TINT_VAR: Record<Tint, string> = {
  peach: "var(--tint-peach)",
  mint: "var(--tint-mint)",
  lavender: "var(--tint-lavender)",
  coral: "var(--tint-coral)",
  blue: "var(--tint-blue)",
  amber: "var(--tint-amber)",
};

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
        <p className="mt-3 rounded-2xl border border-dashed border-[color:var(--border-warm)] bg-[color:var(--surface-card)] p-4 text-center text-[13px] text-muted-foreground">
          Reputation builds as you create and fulfill intents.
        </p>
      ) : (
        <dl className="mt-3 grid grid-cols-3 gap-y-4 rounded-3xl bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-ambient)]">
          <StatCell tint="peach"    icon={FileText} label="Created"    value={stats.intents_created} />
          <StatCell tint="mint"     icon={Users}    label="Joined"     value={intentsJoined ?? 0} />
          <StatCell tint="lavender" icon={Star}     label="Interested" value={stats.total_interested_received} />
          <StatCell tint="coral"    icon={Link2}    label="Connected"  value={stats.total_connections} />
          <StatCell tint="blue"     icon={Undo2}    label="Returning"  value={wouldJoinAgain} />
          <StatCell tint="amber"    icon={Clock}    label="Response"   value={avgResponseLabel(stats)} />
        </dl>
      )}
    </section>
  );
}

function StatCell({
  tint, icon: Icon, label, value,
}: { tint: Tint; icon: LucideIcon; label: string; value: number | string }) {
  const color = TINT_VAR[tint];
  return (
    <div className="flex flex-col items-center gap-1.5 px-1 text-center">
      <span
        className="grid size-9 place-items-center rounded-full"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`, color }}
      >
        <Icon className="size-4" />
      </span>
      <dd className="text-[17px] font-semibold tabular-nums leading-none text-foreground">{value}</dd>
      <dt className="text-[10.5px] leading-tight text-muted-foreground">{label}</dt>
    </div>
  );
}
