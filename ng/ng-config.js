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
    // first_smash: 12345,
  },

  // Scoreboard ids from API Tools → Scoreboards. Each is posted only when the
  // value goes up. Leave an entry out to skip that board.
  scoreboards: {
    // gold:   12345,   // total gold earned
    // eggs:   12346,   // total eggs smashed
    // stages: 12347,   // stages completed
  },
};
