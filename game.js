// ============================================================
//  Egg Smash Adventures – Game Engine
//  game.js  (requires all other JS files loaded first)
// ============================================================

// ── Silence Umami network errors — their fetch.js logs 500s to console.error
// before the promise propagates, so we intercept at the fetch level instead.
(function() {
  const _orig = window.fetch;
  window.fetch = function(input, init) {
    const url = (typeof input === 'string' ? input : (input && input.url)) || '';
    if (url.includes('api-gateway.umami.dev') || url.includes('cloud.umami.is/api/send')) {
      return _orig.call(this, input, init).catch(() =>
        new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
    }
    return _orig.call(this, input, init);
  };
})();

// ── Analytics helper (Umami) ──────────────────────────────────
function track(event, props) {
  try {
    if (typeof umami !== 'undefined') {
      const p = Object.assign({}, props)
      if (typeof _cloudUser !== 'undefined' && _cloudUser?.email) p.user = _cloudUser.email
      const r = umami.track(event, p)
      if (r && typeof r.catch === 'function') r.catch(() => {})
    }
  } catch(e) {}
}


// ==================== GAME STATE ====================
const DEFAULT_STATE = {
  hammers: CONFIG.startingHammers, maxH: CONFIG.startingMaxHammers, gold: CONFIG.startingGold, starPieces: 0, crystalBananas: 0,
  feathers: 0,
  multQueue: [],     // multipliers in hand
  activeMult: 1,     // sum of all selected mults
  _selectedCounts: {}, // { 2: 1, 5: 2 } = how many of each mult value selected
  hammer: 'default', hat: 'none',
  ownedHammers: ['default'], ownedHats: ['none'],
  activeMonkey: 0,
  monkeys: null,     // built in initMonkeys()
  // Round
  roundEggs: null,
  // Daily
  lastLoginDate: null, consecutiveDays: 0, dailyClaimed: false, totalDailyClaims: 0, longestStreak: 0,
  // Regen
  regenCD: CONFIG.regenInterval, fastRegen: false,
  // Stats
  totalEggs: 0, totalEmpties: 0, totalGold: 0, totalStarPieces: 0, totalFeathers: 0,
  totalItems: 0, biggestWin: 0, highestMult: 1,
  starfallsUsed: 0, collectionsCompleted: 0, stagesCompleted: 0,
  roundClears: 0, feathersBought: 0, maxMultUsed: 0, runnySmashed: 0, blackSmashed: 0, timerSmashed: 0, timerMissed: 0, timerCloseCall: 0,
  silverSmashed: 0, goldSmashed: 0, crystalSmashed: 0, rubySmashed: 0, centurySmashed: 0,
  hexesHit: 0, balloonPopped: 0, comboSmashed: 0,
  // Hammer economy
  hammersDepleted: 0,   // times hit 0 hammers
  shopHammers5: 0,      // times bought +5 from shop
  shopHammers20: 0,     // times bought +20 from shop
  tierHammerRefills: 0, // hammers received from tier-up rewards
  dailyHammerTotal: 0,  // hammers received from daily login
  // Multiplier economy
  multDropped: 0,       // multipliers dropped from eggs
  multUsed: 0,          // multipliers consumed (fired)
  shopMult5: 0,         // times bought x5 mult from shop
  totalPlayTime: 0, firstPlayDate: 0,
  achieved: [],
  discoveredEggs: ['normal','silver','gold'], // egg types the player has seen
  soundOn: true,
  musicOn: true,
  autoBuy: false,
  _welcomeDone: false,
  _firstRareSeen: false,
  _starfallTipSeen: false,
  deviceId: null,
  // Premium purchases (one-time flags + counter)
  premium_starter_pack: false,
  premiumPurchases: 0,
  // Shop upgrades (unique one-time purchases)
  owned_spyglass: false, owned_luckycharm: false, owned_goldmagnet: false,
  owned_eggradar: false, owned_doubledaily: false, owned_starsaver: false,
  _spyglassHintShown: false,
  // Secrets
  _secretFlip: false, _secretOuch: false, _secretChicken: false, _secretStrikes: false,
  _secret42: false, _secretMidnight: false, _secretLeet: false, _secretChef: false, _secretOmelette: false,
  _midnightToday: null,
  // Cloud save
  _savedAt: 0,
  _cloudSavedAt: 0,
  cloudAutoSave: false,
};

let G = {};
let regenInt = null;
let _sessionStart = Date.now();
let _sbClient = null;
let _cloudUser = null;
let _cloudSession = null;     // full session object — cached by onAuthStateChange, never stale
let _cloudSyncTimer = null;
let _cloudUnlinking = false;  // guard against SIGNED_IN re-firing after signOut
let _premiumSilentRestoreDone = false;

const _SUPABASE_URL  = 'https://hhpikvqeopscjdzuhbfk.supabase.co';
const _SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocGlrdnFlb3BzY2pkenVoYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzA2NDUsImV4cCI6MjA5MTcwNjY0NX0.-iYI6Wf8eREEBKFxfty7ot1Ke8AqjC73xlT7KCTZaqc';

function initMonkeys() {
  return MONKEY_DATA.map((m, i) => ({
    unlocked: i === 0,
    stage: 0,           // highest unlocked stage index
    activeStage: 0,     // stage currently being played
    tiers: m.stages.map(() => 0), // per-stage tier: 0=bronze,1=silver,2=gold,3=complete
    collections: m.stages.map(s => s.collection.items.map(() => false)),
    completed: false,
  }));
}

// ==================== SAVE / LOAD ====================
const SAVE_KEY    = 'eggBreaker_v2';
const PREMIUM_KEY = 'eba_premium';
// Fields that must survive resets and save corruption — written on every purchase,
// merged back on every load (premium store always wins over main save).
const PREMIUM_FIELDS = [
  'premium_starter_pack', 'premiumPurchases', 'deviceId',
  'owned_luckycharm', 'owned_goldmagnet', 'owned_eggradar',
  'owned_doubledaily', 'owned_starsaver',
];

function savePremium() {
  const data = {};
  for (const k of PREMIUM_FIELDS) data[k] = G[k];
  try { localStorage.setItem(PREMIUM_KEY, JSON.stringify(data)); } catch (_) {}
}

function loadPremium() {
  try {
    const raw = localStorage.getItem(PREMIUM_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const k of PREMIUM_FIELDS) {
      // Only apply truthy values — never downgrade a field back to false/0
      if (data[k]) G[k] = data[k];
    }
  } catch (_) {}
}

function saveGame() {
  const now = Date.now();
  G.totalPlayTime = (G.totalPlayTime || 0) + Math.floor((now - _sessionStart) / 1000);
  _sessionStart = now;
  G._savedAt = now;
  const d = {};
  for (const k of Object.keys(DEFAULT_STATE)) d[k] = G[k];
  // Save eggs without transient _smashing lock
  if (G.roundEggs) {
    d.roundEggs = G.roundEggs.map(egg => {
      const { _smashing, ...clean } = egg;
      return clean;
    });
  }
  const json = JSON.stringify(d);
  const compressed = 'lz:' + LZString.compressToUTF16(json);
  localStorage.setItem(SAVE_KEY, compressed);
}

function migrateSave(state) {
  if (state.monkeys) {
    state.monkeys.forEach((mp, mi) => {
      if (!mp.tiers) {
        mp.tiers = MONKEY_DATA[mi].stages.map((_, si) => {
          if (si < mp.stage) return 3;
          if (si === mp.stage) return mp.tier || 0;
          return 0;
        });
      }
      if (mp.activeStage === undefined) mp.activeStage = mp.stage;
    });
  }
  if (state.roundEggs) {
    state.roundEggs.forEach(egg => {
      if (egg.maxHp === undefined) {
        egg.maxHp = EGG_HP[egg.type] || 1;
        egg.hp = egg.broken ? 0 : egg.maxHp;
      }
      delete egg._smashing;
    });
  }
}

function loadGame() {
  G = { ...DEFAULT_STATE, monkeys: initMonkeys(), roundEggs: null };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    // Support both compressed (lz: prefix) and legacy plain JSON saves
    const json = raw.startsWith('lz:') ? LZString.decompressFromUTF16(raw.slice(3)) : raw;
    const d = JSON.parse(json);
    for (const k of Object.keys(DEFAULT_STATE)) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_STATE, k)) continue;
      if (d[k] !== undefined && d[k] !== null && (DEFAULT_STATE[k] === null || typeof d[k] === typeof DEFAULT_STATE[k])) G[k] = d[k];
    }
    if (d.roundEggs) {
      G.roundEggs = d.roundEggs;
      // _pos values are pixel positions from a previous session that may have had
      // a different screen size — delete them so renderEggTray recalculates fresh.
      G.roundEggs.forEach(egg => { delete egg._pos; });
    }
    if (!G.monkeys || G.monkeys.length < MONKEY_DATA.length) {
      const fresh = initMonkeys();
      if (G.monkeys) {
        for (let i = 0; i < G.monkeys.length; i++) fresh[i] = G.monkeys[i];
      }
      G.monkeys = fresh;
    }
  } catch (_) {}
  migrateSave(G);
  loadPremium(); // premium store always wins — survives save corruption or wipes
}

