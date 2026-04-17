# Egg Breaker Adventures — Claude Code Guide

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
| `play.css` | Play-tab styles — egg tray, hammer bar, log, mult bar, stage chip, particles |
| `style.css` | Global styles — CSS variables, nav, resource bar, tab panels, modals |
| `tabs.css` | Non-play tab styles — album, shop, monkeys, premium, daily, lexicon, achievements |
| `components.css` | Shared component styles — toast, snack, tooltips |
| `sw.js` | Service worker — cache versioning, network-first fetch strategy |
| `build.js` | Bundles JS+CSS → bundle.min.js + bundle.min.css |
| `supabase/functions/` | Edge Functions: create-order, capture-order, verify-play-purchase, subscribe-push, send-notifications |

## Build & deploy
```bash
node build.js                    # bundle JS + CSS (always run before commit)
git add -A && git commit && git push   # Vercel auto-deploys on push
supabase functions deploy <name> # deploy a single edge function
```
Never run `npx vercel --prod` manually.

## Version bumping (every commit)
- `config.js` near top: `const VERSION = 'X.Y.Z'`
- `sw.js` line 6: `const CACHE_VERSION = 'X.Y.Z'`

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

## Key patterns

### Adding config values
Add to `CONFIG` in `config.js`, reference as `CONFIG.myValue` in game.js/render.js.

### Adding a prize weight change
Edit `prizes:` inside the relevant egg type in `CONFIG.eggTypes`. Weights are relative integers.

### Tier rewards
`CONFIG.tierRewards.silver` = Bronze→Silver (currently unused in code — wired but not called)
`CONFIG.tierRewards.gold` = Silver→Gold (gives maxHammers + hammerRefill)

### Mr Monkey item boost
`game.js rollPrize()` — `if (monkey && monkey.id === 'mr_monkey') w.item *= 1.5`

### Starting resources
`CONFIG.startingHammers`, `CONFIG.startingMaxHammers`, `CONFIG.startingGold` → applied in `DEFAULT_STATE`

## Payment flow (web)
1. PayPal SDK loaded with `components=googlepay` (auto-retries without if merchant not enrolled)
2. Google Pay JS loaded from `pay.google.com`
3. If eligible: Google Pay button (main) + "— or —" + PayPal button (secondary)
4. Both flows: `create-order` edge fn → PayPal order ID → confirm payment → `/api/capture-order` (Vercel proxy) → `capture-order` edge fn
5. Android TWA: Google Play Billing → `onPlayPurchaseResult` → `/api/verify-play-purchase` (Vercel proxy) → `verify-play-purchase` edge fn
6. "Restore Purchases" button → `/api/restore-purchases` (Vercel proxy) → `restore-purchases` edge fn (captures pending PayPal orders too)
- All payment calls use same-origin Vercel proxies (`api/capture-order.js`, `api/restore-purchases.js`, `api/verify-play-purchase.js`) to avoid CORS failures — the production origin was missing from `verify-play-purchase`'s ALLOWED_ORIGINS, causing `TypeError: Failed to fetch` in the Android WebView

## Supabase
- Project: `hhpikvqeopscjdzuhbfk` (EU West)
- CORS: production origin `https://egg-breaker-adventures.vercel.app` hardcoded in each function
- `purchases` table: device_id, product_id, paypal_order_id, amount, status

## CSS variables (style.css)
`--gold:#f5c542` `--gold2:#d4a017` `--gold3:#a67c00` `--green:#2ecc71` `--panel:#0f3460` `--dark:#0a0a18` `--bg:#1a1a2e` `--bg2:#16213e` `--amber:#e88d2a` `--gray:#7f8c8d`

## Response format
Always end every response to the user with the current version: **"Current version: X.Y.Z"**

## Common pitfalls
- `renderEggTray` must run inside `requestAnimationFrame` when switching to play tab (needs laid-out dimensions)
- Tab panels use `visibility:hidden + flex:0 0 0` (not `display:none`) to keep animations alive
- `_sbClient.auth.getSession()` can hang on Android — always use cached `_cloudSession` from `onAuthStateChange`
- PayPal `el.dataset.rendered` guard prevents double-render when `renderPremiumShop` resets innerHTML
