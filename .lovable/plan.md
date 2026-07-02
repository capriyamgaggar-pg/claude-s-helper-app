## What I found

1. **Google authorization is partly working, but the return flow is weak**
   - The app uses the Lovable Cloud Google helper correctly in `src/routes/auth.tsx`.
   - Backend auth logs show Google login/token events succeeding.
   - The likely break is after Google returns: `/` always redirects to `/auth`, and `/auth` does not detect an existing signed-in session and send the user to `/home`.

2. **Profile empty-state logic is not what we agreed**
   - The code comment says it should prefer lifetime stats, but the actual code only checks `mine?.length`.
   - If the current intent query returns empty for any reason, it wrongly shows: “Your first intent starts here.”
   - This explains why you still see first-time copy even after posting 1 intent.

3. **Home empty/feed experience is too hidden**
   - The animated `EmptyFeed` only appears when all three Home sections are empty after filters.
   - If your account/location/query state does not match that exact condition, you will not see the new experience.
   - `/empty-preview` exists, but it is behind the authenticated app and not surfaced anywhere in the UI.

4. **Demo data exists, but demo login accounts do not**
   - There are seeded demo users and demo intents already in the database.
   - Those demo users were created without passwords, so they populate the network but cannot be used as accounts to log in.

## Plan

### 1. Fix Google sign-in return behavior
- Add signed-in session detection on `/auth`.
- If a user is already signed in, automatically route them to the intended redirect or `/home`.
- Keep Google using the Lovable Cloud OAuth helper.
- Preserve safe redirect behavior so Google returns to a public same-origin URL, then the app routes internally after the session is available.
- If provider configuration is still failing after code fix, use the built-in social auth configuration tool rather than hand-writing OAuth code.

### 2. Fix Profile “first intent” logic properly
- Add a `user_reputation_stats` query in `profile.me.tsx` for the signed-in user.
- Use the agreed resilient check:
  - `stats.intents_created > 0` when stats are available.
  - Fallback to `mine.length > 0`.
- Only show “Your first intent starts here” when both signals confirm zero lifetime intents.
- Keep tab-specific empty messages for Active/Fulfilled/Closed/Expired when the user has created intents but the current tab is empty.

### 3. Make Home and preview understandable
- Add a lightweight entry point to `/empty-preview` in the app UI for development/preview use, clearly marked as preview/dev.
- On Home, add a better visible state when there are no visible cards due to filters/location:
  - Keep the animated `EmptyFeed` for true empty/cold-start.
  - Add clear recovery copy when filters/location hide results.
  - Give users actions like “Clear location” and “Explore anywhere” so Home does not look blank.

### 4. Create safe demo experiences
- Do **not** expose public demo passwords or weaken auth.
- Add a controlled “Demo mode / Persona preview” route or panel that lets us view the app as seeded personas without creating insecure public credentials.
- Use existing seeded personas and add enough representative demo data to show:
  - normal user discovering intents,
  - creator with active/expired/fulfilled intents,
  - organizer intent with registration form and pipeline,
  - inbox received/sent/chat states,
  - connection lifecycle states.
- Keep it clearly marked as demo/preview so it does not confuse real users.

### 5. Verify after implementation
- Test Google return behavior in preview as far as the environment allows.
- Check `/home`, `/profile/me`, `/explore`, `/empty-preview` visually.
- Confirm Profile no longer shows first-time copy for a user with created intents.
- Confirm build/typecheck passes.

## What will not be changed
- No unrelated security policy changes.
- No public anonymous access to private user data.
- No direct editing of generated auth/backend integration files.
- No fake “demo passwords” placed in the codebase.