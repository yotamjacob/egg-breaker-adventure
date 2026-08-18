/* ============================================================
   ng.js — NEWGROUNDS BUILD ONLY
   Loaded only by /dist-newgrounds/index.html, after bundle.min.js
   and NewgroundsIO.min.js. Never bundled into the Vercel/Android
   build, so nothing here can affect the normal game.

   What it does (all from the outside — no game source is changed):
     A. Removes the store funnel NG rejects: Premium tab/panel, the
        "Support Us" button, the "looks best on mobile" web banner.
     B. Portal pacing: faster hammer regen (NG_CONFIG.pacing).
     C. Front-loads the content pitch in the welcome popup
        (monkeys / stages / items, computed from data.js).
     D. Newgrounds.io: medals mirror achievement unlocks, scoreboards
        mirror total gold / eggs / stages. Non-blocking login bar.
   Every step is wrapped so a failure can never break play.
   ============================================================ */
(function () {
  'use strict';

  // Never run inside the Android TWA (belt and braces — the file is not
  // shipped there anyway).
  if (typeof window.AndroidBridge !== 'undefined') return;

  var CFG = window.NG_CONFIG || {};
  var LOG_PREFIX = '[ng] ';
  function log() { try { console.log.apply(console, [LOG_PREFIX].concat([].slice.call(arguments))); } catch (e) {} }
  function safe(fn) { try { fn(); } catch (e) { log('step failed:', e && e.message); } }
  function $id(id) { return document.getElementById(id); }
  function hasGame() { return typeof G === 'object' && G !== null && typeof CONFIG === 'object'; }

  // ---------------------------------------------------------------
  // A. Strip the store funnel
  // ---------------------------------------------------------------
  safe(function stripFunnel() {
    document.querySelectorAll('.nav-tab[data-tab="premium"]').forEach(function (b) { b.remove(); });
    var panel = $id('panel-premium');
    if (panel) panel.remove();
    // Congrats popup: "💎 Support Us" jumps to the premium tab.
    document.querySelectorAll('.congrats-btns .pop-btn').forEach(function (b) {
      var oc = b.getAttribute('onclick') || '';
      if (oc.indexOf('data-tab=premium') !== -1) b.remove();
    });
    // The web-only "looks best on mobile — get it on Google Play" banner.
    // share.js shows it ~4.6s after load and returns early if the element
    // is gone (_showWebBanner: `if (!el) return`).
    var wb = $id('web-banner');
    if (wb) wb.remove();
    document.documentElement.classList.add('ng-build');
  });

  // ---------------------------------------------------------------
  // B. Portal pacing
  // ---------------------------------------------------------------
  safe(function pacing() {
    if (!hasGame()) return;
    var p = CFG.pacing || {};
    if (p.regenInterval > 0)     CONFIG.regenInterval     = p.regenInterval;
    if (p.fastRegenInterval > 0) CONFIG.fastRegenInterval = p.fastRegenInterval;
    // The first countdown was seeded from the old value before we ran.
    var cur = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
    if (typeof G.regenCD === 'number' && G.regenCD > cur) G.regenCD = cur;
  });

  // ---------------------------------------------------------------
  // C. Welcome popup — sell the content, not the cloud
  // ---------------------------------------------------------------
  safe(function welcome() {
    var pop = document.querySelector('#overlay-welcome .pop-welcome');
    if (!pop || typeof MONKEY_DATA === 'undefined') return;
    var monkeys = MONKEY_DATA.length, stages = 0, items = 0;
    MONKEY_DATA.forEach(function (m) {
      (m.stages || []).forEach(function (s) { stages++; items += ((s.collection && s.collection.items) || s.items || []).length; });
    });
    var sub = pop.querySelector('.pop-sub');
    if (sub) {
      sub.innerHTML =
        '<strong>' + monkeys + ' monkeys</strong> · <strong>' + stages + ' stages</strong> · ' +
        '<strong>' + items + ' items</strong> to collect.<br>' +
        'Smash eggs, complete collections, unlock skills — and earn Newgrounds medals along the way.';
    }
    var btns = pop.querySelector('.confirm-btns');
    if (btns) {
      btns.innerHTML =
        '<button class="pop-btn confirm-yes" onclick="dismissWelcome()">🔨 Let\'s smash!</button>';
    }
  });

  // ---------------------------------------------------------------
  // D. Newgrounds.io — medals + scoreboards
  // ---------------------------------------------------------------
  var ngReady = false;
  var medalQueue = [];          // achievement ids unlocked before NGIO was ready
  var lastPosted = {};          // board key → last value posted
  var loginBar = null;

  // NGIO.hasUser is true whenever the session carries a User object — even an
  // empty one before login — so check for a populated user instead.
  function loggedIn() {
    try { var u = NGIO.user; return !!(u && (u.id || u.name)); } catch (e) { return false; }
  }

  function medalIdFor(achId) {
    var m = CFG.medals || {};
    var id = m[achId];
    return (typeof id === 'number' && id > 0) ? id : null;
  }

  function unlockMedalFor(achId) {
    var medalId = medalIdFor(achId);
    if (!medalId) return;
    if (!ngReady || !loggedIn()) { if (medalQueue.indexOf(achId) === -1) medalQueue.push(achId); return; }
    try {
      var medal = NGIO.getMedal(medalId);
      if (medal && medal.unlocked) return;
      NGIO.unlockMedal(medalId, function (m) {
        if (m && m.name) {
          log('medal unlocked:', m.name);
          try { if (typeof msg === 'function') msg('🏅 Newgrounds medal: ' + m.name, 'trophies'); } catch (e) {}
        }
      });
    } catch (e) { log('unlockMedal failed', e && e.message); }
  }

  // Everything already achieved locally that has a medal and isn't unlocked
  // on NG yet — covers unlocks that happened while logged out / offline.
  function syncMedals() {
    if (!ngReady || !loggedIn() || !hasGame() || !Array.isArray(G.achieved)) return;
    var pending = medalQueue.slice(); medalQueue = [];
    G.achieved.forEach(function (id) { if (pending.indexOf(id) === -1) pending.push(id); });
    pending.forEach(unlockMedalFor);
  }

  function postScores(force) {
    if (!ngReady || !loggedIn() || !hasGame()) return;
    var boards = CFG.scoreboards || {};
    var values = {
      gold:   Math.floor(G.totalGold || 0),
      eggs:   Math.floor(G.totalEggs || 0),
      stages: Math.floor(G.stagesCompleted || 0),
    };
    Object.keys(values).forEach(function (key) {
      var boardId = boards[key];
      if (typeof boardId !== 'number' || boardId <= 0) return;
      var v = values[key];
      if (!(v > 0)) return;
      if (!force && lastPosted[key] === v) return;
      if (lastPosted[key] !== undefined && v < lastPosted[key]) return;   // never post lower
      lastPosted[key] = v;
      try { NGIO.postScore(boardId, v, function () { log('score posted', key, v); }); }
      catch (e) { log('postScore failed', key, e && e.message); }
    });
  }

  // Wrap checkAchievements() so a new unlock triggers a medal at once.
  // Top-level function declarations live on window, and the bundle resolves
  // the identifier through the global object, so reassigning it works.
  safe(function hookAchievements() {
    if (typeof window.checkAchievements !== 'function') return;
    var orig = window.checkAchievements;
    window.checkAchievements = function () {
      var before = (hasGame() && Array.isArray(G.achieved)) ? G.achieved.length : 0;
      var r = orig.apply(this, arguments);
      try {
        if (hasGame() && Array.isArray(G.achieved) && G.achieved.length > before) {
          G.achieved.slice(before).forEach(unlockMedalFor);
          postScores(false);
        }
      } catch (e) { log('achievement hook failed', e && e.message); }
      return r;
    };
  });

  // ---- login bar (shown only when NG asks for a login) ----
  function showLoginBar() {
    if (loginBar) return;
    loginBar = document.createElement('div');
    loginBar.className = 'ng-loginbar';
    loginBar.innerHTML =
      '<span class="ng-loginbar-text">🏅 Log in to Newgrounds to earn medals &amp; post scores</span>' +
      '<button class="ng-loginbar-btn ng-loginbar-yes" type="button">Log in</button>' +
      '<button class="ng-loginbar-btn ng-loginbar-no" type="button">Not now</button>';
    loginBar.querySelector('.ng-loginbar-yes').addEventListener('click', function () {
      try { NGIO.openLoginPage(); } catch (e) {}
      loginBar.classList.add('ng-loginbar-waiting');
      loginBar.querySelector('.ng-loginbar-text').textContent = '⏳ Waiting for Newgrounds login…';
    });
    loginBar.querySelector('.ng-loginbar-no').addEventListener('click', function () {
      try { NGIO.skipLogin(); } catch (e) {}
      hideLoginBar();
    });
    document.body.appendChild(loginBar);
    requestAnimationFrame(function () { loginBar.classList.add('show'); });
  }
  function hideLoginBar() {
    if (!loginBar) return;
    var el = loginBar; loginBar = null;
    el.classList.remove('show');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
  }

  safe(function initNewgroundsIO() {
    if (typeof NGIO === 'undefined') { log('NewgroundsIO library missing'); return; }
    if (!CFG.appId) { log('NG_CONFIG.appId not set — medals/scoreboards disabled'); return; }

    NGIO.init(CFG.appId, CFG.encKey || '', {
      version: (typeof VERSION === 'string' ? VERSION : '1.0.0'),
      checkHostLicense: false,   // never brick the build over a host check
      autoLogNewView: true,
      preloadMedals: true,
      preloadScoreBoards: true,
      preloadSaveSlots: false,
      debugMode: false,
    });

    var poll = setInterval(function () {
      try {
        NGIO.getConnectionStatus(function (status) {
          log('status:', status);
          switch (status) {
            case NGIO.STATUS_LOGIN_REQUIRED:
              showLoginBar();
              break;
            case NGIO.STATUS_READY:
              ngReady = true;
              hideLoginBar();
              if (loggedIn()) {
                log('user:', NGIO.user.name);
                syncMedals();
                postScores(true);
              } else {
                log('no user — playing anonymously');
              }
              break;
            case NGIO.STATUS_LOGIN_CANCELLED:
            case NGIO.STATUS_LOGIN_FAILED:
              hideLoginBar();
              try { NGIO.skipLogin(); } catch (e) {}
              break;
            case NGIO.STATUS_USER_LOGGED_OUT:
              ngReady = false;
              break;
          }
        });
      } catch (e) { log('status poll failed', e && e.message); }
    }, 500);

    // Periodic sync: scores every 60s, medal catch-up every 60s.
    setInterval(function () { safe(syncMedals); safe(function () { postScores(false); }); }, 60000);
    // Flush on tab hide / close.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') safe(function () { postScores(false); });
    });
    window.addEventListener('pagehide', function () { safe(function () { postScores(false); }); });
    // Keep the poll from running forever once ready and idle — the lib only
    // fires the callback on change, so the cost is negligible; keep it.
    void poll;
  });
})();
