// Per-category default feedback question sets for the `feedback` journey step.
// Every preset implicitly includes the platform-fixed questions:
//   - met_expectations (rating, required, rendered first)
//   - overall (rating, required)
//   - would_participate_again (fixed 5-option radio, required)
//   - would_recommend (fixed 5-option radio, stored only, never displayed)
//
// The rows below are the *additional*, category-tuned questions that the
// creator UI will show (and one day let creators edit).

export type FeedbackQuestionType = "rating" | "text";

export interface FeedbackQuestion {
  key: string;
  label: string;
  type: FeedbackQuestionType;
  required?: boolean;
}

export interface FeedbackStepConfig {
  questions: FeedbackQuestion[];
}

const TEXT_LIKED = { key: "liked_most", label: "What did you like most?", type: "text" } as const;
const TEXT_IMPROVE = { key: "improvements", label: "What could be improved?", type: "text" } as const;
const TEXT_COMMENTS = { key: "comments", label: "Additional comments", type: "text" } as const;

const R = (key: string, label: string, required = false): FeedbackQuestion => ({
  key, label, type: "rating", required,
});

// Presets keyed by intent category_slug. Fallback covers any missing category.
export const FEEDBACK_PRESETS: Record<string, FeedbackStepConfig> = {
  trekking: {
    questions: [
      R("safety", "Safety", true),
      R("communication", "Communication", true),
      R("organization", "Organization"),
      R("value", "Value for time / money"),
      TEXT_LIKED, TEXT_IMPROVE,
    ],
  },
  event: {
    questions: [
      R("communication", "Communication", true),
      R("organization", "Organization"),
      R("value", "Value for time / money"),
      TEXT_LIKED, TEXT_IMPROVE, TEXT_COMMENTS,
    ],
  },
  flatmate: {
    questions: [
      R("communication", "Communication", true),
      R("compatibility", "Compatibility"),
      R("accuracy", "Description accuracy"),
      TEXT_COMMENTS,
    ],
  },
  cofounder: {
    questions: [
      R("communication", "Communication", true),
      R("responsiveness", "Responsiveness"),
      R("accuracy", "Description accuracy"),
      TEXT_COMMENTS,
    ],
  },
  networking: {
    questions: [
      R("communication", "Communication", true),
      R("value", "Value for time"),
      TEXT_COMMENTS,
    ],
  },
  sports: {
    questions: [
      R("communication", "Communication", true),
      R("organization", "Organization"),
      TEXT_COMMENTS,
    ],
  },
  study: {
    questions: [
      R("communication", "Communication", true),
      R("value", "Value for time"),
      TEXT_COMMENTS,
    ],
  },
};

export const FALLBACK_FEEDBACK_PRESET: FeedbackStepConfig = {
  questions: [
    R("communication", "Communication", true),
    R("accuracy", "Description accuracy"),
    TEXT_COMMENTS,
  ],
};

export function presetFor(categorySlug: string | null | undefined): FeedbackStepConfig {
  if (!categorySlug) return FALLBACK_FEEDBACK_PRESET;
  return FEEDBACK_PRESETS[categorySlug] ?? FALLBACK_FEEDBACK_PRESET;
}

export const PARTICIPATE_AGAIN_OPTIONS = [
  { value: "definitely", label: "Definitely" },
  { value: "probably", label: "Probably" },
  { value: "maybe", label: "Maybe" },
  { value: "probably_not", label: "Probably not" },
  { value: "never", label: "Never" },
] as const;

export type ParticipateAgain = typeof PARTICIPATE_AGAIN_OPTIONS[number]["value"];
export type RecommendValue = ParticipateAgain;
