# Scheduled PM routines (claude.ai scheduled tasks)

Two weekly passes run the project-manager mandate (see memory note `project-pm-mandate`).
They were first created on 2026-11-26 from a cloud session, which cannot attach connectors,
so those copies run WITHOUT Gmail/Composio (health checks + fixes only, report as the
session's final message). For the full version (analytics via Composio, e-mail digest),
recreate each one in the claude.ai scheduled-tasks UI with the **Gmail** and **Composio**
connectors enabled, paste the prompt below, and delete the connector-less copy.

| Task | Schedule (Asia/Jerusalem) | Prompt |
|------|---------------------------|--------|
| Egg Smash PM: Monday health + analytics | Mondays 07:41 | `agents/routine-monday.txt` |
| Egg Smash PM: Thursday discovery + social | Thursdays 08:23 | `agents/routine-thursday.txt` |
| Egg Smash X posting (MAC-BOUND, needs Chrome logged into @EggSmashAdv) | Tuesdays and Fridays 10:30 | `agents/routine-x-mac.txt` |

Both prompts start by reading `CLAUDE.md` and the memory notes, never change gameplay,
economy or game UI, merge to main only when the test suite passes, and end their e-mail
with "Current version: X.Y.Z".

## X posting split (2026-11-27)
The owner chose the browser route ("free or nothing"; X has no free API tier any more). The cloud
Thursday pass only DRAFTS: it appends entries to `agents/x-queue.md` and commits to main. The
Mac-bound task posts the oldest queued entry through the owner's logged-in Chrome, marks it
posted and pushes. Cloud sessions never post to X.