function resetGame() {
  showConfirm('⚠️', 'Reset ALL progress?', 'Trophies, album and gold will be wiped. Premium purchases are kept.', function() {
    localStorage.removeItem(SAVE_KEY);
    G = {
      ...DEFAULT_STATE,
      achieved: [],
      discoveredEggs: ['normal','silver','gold'],
      multQueue: [],
      _selectedCounts: {},
      ownedHammers: ['default'],
      ownedHats: ['none'],
      hammer: 'default',
      hat: 'none',
      monkeys: initMonkeys(),
      roundEggs: null,
    };
    loadPremium(); // restore premium on top of fresh state
    _logLines.length = 0;
    _fullLog.length  = 0;
    renderLog();
    if (regenInt) { clearInterval(regenInt); regenInt = null; }
    invalidateBonusCache();
    invalidateAchieveCache();
    newRound();
    renderAll();
    renderPremiumShop();
    MUSIC.play(curMonkey().id);
    msg('All progress reset!');
    // Re-sync premium items from the server — PREMIUM_KEY may be stale or empty,
    // and _premiumSilentRestoreDone must be cleared so the Premium tab re-checks too.
    _premiumSilentRestoreDone = false;
    restorePurchases({ silent: true });
  }, 'Reset');
}


// ==================== DAILY LOGIN ====================
function localDateStr(d) {
  const t = d || new Date();
  return t.getFullYear() + '-' +
    String(t.getMonth() + 1).padStart(2, '0') + '-' +
    String(t.getDate()).padStart(2, '0');
}

function updateDailyGlow() {
  const btn = document.querySelector('.nav-tab[data-tab="daily"]');
  if (btn) btn.classList.toggle('daily-ready', !G.dailyClaimed);
}

function checkDaily() {
  const now = new Date();
  const today = localDateStr(now);
  if (G.lastLoginDate === today) {
    renderDailyCalendar();
    updateDailyGlow();
    return;
  }
  // New day — use local date arithmetic for correct DST handling
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = localDateStr(yesterdayDate);
  if (G.lastLoginDate === yesterday) {
    G.consecutiveDays++;
  } else {
    G.consecutiveDays = 1; // streak reset
  }
  G.longestStreak = Math.max(G.longestStreak || 0, G.consecutiveDays);
  G.lastLoginDate = today;
  G.dailyClaimed = false;
  saveGame();
  renderDailyCalendar();
  updateDailyGlow();
}

function claimDaily() {
  if (G.dailyClaimed) return;
  const dayIdx = Math.min(G.consecutiveDays, 100) - 1;
  const reward = DAILY_REWARDS[dayIdx];
  if (!reward) return;

  // Apply reward (Double Daily doubles the value)
  const dv = G['owned_doubledaily'] ? reward.val * 2 : reward.val;
  if (reward.type === 'gold')     { G.gold += dv; G.totalGold += dv; }
  if (reward.type === 'hammers')  { G.hammers = Math.min(G.maxH, G.hammers + dv); G.dailyHammerTotal = (G.dailyHammerTotal || 0) + dv; }
  if (reward.type === 'maxH')     { G.maxH += dv; if (G.hammers < G.maxH) G.hammers = Math.min(G.maxH, G.hammers + dv); }
  if (reward.type === 'feathers') { G.feathers += dv; G.totalFeathers += dv; }
  if (reward.type === 'banana')   { G.crystalBananas += dv; }

  G.dailyClaimed = true;
  updateDailyGlow();
  G.totalDailyClaims = (G.totalDailyClaims || 0) + 1;
  track('daily-claim', { day: G.consecutiveDays });
  msg('Day ' + G.consecutiveDays + ': ' + reward.label, 'daily');
  SFX.play('coin');
  checkAchievements();
  updateResources();
  renderDailyCalendar();
  saveGame();
}


// ==================== HELPERS ====================
function $id(id) { return document.getElementById(id); }

let _bonusCache = null;
let _stageBannerPending = false;
let _achieveBonusCache = null;
let _roundPending    = false;
let _spawningRound   = false;
let _centuryCooldown = 0;
let _shopNudgeDone   = false;
let _balloonHold     = null;
const _stageEggsCache = {};

const _logLines = [];
const _fullLog   = [];   // timestamped history, max 200 entries
const _FULL_LOG_MAX = 200;

