// ============================================================
//  ng-config.js — NEWGROUNDS BUILD ONLY
//  Fill these in from your Newgrounds project page:
//    https://www.newgrounds.com/projects/games/<id>/preview → "API Tools"
//  Nothing here is bundled into the Vercel/Android build.
// ============================================================
window.NG_CONFIG = {
  // App ID + Encryption Key are injected by build.js from the git-ignored
  // ng/ng.secrets.json ({ "appId": "12345:abcDEfgh", "encKey": "…==" }) or
  // the NG_APP_ID / NG_ENC_KEY env vars — never commit them (public repo).
  appId:  '',
  encKey: '',

  // Portal pacing — the web/Android game regenerates one hammer every 30s
  // (20s with the upgrade). A Newgrounds player judges the game in one
  // sitting and never comes back to a full hammer bar, so the NG build
  // regenerates much faster. Set both to 0 to keep the normal game values.
  pacing: { regenInterval: 6, fastRegenInterval: 4 },

  // Achievement id (data.js ACHIEVEMENT_DATA / SECRET_ACHIEVEMENTS) →
  // Newgrounds medal id. Create the medals in API Tools → Medals, then paste
  // the ids here. `node tools/ng-medals.js` prints the suggested list with
  // names, descriptions and points that fit NG's 500-point budget.
  medals: {
    first_smash:     91857,   // First Crack — break your first egg (5)
    smash_50:        91858,   // Egg Smasher — break 50 eggs (5)
    round_clear:     91859,   // Clean Sweep — break all eggs in one round (5)
    stage_1:         91860,   // Stage Clear — complete a stage (10)
    items_10:        91861,   // Treasure Hunter — find 10 items (10)
    starfall_1:      91862,   // Starfall! — first starfall (10)
    monkey_2:        91863,   // New Friend — unlock a second monkey (10)
    smash_1000:      91864,   // Egg Annihilator — break 1,000 eggs (25)
    stage_9:         91865,   // World Champion — complete 9 stages (25)
    black_1:         91866,   // Into the Void — first black egg (25)
    monkey_all:      91867,   // Monkey Business — unlock all monkeys (50)
    stage_all:       91868,   // True Grand Master — complete all 53 stages (50)
  },

  // Scoreboard ids from API Tools → Scoreboards. Each is posted only when the
  // value goes up. Leave an entry out to skip that board.
  scoreboards: {
    gold:   16137,   // Total Gold
    eggs:   16138,   // Eggs Smashed
    stages: 16139,   // Stages Completed
  },
};
