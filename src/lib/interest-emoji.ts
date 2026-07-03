// Emoji for known interest tags -- purely decorative, keeps interest chips
// from reading as flat text. Falls back to a neutral sparkle for anything
// typed in that isn't in the list (interests aren't a closed set).
const INTEREST_EMOJI: Record<string, string> = {
  Travel: "✈️",
  Trekking: "🥾",
  Startups: "🚀",
  Music: "🎵",
  Tech: "💻",
  Reading: "📚",
  Food: "🍜",
  Fitness: "💪",
  Cycling: "🚴",
  Photography: "📷",
  Cinema: "🎬",
  Coffee: "☕",
  Yoga: "🧘",
  Badminton: "🏸",
  Football: "⚽",
};

export function interestEmoji(interest: string): string {
  return INTEREST_EMOJI[interest] ?? "✨";
}
