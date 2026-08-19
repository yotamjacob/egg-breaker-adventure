# Egg Smash Adventures — Claude Code Guide

## Module map
| File | Purpose |
|------|---------|
| `config.js` | Single source of truth — all tuning values, egg types, prize weights, CONFIG object |
| `data.js` | Static game data — monkey definitions, stage collections, achievement data, item quotes |
| `game.js` | Game engine — DEFAULT_STATE, smash logic, prize rolling, shop, cloud save, payments |
| `render.js` | All DOM rendering — renderEggTray, renderAlbum, renderShop, renderPremiumShop, etc. |
| `audio.js` | Sound effects and music — loaded separately, not bundled |
| `particles.js` | Canvas particle system (dt-scaled, one rAF loop): `emit` egg-break burst (shards + additive sparks), `sparkle`, `starRain` (Starfall), `confetti` (Banana Shake), `setAmbient('rage'\|'goose'\|null)` continuous emitters while a skill is active |
| `hammers.js` | Hammer regeneration logic — regen interval, fast regen, max hammer tracking |
| `mastery.js` | Hammer mastery ("train your hammer") — the equipped special hammer earns XP per hit/break/rare item, levels 1→10 from `CONFIG.hammerMastery`; every owned hammer's own bonus scales with ITS level, L5 = 3% free hits, L10 = a unique perk. Bundled after quests.js |
| `quests.js` | Quests — 5 daily + 3 weekly (`weekly` is an array; legacy single object migrates) from `CONFIG.quests`, deterministic per day/week, progress = counter delta since assignment, manual claim (auto-claim on rollover). Owns the **Quests tab** (replaced the Log tab). Bundled after achievements.js |
| `idle.js` | Auto-Smasher (idle) — gold-shop helper that taps eggs with hammers: online loop, offline simulation, "while you were away" report, leveled shop upgrades. **Bundled after achievements.js** (its boot block needs everything before it) |
| `analytics.js` | Umami event wrapper + traffic attribution — `track()`, `openPlayStore()`, `playStoreUrl()` (forwards first-touch utm into the Play `referrer`), first-touch source; Meta Pixel: `initMetaPixel()` / `metaTrack()`, inert unless `META_PIXEL_ID` (config.js) is set and only on our own hostnames. Bundled after `config.js`. Every call is fail-safe |
| `art-masters/` | Hi-res source art (2048² PNGs, stereo MP3s) — **never served** (`.vercelignore`). `img/` + `audio/` are generated from it by `tools/optimize-assets.js` (≤512px palette PNG / mozjpeg / 96k mono); re-run it after adding or replacing a master |
| `share.js` | Share/referral loop — `shareGame()`, share-link builder, arrival banner. **Bundled after `game.js`** (see Promotion below) |
| `play.css` | Play-tab styles — egg tray, hammer bar, log, mult bar, stage chip, particles |
| `style.css` | Global styles — CSS variables, nav, resource bar, tab panels, modals |
| `tabs.css` | Non-play tab styles — album, shop, monkeys, premium, daily, lexicon, achievements |
| `components.css` | Shared component styles — toast, snack, tooltips, referral banner |
| `content.css` | Styles for the SEO content pages only — **not** part of `bundle.min.css` |
| `sw.js` | Service worker — cache versioning, network-first fetch strategy |
| `build.js` | Bundles JS+CSS → bundle.min.js + bundle.min.css; `--itch` assembles the static itch.io build; also generates `sitemap.xml` |
| `itch/itch.js` | itch-only shim — Google Play CTA + desktop phone frame (loaded by the `--itch` build) |
| `payments.js` | Google Play Billing, purchase verification, restore-purchases flow, PREMIUM_PRODUCTS |
| `cloud.js` | Supabase auth + cloud save — `_syncToCloud`, autosave timer (default OFF), session caching |
| `admin.html` | Standalone admin dashboard (not bundled) — Players/Purchases/Analytics tabs; calls admin-* edge fns with `x-admin-secret`. **Save-derived stats are player-controlled**: `admin-players` coerces every field to number/bool (`num()`/`arr()`, per-row `safeStats`) and `playerCard()` re-coerces + `esc()`s before `innerHTML` (stored-XSS fix v3.10.10) |
| `supabase/functions/` | Edge Functions: verify-play-purchase, restore-purchases, subscribe-push, send-notifications, admin-players, admin-purchases |
| `agents/digest.js` | Weekly promotion digest — two web-search research agents (communities + "Egg Breaker" mentions), de-dupes via `agents/seen.json`, emails HTML via Resend. Run by `.github/workflows/weekly-digest.yml` |
| `agents/prompts.js` | Research prompts for the digest. Reddit is excluded here AND via `blocked_domains` AND by a URL filter in digest.js |
| `tests/` | Node test suites — `smoke.test.js` (prod availability, payments, cloud), `sw-health.test.js` (SW invariants, static + live), `smash-animation.test.js` (tap-feedback cascade, drives real Chromium), `autotap.test.js` (offline-simulation accounting invariants, vm sandbox) |
| `.github/workflows/smoke-tests.yml` | CI: runs all tests 3× daily (08/14/20 UTC) + on every push to main; emails on failure |

