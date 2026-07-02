export type IntentExample = {
  emoji: string;
  title: string;
  subtitle?: string;
  interested: number;
  avatar: string;
  tint?: string;
  avatarCount?: 1 | 2;
};

export const defaultIntentExamples: IntentExample[] = [
  { emoji: "🏔", title: "Weekend Trek", subtitle: "Saturday morning", interested: 23, avatar: "K", tint: "oklch(0.93 0.04 80)", avatarCount: 2 },
  { emoji: "🏠", title: "Looking for Flatmate", interested: 12, avatar: "A", tint: "oklch(0.93 0.05 30)", avatarCount: 1 },
  { emoji: "🚀", title: "Looking for Co-founder", interested: 8, avatar: "P", tint: "oklch(0.93 0.05 150)", avatarCount: 1 },
  { emoji: "🎓", title: "Looking for Mentor", interested: 6, avatar: "R", tint: "oklch(0.93 0.05 250)", avatarCount: 1 },
  { emoji: "📷", title: "Photography Walk", interested: 15, avatar: "S", tint: "oklch(0.93 0.04 60)", avatarCount: 2 },
  { emoji: "🚴", title: "Weekend Cycling", interested: 14, avatar: "C", tint: "oklch(0.93 0.05 40)", avatarCount: 2 },
  { emoji: "🎲", title: "Board Games", interested: 11, avatar: "N", tint: "oklch(0.93 0.05 200)", avatarCount: 2 },
  { emoji: "☕", title: "Coffee & Work", interested: 9, avatar: "D", tint: "oklch(0.93 0.03 260)", avatarCount: 1 },
  { emoji: "📚", title: "Study Together", interested: 17, avatar: "M", tint: "oklch(0.93 0.05 250)", avatarCount: 2 },
  { emoji: "✈", title: "Weekend Trip", interested: 21, avatar: "T", tint: "oklch(0.93 0.05 200)", avatarCount: 2 },
];
