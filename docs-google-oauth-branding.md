# Google sign-in shows `hhpikvqeopscjdzuhbfk.supabase.co` — how to fix

**Symptom:** the Google consent screen says *"Choose an account to continue to
hhpikvqeopscjdzuhbfk.supabase.co"* instead of the game's name.

**Why:** Google shows the identity of the **OAuth client** that owns the redirect
URI. Supabase Auth's callback lives on `<project-ref>.supabase.co`, so unless the
OAuth client is branded and verified, Google falls back to that hostname. Nothing
in this repo controls it — it is Google Cloud Console + Search Console config.

**This does NOT require Supabase's paid Custom Domains add-on.** Branding the
OAuth client is enough for the app name to replace the hostname.

## Steps (one-time, ~20 min, free)

1. **Verify a domain you own** in [Google Search Console](https://search.google.com/search-console)
   — use `egg-breaker-adventures.vercel.app` (HTML-file method: drop the file in
   the repo root, push, then verify). If you later buy a real domain, verify that
   instead and redo step 3's authorized domain.
2. In [Google Cloud Console](https://console.cloud.google.com/) open the project
   that owns the OAuth client Supabase is using (the one whose Client ID/Secret are
   in Supabase → Authentication → Providers → Google).
3. **APIs & Services → OAuth consent screen → Branding**:
   - App name: `Egg Smash Adventures`
   - User support email: your address
   - App logo: 120×120 square PNG (use `icon-512.png` downscaled — must be the
     same logo the store listing uses)
   - Application home page: `https://egg-breaker-adventures.vercel.app/`
   - Privacy policy: `https://egg-breaker-adventures.vercel.app/privacy`
   - Terms of service: `https://egg-breaker-adventures.vercel.app/terms`
   - **Authorized domains**: add the domain verified in step 1
4. **Audience → Publish app** (move out of "Testing"). With only the basic scopes
   (`email`, `profile`, `openid`) this is normally instant — no Google review, no
   security assessment.
5. Confirm the client's **Authorized redirect URI** is exactly
   `https://hhpikvqeopscjdzuhbfk.supabase.co/auth/v1/callback` — do not change it;
   the branding is what changes, not the callback.

## What the user sees afterwards
"Continue to **Egg Smash Adventures**" with the logo. Google may still show the
Supabase host in the small print / "to continue to this site" details — that part
only disappears with a Supabase **custom auth domain** (paid add-on, `auth.<yourdomain>`).

## Caveats
- The app must be **Published**, not in Testing, or only test users see the branding.
- An "unverified app" interstitial can appear briefly for new clients; with basic
  scopes it clears without a formal review.
- Changing the OAuth client itself (new Client ID/Secret) means updating
  Supabase → Authentication → Providers → Google, otherwise sign-in breaks.
  The rest of the flow (see CLAUDE.md → Google OAuth / Cloud Save) is unaffected.
