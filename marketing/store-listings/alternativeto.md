# AlternativeTo.net — submission pack

One entry only, covering **both** the web build and the Android build. Do **not** submit
the itch.io or Game Jolt builds separately — AlternativeTo treats repackaged versions of
the same app as duplicates and declines them.

Rules this pack is written against: <https://alternativeto.net/faq/#why-wasn-t-my-software-app-approved>

---

## Rejection risks for *this* submission, and what neutralises each

| Risk | Why it applies here | Mitigation baked into this pack |
|------|---------------------|---------------------------------|
| **"Personal websites, small sites made with automated tools"** — their single biggest decline bucket | A one-developer browser game on a `*.vercel.app` domain pattern-matches this exactly | Fill the **Android download link** with the Google Play listing. A published Play Store app is the clearest signal that this is a shipped product, not a personal page. This is the highest-leverage field in the whole form |
| **Marketing language in the description** — explicit rejection reason | The Play Store copy in `en-US.md` is written to sell: emoji section headers, "The classic egg-smashing game is back", "✅ NO ADS. NO ENERGY TIMERS. NO PAYWALLS.", a closing call to action | Use the description below instead. It is third-person, factual, no exclamation marks, no superlatives, no call to action, no "by one developer who missed it" (that phrasing actively invites the personal-project decline) |
| **URLs / emails / phone numbers in the description** — explicit rejection reason | The Play Store copy ends with `egg-breaker-adventures.vercel.app` | The description below contains zero URLs. Links go in the dedicated URL fields, which is where they are allowed |
| **Non-English apps** | — | Game is English-first; fine |
| **Closed beta / geo-restricted** | — | Live on Play and on the open web, no region gate; fine |
| **Duplicate entries** | itch.io, Game Jolt, web and Android builds all exist | One entry, platforms ticked as Web + Android |
| **Self-promotion on the profile** — explicit rule | Tempting to put the game link in the bio | Leave the profile bio empty of product links. Instead claim the listing through the official developer flow once it's approved |
| **Incentivised voting** — explicit rule | — | Never ask anyone to upvote the entry. This gets listings pulled, not just declined |

---

## Form fields — ready to paste

### Name
```
Egg Smash Adventures
```

### Homepage URL
```
https://egg-breaker-adventures.vercel.app/
```
Use the web build, not the Play listing, as the homepage. The URL loads directly into a
playable game rather than a marketing page — that alone answers the "is this just a small
website" question a reviewer is asking.

### Android download link
```
https://play.google.com/store/apps/details?id=com.eggbreakeradventures.app
```

### License
```
Freemium
```
Not "Free" — optional one-time in-app purchases exist on Android, and a mismatch between
the stated license and what a reviewer sees in the app is a fast decline.

### Platforms
Tick exactly:
- **Web** (browser)
- **Android**
- **Android Tablet** — only if offered as a separate checkbox; the app is portrait-locked but does run on tablets

Do **not** tick Windows / Mac / Linux. It installs as a PWA on desktop, but ticking desktop
OSes for a browser game reads as platform-padding and invites scrutiny.

### Short description — **290 character limit**
267 characters. No URLs, no marketing language:

```
A browser and Android game in which the player breaks eggs with a hammer to win prizes and complete collections. An independent recreation of Egg Breaker Adventures, a Facebook game retired around 2016. 353 collectible items, 53 stages, six monkey companions, no ads.
```

Two alternates, if you want a different emphasis — both also under the limit:

```
Egg Smash Adventures is a browser and Android collection game in which the player breaks eggs with a hammer to win prizes. An independent recreation of the Facebook game Egg Breaker Adventures, with 353 collectible items across 53 stages and six monkey companions.
```
*(264 characters — leads with the product name, drops the shutdown hook.)*

```
A browser and Android collection game in which the player breaks eggs with a hammer to win prizes and fill an album. An independent recreation of the Facebook game Egg Breaker Adventures, with 353 items across 53 stages, six monkey companions and no advertisements.
```
*(265 characters — no date claim at all.)*

Keep "retired around 2016" hedged exactly as written: `what-happened-to-egg-breaker.html`
says the studio wound down its Facebook titles *around* 2016, and a flat date here would
be more confident than the game's own content page.

