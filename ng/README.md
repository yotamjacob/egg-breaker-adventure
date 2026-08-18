# Newgrounds build (`node build.js --newgrounds`)

Produces `dist-newgrounds/` + `dist-newgrounds.zip` (index.html at the zip root,
optimised assets). Nothing in this folder is bundled into the Vercel web game or
the Android app — `ng.js` is injected only into the copy of `index.html` written
to `dist-newgrounds/`, so the normal game is untouched.

## What the NG build changes (from the outside, at runtime)
| Change | Why |
|--------|-----|
| Premium tab/panel, "Support Us" button and the "looks best on mobile → Google Play" banner are removed | Newgrounds declines games that primarily funnel to an external store |
| Hammer regen 6s / 4s instead of 30s / 20s (`NG_CONFIG.pacing`) | Portal players judge in one sitting; an energy wall after two minutes reads as "not developed" |
| Welcome popup pitches the content (monkeys · stages · items, computed from `data.js`) instead of cloud save | The depth exists but was invisible in the first five minutes |
| Newgrounds.io medals mirror achievement unlocks; scoreboards mirror total gold / eggs / stages | Medals + scoreboards are the strongest "finished game" signal on NG and lift judgment scores |

## One-time setup on Newgrounds
1. Create the project: newgrounds.com → Your Stuff → Projects → **Game**.
2. Project page → **API Tools** → note the **App ID** and **Encryption Key**.
   Put them in the git-ignored `ng/ng.secrets.json`:
   `{ "appId": "12345:abcDEfgh", "encKey": "…==" }` (or export `NG_APP_ID` / `NG_ENC_KEY`).
   `build.js` injects them into `dist-newgrounds/ng-config.js` only — the repo is public,
   so they are never committed.
3. **Medals**: run `node tools/ng-medals.js` — it prints 29 medals (500 points, the NG budget)
   with names/descriptions/points, plus a `medals: {}` block. Create each medal in
   API Tools → Medals (`--csv` gives a spreadsheet-friendly list), then paste the ids
   into `ng/ng-config.js`. Medal icons: 50×50 — reuse `img/` sprites or the emoji shown in the Trophies tab.
4. **Scoreboards**: create three (Total Gold, Eggs Smashed, Stages Completed), sort *highest*,
   paste ids into `scoreboards`.
5. `node build.js --newgrounds` → upload `dist-newgrounds.zip` as an HTML5 game.
   Suggested embed size **600 × 800** (the game column is max 540px wide and fills any height ≥ 640px;
   NG's fullscreen button works too).
6. Listing copy: lead with the numbers — 6 monkeys, 53 stages, 353 collectibles, 109 trophies,
   medals + scoreboards. Mention what changed since the last submission.

## Testing locally
`npx serve dist-newgrounds` (or any static server) — without an `appId` the console
prints `[ng] NG_CONFIG.appId not set` and everything else still runs. With an appId,
NG requires the page to be loaded with `?ngio_session_id=…` (the NG player adds it) or
it shows the "Log in to Newgrounds" bar, which opens the passport flow.

## Files
- `ng.js` — the shim (funnel removal, pacing, welcome copy, NGIO wiring)
- `ng.css` — centres the game column in the NG iframe + login-bar styling
- `ng-config.js` — pacing + medal/scoreboard ids (edit this); App ID/key come from `ng.secrets.json` (git-ignored)
- `NewgroundsIO.min.js` — vendored official library (github.com/PsychoGoldfishNG/NewgroundsIO-JS)
- `../tools/ng-medals.js` — suggested medal set generator
