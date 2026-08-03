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
Egg Smash Adventures: I rebuilt a dead 2008 Facebook game in vanilla HTML5
```

## Post body

```
Back around 2008 there was a Facebook game called Egg Breaker. You spent a
hammer, cracked an egg, and out came gold, a multiplier, or if you were lucky,
a collection item you didn't have yet. Fill the collection, unlock the next
stage. That was the whole thing, and I could not put it down.

It got retired around 2016, and whatever was left of it died when browsers
dropped Flash. I kept waiting for someone to remake it. Nobody did, so I
finally did it myself.

Play it here, no install, it loads straight into the game:
https://egg-breaker-adventures.vercel.app/

What's in it:
- 6 monkey companions, each with their own world of 8 to 9 stages
- 353 items to collect
- 7 egg tiers, from a 1 hit Normal egg up to a 100 hit Century Egg
- 8 hammers and 5 hats, all with real stat effects
- No ads, no energy timers, no paywalls

On the tech side, since that's why we're all here: no engine, no framework,
just hand written HTML5 and JS. The build script concatenates the source and
runs esbuild for minification only. It's all DOM apart from a small particle
layer, which gave me easy layout and CSS animation at the cost of never being
able to do anything particle heavy.

One bug cost me months. The service worker used cache.addAll, which is atomic,
so a single 404 rejected the whole install and clients got stuck on an old
worker forever. It now caches assets one at a time with allSettled, with a
version watchdog as a backstop.

Three things I'd love your take on:

1. First 30 seconds. Is the loop clear without a tutorial? There's no
onboarding beyond a stage bar and a hammer counter, and I've stared at it far
too long to judge it anymore.

2. A layout problem I haven't solved nicely. The egg tray works out positions
from laid out dimensions and only recalculates on tab switch, so the game is
locked to portrait. For a DOM game, would you recompute on a debounced resize,
or restructure so the layout is pure CSS and never needs measuring?

3. The no ads, no timers stance is a reaction to what this genre turned into.
Does that read as principled, or just naive to people who've shipped more
casual games than I have?

Press kit and screenshots: https://egg-breaker-adventures.vercel.app/press
The story of the original: https://egg-breaker-adventures.vercel.app/what-happened-to-egg-breaker
Also on itch.io: https://yotamjac.itch.io/egg-smash-adventures

Built solo. Happy to dig into any of it.
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