// ── JS error capture ──────────────────────────────────────────────────────────
const _errorLog = [];
const _ERROR_LOG_MAX = 50;
function _pushError(msg, stack) {
  const existing = _errorLog.find(e => e.msg === msg);
  if (existing) { existing.count++; existing.ts = Date.now(); }
  else {
    _errorLog.unshift({ ts: Date.now(), msg, stack: stack || '', count: 1 });
    if (_errorLog.length > _ERROR_LOG_MAX) _errorLog.length = _ERROR_LOG_MAX;
  }
  if (_logFilter === 'errors') renderFullLog();
}
window.addEventListener('error', function(e) {
  const loc = e.filename ? ' (' + e.filename.replace(/.*\//, '') + ':' + e.lineno + ')' : '';
  _pushError((e.message || String(e)) + loc, e.error && e.error.stack);
});
window.addEventListener('unhandledrejection', function(e) {
  _pushError('Unhandled: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)),
             e.reason && e.reason.stack);
});
function msg(text, cat) {
  const show = CONFIG.logShow || {};
  if (cat && show[cat] === false) return;
  _logLines.unshift({ text: text, cat: cat || '' });
  if (_logLines.length > 5) _logLines.length = 5;
  renderLog();
  // Full log — skip noisy no-hammer noise, keep everything else
  if (cat !== 'noHammers') {
    _fullLog.unshift({ text, cat: cat || '', ts: Date.now() });
    if (_fullLog.length > _FULL_LOG_MAX) _fullLog.length = _FULL_LOG_MAX;
  }
}
function renderLog() {
  const el = $id('reward-log');
  if (!el) return;
  el.innerHTML = '<div class="rlog-title">Log</div>' +
    _logLines.map(function(l) {
      var cls = 'log-line';
      if (l.cat === 'noHammers' || l.cat === 'hex') cls += ' log-err';
      else if (l.cat === 'trophies') cls += ' log-trophy';
      else if (l.cat === 'tiers') cls += ' log-green';
      else if (l.cat === 'items') cls += ' log-blue';
      else if (l.cat === 'empty') cls += ' log-gray';
      else if (l.cat === 'discovery') cls += ' log-purple';
      else if (l.cat === 'cucumber') cls += ' log-cucumber';
      else if (l.cat === 'mjolnir') cls += ' log-mjolnir';
      else if (l.cat === 'freehit') cls += ' log-freehit';
      return '<div class="' + cls + '">' + l.text + '</div>';
    }).join('');
}

let _logFilter = '';

function renderFullLog() {
  const el = $id('full-log-list');
  if (!el) return;
  if (_logFilter === 'errors') {
    if (!_errorLog.length) {
      el.innerHTML = '<div class="flog-empty">No errors recorded. 🎉</div>';
      return;
    }
    const now = Date.now();
    el.innerHTML = _errorLog.map(e => {
      const age  = now - e.ts;
      const mins = Math.floor(age / 60000);
      const time = mins < 1 ? 'just now' : mins < 60 ? mins + 'm ago' : Math.floor(mins / 60) + 'h ago';
      const badge = e.count > 1 ? ' <span class="flog-errcnt">×' + e.count + '</span>' : '';
      return '<div class="flog-row log-err"><span class="flog-time">' + time + badge + '</span>' +
             '<span class="flog-text flog-errtext" title="' + (e.stack || '').replace(/"/g,'&quot;') + '">' + e.msg + '</span></div>';
    }).join('');
    return;
  }
  const _SPECIALS_CATS = new Set(['specials', 'cucumber', 'mjolnir', 'freehit']);
  const entries = _logFilter
    ? _fullLog.filter(e => _logFilter === 'specials' ? _SPECIALS_CATS.has(e.cat) : e.cat === _logFilter)
    : _fullLog;
  if (!entries.length) {
    el.innerHTML = '<div class="flog-empty">No activity recorded yet.</div>';
    return;
  }
  const now = Date.now();
  el.innerHTML = entries.map(e => {
    const age  = now - e.ts;
    const mins = Math.floor(age / 60000);
    const hrs  = Math.floor(mins / 60);
    const time = mins < 1  ? 'just now'
               : mins < 60 ? mins + 'm ago'
               : hrs  < 24 ? hrs + 'h ' + (mins % 60) + 'm ago'
               : Math.floor(hrs / 24) + 'd ago';
    const cls = e.cat === 'trophies'                        ? 'log-trophy'
              : e.cat === 'tiers'                            ? 'log-green'
              : e.cat === 'items'                            ? 'log-blue'
              : e.cat === 'discovery'                        ? 'log-purple'
              : e.cat === 'empty'                            ? 'log-gray'
              : e.cat === 'noHammers' || e.cat === 'hex'      ? 'log-err'
              : e.cat === 'cucumber'                         ? 'log-cucumber'
              : e.cat === 'mjolnir'                          ? 'log-mjolnir'
              : e.cat === 'freehit'                          ? 'log-freehit'
              : '';
    return `<div class="flog-row ${cls}"><span class="flog-time">${time}</span><span class="flog-text">${e.text}</span></div>`;
  }).join('');
}

// Filter buttons for the log panel
document.addEventListener('click', e => {
  const btn = e.target.closest('.log-filter-btn');
  if (!btn) return;
  document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _logFilter = btn.dataset.cat;
  renderFullLog();
});

function spawnFloat(zone, text, color, cls, cx, cy) {
  const el = document.createElement('div');
  el.className = 'prize-float' + (cls ? ' ' + cls : '');
  el.style.color = color;
  if (cx !== undefined && cy !== undefined) {
    // Clamp horizontally so text doesn't clip screen edges
    const zoneW = zone.offsetWidth || 300;
    const margin = 40;
    cx = Math.max(margin, Math.min(zoneW - margin, cx));
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
  } else {
    el.style.left = (20 + Math.random() * 60) + '%';
    el.style.top = (10 + Math.random() * 30) + '%';
  }
  el.textContent = text;
  zone.appendChild(el);
  setTimeout(() => el.remove(), cls === 'mega' ? 3200 : cls === 'big' ? 2700 : 2200);
}

function shake(el, level) {
  el.classList.remove('shake-sm', 'shake-md', 'shake-lg');
  void el.offsetWidth;
  el.classList.add('shake-' + level);
}

function isEggDiscovered(id) {
  return G.discoveredEggs && G.discoveredEggs.includes(id);
}

function curMonkey() { return MONKEY_DATA[G.activeMonkey]; }
function curProgress() { return G.monkeys[G.activeMonkey]; }
function curActiveStage() { return curProgress().activeStage !== undefined ? curProgress().activeStage : curProgress().stage; }
function curStage() { return curMonkey().stages[curActiveStage()]; }

// ==================== STARFALL ====================
function starfallCost() {
  return G['owned_starsaver'] ? CONFIG.starPiecesForStarfall - 1 : CONFIG.starPiecesForStarfall;
}

function isStarfallUnlocked() {
  return G.monkeys && G.monkeys[0] && G.monkeys[0].tiers && G.monkeys[0].tiers[0] >= 3;
}

// ==================== HEX EFFECT ====================
// Penalties scale with Mr. Monkey stage: 2% at stage 3, up to ~10% at stage 9
function _hexPct(mrStage) { return Math.min(0.10, 0.02 + Math.max(0, mrStage - 3) * 0.013); }

const HEX_TYPES = [
  { id: 'loseGold',     weight: 3, apply: (pct)          => { const lost = Math.max(1, Math.ceil(G.gold * pct)); G.gold = Math.max(0, G.gold - lost); return '😈 -' + lost + ' gold'; } },
  { id: 'loseFeathers', weight: 3, apply: (pct)          => { const lost = Math.max(1, Math.ceil(G.feathers * pct)); G.feathers = Math.max(0, G.feathers - lost); return '😈 -' + lost + ' feathers'; } },
  { id: 'loseHammers',  weight: 3, apply: (pct)          => { const lost = Math.max(1, Math.ceil(G.hammers * pct)); G.hammers = Math.max(0, G.hammers - lost); return '😈 -' + lost + ' hammers'; } },
  { id: 'regenPause',   weight: 1, apply: (pct, mrStage) => { const secs = 15 + Math.max(0, mrStage - 3) * 5; pauseRegen(secs); return '😈 Regen paused ' + secs + 's'; } },
];
const _HEX_WEIGHT_TOTAL = HEX_TYPES.reduce((s, h) => s + h.weight, 0);
function _pickHex() {
  let r = Math.random() * _HEX_WEIGHT_TOTAL;
  for (const h of HEX_TYPES) { r -= h.weight; if (r <= 0) return h; }
  return HEX_TYPES[HEX_TYPES.length - 1];
}

let _regenPauseTimer = null;
function pauseRegen(seconds) {
  if (regenInt) { clearInterval(regenInt); regenInt = null; }
  const hRow = $id('hammer-row');
  hRow.classList.add('hexed');
  clearTimeout(_regenPauseTimer);
  _regenPauseTimer = setTimeout(() => {
    hRow.classList.remove('hexed');
    if (G.hammers < G.maxH && !regenInt) startRegen();
    _regenPauseTimer = null;
  }, seconds * 1000);
}

function applyHex(cx, cy) {
  const zone = $id('prize-zone');
  const mrStage = G.monkeys && G.monkeys[0] ? (G.monkeys[0].stage || 0) : 0;
  const pct  = _hexPct(mrStage);
  const hex  = _pickHex();
  const text = hex.apply(pct, mrStage);
  G.hexesHit = (G.hexesHit || 0) + 1;
  spawnFloat(zone, text, '#ff4444', 'big', cx, cy - 30);
  msg(text, 'hex');
  SFX.play('err');
  checkAchievements();
  updateResources();
}

let _starfallActive = false;
function useStarfall() {
  if (_starfallActive || _spawningRound) return;
  if (!isStarfallUnlocked()) return;
  const cost = starfallCost();
  if (G.starPieces < cost || !G.roundEggs) return;
  G.starPieces -= cost;
  _doStarfall('STARFALL! All eggs smashed!');
}
function _doStarfall(message, cat) {
  if (_starfallActive) return;
  _starfallActive = true;
  G.starfallsUsed++;
  SFX.play('starfall');
  msg(message, cat || 'starfall');

  // Suspend multiplier during starfall — mults only apply to manual taps
  const savedMult = G.activeMult;
  const savedCounts = G._selectedCounts;
  G.activeMult = 1;
  G._selectedCounts = {};

  const wrap = $id('egg-tray-wrap');
  wrap.style.animation = 'starfall-glow 1s ease';
  setTimeout(() => wrap.style.animation = '', 1000);

  // Scatter gold sparkles across the tray on activation
  const wRect = wrap.getBoundingClientRect();
  for (let i = 0; i < 10; i++) {
    Particles.sparkle(
      Math.random() * wRect.width,
      Math.random() * wRect.height * 0.75,
      14, '#FFD700'
    );
  }

  // Break all unbroken eggs in sequence — century eggs are immune
  const unbroken = [];
  let immuneCount = 0;
  G.roundEggs.forEach((e, i) => {
    if (!e.broken && !e.expired && e.type !== 'century') unbroken.push(i);
    else if (!e.broken && !e.expired && e.type === 'century') immuneCount++;
  });
  if (immuneCount > 0) msg('🌀 Century egg' + (immuneCount > 1 ? 's are' : ' is') + ' immune to Starfall!', 'specials');

  unbroken.forEach((idx, i) => {
    setTimeout(() => {
      // Starfall instantly breaks egg regardless of HP
      const egg = G.roundEggs[idx];
      egg.hp = 0;
      egg.broken = true;
      G.totalEggs++;

      const slots = $id('egg-tray').children;
      const slot = slots[idx];
      slot.classList.add('smashing');
      setTimeout(() => slot.classList.remove('smashing'), 300);

      const rect = slot.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const cx = rect.left - wrapRect.left + rect.width / 2;
      const cy = rect.top - wrapRect.top + rect.height / 2;
      Particles.emit(cx, cy, egg.type, 14);
      Particles.sparkle(cx, cy, 8, '#FFD700');
      shake(slot, 'sm');
      SFX.play('hit');

      const prize = rollPrize(egg.type);
      setTimeout(() => {
        applyPrize(prize, cx, cy);
        slot.classList.add('broken');
        slot.innerHTML = makeEggSVG(egg.type, egg.maxHp) + eggLabel(egg.type, 0, egg.maxHp, true);
        updateResources();
        updateStageBar();
        saveGame();
      }, 200);
    }, i * 200);
  });

  setTimeout(() => {
    // Restore multiplier state after starfall
    G.activeMult = savedMult;
    G._selectedCounts = savedCounts;
    recalcActiveMult();
    renderMultQueue();
    _starfallActive = false;
    updateStarBtn();
    updateResources();
    checkAchievements();
    // Only advance to the next round if every egg is gone.
    // Century eggs are immune to starfall and must be smashed manually.
    if (!G.roundEggs || G.roundEggs.every(e => e.broken || e.expired)) {
      G.roundClears++;
      setTimeout(() => newRound(), 600);
    }
  }, unbroken.length * 200 + 300);
}


// ==================== COLLECTION / STAGE ====================
function checkCollectionComplete(suppressFlash) {
  const prog = curProgress();
  const si = curActiveStage();
  const stage = curStage();
  const collected = prog.collections[si];
  const total = stage.collection.items.length;
  const found = collected.filter(Boolean).length;

  // Ensure tiers array exists (save migration)
  if (!prog.tiers) prog.tiers = curMonkey().stages.map(() => 0);

  const tier = prog.tiers[si];
  const tt = CONFIG.tierThresholds;
  const thresholds = [
    Math.ceil(total * tt.bronze),
    Math.ceil(total * tt.silver),
    Math.ceil(total * tt.gold),
  ];

  if (tier < 3 && found >= thresholds[tier]) {
    prog.tiers[si]++;
    const newTier = prog.tiers[si];
    SFX.play('tier');

    const _tHMult = curMonkey().tierHammerMult || 1;

    if (newTier === 1) {
      // Bronze → Silver: +5 hammers
      const refill = Math.round(CONFIG.tierRewards.silver.hammerRefill * _tHMult);
      G.hammers += refill;
      G.tierHammerRefills = (G.tierHammerRefills || 0) + refill;
      msg('⬆️ Silver Tier! ' + stage.name + ' +' + refill + ' 🔨', 'tiers');

    } else if (newTier === 2) {
      // Silver → Gold: max hammers + hammers + unlock next stage
      const reward = CONFIG.tierRewards.gold;
      const refill2 = Math.round(reward.hammerRefill * _tHMult);
      G.maxH += reward.maxHammers;
      G.hammers += refill2;
      G.tierHammerRefills = (G.tierHammerRefills || 0) + refill2;
      // Unlock next stage if this is the highest
      if (si >= prog.stage && si < curMonkey().stages.length - 1) {
        prog.stage = si + 1;
      }
      const nextName = si < curMonkey().stages.length - 1
        ? curMonkey().stages[si + 1].name : null;
      msg('🥇 Gold Tier! ' + stage.name + ' +' + refill2 + ' 🔨' + (nextName ? ' — ' + nextName + ' unlocked' : ''), 'tiers');

    } else if (newTier >= 3) {
      // Gold → Complete: banana reward + hammers
      track('stage-complete', { monkey: curMonkey().name, stage: stage.name });
      G.stagesCompleted++;
      G.crystalBananas += CONFIG.crystalBananasPerStage;
      const refill3 = Math.round(CONFIG.tierRewards.complete.hammerRefill * _tHMult);
      G.hammers += refill3;
      G.tierHammerRefills = (G.tierHammerRefills || 0) + refill3;
      // Also unlock next stage if not already
      if (si >= prog.stage && si < curMonkey().stages.length - 1) {
        prog.stage = si + 1;
      }
      msg('✅ Complete! ' + stage.name + ' +' + CONFIG.crystalBananasPerStage + ' 🍌 +' + refill3 + ' 🔨', 'tiers');
      _stageBannerPending = true;
      // First-time stage 1 completion — teach starfall
      if (si === 0 && G.activeMonkey === 0 && !G._starfallTipSeen) {
        G._starfallTipSeen = true;
        setTimeout(() => showConfirm('⭐', 'Starfall Unlocked!',
          'Collect <strong>7 ⭐ Star Pieces</strong> from eggs to fill the star meter.<br><br>Once it\'s full, tap the ⭐ button to trigger <strong>Starfall</strong> — smashing all eggs on screen at once!',
          null, 'Got it!'
        ), 900);
      }
      // Check if ALL stages are complete
      if (prog.tiers.every(t => t >= 3)) {
        prog.completed = true;
        SFX.play('complete');
        // Mr. Monkey completion — unlock feathers
        if (G.activeMonkey === 0) {
          setTimeout(() => showConfirm('🎉', 'Mr. Monkey Complete!',
            'You\'ve unlocked <strong>Feathers 🪶</strong>!<br><br>Feathers drop from eggs and let you buy missing album items directly — great for speeding up your collection.',
            () => { document.querySelector('[data-tab="album"]').click(); },
            'Go to Album'
          ), 800);
        }
      }
    }
    // Refresh UI after tier change — skip renderEggTray so eggs don't jump positions
    setTimeout(() => {
      updateResources();
      updateStageBar();
      renderAlbum();
      renderMonkeys();
      renderStats();
      if (!suppressFlash) flashTierUp(newTier);
    }, 100);
    G.collectionsCompleted = calcTotalCollections();
    checkAchievements();
    saveGame();
  }
}

function calcTotalCollections() {
  let count = 0;
  G.monkeys.forEach((mp, mi) => {
    if (!mp.unlocked) return;
    const monkey = MONKEY_DATA[mi];
    mp.collections.forEach((coll, si) => {
      if (coll.every(Boolean) && si <= mp.stage) count++;
    });
  });
  return count;
}

// ── Item toast ──
const _itemToastQueue = [];
let   _itemToastActive = false;

function showItemToast(prize) {
  _itemToastQueue.push(prize);
  if (!_itemToastActive) _nextItemToast();
}

function _nextItemToast() {
  if (!_itemToastQueue.length) { _itemToastActive = false; return; }
  _itemToastActive = true;
  const prize = _itemToastQueue.shift();

  const wrap = $id('egg-tray-wrap');
  const old  = wrap.querySelector('.item-toast');
  if (old) old.remove();

  const el = document.createElement('div');
  el.className = 'item-toast';
  el.innerHTML =
    '<span class="item-toast-icon">' + prize.emoji + '</span>' +
    '<div class="item-toast-body">' +
      '<div class="item-toast-title">' + prize.name + '</div>' +
      '<div class="item-toast-sub">New item found!</div>' +
      (prize.quote ? '<div class="item-toast-quote">\u201c' + prize.quote + '\u201d</div>' : '') +
    '</div>';
  wrap.appendChild(el);

  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => { el.remove(); _nextItemToast(); }, 350);
  }, 3500);
}