### Full description
No URLs, no contact details, no marketing language. Paste as-is:

```
Egg Smash Adventures is a browser and Android game in which the player breaks eggs with a hammer to win prizes and complete themed collections. It is an independent recreation of Egg Breaker Adventures, a Facebook game that ran from 2008 until its shutdown.

Each tap spends a hammer and damages the egg on screen. Rarer egg tiers take more hits and pay out proportionally more: gold, star pieces, multipliers, and the collectible items that fill the album. There are seven egg tiers and 353 items spread across 53 stages, and completing a stage's collection unlocks the next one.

Six monkey companions each apply a passive bonus to gold, item drop rate or star pieces, and each gates its own themed set of stages. Gold buys nine hammer types, hats and permanent upgrades. Three active skills, Monkey Rage, Golden Goose and Banana Shake, can be triggered during play, and a starfall bonus round fires once enough star pieces are collected. The game includes over a hundred achievements and a daily reward streak.

Hammers regenerate on a timer. There are no advertisements or rewarded videos. Optional one-time in-app purchases on Android provide gold, hammers and drop-rate modifiers. Progress is stored locally by default and can optionally be synced across devices with a Google account.

The game installs as a progressive web app and runs offline after the first load.
```

Condensed variant, if the full-description field turns out to be tighter than expected.
Still ~600 characters — this is **not** a fit for the 290-character short description above:

```
Egg Smash Adventures is a browser and Android collection game in which the player breaks eggs with a hammer to win prizes. It is an independent recreation of Egg Breaker Adventures, a Facebook game that ran from 2008 until its shutdown. Seven egg tiers drop gold, star pieces, multipliers and collectible items across 353 items and 53 stages, with six monkey companions that each apply a passive bonus and gate their own stages. Hammers regenerate on a timer, there are no advertisements, and optional one-time in-app purchases are available on Android. It installs as a progressive web app and runs offline.
```

### Tags
Lowercase and generic — AlternativeTo wants categorisation, not keywords:
```
game, casual-game, clicker, incremental-game, idle-game, collecting, browser-game, progressive-web-app, offline, free-to-play, retro
```

### "Alternative to"
Search their database for `Egg Breaker` first. If an entry for the original Facebook game
exists, that is by far the strongest single alternative to attach — this game's entire
premise is that it replaces a dead product, which is precisely what the site is for.

If it does not exist, attach these instead (all confirmed present on the site):
- Cookie Clicker
- Clicker Heroes
- Idle Miner Tycoon
- Melvor Idle

---

## Assets

| Field | File | Status |
|-------|------|--------|
| Icon | `icon-512.png` | 512×512 PNG, RGBA — clears their 280×280 minimum. Transparent background is only "preferred", not required |
| Screenshots | `shots/play.png`, `shots/album.png`, `shots/monkeys.png`, `shots/shop.png`, `shots/trophies.png` | 440×952 PNG each |

Use `shots/`, **not** `screenshots/`. `tools/capture-shots.js` injects a rich save state
before capturing, so those show a filled album and unlocked monkeys. Captures on an empty
save show "0/5 items" and "???" placeholders, which make the game look like an empty shell
to a reviewer skimming for low-value submissions.

Regenerate with `node tools/capture-shots.js` if the UI has changed since the last run.

---

## After submitting

1. Approval is manual and can take days. Do not resubmit — a second entry is a duplicate.
2. Once live, claim it through the site's own "I'm the developer / manage this app" flow.
   That is the sanctioned way to be associated with the listing; a product link in the
   profile bio is not.
3. Never solicit upvotes, in any channel. That is an explicit rule and it is enforced
   against the listing, not just the account.

---

## Keeping this honest

Every number above is read from `config.js` / `data.js` as of v3.0.5:
7 egg tiers · 6 monkeys · 53 stages · 353 items · 9 hammers · 109 achievements
(102 visible + 7 secret). If those get retuned, this file and `egg-breaker-guide.html`
both go stale — nothing enforces it automatically.

Note the Play Store copy in `en-US.md` says "five hats"; `SHOP_HATS` currently holds six.
This file avoids the number rather than repeat the discrepancy.
