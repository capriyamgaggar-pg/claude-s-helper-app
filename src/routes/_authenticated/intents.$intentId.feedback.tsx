import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { toast } from "sonner";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyFeedbackEligibility,
  submitFeedback,
} from "@/lib/feedback.functions";
import { randomPick, FEEDBACK_THANKS_MESSAGES } from "@/lib/personality";

export const Route = createFileRoute("/_authenticated/intents/$intentId/feedback")({
  head: () => ({ meta: [{ title: "Share feedback — Intent" }] }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const { intentId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const submit = useServerFn(submitFeedback);
  const eligibility = useServerFn(getMyFeedbackEligibility);

  const intent = useQuery({
    queryKey: ["intent-feedback-shell", intentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents")
        .select("id, title, category_slug, status").eq("id", intentId).single();
      if (error) throw error;
      return data;
    },
  });

  const elig = useQuery({
    queryKey: ["feedback-eligibility", intentId],
    queryFn: () => eligibility({ data: { intentId } }),
  });

  type SubmitPayload = {
    intentId: string;
    metExpectations: number;
    overall: number;
    wouldParticipateAgain: "definitely" | "probably" | "maybe" | "probably_not" | "never";
    wouldRecommend: "definitely" | "probably" | "maybe" | "probably_not" | "never" | null;
    answers: Record<string, { rating?: number; text?: string }>;
  };
  const mutation = useMutation({
    mutationFn: (payload: SubmitPayload) =>
      submit({ data: { ...payload, wouldRecommend: payload.wouldRecommend ?? undefined } }),
    onSuccess: () => {
      toast.success(randomPick(FEEDBACK_THANKS_MESSAGES));
      qc.invalidateQueries({ queryKey: ["feedback-eligibility", intentId] });
      qc.invalidateQueries({ queryKey: ["intent", intentId] });
      navigate({ to: "/intents/$intentId", params: { intentId } });
    },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't submit feedback"),
  });

  const body = (() => {
    if (!intent.data || elig.isLoading) return <p className="text-[13px] text-muted-foreground">Loading…</p>;
    if (elig.data?.alreadySubmitted) {
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
          <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
          <p className="mt-2 font-medium text-emerald-900">Feedback already submitted</p>
          <p className="mt-1 text-[13px] text-emerald-900/70">Thanks for helping the creator improve.</p>
        </div>
      );
    }
    if (!elig.data?.eligible) {
      return (
        <div className="rounded-2xl border border-border bg-surface p-5 text-center text-[13px] text-muted-foreground">
          Feedback isn't available for this intent yet.
        </div>
      );
    }
    return (
      <FeedbackForm
        categorySlug={intent.data.category_slug}
        submitting={mutation.isPending}
        onSubmit={(payload) => mutation.mutate({ intentId, ...payload })}
      />
    );
  })();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-4 pt-4">
        <BackButton fallback={`/intents/${intentId}`} />
      </header>
      <div className="flex-1 px-5 pb-16 pt-2">
        <h1 className="display text-2xl leading-tight">Share feedback</h1>
        {intent.data && <p className="mt-1 text-[13px] text-muted-foreground">{intent.data.title}</p>}
        <div className="mt-6">{body}</div>
      </div>
    </div>
  );
}
