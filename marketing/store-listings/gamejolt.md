# Game Jolt — game page copy

Ready to paste at gamejolt.com → Dashboard → Games → your game.

> **Note on tags:** Game Jolt tags are chosen from a **fixed vocabulary**, not
> free text like itch.io, and the platform caps how many you may apply. The list
> below is **ranked** — take as many from the top as the UI allows and drop the
> rest. If an exact tag name is missing from their picker, pick the closest
> match rather than forcing it.

---

## Title

```
Egg Smash Adventures
```

## Tagline / short description

```
Smash eggs, collect 353 treasures, finish the album. A revival of the lost Facebook classic.
```

## Tags — ranked, take from the top

| # | Tag | Why it earns the slot |
|---|-----|----------------------|
| 1 | `idle` | The core loop; the biggest browse category this fits |
| 2 | `clicker` | What players actually search for in this genre |
| 3 | `incremental` | Genre-adjacent audience that overlaps heavily with idle |
| 4 | `retro` | Carries both the pixel art and the 2008-revival angle |
| 5 | `pixelart` | Visual identity; strong browse traffic |
| 6 | `collectathon` | The real differentiator — 353 items is the hook |
| 7 | `casual` | Broad, accurate |
| 8 | `cute` | Matches the tone and pulls a distinct audience |
| 9 | `singleplayer` | Accurate, low-value (most of the site is) |
| 10 | `arcade` | Fallback only if a slot is going spare |

## Category / genre

```
Other  →  or "Simulation" if Other is unavailable
```
Idle/incremental games have no dedicated Game Jolt category. Pick whichever of
those two their form offers; do not file it under Action or Arcade — the
audience mismatch costs more than the extra visibility gains.

## Development stage

```
Complete
```
The game is fully playable and released on web and Android. It is not a demo
and not early access.

## Maturity rating

```
Everyone
```
No violence beyond cartoon egg-cracking, no language, no gambling mechanics
(there are no loot boxes and no purchasable randomised rewards).

---

## Description

```
Smash eggs. Win prizes. Finish the album.

A free revival of the Egg Breaker Facebook game that quietly disappeared —
rebuilt from scratch, playable in your browser right now, no download.

## Where this came from

Around 2008 there was a Facebook game called Egg Breaker. You spent a hammer,
cracked an egg, and out came gold, a multiplier, or — if you were lucky — a
collection item you didn't have yet. Fill the collection, unlock the next
stage. Simple, and very hard to put down.

It was retired around 2016 when the studio wound down its Facebook titles, and
whatever survived died when browsers dropped Flash at the end of 2020. No
announcement, no sequel. I played it constantly as a kid and assumed someone
would remake it. Nobody did, so I built this.

It's a spiritual successor, not a copy — the art, the worlds and every single
item are new. What's faithful is the rhythm.

## What's in it

**353 items to collect.** Six monkey companions, each with their own themed
world of 8-9 stages and a full collection to complete. Fill a stage's
collection and the next one unlocks.

**Seven egg tiers.** From the everyday Normal egg up to the mythical Century
Egg, which takes 100 hits and pays out 100x. Rarer eggs take more hammers but
roll from strictly better prize tables.

**Gear that actually matters.** Nine hammers and five hats, all with real stat
effects rather than pure decoration — more gold, more items, more star pieces,
or a 4% chance to shatter any egg instantly regardless of its health.

**Starfall and multipliers.** Collect star pieces to trigger a Starfall bonus
round. Stack multipliers before cracking a rare egg for one enormous payout.

**Three active skills.** Monkey Rage, Golden Goose and Banana Shake, for when
you want something to press.

**Daily rewards** with a streak that genuinely escalates, dozens of trophies,
and a few hidden secrets.

## No ads. No energy timers. No paywalls.

No interstitials. No rewarded videos. No eight-hour waits to play again.
Hammers regenerate on their own. There are optional one-time purchases for
convenience and cosmetics, and nothing in the game is locked behind them.

The browser version is the full game — not a demo, not a trial.

## Feedback

Genuinely useful: what made you stop playing? A difficulty wall, a stage that
dragged, a collection that felt unfair — that's the most valuable thing you can
tell me. Comments are open.
```

---

## Build to upload

Use `node build.js --gamejolt` → `dist-gamejolt.zip`. index.html sits at the
archive root and Game Jolt permits outbound links, so cloud save, the premium
shop and the Play CTA all stay.

It ships optimised assets: the payload goes from **78MB to 11MB** with no
visible quality loss (512px palette PNGs, 96kbps mono audio), which matters on
a browser-games site where load time is most of the first impression.