function closeOverlay(id) {
  $id(id).classList.add('hidden');
}


function getSelectedMultValues() {
  if (!G._selectedCounts) return [];
  const vals = [];
  for (const [val, count] of Object.entries(G._selectedCounts)) {
    for (let i = 0; i < count; i++) vals.push(parseInt(val));
  }
  return vals;
}

function consumeMultiplier() {
  if (G.activeMult > 1 && G._selectedCounts) {
    G.maxMultUsed = Math.max(G.maxMultUsed || 0, G.activeMult);
    G.multUsed = (G.multUsed || 0) + getSelectedMultValues().length;
    const selected = getSelectedMultValues();
    G._lastMultCount = selected.length;
    // Remove consumed multipliers from queue
    for (const val of selected) {
      const idx = G.multQueue.indexOf(val);
      if (idx >= 0) G.multQueue.splice(idx, 1);
    }
    G._selectedCounts = {};
    G.activeMult = 1;
  }
}

// ==================== HAMMER REGEN ====================
function applyOfflineRegen(elapsedSec) {
  if (G.hammers >= G.maxH || elapsedSec <= 0) return;
  const interval = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
  if (elapsedSec >= G.regenCD) {
    const remaining = elapsedSec - G.regenCD;
    const earned    = 1 + Math.floor(remaining / interval);
    G.hammers  = Math.min(G.maxH, G.hammers + earned);
    G.regenCD  = interval - (remaining % interval);
    if (G.regenCD <= 0) G.regenCD = interval;
  } else {
    G.regenCD -= elapsedSec;
  }
}

