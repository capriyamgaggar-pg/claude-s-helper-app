import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackRow {
  id: string;
  submitted_at: string;
  met_expectations: number;
  would_participate_again: string;
  answers: Record<string, { rating?: number; text?: string }> | null;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(
          "size-3.5",
          n <= value ? "fill-amber-400 stroke-amber-500" : "fill-transparent stroke-muted-foreground/40",
        )} />
      ))}
    </span>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h >= 1) return `${h}h ago`;
  const m = Math.floor(diff / (60 * 1000));
  return m <= 1 ? "just now" : `${m}m ago`;
}

export function FeedbackList({
  rows, questionLabels,
}: { rows: FeedbackRow[]; questionLabels: Record<string, string> }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-[13px] text-muted-foreground">
        Individual anonymous responses will appear here.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const answers = r.answers ?? {};
        const textEntries = Object.entries(answers)
          .filter(([, v]) => typeof v?.text === "string" && v.text.trim().length > 0);
        return (
          <article key={r.id} className="rounded-2xl border border-border bg-surface p-4">
            <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground">Anonymous Participant</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                Joined
              </span>
              <Stars value={r.met_expectations} />
              <span>·</span>
              <span>{relativeTime(r.submitted_at)}</span>
            </header>
            {textEntries.length > 0 && (
              <div className="mt-3 space-y-2">
                {textEntries.map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {questionLabels[k] ?? k.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 whitespace-pre-line text-[14px]">{v!.text}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
