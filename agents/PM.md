# PM brain: Egg Smash Adventures
Read this first in every session and scheduled run; update it last. Keep it under ~120 lines:
replace stale lines instead of appending. History lives in git, durable lessons in LEARNINGS.md,
rules and architecture in CLAUDE.md. Memory notes (server-side) hold owner decisions and accesses.

## Mandate (owner, 2026-11-26)
- Claude = PM. Goals: discoverability + higher Play score. Revenue not a goal.
- Merge to main allowed when tests + CI are green. Gameplay/economy/UI changes: propose by e-mail first.
- Android build: owner builds on the Mac, max once a week, on request.
- Reports to yotamjacob@gmail.com. Never burn the usage limit; pause and e-mail if close.
- Blocked by missing access: tell the owner the exact switch to grant it, not a manual chore.
- Owner prefers step-by-step, one step per message, and ready-to-paste Claude Code desktop prompts for browser chores.
- Free only. No paid APIs (X API rejected 2026-11-27).

## Scheduled tasks (claude.ai, cloud, connectors Gmail + Composio, repo attached)
| Task | When (Israel) | Prompt file |
|---|---|---|
| Monday health + analytics | Mon 07:41 | agents/routine-monday.txt |
| Thursday discovery + social (drafts X posts) | Thu 08:23 | agents/routine-thursday.txt |
| X posting + engagement (hosted browser) | Tue/Wed/Fri/Sun 10:30; posts Tue+Fri only | agents/routine-x-cloud.txt |
This session cannot edit task prompts (permission checker refuses). Change the .txt file, then
ask the owner to paste it into the task's Edit dialog.

## Access map (details in memory note reference-analytics-access)
- Search Console sc-domain:eggbreakeradventure.com, Bing https://eggbreakeradventure.com/: Composio. OK
- Play reviews/replies/vitals: workflow play-console.yml (secret PLAY_SERVICE_ACCOUNT_JSON). OK
- Play listing rating/installs: Composio GETANYAPI_PLAYSTORE_APP (paid per call, cap $0.02). OK
- X @EggSmashAdv: Composio browser_use profile (free offer), codes via Composio gmail "eggsmash-mail". OK
- Umami: share URL https://cloud.umami.is/share/IdKTt1MwfKtK4y0W (public, read-only). Run `UMAMI_SHARE_URL=<it> node tools/umami-funnel.js --days 7`. OK
- Google Ads: Composio googleads, customer 2415992841 only (others on the login are not the game's). Read-only. OK
- GlitchTip: no token. NOT STARTED
- Remote Control to owner's Mac: refuses all folders, cause unknown. DEAD END, don't retry

## Current state (2026-11-27)
- Play DSA trader status declared 2026-11-27 (account level, public contact email = the game mailbox).
- Live version 3.12.12. CI green.
- Play: 1,000+ installs, no score shown yet, 5 reviews (all answered 2026-11-27).
- Review prompt now asks at stages 2/6/12 (>=21 days apart). Ships to Android users via the web bundle, no build needed.
- Search: ~37 impressions / 4 clicks per 28 days, almost all brand queries. Guide page "crawled, not indexed".
- Discovery shipped: llms.txt, guide FAQ + FAQPage schema, IndexNow on push, noindex on vercel.app host.
- X strategy: agents/x-strategy.md. Every live post e-mails the owner (subject "Egg Smash X: posted").
- X: first post live 2026-11-27 (entry -01). X then showed "Unlock more on X" (new-account human check, reduced reach). Engagement paused until 2026-12-04 per stop rule; owner asked to check the account by hand.
- Ads: App campaign "ESA Installs Tier1", 153 installs Oct 28-Nov 2 at ~0.49 ILS each (15/day). Paused Nov 2-26, back on at 5 ILS/day. Target CPA lowered 8 -> 1 ILS on 2026-11-27 at the owner's request; never change budget/bids unasked.
- Beginner boost shipped 3.12.11: 12 s refill until 3 stages or 72 h. Watch reviews and first-break/stage-complete rates for 2 weeks.
- Umami 7d to 2026-11-27: 54 visitors, 92 visits, avg 219 s. game-started was 0 until v3.12.10 (duplicate track() bug, fixed); first-smash counted per page load until v3.12.10. First clean funnel week ends 2026-12-04: compare game-started -> first-smash -> first-break by visitors.

## Backlog (top = next)
1. Week of 2026-12-04: check Ads installs/day and cost per install at Target CPA 1 ILS; if it barely serves, suggest 1.5-2 ILS.
2. YouTube Shorts: channel @EggSmashAdventures created 2026-11-27 (see memory reference-analytics-access); next: confirm Composio connection alias eggsmash-yt, upload one test Short, then add Shorts to the X posting routine (separate Google brand channel; connect a SECOND Composio youtube account, the existing one is another business). TikTok skipped by owner 2026-11-27 (API posts only private/drafts for unaudited apps).
3. Guide page indexing: game root now links to it (v3.12.12 settings links). Re-inspect in Search Console from 2026-12-10; if still not indexed, split the guide into topic pages.