function startRegen(preserveCD = false) {
  // Only regen when below max — overflow hammers are preserved
  if (G.hammers >= G.maxH) { clearInterval(regenInt); regenInt = null; return; }
  if (!preserveCD) G.regenCD = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
  regenInt = setInterval(() => {
    if (G.hammers >= G.maxH) {
      clearInterval(regenInt); regenInt = null;
      updateResources();
      return;
    }
    G.regenCD--;
    if (G.regenCD <= 0) {
      G.hammers++;
      if (G.hammers >= G.maxH) {
        clearInterval(regenInt); regenInt = null;
      } else {
        G.regenCD = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
      }
    }
    updateResources();
  }, 1000);
}

// ==================== MONKEY MANAGEMENT ====================
function switchStage(stageIdx) {
  const prog = curProgress();
  if (stageIdx > prog.stage) return;

  // Save the current stage's eggs into the session cache
  const fromStage = curActiveStage();
  const keyFrom = G.activeMonkey + '_' + fromStage;
  const keyTo   = G.activeMonkey + '_' + stageIdx;
  if (G.roundEggs) {
    _stageEggsCache[keyFrom] = G.roundEggs.map(egg => {
      const { _smashing, _pos, ...clean } = egg;
      return clean;
    });
  }

  prog.activeStage = stageIdx;
  // Clear stage banner if switching to an incomplete stage
  if (((prog.tiers && prog.tiers[stageIdx]) || 0) < 3) _stageBannerPending = false;

  // Restore that stage's eggs if we've visited it this session, else spawn fresh
  if (_stageEggsCache[keyTo]) {
    G.roundEggs = _stageEggsCache[keyTo];
  } else {
    G.roundEggs = null;
    newRound();
  }

  updateStageBar();
  saveGame();
  const tray = $id('egg-tray');
  if (tray) tray.innerHTML = '';
  requestAnimationFrame(renderEggTray);
}

function switchMonkey(index) {
  if (!G.monkeys[index].unlocked) return;
  G.activeMonkey = index;
  const prog = curProgress();
  if (prog.activeStage === undefined) prog.activeStage = prog.stage;
  G.roundEggs = null;
  MUSIC.play(curMonkey().id);
  newRound();
  renderAll();
  saveGame();
}

function unlockMonkey(index) {
  const req = MONKEY_DATA[index].unlockRequires;
  if (req && req.hammer && !G.ownedHammers.includes(req.hammer)) {
    showAlert('⚡', req.hint || 'A special item is required to unlock this monkey.');
    SFX.play('err');
    return;
  }
  if (req && req.monkey) {
    const reqIdx = MONKEY_DATA.findIndex(m => m.id === req.monkey);
    if (reqIdx === -1 || !G.monkeys[reqIdx]?.unlocked) {
      showAlert('🔒', req.hint || 'Unlock another monkey first.');
      SFX.play('err');
      return;
    }
  }
  if (req && req.monkeys) {
    const unmet = req.monkeys.find(id => { const ri = MONKEY_DATA.findIndex(m => m.id === id); return ri === -1 || !G.monkeys[ri]?.unlocked; });
    if (unmet) {
      showAlert('🔒', req.hint || 'Unlock all monkeys first.');
      SFX.play('err');
      return;
    }
  }
  const cost = MONKEY_DATA[index].cost;
  if (G.crystalBananas < cost) {
    showAlert('🍌', 'Need ' + cost + ' Crystal Bananas! (have ' + G.crystalBananas + ')');
    SFX.play('err');
    return;
  }
  showConfirm('🍌', 'Unlock ' + MONKEY_DATA[index].name + '?',
    'Spend ' + cost + ' Crystal Banana' + (cost !== 1 ? 's' : '') + ' to unlock this monkey.',
    function() {
      G.crystalBananas -= cost;
      G.monkeys[index].unlocked = true;
      G.activeMonkey = index;
      invalidateBonusCache();
      track('monkey-unlock', { monkey: MONKEY_DATA[index].name });
      SFX.play('levelup');
      msg(MONKEY_DATA[index].name + ' unlocked!', 'discovery');
      checkAchievements();
      const prog = curProgress();
      if (prog.activeStage === undefined) prog.activeStage = prog.stage;
      G.roundEggs = null;
      MUSIC.play(curMonkey().id);
      newRound();
      renderAll();
      saveGame();
    },
    'Unlock'
  );
}

