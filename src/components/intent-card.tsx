import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface IntentCardData {
  id: string;
  title: string;
  category_label: string;
  city: string | null;
  starts_at: string | null;
  people_needed: number;
  interested_count: number;
  creator_name: string | null;
  creator_photo: string | null;
  created_at: string;
}

export function IntentCard({ intent }: { intent: IntentCardData }) {
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
        <span className="text-[11px] text-muted-foreground">
          · {formatDistanceToNow(new Date(intent.created_at), { addSuffix: true })}
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
          {intent.interested_count} interested · {intent.people_needed} needed
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 pt-1">
        {intent.creator_photo ? (
          <img
            src={intent.creator_photo}
            alt=""
            className="size-6 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {(intent.creator_name?.[0] ?? "·").toUpperCase()}
          </span>
        )}
        <span className="text-[12px] text-muted-foreground">
          by {intent.creator_name ?? "Someone"}
        </span>
      </div>
    </Link>
  );
}
