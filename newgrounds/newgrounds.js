/* ============================================================
   newgrounds.js — NEWGROUNDS BUILD ONLY
   Loaded only by /dist-ng/index.html (the `node build.js --ng`
   target). Never bundled into Vercel / Android / itch builds.

   Integrates the Newgrounds.io (v3) API:
     • Medals      — unlocks an NG medal when a trophy is earned
     • Scoreboards — posts best totals (eggs / stages / gold)
     • Cloud Save  — uses an NG.io save slot as the cloud backend
                     inside NG's sandboxed iframe (where the game's
                     own Google/Supabase cloud save cannot work).

   Protocol (verified against newgrounds.io docs + official JS lib):
     • Gateway: POST FormData field `request` = JSON of the envelope
     • Envelope: { app_id, session_id?, execute }
     • execute:  { component, parameters }  — or  { secure: <b64> }
     • Secure calls (Medal.unlock, ScoreBoard.postScore) are
       AES-128-CBC encrypted: random 16-byte IV, PKCS#7 padding,
       output = base64( IV || ciphertext ).
     • A game hosted on NG receives its logged-in session via the
       ?ngio_session_id=... query param.

   HARD GATE: never runs inside the Android TWA.

   >>> SETUP REQUIRED <<<
   1. In your NG project dashboard, create Medals / Scoreboards /
      enable Cloud Saves, then paste the numeric IDs into the
      MEDAL_IDS / BOARDS / SAVE_SLOT config below. Anything left
      `null` is simply skipped — partial setup is fine.
   2. Test on NG: open the game, watch the console for `[NG]` logs.
   ============================================================ */