## Build & deploy
```bash
node build.js                    # bundle JS + CSS (always run before commit)
node build.js --itch             # + assemble itch.io build → dist-itch.zip (optimised assets, ~10MB; --itch was full-size before v3.10.2)
git add -A && git commit && git push   # Vercel auto-deploys on push
supabase functions deploy <name> # deploy a single edge function
```
Never run `npx vercel --prod` manually.
`.vercelignore` keeps `CLAUDE.md`, `supabase/`, `tests/`, `agents/`, `tools/`, `art-masters/`, `README.md`, `.github/` out of the deploy — `outputDirectory` is `.`, so anything not listed there is publicly served from the game domain (v3.10.10; CLAUDE.md had been reachable at `/CLAUDE.md`). Verify with `curl -I <domain>/CLAUDE.md` → 404 after changing it.
Supabase migrations: the remote history was repaired in v3.10.10, so `supabase db push --linked` applies only new files. Keep versions unique (no more `20260415_x.sql` + `20260415_y.sql`).

## Version bumping (every commit)
- `config.js` near top: `const VERSION = 'X.Y.Z'`
- `sw.js` is **auto-synced** by `build.js` — do not edit it manually. Just bump `config.js` and run `node build.js`.

## Android build & sign
```bash
cd android-build
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew bundleRelease
"$JAVA_HOME/bin/jarsigner" \
  -keystore android.keystore -storepass 'Eggrolls1246' -keypass 'Eggrolls1246' \
  -signedjar app-release-signed.aab \
  app/build/outputs/bundle/release/app-release.aab eggbreaker
```
- Version code/name lives in `android-build/app/build.gradle` (versionCode int, versionName string)
- Launcher name: `twaManifest.launcherName` in `build.gradle` + `twa-manifest.json`
- Mipmap icons: `android-build/app/src/main/res/mipmap-*/ic_launcher.png` + `ic_maskable.png`

### Play Console compliance floors (v2.7.0)
| Setting | Value | Why |
|---------|-------|-----|
| `com.android.billingclient:billing` | `9.1.0` | Play rejects updates using Billing Library < 8.0.0 (enforced Aug 2026). Verify with `grep billingclient.version` in the merged manifest — Play reads that meta-data, not the gradle line |
| `minSdkVersion` | `23` | Hard floor of Billing Library 8.1+/9.x. Cannot go back to 21 without downgrading billing to 8.0.0 |
| `targetSdkVersion` | `36` | Play requires API 36+ for updates (enforced Aug 2026) |
| `android:appCategory="game"` on `<application>` | required | Android 16 ignores `android:screenOrientation` on screens ≥600dp; games with `appCategory` set keep their portrait lock. Without it the app unlocks to landscape on tablets/foldables |
- **Billing API shape (PBL 8+/9)**: `enablePendingPurchases()` must take a `PendingPurchasesParams` (no-arg overload removed — `build()` throws without it), and `queryProductDetailsAsync`'s callback receives a `QueryProductDetailsResult`, not a `List<ProductDetails>`.
### Edge-to-edge / fullscreen (v2.7.1)
- `applyImmersiveMode()` uses **androidx** `WindowCompat` + `WindowInsetsControllerCompat`, never the framework `setSystemUiVisibility`/`SYSTEM_UI_FLAG_*` (deprecated) or an `SDK_INT >= R` branch. A version-gated branch makes Play report "edge-to-edge may not display for all users" because it can't prove edge-to-edge applies on older API levels.
- `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` is set in `onCreate` before `setContentView`. Without it the system letterboxes the fullscreen window away from the notch. It is only safe because `style.css` pads with `env(safe-area-inset-top/bottom)` and `index.html` sets `viewport-fit=cover` — **if either is removed, content slides under the notch.**
- Play also recommends "remove resizability and orientation restrictions ... for large screens". Deliberately **not** done: `renderEggTray` computes from laid-out dimensions and only re-runs on tab switch (no `resize`/`orientationchange` listener — `particles.js` is the only thing that rebinds on resize), so a rotation on a ≥600dp screen would leave a mislaid-out tray. Unlocking it means first re-running the tray on resize and giving `#app` (`max-width:540px`) a landscape layout. Until then `appCategory="game"` keeps the portrait lock honored.
- **`com.google.androidbrowserhelper:billing` must stay removed** — it pins Billing Library 7.1.1 and only serves the TWA Digital Goods API, which this raw-WebView app never used. Re-adding it drags the resolved billing version backwards and its 7.x-compiled classes break against 9.x. Its `PaymentActivity`/`PaymentService` manifest entries and `DelegationService`'s `DigitalGoodsRequestHandler` were removed with it.

## Key patterns

### Adding config values
Add to `CONFIG` in `config.js`, reference as `CONFIG.myValue` in game.js/render.js.

### Adding a prize weight change
Edit `prizes:` inside the relevant egg type in `CONFIG.eggTypes`. Weights are relative integers.

