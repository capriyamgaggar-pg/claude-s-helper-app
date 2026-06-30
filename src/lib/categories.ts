// Category metadata + per-category conversation starters used in the
// smart chat opener (no empty chats — start with shared context).

export type CategorySlug =
  | "flatmate" | "cofounder" | "event" | "sports" | "trekking"
  | "travel" | "shopping" | "study" | "networking" | "hobby" | "other";

export const CATEGORY_STARTERS: Record<CategorySlug, string[]> = {
  flatmate: [
    "What's your monthly budget?",
    "Which area or neighborhood do you prefer?",
    "When are you looking to move in?",
    "Any dealbreakers (pets, smoking, work hours)?",
  ],
  cofounder: [
    "What problem are you most excited to solve?",
    "Technical or business side?",
    "Full-time or moonlighting right now?",
    "Have you worked on something together before?",
  ],
  event: [
    "Which day are you attending?",
    "What industry / focus are you in?",
    "Looking to network, learn, or both?",
    "Want to meet at the entrance or a specific booth?",
  ],
  sports: [
    "What's your skill level — beginner, casual, competitive?",
    "Which venue do you usually play at?",
    "How often do you want to play?",
    "Mornings, evenings, or weekends?",
  ],
  trekking: [
    "How many days are you planning for?",
    "Difficulty — easy, moderate, or challenging?",
    "Camping or homestays?",
    "Have you done this trail before?",
  ],
  travel: [
    "Where are you travelling from?",
    "What are your tentative dates?",
    "Backpacking or comfort stays?",
    "Anything specific you want to do there?",
  ],
  shopping: [
    "What's on your list today?",
    "Which area / mall are you going to?",
    "What time works for you?",
    "Open to grabbing a coffee after?",
  ],
  study: [
    "What are you preparing for?",
    "Online or in-person?",
    "How many hours a day do you study?",
    "What's your weakest topic right now?",
  ],
  networking: [
    "What do you do?",
    "What are you working on right now?",
    "Looking for collaborators, advice, or just to meet folks?",
    "Where would you like to meet?",
  ],
  hobby: [
    "How long have you been into this?",
    "What got you started?",
    "Any favorite spots or groups?",
    "Want to do this regularly?",
  ],
  other: [
    "Tell me a bit more about what you're looking for.",
    "When are you hoping to do this?",
    "Where are you based?",
    "Anything I should know upfront?",
  ],
};

export function startersFor(category: string | null | undefined): string[] {
  if (!category) return CATEGORY_STARTERS.other;
  return CATEGORY_STARTERS[category as CategorySlug] ?? CATEGORY_STARTERS.other;
}
