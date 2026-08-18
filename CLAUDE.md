# Egg Smash Adventures — Claude Code Guide

## Module map
| File | Purpose |
|------|---------|
| `config.js` | Single source of truth — all tuning values, egg types, prize weights, CONFIG object |
| `data.js` | Static game data — monkey definitions, stage collections, achievement data, item quotes |
| `game.js` | Game engine — DEFAULT_STATE, smash logic, prize rolling, shop, cloud save, payments |
| `render.js` | All DOM rendering — renderEggTray, renderAlbum, renderShop, renderPremiumShop, etc. |
| `audio.js` | Sound effects and music — loaded separately, not bundled |
| `particles.js` | Particle effects for egg breaking animations |
| `hammers.js` | Hammer regeneration logic — regen interval, fast regen, max hammer tracking |
| `idle.js` | Auto-Smasher (idle) — gold-shop helper that taps eggs with hammers: online loop, offline simulation, "while you were away" report, leveled shop upgrades. **Bundled after achievements.js** (its boot block needs everything before it) |
| `analytics.js` | Umami event wrapper + traffic attribution — `track()`, `openPlayStore()`, `playStoreUrl()`, first-touch source. Bundled after `config.js`. Every call is fail-safe |
| `share.js` | Share/referral loop — `shareGame()`, share-link builder, arrival banner. **Bundled after `game.js`** (see Promotion below) |
| `play.css` | Play-tab styles — egg tray, hammer bar, log, mult bar, stage chip, particles |
| `style.css` | Global styles — CSS variables, nav, resource bar, tab panels, modals |
| `tabs.css` | Non-play tab styles — album, shop, monkeys, premium, daily, lexicon, achievements |
| `components.css` | Shared component styles — toast, snack, tooltips, referral banner |
| `content.css` | Styles for the SEO content pages only — **not** part of `bundle.min.css` |
| `sw.js` | Service worker — cache versioning, network-first fetch strategy |
| `build.js` | Bundles JS+CSS → bundle.min.js + bundle.min.css; `--itch` assembles the static itch.io build; also generates `sitemap.xml` |
| `itch/itch.js` | itch-only shim — Google Play CTA + desktop phone frame (loaded by the `--itch` build) |
| `ng/` | Newgrounds-only shim (`ng.js`, `ng.css`, `ng-config.js`, vendored `NewgroundsIO.min.js`) — loaded by the `--newgrounds` build only. Removes the store funnel, portal pacing, NG medals + scoreboards. See `ng/README.md` |
| `tools/ng-medals.js` | Prints the curated 29-medal / 500-point set (+ `ng-config.js` template) from `ACHIEVEMENT_DATA` |
| `payments.js` | Google Play Billing, purchase verification, restore-purchases flow, PREMIUM_PRODUCTS |
| `cloud.js` | Supabase auth + cloud save — `_syncToCloud`, autosave timer (default OFF), session caching |
| `admin.html` | Standalone admin dashboard (not bundled) — Players/Purchases/Analytics tabs; calls admin-* edge fns with `x-admin-secret` |
| `supabase/functions/` | Edge Functions: verify-play-purchase, restore-purchases, subscribe-push, send-notifications, admin-players, admin-purchases |
| `agents/digest.js` | Weekly promotion digest — two web-search research agents (communities + "Egg Breaker" mentions), de-dupes via `agents/seen.json`, emails HTML via Resend. Run by `.github/workflows/weekly-digest.yml` |
| `agents/prompts.js` | Research prompts for the digest. Reddit is excluded here AND via `blocked_domains` AND by a URL filter in digest.js |
| `tests/` | Node test suites — `smoke.test.js` (prod availability, payments, cloud), `sw-health.test.js` (SW invariants, static + live), `smash-animation.test.js` (tap-feedback cascade, drives real Chromium), `autotap.test.js` (offline-simulation accounting invariants, vm sandbox) |
| `.github/workflows/smoke-tests.yml` | CI: runs all tests 3× daily (08/14/20 UTC) + on every push to main; emails on failure |

## Build & deploy
```bash
node build.js                    # bundle JS + CSS (always run before commit)
node build.js --itch             # + assemble itch.io build → dist-itch.zip
node build.js --gamejolt         # + assemble Game Jolt build → dist-gamejolt.zip (itch features, optimised assets)
node build.js --newgrounds       # + assemble Newgrounds build → dist-newgrounds.zip (no store funnel, NG medals/scoreboards, portal pacing)
git add -A && git commit && git push   # Vercel auto-deploys on push
supabase functions deploy <name> # deploy a single edge function
```
Never run `npx vercel --prod` manually.

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

### Content pages (SEO)
`/what-happened-to-egg-breaker`, `/play-egg-breaker-online`, `/egg-breaker-guide`,
`/egg-breaker-vs-original`. Plain static HTML sharing `content.css`.
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
| Event names: `game-started`, `play-store-click`, `play-web-click`, `share-click`, `share-completed`, `referral-arrival`, `web-banner-shown`, `web-banner-dismissed` | Content pages fire these declaratively via `data-umami-event`; keep names in sync when adding surfaces |
| Web banner (`#web-banner`, `share.js initWebBanner`) shows only when `AndroidBridge` is absent AND no `.itch-cta` exists; user-dismiss snoozes 7 days in `_ebaWebBanner`; auto-hides after 14s | It is `position:fixed` over the top bar, so it must go away on its own; itch/Game Jolt already paint a Play CTA; the snooze key lives outside `SAVE_KEY` so a reset doesn't bring the nag back |

