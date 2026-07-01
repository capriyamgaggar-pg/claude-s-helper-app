import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RatingSchema = z.number().int().min(1).max(5);
const ParticipateAgainSchema = z.enum([
  "definitely", "probably", "maybe", "probably_not", "never",
]);

const AnswerValueSchema = z.object({
  rating: RatingSchema.optional(),
  text: z.string().max(2000).optional(),
});

const SubmitSchema = z.object({
  intentId: z.string().uuid(),
  metExpectations: RatingSchema,
  overall: RatingSchema,
  wouldParticipateAgain: ParticipateAgainSchema,
  wouldRecommend: ParticipateAgainSchema.optional(),
  answers: z.record(z.string(), AnswerValueSchema).default({}),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SubmitSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch intent to get creator_id and confirm status
    const { data: intent, error: iErr } = await supabase
      .from("intents")
      .select("id, creator_id, status")
      .eq("id", data.intentId)
      .single();
    if (iErr || !intent) throw new Error("Intent not found");
    if (!["fulfilled", "closed", "expired"].includes(intent.status)) {
      throw new Error("Feedback is not open yet for this intent");
    }

    // Merge overall into answers jsonb
    const answers = {
      ...data.answers,
      overall: { rating: data.overall },
    };

    const { error } = await supabase.from("intent_feedback").insert({
      intent_id: data.intentId,
      creator_id: intent.creator_id,
      participant_id: userId,
      met_expectations: data.metExpectations,
      would_participate_again: data.wouldParticipateAgain,
      would_recommend: data.wouldRecommend ?? null,
      answers,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getMyFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ intentId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("intent_feedback")
      .select("id, submitted_at")
      .eq("intent_id", data.intentId)
      .eq("participant_id", userId)
      .maybeSingle();
    return row;
  });

export const getMyFeedbackEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ intentId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: intent }, { data: part }, { data: existing }, { data: req }] = await Promise.all([
      supabase.from("intents").select("status, creator_id").eq("id", data.intentId).single(),
      supabase.from("intent_participants").select("state").eq("intent_id", data.intentId).eq("user_id", userId).maybeSingle(),
      supabase.from("intent_feedback").select("id").eq("intent_id", data.intentId).eq("participant_id", userId).maybeSingle(),
      supabase.from("intent_feedback_requests").select("feedback_requested_at").eq("intent_id", data.intentId).eq("participant_id", userId).maybeSingle(),
    ]);
    const isCreator = intent?.creator_id === userId;
    const completed = intent && ["fulfilled", "closed", "expired"].includes(intent.status);
    const confirmed = part?.state === "confirmed";
    const alreadySubmitted = !!existing;
    const eligible = !isCreator && !!completed && confirmed && !alreadySubmitted;
    return {
      eligible,
      alreadySubmitted,
      confirmed,
      completed: !!completed,
      requestedAt: req?.feedback_requested_at ?? null,
    };
  });

export const getFeedbackSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ intentId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: intent } = await supabase
      .from("intents")
      .select("id, creator_id")
      .eq("id", data.intentId).single();
    if (!intent || intent.creator_id !== userId) throw new Error("Forbidden");

    const [{ data: rows }, { count: requestsCount }] = await Promise.all([
      supabase.from("intent_feedback")
        .select("met_expectations, would_participate_again, answers")
        .eq("intent_id", data.intentId),
      supabase.from("intent_feedback_requests")
        .select("id", { count: "exact", head: true })
        .eq("intent_id", data.intentId),
    ]);

    const responses = rows ?? [];
    const total = responses.length;
    const buckets: Record<string, number> = {
      definitely: 0, probably: 0, maybe: 0, probably_not: 0, never: 0,
    };
    let metSum = 0;
    // question_key -> { sum, count, dist[1..5], texts[] }
    const perQuestion: Record<string, {
      sum: number; count: number; dist: number[]; texts: string[];
    }> = {};

    for (const r of responses) {
      metSum += r.met_expectations ?? 0;
      const wpa = r.would_participate_again as string;
      if (wpa in buckets) buckets[wpa]++;
      const ans = (r.answers ?? {}) as Record<string, { rating?: number; text?: string }>;
      for (const [k, v] of Object.entries(ans)) {
        if (!perQuestion[k]) perQuestion[k] = { sum: 0, count: 0, dist: [0, 0, 0, 0, 0], texts: [] };
        if (typeof v?.rating === "number" && v.rating >= 1 && v.rating <= 5) {
          perQuestion[k].sum += v.rating;
          perQuestion[k].count += 1;
          perQuestion[k].dist[v.rating - 1] += 1;
        }
        if (typeof v?.text === "string" && v.text.trim().length > 0) {
          perQuestion[k].texts.push(v.text);
        }
      }
    }

    return {
      total,
      requestsCount: requestsCount ?? 0,
      avgMetExpectations: total > 0 ? metSum / total : 0,
      wouldParticipateAgainDistribution: buckets,
      perQuestion,
    };
  });

export const getCreatorFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({
    intentId: z.string().uuid(),
    limit: z.number().int().min(1).max(100).default(50),
    beforeSubmittedAt: z.string().datetime().optional(),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: intent } = await supabase
      .from("intents").select("id, creator_id")
      .eq("id", data.intentId).single();
    if (!intent || intent.creator_id !== userId) throw new Error("Forbidden");

    let q = supabase.from("intent_feedback")
      .select("id, submitted_at, met_expectations, would_participate_again, answers")
      .eq("intent_id", data.intentId)
      .order("submitted_at", { ascending: false })
      .limit(data.limit);
    if (data.beforeSubmittedAt) q = q.lt("submitted_at", data.beforeSubmittedAt);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    // Never returns participant_id or would_recommend.
    return rows ?? [];
  });