### Tier rewards
`CONFIG.tierRewards.silver` = Bronze→Silver (currently unused in code — wired but not called)
`CONFIG.tierRewards.gold` = Silver→Gold (gives maxHammers + hammerRefill)
**Bronze/Silver/Gold are internal names only (v3.3.0).** The mechanism stays, but no
player-facing string, tip, stat label, achievement text or guide page may name the tiers —
players see "hammer bonus", "unlock the next stage", "stage complete". Album stage-button
colours (`tier-bronze/silver/gold` classes) are fine; they carry no text.

### Mr Monkey item boost
`game.js rollPrize()` — `if (monkey && monkey.id === 'mr_monkey') w.item *= 1.5`

### Starting resources
`CONFIG.startingHammers`, `CONFIG.startingMaxHammers`, `CONFIG.startingGold` → applied in `DEFAULT_STATE`

## Payment flow
- **Web/desktop**: premium shop is visible but shows "📱 Available on Android" — no purchases on web.
- **Android TWA**: Google Play Billing → `onPlayPurchaseResult` → `/api/verify-play-purchase` (Vercel proxy) → `verify-play-purchase` edge fn
- **Restore Purchases**: `/api/restore-purchases` (Vercel proxy) → `restore-purchases` edge fn — queries `play_purchases` by `device_id` and `user_id`; also reads historical `purchases` table for legacy records.
- All payment calls use same-origin Vercel proxies to avoid CORS failures in the Android WebView.

## Supabase
- Project: `hhpikvqeopscjdzuhbfk` (EU West)
- CORS: production origin `https://egg-breaker-adventures.vercel.app` hardcoded in each function
- `purchases` table: device_id, product_id, paypal_order_id, amount, status
- `push_subscriptions` has RLS enabled and **no anon policy** (v3.10.10; it was `using(true) with check(true)` — world read/write). All access goes through the service-role `subscribe-push` / `send-notifications` functions; never add a client-side query on it

## CSS variables (style.css)
`--gold:#f5c542` `--gold2:#d4a017` `--gold3:#a67c00` `--green:#2ecc71` `--panel:#0f3460` `--dark:#0a0a18` `--bg:#1a1a2e` `--bg2:#16213e` `--amber:#e88d2a` `--gray:#7f8c8d`

## Response format
Always end every response to the user with the current version: **"Current version: X.Y.Z"**

## Google OAuth / Cloud Save flow

### How linking works (Android)
1. `linkGoogleAccount()` sets `sessionStorage._oauthPending = '1'` and `localStorage._cloudLinkPref = 'linked'`, then navigates to the Supabase auth URL.
2. `shouldOverrideUrlLoading` intercepts `supabase.co/auth` and `accounts.google.com` URLs → opens in external Chrome. WebView stays on game page; sessionStorage survives.
3. Supabase redirects to `https://egg-breaker-adventures.vercel.app/#access_token=…` → Android App Links routes this to `onNewIntent()`.
4. `onNewIntent` detects `access_token` in the fragment → calls `handleAndroidOAuthCallback(fragment)` via `evaluateJavascript` (no page reload). **Do NOT use `webView.loadUrl()` for this — it reloads the page, clearing sessionStorage.**
5. `handleAndroidOAuthCallback` calls `_sbClient.auth.setSession()` → fires `onAuthStateChange(SIGNED_IN)`.
6. `_onCloudSignIn` reads `sessionStorage._oauthPending` → shows "linked!" snack and reopens cloud modal.

### How unlinking works
- `linkGoogleAccount()` (when already linked) → confirm → sets `_cloudUnlinking = true` and `localStorage._cloudLinkPref = 'unlinked'` → calls `signOut()`.
- `_cloudUnlinking` prevents a racing `SIGNED_IN` event (token refresh) from re-linking mid-unlink.

**Consent-screen branding:** Google shows `<project-ref>.supabase.co` until the OAuth client is
branded + published in Google Cloud Console. Requirements learned the hard way (Aug 2026): the home
page must be on a domain *you own* (`*.vercel.app` is rejected — hence `eggbreakeradventure.com`,
DNS on Vercel), verified in Search Console with the project's owner account, and it must visibly
show the app name and describe the app + why it uses Google data → use `/about` as the home page.
Reviews are human, ~2–3 business days; re-submitting resets the clock.

### Invariants — never break these
| Invariant | Why |
|-----------|-----|
| `_cloudLinkPref` lives in its own `localStorage` key, **never inside `SAVE_KEY`** | `resetGame()` only removes `SAVE_KEY` — the pref must survive a hard reset |
| `onAuthStateChange(SIGNED_IN)` checks `_cloudLinkPref === 'unlinked'` first and signs out if true | Prevents Supabase from silently re-linking after a reset |
| `redirectTo` is always `window.location.origin + '/'` for all platforms | Custom URI scheme (`eggbreakeradventures://`) caused Chrome to strip the `#fragment` on Android |
| `onNewIntent` handles HTTPS App Link callbacks with `access_token` via JS injection, not `webView.loadUrl()` | `webView.loadUrl()` reloads the page → clears sessionStorage → `_oauthPending` flag lost |
| Never call `_sbClient.auth.getSession()` before a fetch — use cached `_cloudSession` | `getSession()` can hang on Android during token refresh |
| `shouldOverrideUrlLoading` must intercept `supabase.co/auth` and `accounts.google.com` | Google OAuth blocks WebView with 403 disallowed_useragent |

