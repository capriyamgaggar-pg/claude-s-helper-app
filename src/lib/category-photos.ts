// Real photography per category, used as the card's hero image until
// organizers can upload their own cover photo (a natural v2 -- this gives
// every card a real visual hero in the meantime, matching the SocialJar/
// Stitch reference direction rather than a small category icon).
//
// These are direct images.unsplash.com links (stable CDN, doesn't require
// an API key for display) -- NOT the deprecated source.unsplash.com
// dynamic keyword service, which has been fully shut down.

const PARAMS = "auto=format&fit=crop&w=800&q=80";

export const CATEGORY_PHOTOS: Record<string, string> = {
  trekking: `https://images.unsplash.com/photo-1551632811-561732d1e306?${PARAMS}`,
  flatmate: `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?${PARAMS}`,
  cofounder: `https://images.unsplash.com/photo-1522071820081-009f0129c71c?${PARAMS}`,
  event: `https://images.unsplash.com/photo-1511795409834-ef04bbd61622?${PARAMS}`,
  study: `https://images.unsplash.com/photo-1497633762265-9d179a990aa6?${PARAMS}`,
  sports: `https://images.unsplash.com/photo-1461896836934-ffe607ba8211?${PARAMS}`,
  travel: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?${PARAMS}`,
  shopping: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?${PARAMS}`,
  networking: `https://images.unsplash.com/photo-1515187029135-18ee286d815b?${PARAMS}`,
  hobby: `https://images.unsplash.com/photo-1513364776144-60967b0f800f?${PARAMS}`,
  other: `https://images.unsplash.com/photo-1519389950473-47ba0277781c?${PARAMS}`,
};

export function categoryPhoto(slug: string): string {
  return CATEGORY_PHOTOS[slug] ?? CATEGORY_PHOTOS.other;
}
