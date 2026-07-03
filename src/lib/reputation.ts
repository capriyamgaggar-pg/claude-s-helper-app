// Reputation infrastructure — raw stats + event log.
//
// Badge and level rules are intentionally deferred until we have real
// production usage. This module ships as scaffolding so the same UI
// components will light up automatically the day rules land, with no
// schema change.

export interface UserReputationStats {
  user_id: string;
  intents_created: number;
  intents_fulfilled: number;
  intents_closed: number;
  intents_expired: number;
  total_interested_received: number;
  total_connections: number;
  total_joined_participants: number;
  repeat_participants: number;
  repeat_connections: number;
  returning_members: number;
  response_count: number;
  response_total_seconds: number;
  organizer_intents_total: number;
  organizer_intents_completed: number;
  fulfilled_by_category: Record<string, number>;
  feedback_received: number;
  met_expectations_sum: number;
  met_expectations_count: number;
  would_participate_again_definitely: number;
  would_participate_again_probably: number;
  would_participate_again_maybe: number;
  would_participate_again_probably_not: number;
  would_participate_again_never: number;
  updated_at: string;
}

export type Badge = { slug: string; label: string; icon: string };

/**
 * Deferred: no badge rules yet. Returns [] until product decides how
 * to reward behaviour based on real usage data.
 */
export function computeBadges(_stats: UserReputationStats | null): Badge[] {
  return [];
}

/**
 * Deferred: no level scoring yet. Returns null until we know how to
 * weight metrics across different intent categories.
 */
export function computeLevel(_stats: UserReputationStats | null): number | null {
  return null;
}

export const EMPTY_STATS: UserReputationStats = {
  user_id: "",
  intents_created: 0,
  intents_fulfilled: 0,
  intents_closed: 0,
  intents_expired: 0,
  total_interested_received: 0,
  total_connections: 0,
  total_joined_participants: 0,
  repeat_participants: 0,
  repeat_connections: 0,
  returning_members: 0,
  response_count: 0,
  response_total_seconds: 0,
  organizer_intents_total: 0,
  organizer_intents_completed: 0,
  fulfilled_by_category: {},
  feedback_received: 0,
  met_expectations_sum: 0,
  met_expectations_count: 0,
  would_participate_again_definitely: 0,
  would_participate_again_probably: 0,
  would_participate_again_maybe: 0,
  would_participate_again_probably_not: 0,
  would_participate_again_never: 0,
  updated_at: new Date(0).toISOString(),
};

export function avgResponseLabel(stats: UserReputationStats | null): string {
  if (!stats || stats.response_count === 0) return "—";
  const seconds = Math.round(stats.response_total_seconds / stats.response_count);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}
