import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users, ChevronRight } from "lucide-react";

// Category appearance — deterministic gradient + emoji from category_slug.
// Kept local because it's only used here.
const CATEGORY_APPEARANCE: Record<string, { emoji: string; from: string; to: string; chip: string }> = {
  flatmate:   { emoji: "🏠", from: "oklch(0.92 0.05 30)",  to: "oklch(0.86 0.09 30)",  chip: "oklch(0.62 0.14 30)" },
  cofounder:  { emoji: "🚀", from: "oklch(0.92 0.05 150)", to: "oklch(0.85 0.10 150)", chip: "oklch(0.55 0.12 150)" },
  event:      { emoji: "🎉", from: "oklch(0.93 0.06 320)", to: "oklch(0.86 0.10 320)", chip: "oklch(0.60 0.15 320)" },
  sports:     { emoji: "⚽", from: "oklch(0.93 0.05 130)", to: "oklch(0.85 0.10 130)", chip: "oklch(0.55 0.13 130)" },
  trekking:   { emoji: "🏔",  from: "oklch(0.93 0.04 160)", to: "oklch(0.85 0.09 160)", chip: "oklch(0.55 0.11 160)" },
  travel:     { emoji: "✈️", from: "oklch(0.93 0.05 240)", to: "oklch(0.85 0.10 240)", chip: "oklch(0.55 0.14 240)" },
  shopping:   { emoji: "🛍️", from: "oklch(0.94 0.05 340)", to: "oklch(0.86 0.10 340)", chip: "oklch(0.60 0.15 340)" },
  study:      { emoji: "📚", from: "oklch(0.93 0.05 260)", to: "oklch(0.85 0.10 260)", chip: "oklch(0.55 0.13 260)" },
  networking: { emoji: "🤝", from: "oklch(0.93 0.05 60)",  to: "oklch(0.86 0.10 60)",  chip: "oklch(0.60 0.14 60)" },
  hobby:      { emoji: "🎨", from: "oklch(0.94 0.06 100)", to: "oklch(0.86 0.10 100)", chip: "oklch(0.58 0.14 100)" },
  other:      { emoji: "✨", from: "oklch(0.93 0.04 80)",  to: "oklch(0.86 0.08 80)",  chip: "oklch(0.55 0.10 80)" },
};

function getCategoryAppearance(slug: string | null | undefined) {
  return CATEGORY_APPEARANCE[slug ?? "other"] ?? CATEGORY_APPEARANCE.other;
}

export interface ActiveIntentCardData {
  id: string;
  title: string;
  category_slug: string;
  category_label?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  people_needed?: number | null;
  locality?: string | null;
  city?: string | null;
}

function formatDateRange(startISO?: string | null, endISO?: string | null): string | null {
  if (!startISO) return null;
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString(undefined, opts);
  if (!endISO) return startStr;
  const end = new Date(endISO);
  if (Number.isNaN(end.getTime())) return startStr;
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return startStr;
  return `${startStr} – ${end.toLocaleDateString(undefined, opts)}`;
}

export function ActiveIntentCard({ intent }: { intent: ActiveIntentCardData }) {
  const appearance = getCategoryAppearance(intent.category_slug);
  const dateStr = formatDateRange(intent.starts_at, intent.ends_at);
  const location = intent.locality ?? intent.city ?? null;
  const label = intent.category_label ?? intent.category_slug;

  return (
    <Link
      to="/intents/$intentId"
      params={{ intentId: intent.id }}
      className="group flex items-stretch gap-3 rounded-[20px] bg-[color:var(--surface-card)] p-3 shadow-[var(--shadow-ambient)] transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[0_2px_4px_oklch(0.4_0.05_60/0.06),0_14px_32px_-12px_oklch(0.4_0.05_60/0.14)]"
    >
      <div
        className="grid size-[88px] shrink-0 place-items-center rounded-2xl text-[34px]"
        style={{ backgroundImage: `linear-gradient(135deg, ${appearance.from}, ${appearance.to})` }}
        aria-hidden
      >
        <span>{appearance.emoji}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <span
          className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: `color-mix(in oklab, ${appearance.chip} 12%, transparent)`, color: appearance.chip }}
        >
          {label}
        </span>
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
          {intent.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground">
          {dateStr && (
            <span className="inline-flex items-center gap-1"><Calendar className="size-3" />{dateStr}</span>
          )}
          {intent.people_needed != null && intent.people_needed > 0 && (
            <span className="inline-flex items-center gap-1"><Users className="size-3" />{intent.people_needed} needed</span>
          )}
          {location && (
            <span className="inline-flex items-center gap-1 truncate"><MapPin className="size-3" />{location}</span>
          )}
        </div>
      </div>

      <div className="flex items-center pr-1 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground">
        <ChevronRight className="size-4" />
      </div>
    </Link>
  );
}
