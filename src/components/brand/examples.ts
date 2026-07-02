export type IntentExample = {
  emoji: string;
  title: string;
  interested: number;
  avatar: string;
  tint?: string;
};

export const defaultIntentExamples: IntentExample[] = [
  { emoji: "🏠", title: "Looking for Flatmate", interested: 12, avatar: "A", tint: "oklch(0.93 0.05 30)" },
  { emoji: "🚀", title: "Looking for Co-founder", interested: 8, avatar: "P", tint: "oklch(0.93 0.05 150)" },
  { emoji: "🏔", title: "Weekend Trek", interested: 23, avatar: "K", tint: "oklch(0.93 0.04 80)" },
  { emoji: "📸", title: "Photography Walk", interested: 15, avatar: "S", tint: "oklch(0.93 0.04 60)" },
  { emoji: "🤝", title: "Volunteer Together", interested: 19, avatar: "R", tint: "oklch(0.93 0.04 120)" },
  { emoji: "🗣", title: "Learn Spanish", interested: 31, avatar: "M", tint: "oklch(0.93 0.05 250)" },
  { emoji: "🎙", title: "Startup Meetup", interested: 11, avatar: "N", tint: "oklch(0.93 0.05 200)" },
  { emoji: "♟", title: "Chess Partner", interested: 7, avatar: "D", tint: "oklch(0.93 0.03 260)" },
  { emoji: "🚴", title: "Sunday Cycling", interested: 14, avatar: "C", tint: "oklch(0.93 0.05 40)" },
];
