import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCreatorFeedback, getFeedbackSummary } from "@/lib/feedback.functions";
import { FeedbackSummary } from "./feedback-summary";
import { FeedbackList } from "./feedback-list";
import { presetFor } from "@/lib/journey/steps/feedback-presets";

export function FeedbackTab({
  intentId, categorySlug,
}: { intentId: string; categorySlug: string | null }) {
  const summaryFn = useServerFn(getFeedbackSummary);
  const listFn = useServerFn(getCreatorFeedback);

  const summary = useQuery({
    queryKey: ["feedback-summary", intentId],
    queryFn: () => summaryFn({ data: { intentId } }),
  });
  const list = useQuery({
    queryKey: ["feedback-list", intentId],
    queryFn: () => listFn({ data: { intentId, limit: 50 } }),
  });

  const preset = presetFor(categorySlug);
  const labels: Record<string, string> = { overall: "Overall experience" };
  for (const q of preset.questions) labels[q.key] = q.label;

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
        Feedback
      </h2>
      <p className="text-[12px] text-muted-foreground">
        Individual responses are anonymous. This helps participants give honest feedback.
      </p>
      {summary.data ? (
        <FeedbackSummary summary={summary.data} questionLabels={labels} />
      ) : (
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      )}
      {list.data && list.data.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold">Comments</h3>
          <FeedbackList rows={list.data} questionLabels={labels} />
        </div>
      )}
    </div>
  );
}