// ==================== SHOP ====================
function toggleAutoBuy() {
  G.autoBuy = !G.autoBuy;
  const btn = $id('auto-buy-btn');
  btn.textContent = G.autoBuy ? 'ON' : 'OFF';
  btn.classList.toggle('on', G.autoBuy);
  saveGame();
}


function showAlbumInfo() {
  showConfirm('🪶', 'Album & Feathers',
    '1. Collect items by smashing eggs<br>' +
    '2. 🪶 Feathers buy missing items instantly<br>' +
    '3. Complete a stage to earn 🍌 &amp; progress<br>' +
    '4. Buy more feathers in the Premium shop',
    null, 'Got it!'
  );
}

function showMonkeysInfo() {
  showConfirm('🍌', 'Crystal Bananas',
    '1. 🍌 Bananas unlock new monkeys<br>' +
    '2. Earn bananas by completing stages<br>' +
    '3. Each monkey has unique stages &amp; items<br>' +
    '4. Buy bananas in the Premium shop',
    null, 'Got it!'
  );
}

function showShopInfo() {
  showConfirm('🛒', 'Shop — How Bonuses Work',
    '1. <strong>Special bonuses are always active</strong> — owning an item is enough, no need to equip it<br>' +
    '2. Hammers &amp; hats with a bonus stat stack permanently once purchased<br>' +
    '3. Equipping changes your cursor &amp; look — not your power<br>' +
    '4. Buy everything you can afford to maximize your bonuses!',
    null, 'Got it!'
  );
}

let _snackTimeout = null;
function showMultInfo() {
  showConfirm('💡', 'How Multipliers Work',
    '1. Tap a chip to activate it<br>' +
    '2. Chips ADD: x2 + x3 = x5<br>' +
    '3. Boosts gold, stars, feathers & hammers<br>' +
    '4. Skips starfall, hex & collection items<br>' +
    '5. Save big mults for Gold &amp; Crystal eggs!',
    null, 'Got it!'
  );
}

function showShopSnack(text, duration) {
  const el = $id('shop-snack');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(_snackTimeout);
  _snackTimeout = setTimeout(() => el.classList.remove('show'), duration || 1800);
}

function copyStatsToClipboard() {
  const total = Math.max(G.totalEggs, 1);
  const per100 = (n) => ((n || 0) / total * 100).toFixed(1);
  const W = 22; // label column width (includes colon)
  const row = (label, value) => (label + ':').padEnd(W) + value;
  const divider = '─'.repeat(36);

  const text = [
    '🥚 Egg Smash Adventures — Lifetime Stats',
    divider,
    row('Game started',   formatDate(G.firstPlayDate || 0)),
    row('Eggs smashed',   String(G.totalEggs)),
    row('Empties',        String(G.totalEmpties || 0)),
    row('Gold earned',    formatNum(G.totalGold)),
    row('Star pieces',    String(G.totalStarPieces)),
    row('Feathers',       String(G.totalFeathers)),
    row('Items found',    String(G.totalItems)),
    row('Biggest win',    formatNum(G.biggestWin)),
    row('Highest mult',   'x' + G.highestMult),
    row('Starfalls',      String(G.starfallsUsed)),
    row('Collections',    String(G.collectionsCompleted)),
    row('Stages done',    String(G.stagesCompleted)),
    row('Round clears',   String(G.roundClears)),
    row('Runny eggs',     String(G.runnySmashed || 0)),
    row('Timer eggs',     String(G.timerSmashed || 0)),
    row('Timer missed',   String(G.timerMissed || 0)),
    row('Centuries',      String(G.centurySmashed || 0)),
    row('Hexes hit',      String(G.hexesHit || 0)),
    row('Balloons',       String(G.balloonPopped || 0)),
    row('Longest streak', String(G.longestStreak || 0)),
    '',
    '── Hammers ' + '─'.repeat(25),
    row('Hit wall (0 left)', String(G.hammersDepleted || 0)),
    row('Bought +5 hammers', String(G.shopHammers5 || 0)),
    row('Bought +20 hammers', String(G.shopHammers20 || 0)),
    row('Tier refills',      String(G.tierHammerRefills || 0)),
    row('Daily hammers',     String(G.dailyHammerTotal || 0)),
    '',
    '── Multipliers ' + '─'.repeat(21),
    row('Mults dropped',   String(G.multDropped || 0)),
    row('Mults used',      String(G.multUsed || 0)),
    row('x5 mults bought', String(G.shopMult5 || 0)),
    '',
    '── Per 100 eggs ' + '─'.repeat(20),
    row('Silver',   per100(G.silverSmashed)),
    row('Gold',     per100(G.goldSmashed)),
    row('Crystal',  per100(G.crystalSmashed)),
    row('Ruby',     per100(G.rubySmashed)),
    row('Black',    per100(G.blackSmashed)),
    row('Century',  per100(G.centurySmashed)),
  ].join('\n');

  navigator.clipboard.writeText(text)
    .then(() => showShopSnack('📋 Stats copied!'))
    .catch(() => showShopSnack('Copy failed'));
}

function showAlert(icon, text) {
  showConfirm(icon, text, '', null);
  $id('confirm-yes').style.display = 'none';
  const noBtn = $id('overlay-confirm').querySelector('.confirm-no');
  if (noBtn) { noBtn.style.display = ''; noBtn.textContent = 'OK'; }
}

function showConfirm(icon, title, detail, onYes, yesText, noText) {
  const yesBtn = $id('confirm-yes');
  const noBtn  = $id('overlay-confirm').querySelector('.confirm-no');
  $id('confirm-icon').textContent = icon;
  $id('confirm-title').textContent = title;
  $id('confirm-detail').innerHTML = detail;
  if (onYes) {
    yesBtn.style.display = '';
    yesBtn.textContent   = yesText || 'Buy';
    yesBtn.onclick       = function() { closeOverlay('overlay-confirm'); onYes(); };
    if (noBtn) { noBtn.style.display = ''; noBtn.textContent = noText || 'Cancel'; }
  } else {
    if (noBtn) noBtn.style.display = 'none';
    yesBtn.style.display = '';
    yesBtn.textContent   = yesText || 'Got it';
    yesBtn.onclick       = function() { closeOverlay('overlay-confirm'); };
  }
  $id('overlay-confirm').classList.remove('hidden');
}
function cancelConfirm() { closeOverlay('overlay-confirm'); }
// ==================== SOUND ====================
function _syncSoundUI(on) {
  const btn = $id('sound-btn');
  if (btn) { btn.innerHTML = '🔊'; btn.classList.toggle('btn-off', !on); }
}
function toggleSound() {
  const on = SFX.toggle();
  G.soundOn = on;
  _syncSoundUI(on);
  saveGame();
}
function _syncMusicUI(on) {
  const btn = $id('music-btn');
  if (btn) { btn.innerHTML = '🎵'; btn.classList.toggle('btn-off', !on); }
}
function toggleMusic() {
  const on = MUSIC.toggle();
  G.musicOn = on;
  _syncMusicUI(on);
  saveGame();
}

// ==================== SETTINGS ====================
function openSettings() {
  _syncSoundUI(SFX.isOn());
  const el = document.getElementById('overlay-settings');
  if (el) el.classList.remove('hidden');
}

