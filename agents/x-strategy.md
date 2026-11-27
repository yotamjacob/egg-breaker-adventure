# X strategy: @EggSmashAdv (owner rules in memory note project-social-voice-rules)

Goal: people who loved egg-smashing collection games find this one, try it in the browser,
install it, and rate it. Followers are a means, not the target.

## Mix per week (once at full cadence of 5 posts)
| Share | Format | Why |
|---|---|---|
| 2 of 5 | Short gameplay clip, 9-11 s, vertical 1080x1920, no sound (clips/smash.mp4, combo.mp4, theegg.mp4 from tools/capture-clips.js; re-record after visual changes) | Video gets the most reach on X; a smash + prize reveal reads in 2 s |
| 1 of 5 | One screenshot + one line (from /shots) | Cheap, shows the art and the album |
| 1 of 5 | Question or poll ("Which monkey do you pick first?") | Replies feed the algorithm; no link |
| 1 of 5 | Update or tip (new feature, a guide fact, a number from the game) | Gives returning players a reason to come back |

## Rules
- Link in at most half the posts (links cut reach); the bio carries the site. Links use utm_source=x&utm_medium=social.
- 1-2 hashtags max, chosen from: #indiegame #mobilegame #idlegame #pixelart #indiedev. #ScreenshotSaturday only on a Saturday post.
- Post Tue + Fri 10:30 Israel (US morning reach is better around 15:00-17:00 Israel; move there once the account is 2 weeks old).
- Hook in the first 5 words. No "Check out our game!". Speak like a player, not a brand.
- Never mention the original Egg Breaker game or its developer. No politics. No replies to strangers without the owner's yes.
- Review every 4 weeks: which format got the most impressions and profile clicks; shift the mix toward it.

## Engagement (the main growth lever for a new, small account)
Why: on X a 0-follower account is shown to almost nobody. Accounts grow by showing up in other
people's notifications and threads: a relevant follow often gets a follow-back, a like or repost
puts our name in the author's notifications, and a good reply in a busy thread is seen by that
thread's audience. Posting alone does very little in the first months.

Who to engage (relevance beats volume): indie / casual / idle / pixel-art game developers and
players, mobile-game communities, people posting #indiedev #indiegame #pixelart #ScreenshotSaturday
#IndieDevHour, and anyone mentioning egg-smashing or collection games. Skip: politics, crypto/NFT,
giveaway farms, accounts with 0 posts or bought-looking followings, anything rude.

Actions per run (runs: Tue, Wed, Fri, Sun), with a warm-up so the account never looks like a bot:
| Account age | Follows/run | Likes/run | Reposts/run | Unfollows/run |
|---|---|---|---|---|
| Weeks 1-2 | 3 | 5 | 1 | 0 |
| Weeks 3-4 | 5 | 10 | 1 | 0 |
| Week 5+ | 8 | 15 | 2 | up to 5 |
Hard ceilings regardless of week: 15 follows and 30 likes per day, following count never above
2x followers + 100, never like/follow in bursts (wait 20-90 s between actions, random order).
Unfollow only accounts we followed 14+ days ago that did not follow back, oldest first.
Never: follow/unfollow the same account twice, mass-like one account, identical texts, links in
replies, DMs, automated replies to strangers.

Replies: they bring the most reach, but the owner's rule stands: no replies to strangers without
the owner's yes. Each run lists up to 3 reply drafts (thread URL + suggested reply) in
agents/x-activity.md; the Thursday e-mail carries them. When the owner says yes, the next run posts them.

Not stop signals: X Premium upsells ("Unlock more on X", "Get verified", "Upgrade your profile",
"boosted replies") appear for every unverified account; dismiss them and carry on.
Stop signals: any "unusual activity", captcha, rate-limit or "you are unable to follow more
people" screen -> stop all engagement for 7 days, e-mail the owner "Egg Smash X: action needed".
Every run appends one line to agents/x-activity.md (date, follows, likes, reposts, unfollows,
followers count) so caps and the 14-day unfollow rule can be checked from the log.