(function () {
  'use strict';

  // Never run inside the Android TWA.
  if (typeof window.AndroidBridge !== 'undefined') return;

  // ---------- credentials (safe to ship — client-side by design) ----------
  var APP_ID      = '62256:pbz8BDMk';
  var AES_KEY_B64 = 'W26/FDt89Q1gmoCUZ6m5eA==';
  var GATEWAY     = 'https://www.newgrounds.io/gateway_v3.php';

  // ============================================================
  //  CONFIG — fill these in from your Newgrounds project dashboard
  // ============================================================

  // Achievement id  ->  numeric NG Medal id. Leave `null` to skip.
  // (Create the medal on NG, copy its numeric id, paste it here.)
  var MEDAL_IDS = {
    // ===== Regular trophies (102) =====
    first_smash:         null,   // 🥚 First Crack — Break your first egg
    smash_50:            null,   // 💪 Egg Smasher — Break 50 eggs
    smash_200:           null,   // 🔥 Egg Destroyer — Break 200 eggs
    smash_1000:          null,   // 💥 Egg Annihilator — Break 1,000 eggs
    smash_5000:          null,   // ☄️ Egg Apocalypse — Break 5,000 eggs
    smash_10000:         null,   // 🌋 Egg Extinction — Break 10,000 eggs
    smash_50000:         null,   // 🐒 You Did It! — Break 25,000 eggs
    gold_1000:           null,   // 🪙 Coin Collector — Earn 1,000 total gold
    gold_50000:          null,   // 💰 Rich Monkey — Earn 50,000 total gold
    gold_500000:         null,   // 🤑 Gold Tycoon — Earn 500,000 total gold
    gold_2000000:        null,   // 🏦 Gold Hoarder — Earn 2,000,000 total gold
    stars_10:            null,   // ⭐ Stargazer — Collect 10 star pieces
    stars_50:            null,   // 🌠 Star Catcher — Collect 50 star pieces
    stars_200:           null,   // 🌌 Constellation — Collect 200 star pieces
    starfall_1:          null,   // 🌟 Starfall! — Use your first starfall
    starfall_10:         null,   // 💫 Star Storm — Use 10 starfalls
    starfall_50:         null,   // 🌠 Meteor Shower — Use 50 starfalls
    coll_1:              null,   // 📖 Collector — Complete 1 collection
    coll_5:              null,   // 🏛️ Curator — Complete 5 collections
    coll_15:             null,   // 📚 Archivist — Complete 15 collections
    coll_30:             null,   // 🗂️ Completionist — Complete 30 collections
    items_10:            null,   // 🔍 Treasure Hunter — Find 10 collection items
    items_50:            null,   // 🗿 Relic Seeker — Find 50 collection items
    items_100:           null,   // 🏺 Artifact Master — Find 100 collection items
    items_200:           null,   // 🖼️ Museum Curator — Find 200 collection items
    stage_1:             null,   // 🎯 Stage Clear — Complete a stage (gold tier)
    stage_9:             null,   // 🏆 World Champion — Complete 9 stages
    stage_18:            null,   // ⚡ Double Trouble — Complete 18 stages
    stage_36:            null,   // 👑 Grand Master — Complete all 36 stages
    stage_all:           null,   // 🐒 True Grand Master — Complete all 53 stages
    monkey_2:            null,   // 🐒 New Friend — Unlock a second monkey
    monkey_all:          null,   // 🐵 Monkey Business — Unlock all monkeys
    feathers_50:         null,   // 🪶 Plucked — Collect 50 feathers
    feathers_500:        null,   // 🦚 Feather Duster — Collect 500 feathers
    feather_buy:         null,   // 🛍️ Shortcut — Buy an item with feathers
    feather_buy10:       null,   // 💸 Big Spender — Buy 10 items with feathers
    mult_found:          null,   // 🔢 Lucky Find — Find your first multiplier
    mult_50:             null,   // ✖️ Multiplied! — Use a x50 multiplier
    mult_123:            null,   // 🎰 Jackpot! — Find the legendary x123
    mult_stack:          null,   // 📚 Stacked! — Use 3+ multipliers at once
    mult_big:            null,   // 🔥 Mega Combo — Get a x20+ combined multiplier
    silver_10:           null,   // 🥈 Silver Streak — Break 10 silver eggs
    silver_100:          null,   // ⛏️ Silver Mine — Break 100 silver eggs
    gold_egg_10:         null,   // 🥇 Golden Touch — Break 10 gold eggs
    gold_egg_50:         null,   // 🏅 Gold Rush — Break 50 gold eggs
    crystal_1:           null,   // 🔮 Crystal Clear — Break your first crystal egg
    crystal_25:          null,   // 💜 Crystal Collector — Break 25 crystal eggs
    ruby_1:              null,   // 💎 Ruby Glow — Break your first ruby egg
    ruby_25:             null,   // ❤️ Gem Crusher — Break 25 ruby eggs
    black_1:             null,   // 🖤 Into the Void — Break your first black egg
    black_10:            null,   // ⚫ Dark Matter — Break 10 black eggs
    streak_5:            null,   // 📅 On a Roll — 5-day login streak
    daily_10:            null,   // 📆 Regular — Log in 7 days in a row
    buy_hammer:          null,   // 🔨 Tool Upgrade — Buy a special hammer
    buy_hat:             null,   // 🎩 Hat Collector — Buy a hat
    buy_all_h:           null,   // 🗡️ Arsenal — Buy all special hammers
    buy_all_hat:         null,   // 🎪 Millinery — Buy all hats
    shop_10:             null,   // 🛒 Shopaholic — Make 10 shop purchases
    round_clear:         null,   // 🧹 Clean Sweep — Break all eggs in one round
    round_50:            null,   // 🏃 Marathon — Clear 50 rounds
    round_500:           null,   // 🚂 Unstoppable — Clear 500 rounds
    bigwin_500:          null,   // 💵 Payday — Win 500+ gold in one smash
    bigwin_5000:         null,   // 💎 Windfall — Win 5,000+ gold in one smash
    bigwin_50000:        null,   // 🌟 Legendary Loot — Win 50,000+ gold in one smash
    overflow:            null,   // 📦 Overloaded — Have more hammers than your max
    empty_10:            null,   // 💨 Bad Luck — Get 10 empties
    empty_50:            null,   // 🕳️ Consistently Unlucky — Get 50 empties
    empty_200:           null,   // 🤡 Professional Loser — Get 200 empties
    empty_500:           null,   // 👻 Empty Inside — Get 500 empties
    runny_1:             null,   // 🏃 Catch Me! — Smash a runny egg
    runny_25:            null,   // 💨 Egg Chaser — Smash 25 runny eggs
    runny_100:           null,   // 🏆 Can't Run From Me — Smash 100 runny eggs
    timer_1:             null,   // ⏱️ Just In Time — Smash a timed egg
    timer_25:            null,   // ⏰ Beat The Clock — Smash 25 timed eggs
    timer_100:           null,   // 🕐 Time Lord — Smash 100 timed eggs
    timer_close:         null,   // 💀 Living Dangerously — Smash a timed egg with under 0.1s left
    missed_1:            null,   // 🐌 Too Slow — Let a timed egg expire
    missed_10:           null,   // 🧈 Butterfingers — Let 10 timed eggs expire
    combo_effect:        null,   // 🤯 Double Trouble — Smash a runny timed egg
    century_1:           null,   // 🌀 The Chosen One — Break a Century Egg
    hex_1:               null,   // 😈 Cursed! — Get hexed for the first time
    hex_10:              null,   // 👹 Bad Karma — Get hexed 10 times
    hex_50:              null,   // 🧿 Hex Magnet — Get hexed 50 times
    balloon_1:           null,   // 🎈 Pop! — Pop your first balloon egg
    balloon_10:          null,   // 🎉 Party Animal — Pop 10 balloon eggs
    balloon_50:          null,   // 🎊 Balloon Master — Pop 50 balloon eggs
    premium_first:       null,   // 💎 High Roller — Make your first premium purchase
    premium_starter:     null,   // 🎁 Ready to Roll — Purchase the Starter Pack
    premium_supporter:   null,   // 👑 True Supporter — Make 3 premium purchases
    skill_first:         null,   // ⚡ Power Awakened — Unlock your first skill
    skill_all:           null,   // 🌟 Triple Threat — Unlock all 3 skills
    rage_first:          null,   // 🐒 Banana Goes Crazy — Unleash Monkey Rage for the first time
    rage_10:             null,   // 🔥 On A Rampage — Use Monkey Rage 10 times
    rage_upgrade1:       null,   // ⚙️ Focused Fury — Upgrade Monkey Rage
    rage_maxed:          null,   // 🦍 Maximum Rage — Fully upgrade Monkey Rage
    goose_first:         null,   // 🥚 Golden Hour — Activate Golden Goose for the first time
    goose_10:            null,   // ✨ Goose on the Loose — Activate Golden Goose 10 times
    goose_upgrade:       null,   // ⚙️ Gilded Upgrade — Upgrade Golden Goose
    shake_first:         null,   // 🍌 Shake It Up — Use Banana Shake for the first time
    shake_10:            null,   // 🔨 Blended Master — Use Banana Shake 10 times
    shake_upgrade:       null,   // ⚙️ Supercharged Shake — Upgrade Banana Shake
    skills_maxed:        null,   // 👑 Fully Loaded — Max out all 3 skills
    // ===== Secret trophies (7) =====
    secret_speed:        null,   // ⚡ Speed Demon — Smash 5 eggs in under 5 seconds
    secret_sweep:        null,   // 🧹 Clean Sweep — Break every egg in a round
    secret_ouch:         null,   // 🥺 Sorry Little Egg — An egg said ouch
    secret_chicken:      null,   // 🐔 Why Did It Cross? — Spot the runaway chicken
    secret_midnight:     null,   // 🌙 Night Owl — Break eggs at midnight
    secret_strikes:      null,   // ⚾ Three Strikes — Get 3 empties in a row
    secret_chef:         null,   // 👨‍🍳 Could've Been a Chef — Break 10,000 normal eggs
  };

  // Numeric NG Scoreboard ids. Leave `null` to skip that board.
  var BOARDS = {
    eggs:   null,   // suggest a board: "Most Eggs Smashed"   -> G.totalEggs
    stages: null,   // suggest a board: "Stages Completed"    -> G.stagesCompleted
    gold:   null,   // suggest a board: "Total Gold Earned"   -> G.totalGold
  };

  // NG Cloud Save slot number (set null to disable cloud save).
  var SAVE_SLOT = 1;

  // ============================================================
  //  Internal state
  // ============================================================
  var session = null;     // { id, user, passport_url, ... }
  var user    = null;     // logged-in NG user (null if not signed in)
  var sentMedals = {};    // achievement ids already pushed this session
  var cloudReady = false;

  function log() {
    try { console.log.apply(console, ['[NG]'].concat([].slice.call(arguments))); } catch (e) {}
  }

  // ---------- base64 <-> bytes ----------
  function b64ToBytes(b64) {
    var bin = atob(b64), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function bytesToB64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  // ---------- AES-128-CBC encrypt an execute object ----------
  var _keyPromise = null;
  function aesKey() {
    if (!_keyPromise) {
      _keyPromise = crypto.subtle.importKey('raw', b64ToBytes(AES_KEY_B64), { name: 'AES-CBC' }, false, ['encrypt']);
    }
    return _keyPromise;
  }
  function encryptExecute(execObj) {
    return aesKey().then(function (key) {
      var iv = crypto.getRandomValues(new Uint8Array(16));
      var data = new TextEncoder().encode(JSON.stringify(execObj));
      return crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv }, key, data).then(function (buf) {
        var ct = new Uint8Array(buf);
        var combined = new Uint8Array(16 + ct.length);
        combined.set(iv, 0);
        combined.set(ct, 16);
        return bytesToB64(combined);   // base64( IV || ciphertext )
      });
    });
  }

  // ---------- one gateway call ----------
  // exec = { component, parameters } ; secure=true → encrypt the execute.
  function call(exec, secure) {
    var executeP = secure ? encryptExecute(exec).then(function (s) { return { secure: s }; })
                          : Promise.resolve(exec);
    return executeP.then(function (execute) {
      var req = { app_id: APP_ID, execute: execute };
      if (session && session.id) req.session_id = session.id;
      var fd = new FormData();
      fd.append('request', JSON.stringify(req));
      return fetch(GATEWAY, { method: 'POST', body: fd }).then(function (r) { return r.json(); });
    });
  }

  // Pull the (single) result's `data` object out of a gateway response.
  function resultData(json) {
    try {
      var res = json && json.result;
      if (Array.isArray(res)) res = res[0];
      return (res && res.data) ? res.data : res;
    } catch (e) { return null; }
  }

  function getUriParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ============================================================
  //  Session bootstrap
  // ============================================================
  function init() {
    if (!window.crypto || !crypto.subtle) { log('WebCrypto unavailable — NG.io disabled'); return; }

    var sid = getUriParam('ngio_session_id');
    try { sid = sid || localStorage.getItem('_ngSessionId'); } catch (e) {}

    var boot = sid
      ? (session = { id: sid }, call({ component: 'App.checkSession' }, false))
      : call({ component: 'App.startSession', parameters: { force: false } }, false);

    boot.then(function (json) {
      var data = resultData(json);
      var s = data && data.session;
      if (s && s.id) {
        session = s;
        user = s.user || null;
        try { localStorage.setItem('_ngSessionId', s.id); } catch (e) {}
      } else if (session && session.id && data && data.success === false) {
        // stored session was invalid — clear and start a fresh one
        try { localStorage.removeItem('_ngSessionId'); } catch (e) {}
        session = null;
      }
      log('session', session && session.id ? 'ok' : 'none', '| user:', user ? user.name : '(not logged in)');

      // Hooks are installed regardless of login so future events are captured;
      // the individual senders no-op until a logged-in user exists.
      hookMedals();
      hookScores();
      if (SAVE_SLOT != null) initCloud();
    }).catch(function (e) { log('session init failed', e); });
  }

  // ============================================================
  //  Medals — unlock an NG medal when a trophy is earned
  // ============================================================
  function hookMedals() {
    if (typeof window.checkAchievements !== 'function') { log('checkAchievements missing — medals off'); return; }
    var orig = window.checkAchievements;
    window.checkAchievements = function () {
      var ret = orig.apply(this, arguments);
      try { syncMedals(); } catch (e) { log('medal sync err', e); }
      return ret;
    };
    syncMedals();   // catch anything already earned before NG loaded
  }

  function syncMedals() {
    if (!user || !window.G || !Array.isArray(G.achieved)) return;
    for (var i = 0; i < G.achieved.length; i++) {
      var id = G.achieved[i];
      if (sentMedals[id]) continue;
      var mid = MEDAL_IDS[id];
      if (mid == null) { sentMedals[id] = true; continue; }   // no medal mapped — skip silently
      sentMedals[id] = true;
      unlockMedal(id, mid);
    }
  }

  function unlockMedal(achId, medalId) {
    call({ component: 'Medal.unlock', parameters: { id: medalId } }, true)
      .then(function (json) { log('medal', achId, '#' + medalId, resultData(json) && resultData(json).success !== false ? 'ok' : 'fail'); })
      .catch(function (e) { sentMedals[achId] = false; log('medal err', achId, e); });
  }

  // ============================================================
  //  Scoreboards — post best totals (debounced behind saveGame)
  // ============================================================
  function hookScores() {
    if (typeof window.saveGame !== 'function') { log('saveGame missing — scores off'); return; }
    var orig = window.saveGame;
    window.saveGame = function () {
      var ret = orig.apply(this, arguments);
      scheduleScorePost();
      return ret;
    };
    scheduleScorePost();
  }

  var _scoreTimer = null;
  function scheduleScorePost() {
    if (_scoreTimer || !user) return;
    _scoreTimer = setTimeout(function () { _scoreTimer = null; postScores(); }, 30000);
  }

  function postScores() {
    if (!user || !window.G) return;
    var jobs = [];
    if (BOARDS.eggs   != null) jobs.push(['eggs',   BOARDS.eggs,   (G.totalEggs        || 0) | 0]);
    if (BOARDS.stages != null) jobs.push(['stages', BOARDS.stages, (G.stagesCompleted  || 0) | 0]);
    if (BOARDS.gold   != null) jobs.push(['gold',   BOARDS.gold,   (G.totalGold        || 0) | 0]);
    jobs.forEach(function (j) {
      call({ component: 'ScoreBoard.postScore', parameters: { id: j[1], value: j[2] } }, true)
        .then(function () { log('score', j[0], '=', j[2]); })
        .catch(function (e) { log('score err', j[0], e); });
    });
  }

  // ============================================================
  //  Cloud Save — NG.io save slot as the cloud backend
  // ============================================================
  function initCloud() {
    if (!user) { log('cloud: not logged in — skipping'); return; }
    // 1. Load the slot. The slot returns a `url`; the data lives there.
    call({ component: 'CloudSave.loadSlot', parameters: { id: SAVE_SLOT } }, false)
      .then(function (json) {
        var data = resultData(json);
        var slot = data && data.slot;
        if (slot && slot.url) return fetch(slot.url).then(function (r) { return r.text(); });
        if (slot && slot.data) return slot.data;   // some responses inline the data
        return null;
      })
      .then(function (remote) {
        if (remote && typeof window._applyCloudSave === 'function') {
          var remoteAt = parseSavedAt(remote);
          var localAt  = (window.G && G._savedAt) || 0;
          if (remoteAt > localAt) {
            log('cloud: remote save is newer (' + remoteAt + ' > ' + localAt + ') — applying');
            window._applyCloudSave(remote);
          } else {
            log('cloud: local save is newer/equal — keeping local');
          }
        } else {
          log('cloud: no remote save yet');
        }
      })
      .catch(function (e) { log('cloud load err', e); })
      .then(function () { cloudReady = true; hookCloudSave(); });
  }

  // Read `_savedAt` out of an `lz:`-compressed (or plain) save string.
  function parseSavedAt(saveStr) {
    try {
      var json = (saveStr.indexOf('lz:') === 0 && window.LZString)
        ? LZString.decompressFromUTF16(saveStr.slice(3))
        : saveStr;
      var d = JSON.parse(json);
      return d._savedAt || 0;
    } catch (e) { return 0; }
  }

  // Build the current save string exactly like saveGame()/_syncToCloud do.
  function currentSaveString() {
    if (!window.G || !window.DEFAULT_STATE) return null;
    var d = {};
    for (var k in DEFAULT_STATE) if (Object.prototype.hasOwnProperty.call(DEFAULT_STATE, k)) d[k] = G[k];
    if (G.roundEggs) {
      d.roundEggs = G.roundEggs.map(function (egg) { var c = {}; for (var p in egg) if (p !== '_smashing') c[p] = egg[p]; return c; });
    }
    var json = JSON.stringify(d);
    return window.LZString ? 'lz:' + LZString.compressToUTF16(json) : json;
  }

  function hookCloudSave() {
    if (typeof window.saveGame !== 'function') return;
    // saveGame is already wrapped by hookScores; wrap once more for cloud push.
    var orig = window.saveGame;
    window.saveGame = function () {
      var ret = orig.apply(this, arguments);
      scheduleCloudPush();
      return ret;
    };
  }

  var _cloudTimer = null;
  function scheduleCloudPush() {
    if (_cloudTimer || !cloudReady || !user) return;
    _cloudTimer = setTimeout(function () { _cloudTimer = null; pushCloud(); }, 15000);
  }

  function pushCloud() {
    var saveStr = currentSaveString();
    if (saveStr == null) return;
    call({ component: 'CloudSave.setData', parameters: { id: SAVE_SLOT, data: saveStr } }, false)
      .then(function () { log('cloud: saved (' + saveStr.length + ' chars)'); })
      .catch(function (e) { log('cloud save err', e); });
  }

  // ============================================================
  //  Debug handle + login helper
  // ============================================================
  window.NG = {
    status: function () { return { sessionId: session && session.id, user: user, cloudReady: cloudReady }; },
    login:  function () { if (session && session.passport_url) window.open(session.passport_url, '_blank'); else log('no passport_url'); },
    pushCloud: pushCloud,
    postScores: postScores,
    syncMedals: syncMedals,
  };

  // Boot once the DOM (and the deferred bundle) are ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