### localStorage keys used by cloud save (never clear these in resetGame)
- `sb-hhpikvqeopscjdzuhbfk.supabase.co-auth-token` — Supabase session (managed by SDK)
- `_cloudLinkPref` — `'linked'` | `'unlinked'` — explicit user preference

## Purchase persistence — critical invariants

Users must never lose paid purchases. The system has three layers of protection:

### Layer 1 — client-side state (`PREMIUM_KEY` in localStorage)
- Premium items are stored in their own `localStorage` key (`PREMIUM_KEY`), separate from game save (`SAVE_KEY`).
- `resetGame()` removes `SAVE_KEY` only — premium state survives a hard reset.
- `loadPremium()` / `savePremium()` manage this key. Never fold premium fields into `SAVE_KEY`.

### Layer 2 — Supabase database (`play_purchases` table)
- Every verified Play Billing purchase is recorded in `play_purchases` with `device_id`, `user_id`, `purchase_token`, and `status='completed'`.
- `restore-purchases` edge fn queries by **both** `device_id` AND `user_id` (when logged in) — so purchases survive reinstalls as long as the user is signed in.
- `verify-play-purchase` is idempotent: returns `already_processed:true` if the token is already recorded (safe to call multiple times).
- RLS prevents the anon key from reading `play_purchases` directly — this is intentional. Query via the `restore-purchases` edge fn instead.

### Layer 3 — Play Billing ownership sync on startup
- `MainActivity.java`: `queryOwnedPurchases()` fires via `AndroidBridge.jsReady()` — called from game.js after init.
- **Race condition**: billing setup completes asynchronously. `jsReady()` ensures `queryOwnedPurchases()` only fires once BOTH `_billingReady` AND `_jsReady` are true. **Never call `queryOwnedPurchases()` directly from `onBillingSetupFinished` without checking `_jsReady`** — the WebView may not have loaded yet, silently dropping results.
- Each owned token is piped through `verify-play-purchase` → `applyPurchaseReward`, which sets `G[boughtKey]` and saves.

### Invariants — never break these
| Invariant | Why |
|-----------|-----|
| `PREMIUM_KEY` is never cleared in `resetGame()` | Paid items must survive a hard reset |
| `queryOwnedPurchases()` is gated on `_jsReady && _billingReady` | Billing setup fires before WebView loads — results would be silently dropped otherwise |
| `verify-play-purchase` must remain idempotent (check existing token before insert) | `queryOwnedPurchases` fires on every cold start — without this, duplicate records or errors on re-verify |
| `applyPurchaseReward` only runs on `data.success === true` with no `data.error` | Never grant items without server confirmation |
| `restore-purchases` queries by both `device_id` and `user_id` | `device_id` alone breaks after reinstall; `user_id` alone breaks without cloud save linked |
| `payLog()` helper in Java must call `_payLog` (not `_oauthLog`) | Purchase events must appear in the payment debug log, not just the OAuth log |
| Every ownership grant must call `_syncToCloud().catch(()=>{})` — `applyPurchaseReward` + the `already_processed` re-verify + silent-restore paths | Cloud autosave defaults OFF and only fires on a 15-min timer/manual save/sign-in. Without a sync-on-grant, a buyer's `game_saves` snapshot never receives the flag, so the admin Players tab shows "Premium 💎 —" for paying players (v2.6.8 fix). Entitlements are still safe — this is about mirroring them into the cloud save |

### Admin premium visibility — where the truth lives
- **Purchases tab** reads `play_purchases`/`purchases` directly → **authoritative** "did they pay".
- **Players tab** ("Premium 💎") reflects the player's **cloud-save snapshot** (`game_saves.save_data`), which can lag reality if their save hasn't synced since the purchase. Never treat the Players tab as proof of payment.
- Entitlement recovery does **not** depend on the cloud save — it comes from Google Play `queryOwnedPurchases` + `play_purchases` + local `PREMIUM_KEY`. A stale cloud save never means a lost purchase.
- Existing buyers whose LOCAL save already has premium won't auto-heal into the cloud (sync fires only on a `false→true` transition) — repair `game_saves` directly. Debug/repair recipe is in memory `project_admin_premium_visibility`.

### Adding a new premium product
1. Add to `PREMIUM_PRODUCTS` array in `game.js` with `id`, `boughtKey`, and display fields.
2. Add `id: {}` (or reward shape) to `REWARDS` in both `verify-play-purchase/index.ts` and `restore-purchases/index.ts`.
3. Add the product in Google Play Console as a non-consumable in-app product.
4. Test: buy → check debug log for `queryOwned found=<id>` + `verify OK` → confirm `G[boughtKey]` is `true`.

## Promotion / growth surfaces

Marketing pages, analytics and the share loop. All organic — no paid ads.
(The wide-viewport "site strip" identity card with About · Privacy · Terms links beside the
game column was removed in v3.10.12 at the owner's request; `/about` carries the OAuth
brand-review requirements, the game root no longer needs visible name/purpose text.)