function openSubModal(id, renderFn) {
  closeOverlay('overlay-settings');
  if (renderFn) renderFn();
  document.getElementById(id).classList.remove('hidden');
}






// ==================== NAVIGATION ====================
$id('nav-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.nav-tab, .nav-play');
  if (!tab || tab.disabled) return;
  if (tab.classList.contains('active')) return;
  const name = tab.dataset.tab;
  document.querySelectorAll('.nav-tab, .nav-play').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  tab.classList.add('active');
  $id('panel-' + name).classList.add('active');
  // Refresh content when switching tabs
  if (name === 'play' && (_trayNeedsRender || !$id('egg-tray').children.length)) {
    // rAF ensures the browser has laid out the panel (display:flex) before
    // renderEggTray reads offsetWidth/offsetHeight for egg positioning.
    requestAnimationFrame(renderEggTray);
  }
  if (name === 'album') renderAlbum();
  if (name === 'monkeys') renderMonkeys();
  if (name === 'shop') { tab.classList.remove('shop-nudge'); renderShop(); updateAutoBuyBtn(); }
  if (name === 'stats') renderStats();
  if (name === 'lexicon') renderLexicon();
  if (name === 'daily') renderDailyCalendar();
  if (name === 'achieve') renderAchievements();
  if (name === 'premium') {
    renderPremiumShop();
    if (_cloudUser && !_premiumSilentRestoreDone) {
      _premiumSilentRestoreDone = true;
      restorePurchases({ silent: true });
    }
  }
  if (name === 'log') renderFullLog();
});

// ==================== BALLOON DESKTOP HANDLERS ====================
$id('egg-tray').addEventListener('mousedown', (e) => {
  const slot = e.target.closest('.egg-slot[data-balloon="1"]');
  if (!slot || slot.classList.contains('broken')) return;
  const idx = parseInt(slot.getAttribute('data-idx'));
  startBalloonInflate(idx, slot);
});
document.addEventListener('mouseup', () => {
  cancelBalloonInflate(document.querySelector('.inflating'));
});

// ==================== EASTER EGGS ====================
// 1. Tap title 5 times → eggs flip upside down for one round
(() => {
  let titleTaps = 0, titleLast = 0;
  const titleEl = document.querySelector('.title-text h1');
  if (titleEl) titleEl.addEventListener('click', () => {
    const now = Date.now();
    if (now - titleLast > 1200) titleTaps = 0;
    titleLast = now;
    titleTaps++;
    if (titleTaps >= 5) {
      titleTaps = 0;
      document.querySelectorAll('.egg-slot:not(.broken)').forEach(s => s.style.transform = 'scaleY(-1)');
      msg('The eggs are feeling... upside down', 'discovery');
      G._secretFlip = true; checkAchievements(); saveGame();
      setTimeout(() => document.querySelectorAll('.egg-slot').forEach(s => s.style.transform = ''), 5000);
    }
  });
})();

// 3. Track consecutive no-gold streaks
let _noGoldStreak = 0;

// 5. "ouch!" — 1 in 1000 chance on egg break
// 6. Chicken run — 1 in 500 chance
// 7. Midnight bonus
// 8. l33t gold
// 9. Empty streak (3 in a row)
let _emptyStreak = 0;

// Hook into applyPrize for easter eggs
const _origApplyPrize = applyPrize;
applyPrize = function(prize, cx, cy) {
  const zone = $id('prize-zone');

  // #5: rare "ouch!" before prize
  if (Math.random() < CONFIG.secretOuchChance) {
    spawnFloat(zone, 'ouch!', '#fca5a5', '', cx, cy - 25);
    G._secretOuch = true; checkAchievements(); saveGame();
  }

  // #6: rare chicken run
  if (Math.random() < CONFIG.secretChickenChance) {
    const chicken = document.createElement('div');
    chicken.className = 'chicken-run';
    chicken.textContent = '🐔';
    chicken.style.cursor = 'pointer';
    chicken.addEventListener('click', () => {
      G.feathers += 5;
      G.totalFeathers += 5;
      msg('🐔 Bwok! +5 feathers', 'prizes');
      const wrap = $id('egg-tray-wrap');
      const wRect = wrap.getBoundingClientRect();
      const cRect = chicken.getBoundingClientRect();
      spawnFloat($id('prize-zone'), '🐔 Bwok! +5🪶', '#059669', 'big',
        cRect.left - wRect.left + cRect.width / 2,
        cRect.top  - wRect.top  + cRect.height / 2);
      chicken.remove();
      updateResources();
      saveGame();
    });
    $id('egg-tray-wrap').appendChild(chicken);
    G._secretChicken = true; checkAchievements(); saveGame();
    setTimeout(() => { if (chicken.parentNode) chicken.remove(); }, 2500);
  }

  // #9: Empty streak tracking
  if (prize.type === 'empty') {
    _emptyStreak++;
    if (_emptyStreak >= 3) {
      G._secretStrikes = true; checkAchievements(); saveGame();
    }
  } else {
    _emptyStreak = 0;
  }

  // #3: No-gold streak
  if (prize.type === 'gold') {
    _noGoldStreak = 0;
  } else {
    _noGoldStreak++;
    if (_noGoldStreak >= 42) {
      spawnFloat(zone, 'The meaning of life is... not gold apparently', '#c084fc', 'big', cx, cy);
      G._secret42 = true; checkAchievements(); saveGame();
      _noGoldStreak = 0;
    }
  }

  // Call original
  _origApplyPrize(prize, cx, cy);

  // #7: Midnight bonus
  const hour = new Date().getHours();
  if (hour === 0 && !G._midnightToday) {
    G._midnightToday = new Date().toISOString().slice(0, 10);
    G.starPieces = (G.starPieces || 0) + 1;
    G.totalStarPieces = (G.totalStarPieces || 0) + 1;
    spawnFloat(zone, '🌙 Night owl! +1 star piece', '#c084fc', 'big', cx, cy - 40);
    msg('🌙 Night owl! The eggs were sleeping...', 'discovery');
    G._secretMidnight = true; checkAchievements(); saveGame();
    updateStarBtn();
  }

  // #8: l33t gold check
  if (G.gold === 1337) {
    msg('l33t h4ck3r detected', 'discovery');
    G._secretLeet = true; checkAchievements(); saveGame();
  }

  // #10: 10000 normal eggs
  if ((G.totalEggs || 0) >= 10000 && !G._secretChef) {
    G._secretChef = true; checkAchievements(); saveGame();
  }
};

// ==================== KEYBOARD ====================
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (G.roundEggs) {
      const idx = G.roundEggs.findIndex(egg => !egg.broken);
      if (idx >= 0) smashEgg(idx);
    }
  }
  if (e.code === 'KeyS' && e.ctrlKey) { e.preventDefault(); useStarfall(); }

  // #3 "omelette" typed
  if (!window._eggBuf) window._eggBuf = '';
  window._eggBuf += e.key.toLowerCase();
  if (window._eggBuf.length > 10) window._eggBuf = window._eggBuf.slice(-10);
  if (window._eggBuf.includes('omelette')) {
    window._eggBuf = '';
    document.querySelectorAll('.egg-slot:not(.broken)').forEach(s => {
      s.style.animation = 'egg-smash-retro .35s steps(6)';
      setTimeout(() => s.style.animation = '', 400);
    });
    msg('🍳 The eggs are nervous...', 'discovery');
    G._secretOmelette = true; checkAchievements(); saveGame();
  }
});


// ==================== GOD MODE ====================
(() => {
  let taps = 0, lastTap = 0;
  $id('monkey-avatar').addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap > 800) taps = 0;
    lastTap = now;
    taps++;
    if (taps >= 10) {
      $id('god-btn').classList.toggle('hidden');
      taps = 0;
    }
    document.querySelector('.nav-tab[data-tab="monkeys"]').click();
  });
})();

