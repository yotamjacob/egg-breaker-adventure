# html5gamedevs.com — Game Showcase post

Board: **Game Showcase**
Guidelines followed: https://www.html5gamedevs.com/topic/873-guidelines-for-posting-in-this-board/

## Checklist against the board rules

| Rule | Status |
|------|--------|
| `[WIP]` prefix | **Not used** — the game is released on web + Play, not work-in-progress. The prefix is only for WIP games. |
| One or more screenshots, ~800×600 | ✅ two prepared at exactly 800×600 |
| Screenshots uploaded as **attachments**, not external hosting | ⚠️ **you must attach the files** — do not paste image URLs |
| Short description | ✅ |
| Link to the game | ✅ |
| Optional website / blog link | ✅ (press kit + the "what happened" writeup) |
| Ask for specific feedback to start a discussion | ✅ three concrete questions |
| Moderator approval required before it appears | expect a delay — don't repost |

**Attach these two files** (from `marketing/covers/`):
- `forum-1-gameplay-800x600.png`
- `forum-2-progression-800x600.png`

Optional third: `promo/egg-smash-gameplay.gif` (2.2 MB — the board says GIFs are fine
but file size matters; skip it if it feels heavy, the two stills carry the post).

---

## Title

```
Egg Smash Adventures — rebuilding a dead 2008 Facebook game from scratch in vanilla HTML5
```

## Post body

```
Around 2008 there was a Facebook game called Egg Breaker, published by LabPixies.
You spent a hammer, cracked an egg, and out came gold, a multiplier, or — if you
were lucky — a collection item you didn't have. Fill the collection, unlock the
next stage. It was retired around 2016, and whatever survived died when browsers
dropped Flash at the end of 2020.

I played it constantly as a kid, assumed someone would remake it, and eventually
gave up waiting. Egg Smash Adventures is that remake — same core loop, entirely
new art, worlds and items.

▶ Play (instant, no install): https://egg-breaker-adventures.vercel.app/

WHAT'S IN IT
• 6 monkey companions, each a themed world of 8–9 stages
• 353 collectible items total
• 7 egg tiers, from a 1-hit Normal egg to a 100-hit Century Egg
• 8 unlockable hammers and 5 unlockable hats, all with real stat effects
  rather than pure cosmetics
• Starfall bonus rounds and stacking multipliers
• No ads, no energy timers, no paywalls

THE TECH, SINCE THAT'S WHY WE'RE ALL HERE
No engine and no framework — plain HTML5 and hand-written JS. The build is a
Node script that concatenates the source files and runs them through esbuild for
minification only (identifiers are deliberately NOT mangled, because inline
onclick handlers in the HTML reference globals by name). Output is one JS bundle
and one CSS bundle.

Everything is DOM, no canvas, except a small particle layer for the egg-break
effect. That was a deliberate bet: DOM gave me free accessibility, trivial
layout, and CSS animations, at the cost of not being able to do anything
particle-heavy. Mostly it paid off.

Other bits that might be useful to someone:
• PWA with a service worker; plays offline after first load. The install step
  caches assets individually via Promise.allSettled rather than cache.addAll —
  addAll is atomic, so one 404 rejects the whole install and clients get stuck
  on a stale worker forever. That happened to me for ~100 versions before I
  worked out why. There's now a version watchdog in the page as a last resort.
• Optional cloud save via Supabase + Google OAuth. Progress is localStorage by
  default; signing in is opt-in.
• The same codebase ships to web, Android, itch.io and CrazyGames from one
  build script with per-platform targets. The CrazyGames build strips every
  external request (self-hosted fonts, no analytics, no cloud save) to meet
  their rules, and re-encodes assets down from 78 MB to 11 MB — 1024px PNG
  masters resized to 512 and palette-quantised, audio to 96 kbps mono. Pixel
  art quantises almost losslessly, which I did not expect.
• Android is a raw WebView wrapper rather than a TWA, so Google Play Billing
  talks to the page through a JS bridge.

FEEDBACK I'D ACTUALLY LIKE
1. First 30 seconds — is the core loop legible without a tutorial? There's no
   onboarding beyond a stage bar and a hammer counter, and I genuinely can't
   tell anymore whether that reads as "obvious" or as "nothing is happening".

2. A real layout problem I haven't solved well: the egg tray computes positions
   from laid-out dimensions and only re-runs on tab switch — there's no resize
   or orientationchange listener. So the game is locked to portrait, because a
   rotation would leave the tray mislaid-out. For a DOM-based game, how do you
   handle this? Recompute on a debounced resize, or restructure so layout is
   pure CSS and never needs measuring?

3. The no-ads / no-timers stance is a reaction to what this genre became, but
   I'm curious whether it reads as principled or just naive to people who've
   shipped more casual games than I have.

MORE
Press kit / screenshots / factsheet: https://egg-breaker-adventures.vercel.app/press
The full story of the original game: https://egg-breaker-adventures.vercel.app/what-happened-to-egg-breaker
Also on itch.io: https://yotamjac.itch.io/egg-smash-adventures

Built solo. Happy to go into detail on any of the above.
```

---

## Notes before you post

- **Attach the PNGs, don't link them.** The guidelines specifically ask for direct
  attachments rather than external image hosting.
- **The post needs moderator approval**, so it won't appear immediately. That's
  normal; don't repost.
- The board says a well-formed post has a good chance of being tweeted out by
  the admin, which is the main reason to follow the format exactly.
- Question 2 is a genuine open problem in the codebase, not a rhetorical device.
  If someone answers it well, that's a real fix worth making.