### Content pages (SEO)
`/what-happened-to-egg-breaker`, `/play-egg-breaker-online`, `/egg-breaker-guide`,
`/egg-breaker-vs-original`, `/about`. Plain static HTML sharing `content.css`.
`/about` is also the **OAuth consent-screen home page** — Google requires visible page
text with the exact app name + purpose, which the game root cannot provide without UI
changes. Keep its H1 exactly `Egg Smash Adventures` and keep the "Google sign-in is used
for cloud save only" paragraph (see the Google OAuth notes above).
- Facts in these pages (egg tiers, hat/hammer prices, monkey perks, the 353-item
  total) come from `config.js`/`data.js`. **If you retune those, update the guide** —
  nothing enforces it automatically.
- `sitemap.xml` is generated by `build.js`. Adding a page means adding it to
  `SITEMAP_PAGES`, otherwise it never gets listed.
- Content pages are intentionally **not** in `sw.js` `STATIC_ASSETS` — pre-caching
  marketing pages would tax every player's install for pages most never open.

### Analytics
| Rule | Why |
|------|-----|
| Play Store links use `&referrer=` with URL-encoded `utm_*` inside | Bare `?utm_source=` on a Play listing URL is **dropped**. Play Console reads campaign data out of `referrer` |
| Attribution lives in its own `localStorage` key (`_ebaAttribution`), never `SAVE_KEY` | `resetGame()` clears the save; losing the original acquisition source silently corrupts reporting. Same reasoning as `_cloudLinkPref` / `PREMIUM_KEY` |
| `track()` must stay fail-safe | The itch.io build ships the same bundle and may load without umami. Analytics must never break play |
| Event names: `game-started` (carries `daysSinceFirstPlay`), `first-smash`, `first-break`, `welcome-dismissed`, `play-store-click`, `play-web-click`, `share-click`, `share-completed`, `referral-arrival`, `web-banner-shown`, `web-banner-dismissed` | Content pages fire these declaratively via `data-umami-event`; keep names in sync when adding surfaces |
| **No PII in analytics** — `track()` never attaches the cloud e-mail (removed v3.10.8) | `privacy.html` promises no personal data is collected |
| Meta Pixel (v3.10.8): `META_PIXEL_ID` in config.js, empty = nothing loads. Events: `PageView`, custom `GameStarted`/`FirstSmash`/`PlayStoreClick`, standard `Lead` on cloud link. Only on `eggbreakeradventure.com` / `egg-breaker-adventures.vercel.app`, never with `AndroidBridge` | Ads Manager needs conversions to optimise; itch/localhost/app must not pollute the ad account. Enabling it sets `_fbp` → EU/UK traffic needs consent or geo-exclusion |
| Content pages forward `utm_*`/`fbclid` into their `href="/"` CTAs (inline script before `</body>`); `share.js` strips `fbclid` after `trackGameStarted()` read it | Campaign params must survive the content-page hop; fbclid would fragment the Umami pages report |
| Quota hygiene: no per-load `Sentry.captureMessage`; boot `subscribe-push` DELETE only when a stale row can exist (pending flag / dropped local sub / one-time legacy cleanup) | A traffic spike would otherwise burn the GlitchTip quota (dropping real errors) and spend one edge-fn call per anonymous visitor for nothing (v3.10.9) |
| Web card (`#web-banner`, `.web-card`, `share.js initWebBanner`) shows only when `AndroidBridge` is absent AND no `.itch-cta` exists; **no auto-hide** — closing it writes `_ebaWebBanner='1'` permanently (v3.9.2) | It floats beside the game column (right edge, z-index 880 under `.overlay`) instead of over the top bar, so it never needs to time out. Below 880px there is no side room and it docks as a slim bottom bar. The key lives outside `SAVE_KEY` so a reset doesn't bring the nag back |

### Share / referral loop
| Invariant | Why |
|-----------|-----|
| `share.js` is bundled **after** `game.js` | It strips `ref/st/al/mk` from the URL, and `trackGameStarted()` must read them first to classify the source |
| Share links stay static (`/?ref=…`), no server-rendered `/s` route | It is the most important URL in the funnel: it cannot 500, cannot cold-start, and still resolves from the SW cache offline. Cost is a generic link preview — `TODO(owner)` in `share.js` has the upgrade path |
| Referral banner is `position:fixed` above `#app`, z-index 890 | It must not shift layout — `renderEggTray` computes from laid-out dimensions and only re-runs on tab switch. 890 keeps it under `.overlay` (900) so modals still cover it |
| Banner waits for the splash to clear (~4.6s) | The splash is z-index 9999; showing immediately burns most of the banner's 11s life behind it |
| Share code lives in its own `localStorage` key | Must survive `resetGame()` |

### Marketing asset tooling (run manually, not in the deploy)
```bash
node tools/capture-shots.js    # gameplay screenshots (full-res + web-sized /shots)
node tools/make-og.js          # 1200x630 og-image.png  (needs capture-shots first)
node tools/make-presskit.js    # press-kit.zip
node tools/check-listings.js   # validate store listings against Play's limits
```
`capture-shots.js` injects a rich save state on purpose — captures taken on an empty
save show "0/5 items" and "???" placeholders and sell the game badly. Eggs are
`.egg-slot`, **not** `.egg`.

