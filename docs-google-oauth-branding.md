# Google sign-in shows `hhpikvqeopscjdzuhbfk.supabase.co` — how to fix

**Symptom:** the Google consent screen says *"Choose an account to continue to
hhpikvqeopscjdzuhbfk.supabase.co"* instead of the game's name.

**Why:** Google shows the identity of the **OAuth client** that owns the redirect
URI. Supabase Auth's callback lives on `<project-ref>.supabase.co`, so unless the
OAuth client is branded and verified, Google falls back to that hostname. Nothing
in this repo controls it — it is Google Cloud Console + Search Console config.

**This does NOT require Supabase's paid Custom Domains add-on** — but it *does*
require a domain of your own for the home page (see below). Branding the OAuth
client is then enough for the app name to replace the hostname.

## ⚠️ `*.vercel.app` cannot be used — a custom domain is required

Google's brand verification rejects it:

> *The website of your home page URL "https://egg-breaker-adventures.vercel.app/" is not registered to you.*

Google verifies ownership of the **top private (registrable) domain**, which here is
`vercel.app` — owned by Vercel, not by us. Verifying the subdomain as a URL-prefix
property in Search Console does **not** satisfy it, and Google explicitly excludes
home pages hosted on third-party platforms whose subdomain you cannot prove you own.
So a domain purchase is unavoidable for branded Google sign-in.

Check progress at any time with:

```bash
node tools/check-domain.js <your-domain> "google-site-verification=<value>"
```
It reports the Search Console TXT record, whether DNS points at Vercel, and whether
`/`, `/privacy` and `/terms` answer 200 with the game on them.

### The cheap path (~$12/yr, no code changes, no Android impact)
1. **Buy a domain** (e.g. `eggsmashadventures.com`). Any registrar.
2. **Add it to the existing Vercel project** (Project → Settings → Domains) as an
   alias and follow the DNS instructions. The game then answers on both the new
   domain *and* `egg-breaker-adventures.vercel.app` — nothing in this repo has to
   change, the Android TWA keeps working against the old host, and Supabase CORS /
   App Links stay valid.
3. **Verify the domain in Google Search Console** with the *Domain* property type
   (DNS TXT record), signed in with the **same Google account that owns the Cloud
   project**. This is the step the error is complaining about.
4. In the OAuth consent screen use the new domain everywhere: home page
   `https://<newdomain>/`, privacy `https://<newdomain>/privacy`, terms
   `https://<newdomain>/terms`, and add `<newdomain>` under **Authorized domains**.
5. Re-submit branding.

### If you later want the new domain to be the *primary* one
Not required for verification, but if you do switch, these carry the old host and
must be updated together: `index.html` (canonical + og/twitter + JSON-LD, 11 refs),
the content pages (`egg-breaker-guide`, `play-egg-breaker-online`,
`what-happened-to-egg-breaker`, `egg-breaker-vs-original`, `press`, `privacy`,
`terms`, `refund`), `build.js` (`SITEMAP_PAGES` base), `share.js` (share links),
`game.js`, the marketing email, `tools/*`, `tests/smoke.test.js`,
`tests/sw-health.test.js`, the four Supabase edge functions that hardcode the CORS
origin, and — the risky one — `android-build/.../AndroidManifest.xml` App Links plus
`twa-manifest.json`, which needs a new APK/AAB and a fresh
`.well-known/assetlinks.json`. Keeping `vercel.app` as the app's host avoids all of
that.

## Steps (one-time, after the domain is in place)

1. **Verify the domain you own** in [Google Search Console](https://search.google.com/search-console)
   (Domain property, DNS TXT) using the Google account that owns the Cloud project.
2. In [Google Cloud Console](https://console.cloud.google.com/) open the project
   that owns the OAuth client Supabase is using (the one whose Client ID/Secret are
   in Supabase → Authentication → Providers → Google).
3. **APIs & Services → OAuth consent screen → Branding**:
   - App name: `Egg Smash Adventures`
   - User support email: your address
   - App logo: 120×120 square PNG (use `icon-512.png` downscaled — must be the
     same logo the store listing uses)
   - Application home page: `https://<your-domain>/`
   - Privacy policy: `https://<your-domain>/privacy`
   - Terms of service: `https://<your-domain>/terms`
   - **Authorized domains**: `<your-domain>` (registrable domain, no subdomain)
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