### Share / referral loop
| Invariant | Why |
|-----------|-----|
| `share.js` is bundled **after** `game.js` | It strips `ref/st/al/mk` from the URL, and `trackGameStarted()` must read them first to classify the source |
| Share links stay static (`/?ref=…`), no server-rendered `/s` route | It is the most important URL in the funnel: it cannot 500, cannot cold-start, and still resolves from the SW cache offline. Cost is a generic link preview — `TODO(owner)` in `share.js` has the upgrade path |
| Referral banner is `position:fixed` above `#app`, z-index 890 | It must not shift layout — `renderEggTray` computes from laid-out dimensions and only re-runs on tab switch. 890 keeps it under `.overlay` (900) so modals still cover it |
| Banner waits for the splash to clear (~4.6s) | The splash is z-index 9999; showing immediately burns most of the banner's 11s life behind it |
| Share code lives in its own `localStorage` key | Must survive `resetGame()` |

### Newgrounds build (`ng/`)
Newgrounds rejected the first submission ("not enough content / not developed enough")
— the game's depth was invisible in the first five minutes and the itch shim reads as
a Play-Store advert. `ng.js` fixes this **from the outside** (runtime hooks on globals),
so the web/Android game is untouched:
| Rule | Why |
|------|-----|
| The NG shim is only ever injected into `dist-newgrounds/index.html` by `NG_SHIM` in `build.js` — never into `JS_FILES` | Web/Android must not change; that is the whole contract of the NG build |
| Premium tab/panel, "Support Us" and `#web-banner` are removed at runtime; nothing links to Google Play | NG declines games that primarily funnel to an external store |
| Pacing (`NG_CONFIG.pacing`) overrides `CONFIG.regenInterval` after load, and clamps the already-seeded `G.regenCD` | Portal players judge in one sitting; the 30s regen wall after ~2 min is the classic "not developed" trigger |
| Medals hook `window.checkAchievements` (wrap, not replace) and re-sync every 60s; scores post only when a value increases | Achievements stay the single source of truth; the wrap must call the original |
| `checkHostLicense:false` in `NGIO.init` | A host-license hiccup must never brick the build |
| App ID + encryption key live in git-ignored `ng/ng.secrets.json` (or `NG_APP_ID`/`NG_ENC_KEY`) and are injected into `dist-newgrounds/ng-config.js` at build time; medal ids stay in `ng/ng-config.js` | Public repo — never commit the key. The build warns when `appId` is empty (medals silently disabled) |
Setup steps (create project, medals, scoreboards, embed size) are in `ng/README.md`.

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
Gold-shop only (no premium, by decision). Hammers are the fuel: idle income is bounded by regen,
so shop prices never needed retuning.
| Rule | Why |
|------|-----|
| `game.js` boot skips `applyOfflineRegen` when the sim will run and leaves `_bootElapsedSec`; `idle.js`'s boot block does the sim after the whole bundle executed | The sim walks regen tap by tap itself; crediting regen first would double-count. `idle.js` must stay **after** game/smash/shop/achievements in `JS_FILES` |
| **All** module-level state in `idle.js` is `var`, never `let`/`const` | game.js boot calls `renderShop()` and `updateSkillBtns()` → `updateAutoBtn()` before idle.js's top level executes; a `let`/`const` there is in its TDZ and throws, aborting every later top-level statement in the bundle. v3.4.2 shipped this exact bug (`_autoTapNextAt`) — every player who had unlocked the smasher got a blank tray on reload; fresh saves never hit it because `updateAutoBtn` returns early when locked. Test the unlocked-then-reload path for any idle change |
| Offline rolls run with `_quietRoll = true` and `G.activeMult = 1` | No DOM/log/SFX from the sim; multipliers are never spent while away |
| The Auto-Smasher never touches Century eggs — `availableEggTypes(si, true)` offline, `e.type !== 'century'` filter online | The 100-hit jackpot stays a hands-on moment; the bot must not sink 100 hammers into it either |
| Offline items: max `offlineMaxItems` new per report, never rarity 3 | Collection completion stays a hands-on moment; the rest converts to duplicate gold |
| Clock guard: nothing simulated below `offlineMinSeconds` or above `offlineMaxSeconds`; time beyond the cap gets plain `applyOfflineRegen` | Tab switches don't nag; a clock jump can't mint 30 days; a capped absence never loses regen |
| The visibility handler saves on hide and runs the sim on show | Android suspends the WebView instead of closing it — that path is what mobile actually hits |
Invariants are checked by `tests/autotap.test.js` (vm sandbox, no browser).

## Common pitfalls
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
| Any new `.egg-slot.<state>` rule that sets `animation` must not outrank the smash feedback | This is the whole bug class. Adding one is silent |

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