## Auto-Smasher (idle) — `idle.js`, `CONFIG.autoTap` (v3.4.0)
Gold-shop only (no premium, by decision). Online the smasher spends hammers like a tap; **offline
taps are free (v3.6.1)** — the bar regenerates to full for the whole absence and the report comes on
top, so idle income is bounded by time × speed × efficiency + the item cap, not by regen.
| Rule | Why |
|------|-----|
| `game.js` boot skips `applyOfflineRegen` when the sim will run and leaves `_bootElapsedSec`; `idle.js`'s boot block does the sim after the whole bundle executed and calls `applyOfflineRegen(elapsed)` itself | Regen must be credited exactly once; `idle.js` must stay **after** game/smash/shop/achievements in `JS_FILES` |
| **All** module-level state in `idle.js` is `var`, never `let`/`const` | game.js boot calls `renderShop()` and `updateSkillBtns()` → `updateAutoBtn()` before idle.js's top level executes; a `let`/`const` there is in its TDZ and throws, aborting every later top-level statement in the bundle. v3.4.2 shipped this exact bug (`_autoTapNextAt`) — every player who had unlocked the smasher got a blank tray on reload; fresh saves never hit it because `updateAutoBtn` returns early when locked. Test the unlocked-then-reload path for any idle change |
| Offline rolls run with `_quietRoll = true` and `G.activeMult = 1` | No DOM/log/SFX from the sim; multipliers are never spent while away |
| The Auto-Smasher never touches Century eggs — `availableEggTypes(si, true)` offline, `e.type !== 'century'` filter online | The 100-hit jackpot stays a hands-on moment; the bot must not sink 100 hammers into it either |
| Offline items: max `offlineMaxItems` new per report, never rarity 3 | Collection completion stays a hands-on moment; the rest converts to duplicate gold |
| Clock guard: nothing simulated below `offlineMinSeconds` or above `offlineMaxSeconds`; time beyond the cap gets plain `applyOfflineRegen` | Tab switches don't nag; a clock jump can't mint 30 days; a capped absence never loses regen |
| The visibility handler saves on hide and runs the sim on show | Android suspends the WebView instead of closing it — that path is what mobile actually hits |
Invariants are checked by `tests/autotap.test.js` (vm sandbox, no browser).

## Quests (`quests.js`, `CONFIG.quests`, v3.7.0; 5 daily / 3 weekly since v3.10.0)
| Rule | Why |
|------|-----|
| Progress is `metric(now) − base` where `base` is snapshotted at assignment; new templates must name an existing `G` counter (or `skillUses`) | Nothing new is tracked; adding a quest is data only |
| **Any non-gameplay counter gain must call `questCredit(metric, amount)`** — trophy rewards, daily-login rewards, quest rewards, shop star pieces, album items bought with feathers | Otherwise a quest completes without doing the thing: buying album items finished "find 5 items", claiming a trophy finished "collect 10 star pieces", and rollover then auto-granted the reward (v3.8.0 fix) |
| `questFeasible(t)` filters templates the player cannot finish (album complete → no item quests, all collections done, egg type not spawnable yet) before the deterministic pick | Never offer an impossible quest |
| Two daily quests never share a `metric` | "Break 60 eggs" + "break 150 eggs" is one quest wearing two hats |
| Day key = `localDateStr()`, week key = the local Monday; `ensureQuests()` runs at boot, every 60s and on render — rollover **auto-claims** completed unclaimed quests before re-rolling | Same clock as the daily login; nothing earned is ever lost |
| Reward gold calls `_questBumpBases('totalGold', …)` | Quest gold must not progress "earn gold" quests |
| Templates with `need:` are filtered *before* the deterministic pick, so two players on the same day can differ only by what they have unlocked | Never hand a starfall quest to someone without Starfall |
| Rage refunds (`stopMonkeyRage`, boot restore) are the full remaining pool, never clamped to `maxH` | Overflow hammers (tier refills, quests, daily rewards) belong to the player; clamping silently deleted them when a rage was stopped mid-way (v3.10.0) |
| Runny eggs write `egg._pos` every drift tick | Re-renders and teleport read `_pos`; without the sync a smashed/re-rendered runny egg snapped back to its spawn spot |
| The Log **tab and the full activity log are gone** (v3.9.2) — `data-tab="quests"` took the slot and the tray's 5-line mini-log is the only history | Nav real estate; the filtered history was dead weight nobody opened twice |
Guarded by `tests/quests.test.js` (vm sandbox).

