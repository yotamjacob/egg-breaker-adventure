// ============================================================
//  Weekly digest — research prompts
//
//  Kept separate from digest.js so the wording can be tuned without
//  touching the delivery/dedup machinery.
//
//  HARD RULES enforced in three independent places, because a prompt
//  alone is not a guarantee:
//    1. here, in the prompt text
//    2. `blocked_domains` on the web_search tool (reddit never returned)
//    3. a URL filter in digest.js (belt and braces)
// ============================================================

const GAME_CONTEXT = `
ABOUT THE GAME
Egg Breaker Adventure Revival ("Egg Smash Adventures") is a fan revival of the
original Egg Breaker Facebook game.

VERIFIED PROVENANCE — use these names, do not substitute others:
  - Egg Breaker (2008) was the FIRST title of DJArts Games, founded 2008 in
    Victoria, British Columbia by David Whittaker and Justin Stocks.
  - Series order: Egg Breaker -> Egg Breaker 2 -> Egg Drop -> Egg Breaker Adventures.
  - DJArts Games renamed itself Codename Entertainment on 2 July 2014. That studio
    still operates (Bush Whacker 2, Crusaders of the Lost Idols).
  - 17 May 2016: studio announced it would stop developing NEW CONTENT for the
    series (a final monkey and hat), but said the game would stay online
    indefinitely and progress would not be lost. It was NOT shut down in 2016.
  - What ended it was Adobe discontinuing Flash at the end of 2020.
  - The game is NOT connected to LabPixies. LabPixies is an unrelated Israeli
    studio Google acquired in April 2010. Earlier versions of our own site made
    this mistake; do not reproduce it, and flag it if you see it in the wild.

It is a casual/idle egg-smashing and collection game:
  - Smash eggs with a hammer, roll prizes, complete collections to unlock stages
  - 6 monkey companions, 8-9 stages each, 353 collectible items total
  - 7 egg tiers from Normal up to the 100-hit Century Egg
  - No ads, no energy timers, no paywalls

Where to play:
  - Web (instant, no install): https://egg-breaker-adventures.vercel.app/
  - Google Play: com.eggbreakeradventures.app (has in-app purchases)
  - itch.io: https://yotamjac.itch.io/egg-smash-adventures

THE NOSTALGIA ANGLE IS THE STRONGEST HOOK. People who remember the original
Facebook game and cannot find it are the highest-intent audience.
`.trim();

const HARD_RULES = `
HARD RULES — these are absolute:
  - NEVER include Reddit. No reddit.com links, no subreddits, no Reddit
    communities, no Reddit posts. Not as a source, not as a suggestion.
    If the best result you find is on Reddit, discard it and find another.
  - You are a RESEARCHER, not a poster. Never suggest that anything be posted
    automatically. Everything you return is a recommendation for a human to
    review and act on personally.
  - No spam tactics. Never recommend a promotional blast, a copy-paste drop
    into many communities, or anything a moderator would remove.
  - Only report things you actually found via search. If you cannot verify a
    community is active or a mention is real, leave it out. An empty section is
    far better than a fabricated one.
  - Prefer recent, verifiable, publicly linkable results.
`.trim();

/** Section A — community finder. */
/** Renders prior findings as "Name — url" so the model can avoid them by identity. */
function renderSeen(seenList) {
  if (!seenList || !seenList.length) return '  (nothing yet — this is the first run)';
  return seenList.map(e => {
    const name = (e && e.name) || String(e);
    const url  = (e && e.url) ? ` — ${e.url}` : '';
    return `  - ${name}${url}`;
  }).join('\n');
}

