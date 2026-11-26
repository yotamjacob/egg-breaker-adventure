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

Both prompts start by reading `CLAUDE.md` and the memory notes, never change gameplay,
economy or game UI, merge to main only when the test suite passes, and end their e-mail
with "Current version: X.Y.Z".
