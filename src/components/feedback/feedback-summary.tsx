import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARTICIPATE_AGAIN_OPTIONS } from "@/lib/journey/steps/feedback-presets";

interface Summary {
  total: number;
  requestsCount: number;
  avgMetExpectations: number;
  wouldParticipateAgainDistribution: Record<string, number>;
  perQuestion: Record<string, { sum: number; count: number; dist: number[]; texts: string[] }>;
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-4",
            n <= rounded ? "fill-amber-400 stroke-amber-500" : "fill-transparent stroke-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

function Bar({ value, max, label, count }: { value: number; max: number; label: string; count: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

export function FeedbackSummary({
  summary, questionLabels,
}: {
  summary: Summary;
  questionLabels: Record<string, string>;
}) {
  const { total, requestsCount, avgMetExpectations, wouldParticipateAgainDistribution, perQuestion } = summary;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-[13px] text-muted-foreground">
        No feedback yet. Participants can share feedback anytime after the intent is completed.
      </div>
    );
  }

  const completionPct = requestsCount > 0 ? Math.round((total / requestsCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Met expectations</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{avgMetExpectations.toFixed(1)}</p>
          <div className="mt-1"><Stars value={avgMetExpectations} /></div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Responses</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-[12px] text-muted-foreground">
            {requestsCount > 0 ? `${completionPct}% of ${requestsCount} requested` : "—"}
          </p>
        </div>
      </div>

      {Object.entries(perQuestion).filter(([, v]) => v.count > 0).length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="text-[13px] font-semibold">Ratings</h3>
          <div className="mt-3 space-y-3">
            {Object.entries(perQuestion)
              .filter(([, v]) => v.count > 0)
              .map(([key, v]) => {
                const avg = v.count > 0 ? v.sum / v.count : 0;
                const max = Math.max(...v.dist, 1);
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">
                        {questionLabels[key] ?? key.replace(/_/g, " ")}
                      </span>
                      <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                        <Stars value={avg} />
                        <span className="tabular-nums">{avg.toFixed(1)}</span>
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <Bar
                          key={star}
                          label={`${star} star${star === 1 ? "" : "s"}`}
                          value={v.dist[star - 1]}
                          max={max}
                          count={v.dist[star - 1]}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-[13px] font-semibold">Would participate again</h3>
        <div className="mt-3 space-y-1">
          {PARTICIPATE_AGAIN_OPTIONS.map((o) => {
            const count = wouldParticipateAgainDistribution[o.value] ?? 0;
            const max = Math.max(
              ...PARTICIPATE_AGAIN_OPTIONS.map((x) => wouldParticipateAgainDistribution[x.value] ?? 0),
              1,
            );
            return <Bar key={o.value} label={o.label} value={count} max={max} count={count} />;
          })}
        </div>
      </section>
    </div>
  );
}