function communitiesPrompt(seenList) {
  return `
${GAME_CONTEXT}

${HARD_RULES}

YOUR TASK — SECTION A: COMMUNITY FINDER
Search the web and find ACTIVE, non-Reddit communities where this game's
audience gathers. Priority order:
  1. People nostalgic for old Facebook / Flash games (highest priority)
  2. Casual / idle / clicker / collection game players
  3. Indie and browser-game fans

Cover these surfaces (not all will yield results every week — that is fine):
  - Facebook groups
  - Discord servers
  - Forums: HTML5GameDevs, Lost Media Wiki, retro-gaming boards, TIGSource
  - TikTok / YouTube nostalgia clusters (channels, hashtags, creators)
  - itch.io community and devlog surfaces
  - IndieDB

For each community, establish and report:
  - name and a working link
  - platform and rough size / how active it actually is
  - why it fits THIS game specifically (not generic "gamers are here")
  - its self-promotion policy: does it ban self-promo? is it lurk-first, or is
    sharing openly welcome? Check pinned rules where you can.
  - a suggested GENUINE first action — a real contribution, question, or
    comment that a human would make. NEVER a promo blast. If the right first
    action is "lurk for two weeks and answer other people's questions", say that.

Rank best-fit first.

ALREADY REPORTED IN PREVIOUS WEEKS — do not report these again. Find NEW ones:
${renderSeen(seenList)}

GO DEEPER THAN A LIST OF OBVIOUS LINKS. For every community you propose:
  - VERIFY it is actually alive. Find evidence: a dated recent post, a member
    count, visible activity. State the evidence and the date. If you cannot
    verify activity, say so explicitly rather than guessing.
  - READ THE ACTUAL RULES where they are visible (pinned post, sidebar, rules
    page, #rules channel). Quote or paraphrase the specific self-promotion
    clause instead of writing a generic "probably fine".
  - Say WHO is there — the specific sub-audience, not "gamers". Ex-Facebook-game
    players? Flash preservationists? Idle-game min-maxers? HTML5 developers?
  - Make the first action SPECIFIC AND CURRENT: reference a real thread,
    question, or topic you actually found, not a hypothetical one.

Because the obvious surfaces have been covered in previous weeks, push into
territory not yet explored. Deliberately try:
  - smaller and more niche forums rather than the biggest ones
  - non-English communities (Spanish, Portuguese, German, French, Hebrew) —
    the store listings are localised for exactly those markets
  - Flash/Facebook-game PRESERVATION projects and archives specifically
  - Discord servers reachable via disboard/top.gg style directories
  - creator communities (small YouTube/TikTok nostalgia channels and their
    comment sections, Discord servers attached to those channels)
  - itch.io and IndieDB devlog/community surfaces

Aim for 6-12 strong results. Depth beats breadth: a community with verified
activity, a quoted promo rule and a specific first action is worth far more
than five unverified links.

Write your findings as clear prose with explicit links. A separate step will
structure them, so focus on being accurate and complete rather than on format.
`.trim();
}

/** Section B — "Egg Breaker" mention monitor. */
function mentionsPrompt(seenList) {
  return `
${GAME_CONTEXT}

${HARD_RULES}

YOUR TASK — SECTION B: "EGG BREAKER" MENTION MONITOR
Search the web for fresh, public mentions of the game "Egg Breaker" — people
reminiscing about it, asking where to play it, or wondering what happened to it.

Vary your queries. Try things like:
  - "egg breaker" facebook game
  - "egg breaker" nostalgia
  - "what happened to" egg breaker game
  - egg breaker monkey hat game
  - egg breaker labpixies
  - "egg breaker" flash game remember

INCLUDE:
  - mentions of the old Facebook original
  - mentions of this revival
  - people actively looking for it or asking if it still exists

EXCLUDE (these are noise — do not report them):
  - kitchen tools and egg-cracking gadgets
  - unrelated games that happen to be called "egg breaker"
  - app-store clones with no connection to the original
  - anything on Reddit

For each mention, report:
  - source (site / platform) and a working link
  - date, as precisely as you can establish it
  - a PARAPHRASED snippet of what the person said (paraphrase, don't quote at
    length)
  - context and sentiment: are they nostalgic? frustrated? actively searching?
  - a DRAFT friendly, human reply that the developer could post themselves.
    The draft must: sound like a person, not marketing; lead with the shared
    nostalgia; mention the revival naturally rather than pitching it; be short.
    It will be reviewed and posted manually by a human — never suggest
    automating it.

ALREADY REPORTED IN PREVIOUS WEEKS — do not report these again. Find NEW ones:
${renderSeen(seenList)}

SEARCH HARDER THAN A SINGLE PASS. Run many distinct queries, and go past the
first page of results. Also try:
  - "egg breaker" + each of: monkey, hammer, hat, collection, prizes
  - "egg breaker" + facebook game + each of: remember, miss, gone, shut down,
    where can I play, anyone else
  - "egg breaker" + each of: djarts, "djarts games", "codename entertainment",
    kongregate, "armor games" — the real publisher lineage, which is where the
    surviving listings and forum threads live
  - the game's name alongside other Codename Entertainment / DJArts titles
    (Egg Breaker 2, Egg Drop, Bush Whacker, Crusaders of the Lost Idols)
  - YouTube comment sections on "lost Facebook games" / "Flash games we lost"
    style videos
  - old forum threads and blog comments, including ones several years old that
    have recent replies
  - non-English phrasings (Spanish, Portuguese, German, French, Hebrew)
  - archived and preservation sites (Flashpoint, Internet Archive, Lost Media)
  - Quora, Discord public logs, YouTube, TikTok, Facebook, personal blogs

For every mention, dig into the actual page rather than reporting the search
snippet. Establish the real date, what the person actually said, and whether
they are still reachable (is the thread live? does the platform allow replies?).
Note explicitly if replying is not possible — a mention nobody can answer is
worth knowing about but is not an action.

This section is often thin, and that is expected and fine. Report only genuine
finds. Zero results is a valid, useful answer — do not pad it. But do not stop
after two or three searches: exhaust the angles above before concluding there
is nothing new.

Write your findings as clear prose with explicit links. A separate step will
structure them, so focus on being accurate and complete rather than on format.
`.trim();
}

module.exports = { communitiesPrompt, mentionsPrompt, GAME_CONTEXT, HARD_RULES };
