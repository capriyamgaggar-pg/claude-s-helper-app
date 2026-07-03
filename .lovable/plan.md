Profile Redesign — Warm Editorial v2 (deltas only)

The v1 "Warm Editorial" profile is already shipped (warm cream background, pulsing avatar ring, tinted 3×2 reputation grid, gradient category covers, compact promo card, shared-interests line). This patch includes only the following changes.

1. Softer bottom navigation

Update src/components/app-shell.tsx to match the new Warm Editorial palette by reusing the existing warm design tokens. The center "+" FAB remains unchanged.

No routing or layout changes.

2. Fix hydration mismatch on /auth

Ensure DemoAuthPanel renders the same initial tree during SSR and hydration. The implementation (mounted flag, client-only render, or equivalent) is left to the implementation.

Scope:

src/components/demo/DemoAuthPanel.tsx
(or its call site in src/routes/auth.tsx)

No functional changes beyond fixing the hydration error.

Explicitly not changing

 Header layout

 Avatar

 Avatar ring animation

 Presence dot

 Name

 Bio/About text

 Profession

 City

 Interests

 Reputation card

 Active intent cards

 Promo card

 Queries

 Database

 Business logic

 Design tokens

All user-generated profile content (name, bio, profession, city, etc.) remains exactly as entered by the user. This patch only adjusts application UI, not profile data or copy.

This patch is strictly limited to the files listed below. Any visual or behavioral changes outside this scope are out of scope and should not be made.

Files touched

src/components/app-shell.tsx

src/components/demo/DemoAuthPanel.tsx (or src/routes/auth.tsx if mounted there)

Ship as v2 patch.

This keeps the scope focused and avoids altering any user content.