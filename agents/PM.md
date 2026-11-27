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
| X posting (hosted browser) | Tue+Fri 10:30 | agents/routine-x-cloud.txt |
This session cannot edit task prompts (permission checker refuses). Change the .txt file, then
ask the owner to paste it into the task's Edit dialog.

## Access map (details in memory note reference-analytics-access)
- Search Console sc-domain:eggbreakeradventure.com, Bing https://eggbreakeradventure.com/: Composio. OK
- Play reviews/replies/vitals: workflow play-console.yml (secret PLAY_SERVICE_ACCOUNT_JSON). OK
- Play listing rating/installs: Composio GETANYAPI_PLAYSTORE_APP (paid per call, cap $0.02). OK
- X @EggSmashAdv: Composio browser_use profile (free offer), codes via Composio gmail "eggsmash-mail". OK
- Umami: needs share URL. PENDING (owner fetching it)
- Google Ads (5 NIS/day campaign): Composio googleads not connected. PENDING
- GlitchTip: no token. NOT STARTED
- Remote Control to owner's Mac: refuses all folders, cause unknown. DEAD END, don't retry

## Current state (2026-11-27)
- Live version 3.12.9. CI green.
- Play: 1,000+ installs, no score shown yet, 5 reviews (all answered 2026-11-27).
- Review prompt now asks at stages 2/6/12 (>=21 days apart). Ships to Android users via the web bundle, no build needed.
- Search: ~37 impressions / 4 clicks per 28 days, almost all brand queries. Guide page "crawled, not indexed".
- Discovery shipped: llms.txt, guide FAQ + FAQPage schema, IndexNow on push, noindex on vercel.app host.
- X: profile set, 0 posts, 2 drafts queued in agents/x-queue.md. First post Fri 2026-11-27 10:30.

## Backlog (top = next)
1. Umami share URL -> wire into Monday report (tools/umami-funnel.js, UMAMI_SHARE_URL).
2. Google Ads connection -> weekly cost/clicks in Monday report.
3. Proposal to owner: gentler first-session hammer pacing (2 of 5 reviews complain about waiting).
4. Get the guide page indexed (stronger internal links, unique title, maybe split into topic pages).
5. Play trader-status declaration due Feb 2027 (owner, Play Console banner).
6. Remove stale "sitemaps.xml" entry in Search Console (harmless).