## Hammer mastery (`mastery.js`, `CONFIG.hammerMastery`, v3.8.0)
| Rule | Why |
|------|-----|
| Only the **equipped**, owned, non-default hammer gains XP (`addHammerXp`) | Choosing what to train is the decision; the Basic Hammer never levels |
| Bonuses stay always-active as before; mastery only **scales** them via `hammerBoost(id, key)` = `CONFIG.hammerMastery.scale[id][key] × hammerScale(id)` | Never gate an existing bonus behind a level — that would nerf owned hammers |
| Every scaling hook sits next to the base bonus it extends in `smash.js` (weights in `rollPrize`, gold in `resolvePrize`, procs in `smashEgg`) | One place per effect; grep `hammerBoost(` to find them all |
| L10 perks read `hammerPerk(id)` and are per hammer (see `hammerPerkDesc`) | Adding a hammer means adding a perk + a `scale` entry, nothing else |
| `hammerXp` is a plain `{id: xp}` map in the save; missing = 0 | Old saves and new hammers need no migration |
Guarded by `tests/mastery.test.js`.

## UI/UX quality bar (project rule, v3.10.1)
The game's UI is a product surface, not a debug view. Every change that touches something a
player sees must meet this bar before it ships — the hammer card in v3.10.0 (a 68px "band" holding
one line of text, 7–8px type, misaligned rows) is the reference for what NOT to ship.
| Rule | How to check |
|------|--------------|
| **No dead space.** Never reserve fixed-height bands "so things align"; size bands to real content, and align siblings by giving them the same *shape* (equal grid rows + same element order) | Screenshot at 390px and compare cards side by side |
| **Type is readable.** Pixel font: body ≥ 9px, labels ≥ 10px, never below 8px anywhere; sans-serif fallback for long prose | Zoom the screenshot 2× — if you squint, it's too small |
| **One rhythm.** 4px spacing steps (4/8/12/16); consistent gaps inside a component; text-align left inside dense info blocks, centred for hero elements | Measure `getBoundingClientRect` offsets in a Playwright pass — siblings should return one value |
| **Nothing clips.** Long labels wrap to a bounded number of lines or are shortened at the source (data) — never ellipsised into meaninglessness | Assert `scrollHeight <= clientHeight` on text nodes in the check script |
| **Verify visually before shipping.** Every UI change gets a real screenshot at 390px (phone) and 1280px (desktop) and a measurement pass; describe what was seen, not what was intended | The `.tmp.js` Playwright checks used throughout this project are the pattern |
| **Respect the game's language.** Gold `--gold` for value/primary, green `--green` for owned/done, `--gray` for secondary, hard 2–3px borders with `--dark` drop shadows; no new colours or radii without reason | Compare with an adjacent, existing component |

## Common pitfalls
- **Programmatic smashes while the play panel is collapsed.** `renderEggTray()` empties the tray when the panel has no size (another tab open) and defers. `smashEgg()` therefore returns *before* taking the per-egg `_smashing` lock if the slot element is missing, `renderEggTray()` clears every `_smashing` on rebuild, and the Auto-Smasher tick skips when the tray is empty. v3.6.4 fixed "eggs randomly unclickable after coming back from a tab" — the lock was being set and then a throw on the missing slot left it set forever.
- **Boot budget (v3.10.9):** splash fades when `#egg-tray .egg-slot` exists (min 1.2 s, max 4 s; `index.html` 6 s safety net remains); welcome modal follows `window._splashFadeAt`; SW registers on `DOMContentLoaded`, not `load`; music `Audio` gets `preload='none'` and is not `play()`ed before the first gesture (`audio.js _hadGesture`); portrait preload covers unlocked monkeys only. Measured cold mobile: 0.57 MB / playable 2.4 s wifi, 3.8 s Fast 3G (was 43 MB / 5.5 s / 7.6 s, and `load` never fired on 3G). Don't add boot-time fetches of anything a new player can't see.
- `renderEggTray` must run inside `requestAnimationFrame` when switching to play tab (needs laid-out dimensions)
- Tab panels use `visibility:hidden + flex:0 0 0` (not `display:none`) to keep animations alive
- `_sbClient.auth.getSession()` can hang on Android — always use cached `_cloudSession` from `onAuthStateChange`
- PayPal `el.dataset.rendered` guard prevents double-render when `renderPremiumShop` resets innerHTML

## Service worker invariants — never break these
| Invariant | Why |
|-----------|-----|
| `install` caches assets individually via `Promise.allSettled(...cache.add)` — never `cache.addAll` | `addAll` is atomic: one 404 rejects the whole install, so SW updates silently stop installing and clients freeze on a stale worker forever. This happened for v2.4.61→v2.6.2 (deleted maskable icons stayed in `STATIC_ASSETS`) — trapped devices served a fossilized v1.x cache and dead-ended in `net::ERR_TIMED_OUT` |
| When deleting a static file, remove it from `STATIC_ASSETS` in `sw.js` in the same commit | Stale entries 404 during install; even with allSettled they waste a fetch and hide real breakage |
| `networkFirst()` must always resolve — timeout → cache → shell (`/`) → `Response.error()`; never `respondWith(undefined)` | A hanging fetch or `undefined` response shows the browser's hard error page; the Android app is a raw WebView with no recovery UI |
| `STATIC_ASSETS` uses clean URLs (`/privacy`, not `/privacy.html`) | `cleanUrls: true` in vercel.json 308-redirects `.html` paths; `cache.add` rejects on non-200 |
| The version watchdog in `index.html` (fetch live sw.js → compare `CACHE_VERSION` to running `VERSION` → force update + one guarded reload) must stay | Last line of defense: no client can stay pinned to an old version while online, whatever the failure mode. Auto-SKIP_WAITING happens only at startup — the update banner remains the mid-session path |

