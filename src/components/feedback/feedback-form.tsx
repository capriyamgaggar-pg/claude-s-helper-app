import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PARTICIPATE_AGAIN_OPTIONS,
  presetFor,
  type ParticipateAgain,
} from "@/lib/journey/steps/feedback-presets";

interface Props {
  categorySlug: string | null;
  submitting?: boolean;
  onSubmit: (payload: {
    metExpectations: number;
    overall: number;
    wouldParticipateAgain: ParticipateAgain;
    wouldRecommend: ParticipateAgain | null;
    answers: Record<string, { rating?: number; text?: string }>;
  }) => void;
}

function StarInput({
  value, onChange, ariaLabel,
}: { value: number; onChange: (v: number) => void; ariaLabel: string }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-1 -m-1"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            className={cn(
              "size-7 transition-colors",
              n <= shown ? "fill-amber-400 stroke-amber-500" : "fill-transparent stroke-muted-foreground/50",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function RadioRow({
  value, onChange, name,
}: { value: ParticipateAgain | null; onChange: (v: ParticipateAgain) => void; name: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PARTICIPATE_AGAIN_OPTIONS.map((o) => {
        const selected = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1.5 text-[13px] transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface hover:bg-secondary",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              className="sr-only"
              checked={selected}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

export function FeedbackForm({ categorySlug, submitting, onSubmit }: Props) {
  const preset = presetFor(categorySlug);
  const [metExpectations, setMet] = useState(0);
  const [overall, setOverall] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [wpa, setWpa] = useState<ParticipateAgain | null>(null);
  const [rec, setRec] = useState<ParticipateAgain | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = metExpectations > 0 && overall > 0 && !!wpa
    && preset.questions.every((q) => q.type !== "rating" || !q.required || (ratings[q.key] ?? 0) > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !wpa) { setError("Please answer all required questions."); return; }
    const answers: Record<string, { rating?: number; text?: string }> = {};
    for (const q of preset.questions) {
      if (q.type === "rating" && ratings[q.key]) answers[q.key] = { rating: ratings[q.key] };
      if (q.type === "text" && texts[q.key]?.trim()) answers[q.key] = { text: texts[q.key].trim() };
    }
    onSubmit({
      metExpectations, overall,
      wouldParticipateAgain: wpa,
      wouldRecommend: rec,
      answers,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <p className="rounded-xl bg-secondary/60 px-3 py-2 text-[12px] text-muted-foreground">
        Your response is anonymous to the intent creator.
      </p>

      <section className="space-y-2">
        <label className="block text-[15px] font-medium">
          Did this intent meet your expectations? <span className="text-destructive">*</span>
        </label>
        <StarInput value={metExpectations} onChange={setMet} ariaLabel="Met expectations" />
      </section>

      <section className="space-y-2">
        <label className="block text-[15px] font-medium">
          Overall experience <span className="text-destructive">*</span>
        </label>
        <StarInput value={overall} onChange={setOverall} ariaLabel="Overall experience" />
      </section>

      {preset.questions.filter((q) => q.type === "rating").map((q) => (
        <section key={q.key} className="space-y-2">
          <label className="block text-[15px] font-medium">
            {q.label}{q.required && <span className="text-destructive"> *</span>}
          </label>
          <StarInput
            value={ratings[q.key] ?? 0}
            onChange={(v) => setRatings((r) => ({ ...r, [q.key]: v }))}
            ariaLabel={q.label}
          />
        </section>
      ))}

      {preset.questions.filter((q) => q.type === "text").map((q) => (
        <section key={q.key} className="space-y-2">
          <label className="block text-[14px] font-medium text-muted-foreground">{q.label}</label>
          <Textarea
            value={texts[q.key] ?? ""}
            onChange={(e) => setTexts((t) => ({ ...t, [q.key]: e.target.value }))}
            rows={3}
            maxLength={2000}
          />
        </section>
      ))}

      <section className="space-y-2">
        <label className="block text-[15px] font-medium">
          Would you participate in another intent by this creator? <span className="text-destructive">*</span>
        </label>
        <RadioRow value={wpa} onChange={setWpa} name="wpa" />
      </section>

      <section className="space-y-2">
        <label className="block text-[15px] font-medium">
          Would you recommend this creator to a friend?
        </label>
        <RadioRow value={rec} onChange={setRec} name="rec" />
      </section>

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      <Button type="submit" className="h-11 w-full rounded-xl" disabled={!canSubmit || submitting}>
        {submitting ? "Submitting…" : "Share feedback"}
      </Button>
    </form>
  );
}
