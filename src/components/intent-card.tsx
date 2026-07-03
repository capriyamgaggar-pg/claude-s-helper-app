import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Users, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { statusPill, type IntentStatus } from "@/lib/intent-lifecycle";
import { creatorByline, isOrganizerCategory } from "@/lib/creator-visibility";

export interface IntentCardData {
  id: string;
  title: string;
  category_slug: string;
  category_label: string;
  city: string | null;
  starts_at: string | null;
  people_needed: number;
  interested_count: number;
  creator_name: string | null;
  creator_photo: string | null;
  creator_visible: boolean;
  created_at: string;
  status?: IntentStatus | string;
  expires_at?: string | null;
  /** Count of registration responses still awaiting a decision (My Intents only). */
  newResponses?: number;
  /** Total responses ever received for this intent (My Intents only). */
  totalResponses?: number;
}

export function IntentCard({ intent }: { intent: IntentCardData }) {
  const pill = intent.status ? statusPill(intent.status, intent.expires_at ?? null) : null;
  const toneClass =
    pill?.tone === "amber"
      ? "bg-amber-100 text-amber-900"
      : pill?.tone === "green"
        ? "bg-emerald-100 text-emerald-900"
        : pill?.tone === "grey"
          ? "bg-muted text-muted-foreground"
          : "bg-secondary text-muted-foreground";

  const byline = creatorByline(intent.category_slug, intent.creator_visible);
  const showName = intent.creator_visible;
  const initial = showName
    ? (intent.creator_name?.[0] ?? "·").toUpperCase()
    : "?";

  return (
    <Link
      to="/intents/$intentId"
      params={{ intentId: intent.id }}
      className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-secondary/60 active:scale-[0.995]"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {intent.category_label}
        </span>
        {pill && (
          <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " + toneClass}>
            <Clock className="size-3" /> {pill.text}
          </span>
        )}
        {!!intent.newResponses && intent.newResponses > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-medium text-white">
            {intent.totalResponses ?? intent.newResponses} total · {intent.newResponses} left
          </span>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(intent.created_at), { addSuffix: true })}
        </span>
      </div>

      <h3 className="display mt-2 text-lg leading-snug text-foreground">{intent.title}</h3>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {intent.city && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {intent.city}
          </span>
        )}
        {intent.starts_at && (
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {new Date(intent.starts_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="size-3.5" />
          {intent.interested_count} interested
          {isOrganizerCategory(intent.category_slug)
            ? ` · ${intent.people_needed} max`
            : ` · ${intent.people_needed} needed`}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 pt-1">
        {showName && intent.creator_photo ? (
          <img
            src={intent.creator_photo}
            alt=""
            className="size-6 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {initial}
          </span>
        )}
        <span className="text-[12px] text-muted-foreground">
          {showName
            ? `${byline} ${intent.creator_name ?? "Someone"}`
            : "Anonymous Creator"}
        </span>
      </div>
    </Link>
  );
}