function godMode() {
  G.hammers = G.maxH;
  msg('Hammers refilled!');
  SFX.play('tier');
  updateResources();
  saveGame();
}


// ==================== INIT ====================
loadGame();
if (!G.firstPlayDate) { G.firstPlayDate = Date.now(); }

// Offline hammer regen — apply hammers earned while the app was closed
if (G._savedAt > 0 && G.hammers < G.maxH) {
  const elapsed = Math.floor((Date.now() - G._savedAt) / 1000);
  applyOfflineRegen(elapsed);
}

if (G.soundOn === false && SFX.isOn()) SFX.toggle();
_syncSoundUI(SFX.isOn());
if (G.musicOn === false && MUSIC.isOn()) MUSIC.toggle();
_syncMusicUI(MUSIC.isOn());
MUSIC.play(curMonkey().id);

Particles.init($id('particle-canvas'));

if (!G.roundEggs || G.roundEggs.length === 0) newRound();

renderAll();
initCloudSave();
_startCloudAutoSave();
_initNotifBtn();

// Once per session: warn in the log if not synced to cloud
let _noSyncWarned = false;
setTimeout(() => {
  if (!_noSyncWarned && !_cloudUser) {
    _noSyncWarned = true;
    msg('☁️ Not synced — go to ⚙️ Settings → Cloud Save to back up your progress', 'noSync');
  }
}, 3000);

$id('version-tag').textContent = 'Egg Smash Adventures v' + VERSION;

// PWA shortcut deep-linking: ?tab=play|album|shop|monkeys etc.
(function() {
  const tab = new URLSearchParams(location.search).get('tab');
  if (tab) {
    const btn = document.querySelector('[data-tab="' + tab + '"]');
    if (btn) btn.click();
  }
})();

if (G.hammers < G.maxH && !regenInt) startRegen();

// Welcome modal (cloud sync prompt) — show once to new players
function dismissWelcome(goToCloud) {
  closeOverlay('overlay-welcome');
  G._welcomeDone = true;
  saveGame();
  if (goToCloud) openCloudSaveModal();
}
if (!G._welcomeDone && G.totalEggs === 0) {
  setTimeout(() => $id('overlay-welcome').classList.remove('hidden'), 4800);
}

// Splash screen tip — show a random tip while the splash is visible (every load)
const _SPLASH_TIPS = [
  'Use feathers to unlock album items directly.',
  'Collect 7 star pieces to unleash Starfall!',
  'Multiplier chips + balloon eggs = massive prizes.',
  'Silver and gold eggs never give empty prizes.',
  'The shop has upgrades that keep hammers flowing.',
  'Complete Mr. Monkey to unlock feathers.',
  'Tap the gold counter to jump to the shop.',
  'Check the premium shop for game-changing gear.',
  'Crystal and ruby eggs hit harder but pay out big.',
];
(function() {
  const el = document.getElementById('splash-tip');
  if (!el) return;
  el.textContent = '💡 ' + _SPLASH_TIPS[Math.floor(Math.random() * _SPLASH_TIPS.length)];
})();

// Hammer regen catch-up when app is minimized / backgrounded
let _hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    _hiddenAt = Date.now();
    // Stop the 1 Hz regen loop while backgrounded — no point waking the JS thread every
    // second when applyOfflineRegen handles the catch-up math instantly on resume.
    if (regenInt) { clearInterval(regenInt); regenInt = null; }
  } else if (_hiddenAt > 0) {
    const elapsed = Math.floor((Date.now() - _hiddenAt) / 1000);
    // Always clear first (the hex-pause callback may have restarted regen while backgrounded)
    if (regenInt) { clearInterval(regenInt); regenInt = null; }
    if (elapsed > 0 && G.hammers < G.maxH) {
      applyOfflineRegen(elapsed);
      updateResources();
    }
    // Restart unless a hex-pause is still counting down (it will call startRegen when done)
    if (G.hammers < G.maxH && !regenInt && !_regenPauseTimer) startRegen(true);
    _hiddenAt = 0;
    Particles.resume();
  }
});

// Save _savedAt when app is fully closed so offline regen is accurate on next open
window.addEventListener('pagehide', () => { saveGame(); });

// Gold click → Shop
$id('res-g-wrap').addEventListener('click', () => {
  document.querySelector('[data-tab="shop"]').click();
});

// Feathers click → Album items
$id('res-b-wrap').addEventListener('click', () => {
  document.querySelector('.nav-tab[data-tab="monkeys"]').click();
});

$id('res-f-wrap').addEventListener('click', () => {
  document.querySelectorAll('.nav-tab, .nav-play').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.nav-tab[data-tab="album"]').classList.add('active');
  $id('panel-album').classList.add('active');
  renderAlbum();
  requestAnimationFrame(() => $id('album-items').scrollIntoView({ behavior: 'smooth', block: 'start' }));
});

// Find lowest-index unlocked stage that isn't tier 3 yet
function nextUncompletedStageIdx() {
  const prog = curProgress();
  for (let i = 0; i <= prog.stage && i < curMonkey().stages.length; i++) {
    if ((prog.tiers && prog.tiers[i] || 0) < 3) return i;
  }
  return -1;
}

// Shared: advance to next uncompleted stage, or open monkeys if all done
// Progress bar click → open album
$id('stage-bar').addEventListener('click', () => {
  document.querySelector('[data-tab="album"]').click();
});

// Banner click → advance to next uncompleted stage (or open monkeys if all done)
function stageBarAction() {
  const prog = curProgress();
  if (prog.completed) {
    document.querySelector('[data-tab="monkeys"]').click();
    return;
  }
  const nextIdx = nextUncompletedStageIdx();
  if (nextIdx >= 0) {
    _stageBannerPending = false;
    switchStage(nextIdx);
    updateStageBar();
  }
}
const _scBanner = $id('stage-complete-banner');
if (_scBanner) { _scBanner.style.pointerEvents = 'auto'; _scBanner.style.cursor = 'pointer'; _scBanner.addEventListener('click', stageBarAction); }

// Auto-save
setInterval(saveGame, 15000);

// Notify Android that JS is ready — triggers queryOwnedPurchases() on the Java side,
// which is gated on both billing-ready AND js-ready to avoid a race condition where
// billing connects before the page has loaded and purchase results are silently dropped.
if (window.AndroidBridge && typeof window.AndroidBridge.jsReady === 'function') {
  window.AndroidBridge.jsReady();
}

// Splash screen — fade out 4s after the game has initialised
setTimeout(() => {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.add('fade-out');
  setTimeout(() => splash.remove(), 650);
}, 4000);



// Hammer follows mouse (desktop) or flashes on tap (mobile)
let _isDesktop = !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
(() => {
  const wrap = $id('egg-tray-wrap');
  const hammer = $id('hammer');

  if (_isDesktop) {
    wrap.style.cursor = 'none';
    let _rafPending = false;
    wrap.addEventListener('mousemove', (e) => {
      if (_rafPending) return;
      _rafPending = true;
      requestAnimationFrame(() => {
        const r = wrap.getBoundingClientRect();
        hammer.style.left = (e.clientX - r.left - 20) + 'px';
        hammer.style.top = (e.clientY - r.top - 10) + 'px';
        _rafPending = false;
      });
    });
    wrap.addEventListener('mouseleave', () => { hammer.style.opacity = '0'; });
    wrap.addEventListener('mouseenter', () => { hammer.style.opacity = '1'; });
  }

  // Double-tap zoom prevention handled by CSS touch-action:manipulation
})();

