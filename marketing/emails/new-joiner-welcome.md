# Welcome email — new joiners

**HTML version:** `marketing/emails/new-joiner-welcome.html` (light, minimal; short list of
what's new, Play Store badge; images served from `/email/*.png` on the live site).
The text below is the plain-text alternative sent alongside it.

Send to new players / early joiners. Plain text, no emoji clutter.
The Play link carries `referrer=` attribution so installs from this email show up
in Play Console as `utm_source=email / utm_medium=welcome` (a bare `?utm_source=`
on a Play listing URL is dropped — see CLAUDE.md → Analytics).

**Play link to use:**
`https://play.google.com/store/apps/details?id=com.eggbreakeradventures.app&referrer=utm_source%3Demail%26utm_medium%3Dwelcome%26utm_campaign%3Dplay_install%26utm_content%3Dnew_joiner`

---

## Subject line options
1. `You're in — and the game just got a lot bigger`
2. `Welcome to Egg Smash Adventures (plus a free item for you)`
3. `New in Egg Smash: quests, hammer training, and an idle helper`

---

## Body

```
Hi,

Thanks for joining Egg Smash Adventures — the Facebook egg-breaking classic,
rebuilt from scratch and free to play.

A quick tour of what's new, because a lot has landed recently:

• Auto-Smasher — a helper you unlock in the shop that keeps cracking eggs
  while the game is closed. Come back and it hands you a report of everything
  it found. Your hammers refill in full while you're away, so nothing is lost.

• Daily & weekly quests — three goals a day and one bigger goal each week,
  paying gold, feathers and star pieces. Everyone gets the same set, so you
  can compare notes.

• Hammer training — the special hammer you have equipped now levels up as you
  play, all the way to level 10. Its effect grows with it, and at max level
  each hammer unlocks a perk of its own: the Golden Hammer's prizes can pay
  five times over, the Judge Gavel refunds your hammer, Mjǫllnir makes
  Starfall cheaper.

• A rebuilt Starfall — a proper rain of stars across the tray — plus new
  summon effects when rare eggs appear. Century eggs arrive on a column of
  light now.

That sits on top of what was already there: 6 monkeys, 53 stages, 353
collectible items and 123 trophies to chase.

Two small things I'd love from you:

1. Reply to this email and tell me which premium item you'd like — Lucky
   Charm, Egg Radar or Golden Magnet — and I'll send it to you free, as a
   thank-you for joining early.

2. If you're enjoying it, a rating on the Play Store genuinely helps more
   than anything else I can do. It takes ten seconds:
   https://play.google.com/store/apps/details?id=com.eggbreakeradventures.app&referrer=utm_source%3Demail%26utm_medium%3Dwelcome%26utm_campaign%3Dplay_install%26utm_content%3Dnew_joiner

Found a bug, or have an idea for what should come next? Just hit reply —
I read every message, and a fair few of the features above started as
someone's reply.

Have fun smashing,
Yotam
Egg Smash Adventures
```

---

## Notes before sending
- Swap the three gift items if you'd rather offer different ones; those three
  are the least balance-sensitive.
- Keep the numbers in sync if you retune: 6 monkeys / 53 stages / 353 items /
  123 trophies (`node tools/ng-medals.js` and `data.js` are the source of truth).
- If you send this to web players who have never installed the app, the
  Play link is the call to action; for existing Android players, lead with the
  rating ask instead.
