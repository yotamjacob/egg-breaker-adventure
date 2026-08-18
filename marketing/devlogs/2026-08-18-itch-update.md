# itch.io devlog — 2026-08-18

**Status:** ready to paste into itch.io → Egg Smash Adventures → Devlog → New post.
Upload `dist-itch.zip` (v3.10.2, ~10.5 MB — down from 63 MB, same game) first,
then post this.

Covers everything that changed for *itch players* between the July build
(v2.9.x) and v3.10.2. Android-only work (billing, Play Store) is left out.

---

## Title

```
Big update: idle play, quests, hammer training and teleporting eggs
```

**Alternates:**
- `The game keeps playing while you're away now — plus quests, hammer levels and a lot more`
- `Egg Smash Adventures 3.10: the "there's a lot more here" update`

---

## Body

```
This is the largest update since the game launched. Short version: it now
rewards coming back, it has goals every day, your hammers grow with you, and
the eggs got a lot more interesting to look at and hit. Also the download is
six times smaller.

## Auto-Smasher — the game plays while you're away

A gold-shop upgrade (Mr. Monkey stage 3, no premium). It taps eggs for you: a
robot pill in the tray toggles it, and it keeps working after you close the
tab. Come back and you get a "While you were away" report — eggs cracked, gold,
star pieces, items found — and your hammer bar is full. Three upgrade tracks:
tap speed, how many hours it covers, and how much of the away gold you keep.
It won't touch Century eggs; those are yours.

## Quests

A Quests tab: five daily quests and three weekly ones, drawn from a shared pool
so everyone gets the same set on a given day. Rewards are gold (scaling with
how far you are), feathers, star pieces, hammers and max hammers. Claim by hand;
anything you finished but forgot to claim is auto-claimed at reset. Quests only
ever ask for things you can actually do, and only real play counts toward
them — buying album items or claiming trophies doesn't.

## Train your hammer

The special hammer you have equipped earns XP for every hit, break and rare
find, up to level 10. Its own effect grows with it (Golden Hammer's gold, the
Cucumber's double-hit chance, Mjǫllnir's Starfall procs…). Level 5 gives any
hammer a 3% chance that a hit is free; level 10 unlocks a perk unique to each
hammer — the Golden Hammer's jackpots, the Judge Gavel refunding your hammer on
every verdict, Mjǫllnir dropping Starfall to five stars. The cursor glows
bronze → silver → gold → prismatic as it levels.

## Teleport eggs

Silver and gold eggs can now teleport: every hit beams them out and back in
somewhere else on the tray, far away. Chase one down and it pays four times
the normal prize.

## It looks better

Starfall is a proper rain of stars. Eggs pop in with a summon effect that gets
bigger and brighter by tier — Century eggs arrive on a column of light. Rage
has embers, Golden Goose has gold dust, Banana Shake throws confetti, and the
smash burst itself is smoother.

## Smaller things

- The shop is tabbed (Supplies / Upgrades / Auto / Hammers / Hats) instead of
  one long scroll, and hammer cards show everything about the hammer in one box.
- The download is ~10 MB instead of 63 MB. Same art, same audio, re-encoded.
- Overflow hammers (from stage rewards, quests, dailies) are never lost anymore
  when Rage is stopped early — that was a bug.
- Runny eggs no longer snap back to their spawn spot after a re-render — bug.
- Eggs could get stuck unclickable after switching tabs while the Auto-Smasher
  was running — fixed.
- 14 new trophies (Auto-Smasher, quests, hammer mastery, teleport eggs): 123 total.

That's it. If you played the July build, most of what you'll notice is that the
game has *reasons* now — a quest to finish, a hammer to level, a report waiting
when you come back. Tell me what's off; a fair few of these came from comments.
```

---

## Notes
- The itch page description was rewritten alongside this post — see
  `marketing/store-listings/itch.md`. Update both together.
- Version shown in Settings: **3.10.2**.
