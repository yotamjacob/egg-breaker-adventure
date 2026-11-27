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
- Umami: share URL https://cloud.umami.is/share/IdKTt1MwfKtK4y0W (public, read-only). Run `UMAMI_SHARE_URL=<it> node tools/umami-funnel.js --days 7`. OK
- Google Ads: Composio googleads, customer 2415992841 only (others on the login are not the game's). Read-only. OK
- GlitchTip: no token. NOT STARTED
- Remote Control to owner's Mac: refuses all folders, cause unknown. DEAD END, don't retry

## Current state (2026-11-27)
- Live version 3.12.10. CI green.
- Play: 1,000+ installs, no score shown yet, 5 reviews (all answered 2026-11-27).
- Review prompt now asks at stages 2/6/12 (>=21 days apart). Ships to Android users via the web bundle, no build needed.
- Search: ~37 impressions / 4 clicks per 28 days, almost all brand queries. Guide page "crawled, not indexed".
- Discovery shipped: llms.txt, guide FAQ + FAQPage schema, IndexNow on push, noindex on vercel.app host.
- X: profile set, 0 posts, 2 drafts queued in agents/x-queue.md. First post Fri 2026-11-27 10:30.
- Ads: App campaign "ESA Installs Tier1", 153 installs Oct 28-Nov 2 at ~0.49 ILS each (15/day). Paused Nov 2-26, back on at 5 ILS/day with Target CPA 8 ILS.
- Umami 7d to 2026-11-27: 54 visitors, 92 visits, avg 219 s. game-started was 0 until v3.12.10 (duplicate track() bug, fixed); first-smash counted per page load until v3.12.10. First clean funnel week ends 2026-12-04: compare game-started -> first-smash -> first-break by visitors.

## Backlog (top = next)
1. Owner decision: lower the Ads Target CPA from 8 to ~1 ILS (achieved ~0.49) so a 5 ILS/day budget can serve; watch week 1 at 5/day first.
2. Proposal to owner: gentler first-session hammer pacing (2 of 5 reviews complain about waiting).
3. Get the guide page indexed (stronger internal links, unique title, maybe split into topic pages).
4. Play trader-status declaration due Feb 2027 (owner, Play Console banner).
5. Remove stale "sitemaps.xml" entry in Search Console (harmless).