All of these are enforced by `tests/sw-health.test.js` in CI (3× daily + every push). If a change legitimately needs to alter one, update the test in the same commit.

## Smash animation invariants — never break these

The tap-feedback animation broke twice with nothing failing, erroring or logging,
because both failures were **CSS cascade** failures: two rules set `animation` on
`.egg-slot` and the loser vanishes silently.

| Invariant | Why |
|-----------|-----|
| `smashEgg()`'s normal-egg branch must add the `smashing` class | It drives `egg-smash-retro`, the squash-and-rotate wiggle that reads as "you hit it". v3.2.1 (`ef754f5`) swapped it for `shake()` — a few-pixel translate — and the class survived only on the rage/starfall paths. The rule and keyframes stayed in `play.css`, orphaned, so the CSS looked healthy for months |
| `shake()` must strip `idle-wiggle` before adding its own class | `.egg-slot.idle-wiggle` is specificity (0,2,0); `.shake-*` is (0,1,0). A tap landing inside an egg's 0.5s idle wiggle showed no reaction at all |
| Special eggs (`crystal`/`ruby`/`black`/`century`) must resolve to `egg-crunch`, not `egg-smash-retro` | `.egg-slot.egg-crunching` and `.egg-slot.smashing` tie on specificity, so **source order in the bundle decides**. `egg-crunching` is earlier and would lose — the normal path must therefore never set `smashing` on a special egg |
| Teleport eggs (v3.9.0, `CONFIG.teleportEgg`; **exclusive** — never stacked with runny/timer/hex since v3.10.3) animate the slot's **transform/transition** (`.tele-out`/`.tele-in`) and put the shimmer/arrival `animation` on the SVG child | Same rule: never set `animation` on `.egg-slot` itself. `teleportEgg()` in smash.js also writes `egg._pos` so a re-render keeps the new spot |
| Any new `.egg-slot.<state>` rule that sets `animation` must not outrank the smash feedback | This is the whole bug class. Adding one is silent |
| The summon effect animates **children**, never `.egg-slot`, and the pop selector is keyed to the burst sibling: `.egg-slot.spawning > .spawn-burst ~ svg` (v3.10.3). Any `slot.innerHTML` rebuild (hit, break, rage, balloon, starfall) drops `.spawn-burst`, so a rebuilt SVG can never replay the pop even while the timer class is still on the slot | Keeps it out of the cascade. It plays only when `newRound()` sets `_spawnFxPending` before `renderEggTray()`. v3.7.1: relying on the burst's `animationend` left `spawning` stuck when a hit rebuilt the slot mid-burst → the pop replayed on every tap of multi-HP eggs. Tiers via `.spawn-t0…t6` (`SPAWN_TIER`), tiers ≥2 add canvas sparkles, century adds a beam + local star rain |

Guarded by `tests/smash-animation.test.js`, which asserts the **resolved**
`getComputedStyle().animationName` after a real tap — source greps cannot catch a
cascade loss. It drives Chromium, so CI runs `npm ci` + `npx playwright install
chromium` first; locally it skips with a warning if the browser binary is absent.

## Weekly promotion digest (`agents/`)

`node agents/digest.js` runs two research agents and emails one combined digest.
Scheduled by `.github/workflows/weekly-digest.yml` for Monday 08:00 Europe/Vienna.

| Rule | Why |
|------|-----|
| Reddit is blocked in **three** independent places — the prompt, `blocked_domains` on the web_search tool, and a URL/`r/sub` filter in `digest.js` | It is a hard product rule; a prompt alone is not a guarantee |
| The agents only ever *report* — nothing is posted anywhere | Every community action and draft reply is reviewed and posted by a human |
| `agents/seen.json` is committed back by the workflow | It is the de-duplication state; without persistence every week re-reports the same items. Keys are normalised host+path, so utm params and trailing slashes don't defeat it |
| `seen.json` is written **only after** a successful send | A delivery failure must not silently swallow a week's findings |
| Two API calls per section (research → structure) | The `web_search` tool returns citations, and structured outputs (`output_config.format`) are rejected alongside citations. Research runs free-form, then a tool-less call structures it against a JSON schema |
| Cron fires at **four** Monday-morning UTC slots; a guard sends only on the first success that week | Two independent problems. (a) DST: GitHub cron is UTC-only, so one expression drifts an hour twice a year — a local-hour window (08:00-10:00 Europe/Vienna) absorbs it. (b) GitHub silently DROPS a large share of cron firings (measured ~10/72 on yotamjacob/vanilla-sky-tracker), so a single slot quietly misses weeks. Extra slots are insurance; the guard stops duplicate emails |

Modes: `--test` (subject prefixed), `--dry-run` (renders `agents/preview.html`, sends nothing),
`--smoke` (tiny email, no research). Also available via workflow_dispatch.

Secrets required: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `DIGEST_FROM` (a Resend-verified
sending domain), optional `DIGEST_TO`.
