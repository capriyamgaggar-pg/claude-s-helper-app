// Lightweight, deterministic matching score. Designed to be swapped for an
// AI/embeddings-based engine later without changing the data model.

export interface ScoreInput {
  viewer: {
    interests: string[];
    city: string | null;
    pastCategories: string[]; // category slugs of intents they've joined/created
  };
  intent: {
    category_slug: string;
    city: string | null;
    tags: string[];
    starts_at: string | null;
    creator_id: string;
  };
  viewerId: string;
}

export function scoreIntent({ viewer, intent, viewerId }: ScoreInput): number {
  if (intent.creator_id === viewerId) return -Infinity; // never recommend own

  let score = 0;

  // Shared interests / tags (Jaccard-ish, ×3)
  const tagSet = new Set(intent.tags.map((t) => t.toLowerCase()));
  const interestSet = new Set(viewer.interests.map((i) => i.toLowerCase()));
  let overlap = 0;
  for (const t of tagSet) if (interestSet.has(t)) overlap++;
  score += overlap * 3;

  // Same city ×2
  if (viewer.city && intent.city && viewer.city.toLowerCase() === intent.city.toLowerCase()) {
    score += 2;
  }

  // Category affinity ×2
  if (viewer.pastCategories.includes(intent.category_slug)) score += 2;

  // Time proximity (starts within next 30 days) ×1
  if (intent.starts_at) {
    const days = (new Date(intent.starts_at).getTime() - Date.now()) / 86_400_000;
    if (days >= 0 && days <= 30) score += 1;
  }

  return score;
}
