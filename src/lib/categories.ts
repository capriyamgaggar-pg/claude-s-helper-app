// Category metadata + per-category conversation starters used in the
// smart chat opener (no empty chats — start with shared context).
// Starters are role-aware: the intent creator gets prompts geared toward
// sharing plan details, the person who reached out gets prompts geared
// toward asking questions.

export type CategorySlug =
  | "flatmate" | "cofounder" | "event" | "sports" | "trekking"
  | "travel" | "shopping" | "study" | "networking" | "hobby" | "other";

interface RoleStarters {
  organizer: string[];
  participant: string[];
}

export const CATEGORY_STARTERS: Record<CategorySlug, RoleStarters> = {
  flatmate: {
    organizer: [
      "The budget I'm looking at is around ₹__/month — does that work?",
      "Here's the area/neighborhood I'm considering.",
      "I'm hoping to move in around __.",
      "A few things that matter to me: pets, smoking, work hours...",
    ],
    participant: [
      "What's your monthly budget?",
      "Which area or neighborhood do you prefer?",
      "When are you looking to move in?",
      "Any dealbreakers (pets, smoking, work hours)?",
    ],
  },
  cofounder: {
    organizer: [
      "Here's the problem I'm excited to solve.",
      "I'm coming from the technical/business side — what about you?",
      "I'm thinking full-time / moonlighting for now.",
      "Have you built something like this before?",
    ],
    participant: [
      "What problem are you most excited to solve?",
      "Technical or business side?",
      "Full-time or moonlighting right now?",
      "Have you worked on something together before?",
    ],
  },
  event: {
    organizer: [
      "I'll be there on __ — does that day work for you?",
      "What industry / focus are you in?",
      "Are you looking to network, learn, or both?",
      "Let's meet at the entrance or a specific booth?",
    ],
    participant: [
      "Which day are you attending?",
      "What industry / focus are you in?",
      "Looking to network, learn, or both?",
      "Want to meet at the entrance or a specific booth?",
    ],
  },
  sports: {
    organizer: [
      "My skill level is __ — beginner, casual, competitive?",
      "I usually play at __.",
      "I'm hoping to play __ times a week.",
      "Mornings, evenings, or weekends work best for me.",
    ],
    participant: [
      "What's your skill level — beginner, casual, competitive?",
      "Which venue do you usually play at?",
      "How often do you want to play?",
      "Mornings, evenings, or weekends?",
    ],
  },
  trekking: {
    organizer: [
      "Planning for __ days — sound good?",
      "Difficulty level is __ — easy, moderate, challenging.",
      "We'll be camping / doing homestays.",
      "Have you done this trail before?",
    ],
    participant: [
      "How many days are you planning for?",
      "Difficulty — easy, moderate, or challenging?",
      "Camping or homestays?",
      "Have you done this trail before?",
    ],
  },
  travel: {
    organizer: [
      "I'll be travelling from __.",
      "Tentative dates: __.",
      "Thinking backpacking / comfort stays — what's your style?",
      "Here's what I'd love to do while we're there.",
    ],
    participant: [
      "Where are you travelling from?",
      "What are your tentative dates?",
      "Backpacking or comfort stays?",
      "Anything specific you want to do there?",
    ],
  },
  shopping: {
    organizer: [
      "Here's what's on my list today.",
      "Thinking of heading to __.",
      "What time works for you?",
      "Want to grab a coffee after?",
    ],
    participant: [
      "What's on your list today?",
      "Which area / mall are you going to?",
      "What time works for you?",
      "Open to grabbing a coffee after?",
    ],
  },
  study: {
    organizer: [
      "I'm preparing for __.",
      "Studying online or in-person?",
      "I usually put in __ hours a day.",
      "My weakest topic right now is __.",
    ],
    participant: [
      "What are you preparing for?",
      "Online or in-person?",
      "How many hours a day do you study?",
      "What's your weakest topic right now?",
    ],
  },
  networking: {
    organizer: [
      "Here's a bit about what I do.",
      "Currently working on __.",
      "Looking for collaborators, advice, or just to meet folks?",
      "Where would you like to meet?",
    ],
    participant: [
      "What do you do?",
      "What are you working on right now?",
      "Looking for collaborators, advice, or just to meet folks?",
      "Where would you like to meet?",
    ],
  },
  hobby: {
    organizer: [
      "I've been into this for __.",
      "Here's what got me started.",
      "A few of my favorite spots/groups.",
      "Want to do this regularly?",
    ],
    participant: [
      "How long have you been into this?",
      "What got you started?",
      "Any favorite spots or groups?",
      "Want to do this regularly?",
    ],
  },
  other: {
    organizer: [
      "Here's a bit more about what I'm planning.",
      "I'm hoping to do this around __.",
      "I'm based in __.",
      "Anything you'd like to know upfront?",
    ],
    participant: [
      "Tell me a bit more about what you're looking for.",
      "When are you hoping to do this?",
      "Where are you based?",
      "Anything I should know upfront?",
    ],
  },
};

export function startersFor(category: string | null | undefined, isCreator: boolean): string[] {
  const set = category ? (CATEGORY_STARTERS[category as CategorySlug] ?? CATEGORY_STARTERS.other) : CATEGORY_STARTERS.other;
  return isCreator ? set.organizer : set.participant;
}
