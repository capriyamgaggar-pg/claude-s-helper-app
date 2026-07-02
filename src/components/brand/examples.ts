export type IntentExample = {
  emoji: string;
  title: string;
  interested: number;
  avatar: string;
  tint?: string;
};

export const defaultIntentExamples: IntentExample[] = [
  { emoji: "🏔", title: "Weekend Trek", interested: 23, avatar: "K", tint: "oklch(0.93 0.04 80)" },
  { emoji: "🚀", title: "Looking for Co-founder", interested: 8, avatar: "P", tint: "oklch(0.93 0.05 150)" },
  { emoji: "🏠", title: "Looking for Flatmate", interested: 12, avatar: "A", tint: "oklch(0.93 0.05 30)" },
];
