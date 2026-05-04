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
  skillsUnlocked: [false, false, false],
  skillsUnlockSeen: false,
  skillUpgrades: [0, 0, 0],
  skillLastUsedAt: [-999, -999, -999],
  skillConfirmSkip: [false, false, false],
  totalRageUses: 0,
  totalGooseUses: 0,
  totalShakeUses: 0,
  _gooseEggsLeft: 0,
  _rageHammersLeft: 0,
  showFloats: true,
  showLog: true,
  _welcomeDone: false,
  _firstRareSeen: false,
  _starfallTipSeen: false,
  deviceId: null,
  // Premium purchases (one-time flags + counter)
  premium_starter_pack: false,
  premiumPurchases: 0,
  // Shop upgrades (unique one-time purchases)
  owned_spyglass: false, owned_luckycharm: false, owned_goldmagnet: false,
  owned_eggradar: false, owned_doubledaily: false, owned_starsaver: false, owned_cleanse: false,
  eggradar_on: true,
  doubledailyRetroApplied: false,
  _bananasEverShown: false,
  _spyglassHintShown: false,
  _allMonkeysCongratsSeen: false,
  // Secrets
  _reviewPromptShown: false,
  _secretOuch: false, _secretChicken: false, _secretStrikes: false,
  _secretSpeed: false, _secretSweep: false,
  _secretMidnight: false, _secretLeet: false, _secretChef: false,
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
  try {
    localStorage.setItem(SAVE_KEY, compressed);
  } catch (e) {
    console.error('saveGame storage error:', e);
  }
}

function migrateSave(state) {
  if (state.monkeys) {
    state.monkeys.forEach((mp, mi) => {
      if (!MONKEY_DATA[mi]) return; // guard against downgrade/corrupt extra entries
      if (!mp.tiers) {
        mp.tiers = MONKEY_DATA[mi].stages.map((_, si) => {
          if (si < mp.stage) return 3;
          if (si === mp.stage) return mp.tier || 0;
          return 0;
        });
      }
      if (mp.activeStage === undefined) mp.activeStage = mp.stage;
      // Extend collections array if new stages were added in a patch
      if (!Array.isArray(mp.collections)) mp.collections = [];
      while (mp.collections.length < MONKEY_DATA[mi].stages.length) {
        const stageItems = MONKEY_DATA[mi].stages[mp.collections.length].collection.items;
        mp.collections.push(stageItems.map(() => false));
      }
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
    // If every egg is already broken/expired (app killed mid-round-clear), discard the tray
    // so newRound() spawns fresh eggs instead of leaving the player stuck.
    if (state.roundEggs.every(e => e.broken || e.expired)) {
      state.roundEggs = null;
    }
  }
  // Guard out-of-bounds activeMonkey (corrupt save or downgrade)
  if (state.activeMonkey >= MONKEY_DATA.length) state.activeMonkey = 0;
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
    migrateSave(G);
  } catch (e) {
    // Save data unreadable — start fresh but warn the player
    console.error('loadGame parse error:', e);
    G = { ...DEFAULT_STATE, monkeys: initMonkeys(), roundEggs: null };
    setTimeout(() => showShopSnack('⚠️ Save data unreadable — starting fresh. Use Report Issue if this repeats.', 6000), 1500);
  }
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
  const dayIdx = Math.min(G.consecutiveDays, 30) - 1;
  const reward = DAILY_REWARDS[dayIdx];
  if (!reward) return;

  // Apply reward (Double Daily doubles the value, except premium items)
  const dv = G['owned_doubledaily'] ? reward.val * 2 : reward.val;
  if (reward.type === 'gold')       { G.gold += dv; G.totalGold += dv; }
  if (reward.type === 'hammers')    { G.hammers += dv; G.dailyHammerTotal = (G.dailyHammerTotal || 0) + dv; }
  if (reward.type === 'maxH')       { G.maxH += dv; if (G.hammers < G.maxH) G.hammers = Math.min(G.maxH, G.hammers + dv); }
  if (reward.type === 'feathers')   { G.feathers += dv; G.totalFeathers += dv; }
  if (reward.type === 'goldmagnet') {
    if (!G.owned_goldmagnet) { G.owned_goldmagnet = true; savePremium(); }
    else { G.gold += 2000; G.totalGold += 2000; } // consolation if already purchased
  }

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


// Retroactively grant the bonus half of every previously-claimed daily reward.
// Called once when Double Daily is first purchased (guarded by doubledailyRetroApplied).
function applyDoubleDailyRetroBonus() {
  if (G.doubledailyRetroApplied) return;
  G.doubledailyRetroApplied = true;

  // Days already claimed: 1..(consecutiveDays-1) always, plus consecutiveDays if dailyClaimed
  const claimedUpTo = G.dailyClaimed ? G.consecutiveDays : G.consecutiveDays - 1;
  if (claimedUpTo <= 0) return;

  let bonusGold = 0, bonusHammers = 0, bonusFeathers = 0, bonusMaxH = 0;
  for (let d = 1; d <= Math.min(claimedUpTo, 30); d++) {
    const r = DAILY_REWARDS[d - 1];
    if (!r) continue;
    if (r.type === 'gold')     bonusGold     += r.val;
    if (r.type === 'hammers')  bonusHammers  += r.val;
    if (r.type === 'feathers') bonusFeathers += r.val;
    if (r.type === 'maxH')     bonusMaxH     += r.val;
  }

  if (bonusGold)     { G.gold     += bonusGold;     G.totalGold     += bonusGold; }
  if (bonusHammers)  { G.hammers  += bonusHammers;  G.dailyHammerTotal = (G.dailyHammerTotal || 0) + bonusHammers; }
  if (bonusFeathers) { G.feathers += bonusFeathers; G.totalFeathers += bonusFeathers; }
  if (bonusMaxH)     { G.maxH     += bonusMaxH; }

  const parts = [];
  if (bonusGold)     parts.push(bonusGold.toLocaleString() + ' 🪙');
  if (bonusHammers)  parts.push(bonusHammers + ' 🔨');
  if (bonusFeathers) parts.push(bonusFeathers + ' 🪶');
  if (bonusMaxH)     parts.push('+' + bonusMaxH + ' max 🔨');
  if (parts.length)  msg('📅 Double Daily retro bonus (' + claimedUpTo + ' days): ' + parts.join(' + '), 'prizes');
}

function toggleEggradar() {
  G.eggradar_on = !G.eggradar_on;
  saveGame();
  renderPremiumShop();
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

function msg(text, cat) {
  const show = CONFIG.logShow || {};
  if (cat && show[cat] === false) return;
  _logLines.unshift({ text: text, cat: cat || '' });
  if (_logLines.length > 5) _logLines.length = 5;
  renderLog();
  // Full log — skip noisy no-hammer noise, keep everything else
  if (cat !== 'noHammers') {
    const eggType = (typeof _prizeEggType !== 'undefined' && _prizeEggType) ? _prizeEggType : null;
    _fullLog.unshift({ text, cat: cat || '', ts: Date.now(), eggType });
    if (_fullLog.length > _FULL_LOG_MAX) _fullLog.length = _FULL_LOG_MAX;
  }
}
function renderLog() {
  const el = $id('reward-log');
  if (!el) return;
  el.style.display = (typeof G !== 'undefined' && G.showLog === false) ? 'none' : '';
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
      else if (l.cat === 'gavel') cls += ' log-gavel';
      return '<div class="' + cls + '">' + l.text + '</div>';
    }).join('');
}

let _logFilter = '';

function renderFullLog() {
  const el = $id('full-log-list');
  if (!el) return;
  const _SPECIALS_CATS = new Set(['specials', 'cucumber', 'mjolnir', 'freehit', 'gavel']);
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
              : e.cat === 'gavel'                           ? 'log-gavel'
              : '';
    let prefix = '';
    if (e.eggType) {
      const eCfg = CONFIG.eggTypes.find(t => t.id === e.eggType);
      if (eCfg) prefix = `<span class="flog-egg">${eCfg.name} › </span>`;
    }
    return `<div class="flog-row ${cls}"><span class="flog-time">${time}</span><span class="flog-text">${prefix}${e.text}</span></div>`;
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
  if (!zone || !zone.isConnected) return;
  if (typeof G !== 'undefined' && G.showFloats === false) return;
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
// Penalties scale with Mr. Monkey stage: 2% at stage 3, up to ~6% at stage 9
function _hexPct(mrStage) { return Math.min(0.06, 0.02 + Math.max(0, mrStage - 3) * 0.007); }

const HEX_TYPES = [
  { id: 'loseGold',     weight: 3, apply: (pct)          => { const lost = Math.max(1, Math.ceil(G.gold * pct)); G.gold = Math.max(0, G.gold - lost); return '😈 -' + lost + ' gold'; } },
  { id: 'loseFeathers', weight: 3, apply: (pct)          => { const lost = Math.max(1, Math.ceil(G.feathers * pct)); G.feathers = Math.max(0, G.feathers - lost); return '😈 -' + lost + ' feathers'; } },
  { id: 'loseHammers',  weight: 3, apply: (pct)          => { const lost = Math.max(1, Math.ceil(G.hammers * pct)); G.hammers = Math.max(0, G.hammers - lost); return '😈 -' + lost + ' hammers'; } },
  { id: 'regenPause',   weight: 1, apply: (pct, mrStage) => { const secs = 15 + Math.max(0, mrStage - 3) * 2.5; pauseRegen(secs); return '😈 Regen paused ' + secs + 's'; } },
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
  if (_rageActive) { stopMonkeyRage(); return; }
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


// ==================== MONKEY RAGE ====================
let _rageActive = false;
let _rageHammersLeft = 0;
let _gooseActive = false;
let _gooseEggsLeft = 0;

function activateMonkeyRage() {
  if (_gooseActive) { _skillBump($id('rage-btn')); return; }
  if (_rageActive || _starfallActive || _spawningRound) return;
  if (!G.skillsUnlocked || !G.skillsUnlocked[0]) return;
  if (!isSkillReady(0)) return;
  if (G.hammers < 1) { showAlert('🔨', 'No hammers left!'); SFX.play('err'); return; }
  if (!G.roundEggs) return;
  const unbroken = G.roundEggs.filter(e => !e.broken && !e.expired);
  if (!unbroken.length) { showAlert('🐒', 'No eggs to smash!'); return; }

  const hammersNow = G.hammers;
  const doRage = () => {
    if (_rageActive || _starfallActive || _spawningRound) return;
    if (G.hammers < 1) { showAlert('🔨', 'No hammers left!'); SFX.play('err'); return; }
    _rageHammersLeft = Math.max(0, G.hammers);
    G._rageHammersLeft = _rageHammersLeft;
    G.hammers = 0;
    _rageActive = true;
    G.totalRageUses = (G.totalRageUses || 0) + 1;
    const _trayWrap = $id('egg-tray-wrap');
    if (_trayWrap) _trayWrap.classList.add('rage-tray-active');
    updateResources();
    msg('MONKEY RAGE! ' + _rageHammersLeft + ' hammers unleashed!', 'specials');
    SFX.play('starfall');
    spawnFloat($id('prize-zone'), 'MONKEY RAGE!!', '#ff3333', 'mega');
    _doRageBatch();
  };

  if ((G.skillConfirmSkip || [])[0]) { doRage(); return; }

  showConfirm('', 'Monkey Rage!',
    'Will consume <b style="color:#ffaaaa">' + hammersNow + ' hammers</b> — smashing every egg across stages until empty.<br><br><label class="skill-skip-label"><input type="checkbox" id="skill-skip-0"> Don\'t show me again</label>',
    () => {
      if (document.getElementById('skill-skip-0')?.checked) {
        if (!G.skillConfirmSkip) G.skillConfirmSkip = [false,false,false];
        G.skillConfirmSkip[0] = true;
        saveGame();
      }
      doRage();
    },
    'Unleash', 'Cancel'
  );
  $id('confirm-icon').innerHTML = '<img src="img/rage_monkey.png" class="rage-confirm-img" alt="">';
}

function _doRageBatch() {
  if (_rageHammersLeft <= 0) { _finishRage(); return; }
  if (!G.roundEggs) { _finishRage(); return; }

  const unbrokenIdxs = G.roundEggs.reduce((a, e, i) => {
    if (!e.broken && !e.expired) a.push(i);
    return a;
  }, []);

  if (!unbrokenIdxs.length) {
    // Round cleared — advance and keep going if hammers remain
    G.roundClears++;
    checkCollectionComplete(true);
    checkAchievements();
    newRound();
    setTimeout(_doRageBatch, 450);
    return;
  }

  // Assign hammer cost per egg (full break or partial damage)
  const toProcess = [];
  let hammersLeft = _rageHammersLeft;
  for (const idx of unbrokenIdxs) {
    if (hammersLeft <= 0) break;
    const egg = G.roundEggs[idx];
    const cost = egg.hp;
    if (hammersLeft >= cost) {
      toProcess.push({ idx, fullyBroken: true });
      hammersLeft -= cost;
    } else {
      toProcess.push({ idx, fullyBroken: false, dmg: hammersLeft });
      hammersLeft = 0;
    }
  }
  _rageHammersLeft = hammersLeft;
  G._rageHammersLeft = _rageHammersLeft;
  updateRageBtn();

  const wrap = $id('egg-tray-wrap');
  const hammerEl = $id('hammer');

  toProcess.forEach(({ idx, fullyBroken, dmg }, i) => {
    setTimeout(() => {
      const egg = G.roundEggs[idx];
      if (!egg || egg.broken) return;

      const slots = $id('egg-tray').children;
      const slot = slots[idx];
      if (!slot) return;
      const rect = slot.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const cx = rect.left - wrapRect.left + rect.width / 2;
      const cy = rect.top - wrapRect.top + rect.height / 2;

      clearTimeout(hammerEl._hideTimer);
      hammerEl.style.transition = 'none';
      hammerEl.style.left = (cx - 20) + 'px';
      hammerEl.style.top = (cy - 10) + 'px';
      hammerEl.style.opacity = '1';
      hammerEl.classList.remove('hammer-anim');
      void hammerEl.offsetWidth;
      hammerEl.classList.add('hammer-anim');
      hammerEl._hideTimer = setTimeout(() => {
        hammerEl.style.opacity = '0';
        hammerEl.style.transition = '';
      }, 130);

      const isSpecial = ['crystal','ruby','black','century'].includes(egg.type);
      SFX.play(isSpecial ? 'crunch' : 'hit');
      shake(slot, fullyBroken ? 'lg' : 'md');
      slot.classList.add('smashing');
      setTimeout(() => slot.classList.remove('smashing'), 250);
      Particles.emit(cx, cy, egg.type, fullyBroken ? 18 : Math.max(4, (dmg || 1) * 3));

      setTimeout(() => {
        if (fullyBroken) {
          egg.hp = 0;
          egg.broken = true;
          G.totalEggs++;
          const prize = rollPrize(egg.type);
          applyPrize(prize, cx, cy);
          slot.classList.add('broken');
          slot.innerHTML = makeEggSVG(egg.type, egg.maxHp) + eggLabel(egg.type, 0, egg.maxHp, true);
        } else {
          // Partial damage — show cracks, egg survives
          egg.hp -= dmg;
          const damage = egg.maxHp - egg.hp;
          slot.innerHTML = makeEggSVG(egg.type, damage) + eggLabel(egg.type, egg.hp, egg.maxHp, false);
        }
        updateResources();
        updateStageBar();
        saveGame();
      }, 120);
    }, i * 140);
  });

  // After this batch: spawn new round if cleared, then continue or finish
  setTimeout(() => {
    const roundCleared = G.roundEggs.every(e => e.broken || e.expired);
    if (roundCleared) {
      G.roundClears++;
      checkCollectionComplete(true);
      checkAchievements();
      newRound(); // always repopulate eggs when round is cleared
      if (_rageHammersLeft > 0) {
        setTimeout(_doRageBatch, 450);
      } else {
        setTimeout(_finishRage, 450);
      }
    } else {
      _finishRage();
    }
  }, toProcess.length * 140 + 350);
}

function _finishRage() {
  _rageActive = false;
  _rageHammersLeft = 0;
  G._rageHammersLeft = 0;
  if (!G.skillLastUsedAt) G.skillLastUsedAt = [-999,-999,-999];
  G.skillLastUsedAt[0] = G.totalEggs; // cooldown starts from when rage ends
  const _trayWrap = $id('egg-tray-wrap');
  if (_trayWrap) _trayWrap.classList.remove('rage-tray-active');
  updateResources();
  checkAchievements();
  if (typeof regenInt !== 'undefined' && !regenInt && G.hammers < G.maxH) startRegen();
}

function stopMonkeyRage() {
  if (!_rageActive) return;
  const refund = Math.min(_rageHammersLeft, G.maxH - G.hammers);
  _rageHammersLeft = 0; // causes _doRageBatch to call _finishRage after current batch
  if (refund > 0) {
    G.hammers = Math.min(G.maxH, G.hammers + refund);
    msg('Rage stopped — ' + refund + ' hammers refunded.', 'specials');
  } else {
    msg('Rage stopped.', 'specials');
  }
  updateResources();
}

// ==================== GOLDEN GOOSE ====================
function activateGoldenGoose() {
  if (_rageActive) { _skillBump($id('goose-btn')); return; }
  if (_gooseActive || _starfallActive) return;
  // blocked by banana? (banana is instant so never truly "active")
  if (!G.skillsUnlocked || !G.skillsUnlocked[1]) return;
  if (!isSkillReady(1)) return;

  const doGoose = () => {
    _gooseActive = true;
    _gooseEggsLeft = 50;
    G._gooseEggsLeft = 50;
    G.totalGooseUses = (G.totalGooseUses || 0) + 1;
    const _gt = $id('egg-tray-wrap'); if (_gt) _gt.classList.add('goose-tray-active');
    updateResources();
    msg('GOLDEN GOOSE! Next 50 eggs give 3× rewards!', 'specials');
    SFX.play('starfall');
    spawnFloat($id('prize-zone'), 'GOLDEN GOOSE!', '#FFD700', 'mega');
    renderSkills();
    updateGooseBtn();
  };

  if ((G.skillConfirmSkip || [])[1]) { doGoose(); return; }

  showConfirm('', 'Golden Goose',
    'Next <b>50 eggs</b> give a flat <b style="color:#FFD700">+3× base bonus</b> on top of normal rewards. Century eggs excluded.<br><br><label class="skill-skip-label"><input type="checkbox" id="skill-skip-1"> Don\'t show me again</label>',
    () => {
      if (document.getElementById('skill-skip-1')?.checked) {
        if (!G.skillConfirmSkip) G.skillConfirmSkip = [false,false,false];
        G.skillConfirmSkip[1] = true;
        saveGame();
      }
      doGoose();
    },
    'Activate', 'Cancel'
  );
  $id('confirm-icon').innerHTML = '<img src="img/golden_goose.png" class="rage-confirm-img" alt="">';
}

function _finishGoose() {
  _gooseActive = false;
  _gooseEggsLeft = 0;
  G._gooseEggsLeft = 0;
  const _gt2 = $id('egg-tray-wrap'); if (_gt2) _gt2.classList.remove('goose-tray-active');
  if (!G.skillLastUsedAt) G.skillLastUsedAt = [-999,-999,-999];
  G.skillLastUsedAt[1] = G.totalEggs;
  msg('Golden Goose ended — cooldown started.', 'specials');
  updateResources();
  renderSkills();
  updateGooseBtn();
}

// ==================== BANANA SHAKE ====================
function activateBananaShake() {
  if (_rageActive || _gooseActive) { _skillBump($id('banana-btn')); return; }
  if (_starfallActive) return;
  if (!G.skillsUnlocked || !G.skillsUnlocked[2]) return;
  if (!isSkillReady(2)) return;

  const doShake = () => {
    G.hammers = G.maxH;
    G.regenCD = CONFIG.regenInterval;
    G.totalShakeUses = (G.totalShakeUses || 0) + 1;
    if (!G.skillLastUsedAt) G.skillLastUsedAt = [-999,-999,-999];
    G.skillLastUsedAt[2] = G.totalEggs;
    saveGame();
    updateResources();
    SFX.play('complete');
    spawnFloat($id('prize-zone'), 'BANANA SHAKE!', '#FFD700', 'mega');
    msg('BANANA SHAKE! Hammers refilled!', 'specials');
    renderSkills();
    updateBananaBtn();
    const _bb = $id('banana-btn');
    if (_bb) { _bb.classList.add('skill-glow-blue'); setTimeout(() => _bb.classList.remove('skill-glow-blue'), 1600); }
    const _tw = $id('egg-tray-wrap');
    if (_tw) { _tw.classList.add('shake-tray-wiggle'); setTimeout(() => _tw.classList.remove('shake-tray-wiggle'), 1100); }
    flyHammers();
  };

  if ((G.skillConfirmSkip || [])[2]) { doShake(); return; }

  showConfirm('', 'Banana Shake',
    'Instantly refills all hammers to maximum (<b>' + G.maxH + ' hammers</b>).<br><br><label class="skill-skip-label"><input type="checkbox" id="skill-skip-2"> Don\'t show me again</label>',
    () => {
      if (document.getElementById('skill-skip-2')?.checked) {
        if (!G.skillConfirmSkip) G.skillConfirmSkip = [false,false,false];
        G.skillConfirmSkip[2] = true;
        saveGame();
      }
      doShake();
    },
    'Activate', 'Cancel'
  );
  $id('confirm-icon').innerHTML = '<img src="img/banana_shake.png" class="rage-confirm-img" alt="">';
}

function flyHammers() {
  const srcEl  = $id('banana-btn');
  const dstEl  = $id('hammer-row');
  if (!srcEl || !dstEl) return;

  const srcR = srcEl.getBoundingClientRect();
  const dstR = dstEl.getBoundingClientRect();
  const sx   = srcR.left + srcR.width  / 2;
  const sy   = srcR.top  + srcR.height / 2;
  const dx   = dstR.left + dstR.width  / 2;
  const dy   = dstR.top  + dstR.height / 2;

  const COUNT   = 10;
  const STAGGER = 65;   // ms between launches

  for (let i = 0; i < COUNT; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className  = 'flying-hammer';
      el.textContent = '🔨';
      el.style.left = sx + 'px';
      el.style.top  = sy + 'px';
      document.body.appendChild(el);

      // random control-point arc above/below
      const spread = (Math.random() - 0.5) * 140;
      const cpx = (sx + dx) / 2 + spread;
      const cpy = Math.min(sy, dy) - 80 - Math.random() * 60;

      const dur = 520 + i * 18;
      let start = null;

      const tick = (now) => {
        if (!start) start = now;
        const t  = Math.min(1, (now - start) / dur);
        const e  = 1 - Math.pow(1 - t, 2);   // ease-out quad
        // quadratic bezier
        const bx = (1-e)*(1-e)*sx + 2*(1-e)*e*cpx + e*e*dx;
        const by = (1-e)*(1-e)*sy + 2*(1-e)*e*cpy + e*e*dy;
        const sc = 0.6 + 0.8 * Math.sin(t * Math.PI);   // grow then shrink
        el.style.transform = `translate(-50%,-50%) scale(${sc})`;
        el.style.left = bx + 'px';
        el.style.top  = by + 'px';
        el.style.opacity = t < 0.85 ? '1' : String(1 - (t - 0.85) / 0.15);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          el.remove();
          dstEl.classList.add('hammer-arrive');
          setTimeout(() => dstEl.classList.remove('hammer-arrive'), 320);
          if (i === COUNT - 1) {
            setTimeout(() => {
              dstEl.classList.add('hammer-fill-complete');
              setTimeout(() => dstEl.classList.remove('hammer-fill-complete'), 500);
            }, 60);
          }
        }
      };
      requestAnimationFrame(tick);
    }, i * STAGGER);
  }
}

function activateSkill(i) {
  if (i === 0) activateMonkeyRage();
  else if (i === 1) activateGoldenGoose();
  else if (i === 2) activateBananaShake();
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

  let tier = prog.tiers[si];
  const tt = CONFIG.tierThresholds;
  const thresholds = [
    Math.ceil(total * tt.bronze),
    Math.ceil(total * tt.silver),
    Math.ceil(total * tt.gold),
  ];

  while (tier < 3 && found >= thresholds[tier]) {
    prog.tiers[si]++;
    tier = prog.tiers[si];
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
        // Skills unlock: any 2 monkeys completed
        const completedCount = G.monkeys.filter(m => m.completed).length;
        if (completedCount >= 2 && !G.skillsUnlockSeen) {
          G.skillsUnlockSeen = true;
          checkSkillsUnlock();
          setTimeout(() => $id('overlay-skills-unlock').classList.remove('hidden'), 1800);
        }
        // Check if ALL monkeys (including locked ones) are now complete
        const allMonkeysDone = G.monkeys.every(mp => mp.completed === true);
        if (allMonkeysDone && !G._allMonkeysCongratsSeen) {
          G._allMonkeysCongratsSeen = true;
          setTimeout(() => {
            SFX.play('fanfare');
            setTimeout(() => $id('overlay-congrats').classList.remove('hidden'), 800);
          }, 1200);
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

function checkSkillsUnlock() {
  const done = (G.monkeys || []).filter(m => m.completed).length;
  const btn = $id('nav-skills');
  if (!btn) return;
  if (done >= 2) {
    btn.disabled = false;
    btn.classList.remove('locked');
    btn.textContent = 'Skills';
  }
  updateSkillBtns();
}

function _skillBump(el) {
  if (!el) return;
  el.classList.remove('skill-btn-bump');
  void el.offsetWidth;
  el.classList.add('skill-btn-bump');
  setTimeout(() => el.classList.remove('skill-btn-bump'), 400);
}

function updateRageBtn() {
  const btn = $id('rage-btn');
  if (!btn) return;
  if (!G.skillsUnlocked || !G.skillsUnlocked[0]) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden');
  if (_gooseActive) {
    btn.classList.remove('skill-glow-red');
    btn.classList.add('skill-btn-blocked');
    if (!isSkillReady(0)) {
      btn.classList.add('rage-cooldown');
      btn.innerHTML = `<span class="rage-cd-count">${skillEggsUntilReady(0)}</span>`;
      btn.disabled = true;
    } else {
      btn.classList.remove('rage-cooldown');
      btn.innerHTML = '<img src="img/rage_monkey.png" class="rage-btn-img" alt="">';
      btn.disabled = false;
    }
    btn.title = 'Monkey Rage (skill active)';
    return;
  }
  btn.classList.remove('skill-btn-blocked');
  if (_rageActive) {
    btn.classList.remove('rage-cooldown');
    btn.classList.add('skill-glow-red');
    btn.innerHTML = `<div class="rage-running-wrap"><img src="img/rage_monkey.png" class="rage-btn-img rage-btn-dim" alt=""><span class="rage-running-count">${_rageHammersLeft}</span><span class="rage-stop-hint">✕</span></div>`;
    btn.disabled = false;
    btn.title = 'Stop Rage (refunds remaining hammers)';
    return;
  }
  btn.title = 'Monkey Rage';
  btn.classList.remove('skill-glow-red');
  const ready = isSkillReady(0);
  if (!ready) {
    const left = skillEggsUntilReady(0);
    btn.classList.add('rage-cooldown');
    btn.innerHTML = `<span class="rage-cd-count">${left}</span>`;
    btn.disabled = true;
  } else {
    btn.classList.remove('rage-cooldown');
    btn.innerHTML = '<img src="img/rage_monkey.png" class="rage-btn-img" alt="">';
    btn.disabled = G.hammers < 1;
  }
}

function updateGooseBtn() {
  const btn = $id('goose-btn');
  if (!btn) return;
  if (!G.skillsUnlocked || !G.skillsUnlocked[1]) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden');
  if (_rageActive) {
    btn.classList.remove('skill-glow-gold');
    btn.classList.add('skill-btn-blocked');
    if (!isSkillReady(1)) {
      btn.classList.add('skill-btn-cd');
      btn.innerHTML = `<span class="rage-cd-count">${skillEggsUntilReady(1)}</span>`;
      btn.disabled = true;
    } else {
      btn.classList.remove('skill-btn-cd');
      btn.innerHTML = '<img src="img/golden_goose.png" class="rage-btn-img" alt="">';
      btn.disabled = false;
    }
    return;
  }
  btn.classList.remove('skill-btn-blocked');
  if (_gooseActive) {
    btn.classList.remove('skill-btn-cd');
    btn.classList.add('skill-glow-gold');
    btn.innerHTML = `<div class="rage-running-wrap"><img src="img/golden_goose.png" class="rage-btn-img rage-btn-dim" alt=""><span class="rage-running-count">${_gooseEggsLeft}</span></div>`;
    btn.disabled = true;
    return;
  }
  btn.classList.remove('skill-glow-gold');
  const ready = isSkillReady(1);
  if (!ready) {
    btn.classList.add('skill-btn-cd');
    btn.innerHTML = `<span class="rage-cd-count">${skillEggsUntilReady(1)}</span>`;
    btn.disabled = true;
  } else {
    btn.classList.remove('skill-btn-cd');
    btn.innerHTML = '<img src="img/golden_goose.png" class="rage-btn-img" alt="">';
    btn.disabled = false;
  }
}

function updateBananaBtn() {
  const btn = $id('banana-btn');
  if (!btn) return;
  if (!G.skillsUnlocked || !G.skillsUnlocked[2]) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden');
  if (_rageActive || _gooseActive) {
    btn.classList.add('skill-btn-blocked');
    if (!isSkillReady(2)) {
      btn.classList.add('skill-btn-cd');
      btn.innerHTML = `<span class="rage-cd-count">${skillEggsUntilReady(2)}</span>`;
      btn.disabled = true;
    } else {
      btn.classList.remove('skill-btn-cd');
      btn.innerHTML = '<img src="img/banana_shake.png" class="rage-btn-img" alt="">';
      btn.disabled = false;
    }
    return;
  }
  btn.classList.remove('skill-btn-blocked');
  const ready = isSkillReady(2);
  if (!ready) {
    btn.classList.add('skill-btn-cd');
    btn.innerHTML = `<span class="rage-cd-count">${skillEggsUntilReady(2)}</span>`;
    btn.disabled = true;
  } else {
    btn.classList.remove('skill-btn-cd');
    btn.innerHTML = '<img src="img/banana_shake.png" class="rage-btn-img" alt="">';
    btn.disabled = false;
  }
}

function updateSkillBtns() {
  updateRageBtn();
  updateGooseBtn();
  updateBananaBtn();
}

function goToSkills() {
  closeOverlay('overlay-skills-unlock');
  document.querySelector('[data-tab="skills"]').click();
}

const _SKILL_COSTS = [
  { feathers: 350, gold: 100000 },
  { feathers: 550, gold: 175000 },
  { feathers: 750, gold: 300000 },
];
// Per-skill cooldown arrays [base, upgrade1, upgrade2]
const _SKILL_COOLDOWNS = [
  [300, 250, 200],  // Monkey Rage
  [300, 250, 200],  // Golden Goose
  [400, 350, 300],  // Banana Shake
];
const _SKILL_UPGRADE_COSTS = { gold: [140000, 140000], feathers: [150, 150] };

function skillCooldownThreshold(idx) {
  const level = Math.min(2, (G.skillUpgrades || [0,0,0])[idx] || 0);
  const cds = _SKILL_COOLDOWNS[idx] || _SKILL_COOLDOWNS[0];
  return cds[level];
}
function skillEggsUntilReady(idx) {
  const cd   = skillCooldownThreshold(idx);
  const last = ((G.skillLastUsedAt || [-999,-999,-999])[idx] ?? -999);
  return Math.max(0, cd - (G.totalEggs - last));
}
function isSkillReady(idx) { return skillEggsUntilReady(idx) === 0; }

function buySkillUpgrade(skillIdx) {
  const level = (G.skillUpgrades || [0,0,0])[skillIdx] || 0;
  if (level >= 2) return;
  const goldCost    = _SKILL_UPGRADE_COSTS.gold[level];
  const featherCost = _SKILL_UPGRADE_COSTS.feathers[level];
  const cds = _SKILL_COOLDOWNS[skillIdx] || _SKILL_COOLDOWNS[0];
  const newCd = cds[level + 1];
  if (G.gold < goldCost) { showAlert('🪙', 'Need ' + formatNum(goldCost) + ' gold!'); SFX.play('err'); return; }
  if (G.feathers < featherCost) { showAlert('🪶', 'Need ' + featherCost + ' feathers!'); SFX.play('err'); return; }
  showConfirm('⚡', 'Upgrade Skill?',
    'Reduce cooldown to ' + newCd + ' eggs<br>' + featherCost + ' 🪶 + ' + formatNum(goldCost) + ' 🪙',
    () => {
      G.gold -= goldCost;
      G.feathers -= featherCost;
      if (!G.skillUpgrades) G.skillUpgrades = [0,0,0];
      G.skillUpgrades[skillIdx]++;
      saveGame();
      updateResources();
      renderSkills();
      checkAchievements();
      SFX.play('complete');
    },
    'Upgrade'
  );
}

function buySkill(idx) {
  if ((G.skillsUnlocked || [])[idx]) return;
  const owned = (G.skillsUnlocked || []).filter(Boolean).length;
  if (owned >= 3) return;
  const cost = _SKILL_COSTS[owned];
  if (G.feathers < cost.feathers) { showAlert('🪶', 'Need ' + cost.feathers + ' feathers! (have ' + G.feathers + ')'); SFX.play('err'); return; }
  if (G.gold < cost.gold) { showAlert('🪙', 'Need ' + formatNum(cost.gold) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return; }
  showConfirm('⚡', 'Unlock Skill?',
    cost.feathers + ' 🪶 + ' + formatNum(cost.gold) + ' 🪙',
    () => {
      G.feathers -= cost.feathers;
      G.gold -= cost.gold;
      G.skillsUnlocked[idx] = true;
      saveGame();
      updateResources();
      renderSkills();
      updateSkillBtns();
      checkAchievements();
      SFX.play('complete');
    },
    'Unlock'
  );
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
  if (req && req.totalEggs && (G.totalEggs || 0) < req.totalEggs) {
    showAlert('🥚', 'Smash ' + req.totalEggs.toLocaleString() + ' eggs first! (' + (G.totalEggs || 0).toLocaleString() + ' so far)');
    SFX.play('err');
    return;
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
    '3. Complete a stage to earn 🍌 &amp; progress',
    null, 'Got it!'
  );
}

function showMonkeysInfo() {
  showConfirm('🍌', 'Monkeys',
    '1. 🍌 Crystal Bananas unlock new monkeys<br>' +
    '2. Earn bananas by completing stages<br>' +
    '3. Each monkey has unique stages &amp; items<br>' +
    '4. <strong>Perks are always active once unlocked</strong> — you don\'t need to equip a monkey to benefit from its bonus. All unlocked monkey perks stack permanently.<br>' +
    '5. Buy bananas in the Premium shop',
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

function _syncFloatsUI(on) {
  const label = $id('floats-toggle-label');
  if (label) { label.textContent = on ? 'ON' : 'OFF'; label.classList.toggle('on', on); }
}
function toggleFloats() {
  G.showFloats = !G.showFloats;
  _syncFloatsUI(G.showFloats);
  saveGame();
}
function _syncLogUI(on) {
  const label = $id('log-toggle-label');
  if (label) { label.textContent = on ? 'ON' : 'OFF'; label.classList.toggle('on', on); }
  const log = $id('reward-log');
  if (log) log.style.display = on ? '' : 'none';
}
function toggleLog() {
  G.showLog = !G.showLog;
  _syncLogUI(G.showLog);
  saveGame();
}

// ==================== SETTINGS ====================
function openSettings() {
  _syncSoundUI(SFX.isOn());
  _syncFloatsUI(G.showFloats !== false);
  _syncLogUI(G.showLog !== false);
  const el = document.getElementById('overlay-settings');
  if (el) el.classList.remove('hidden');
}

function openSubModal(id, renderFn) {
  closeOverlay('overlay-settings');
  if (renderFn) renderFn();
  if (id === 'overlay-progress') {
    _overallQuoteText = _nextQuote();
    updateOverallProgress();
  }
  document.getElementById(id).classList.remove('hidden');
}

function openExternalUrl(url) {
  if (window.AndroidBridge && typeof window.AndroidBridge.openUrl === 'function') {
    window.AndroidBridge.openUrl(url);
  } else {
    window.open(url, '_blank');
  }
}

function checkReviewPrompt() {
  if (G._reviewPromptShown) return;
  if ((G.totalEggs || 0) < 1000) return;
  G._reviewPromptShown = true;
  saveGame();
  setTimeout(() => {
    showConfirm('🥚', 'You smashed 1000 eggs!',
      'Enjoying the game so far? A quick review means the world to us 🙏',
      () => openExternalUrl('https://play.google.com/store/apps/details?id=com.eggbreakeradventures.app'),
      '⭐ Rate Now', 'Maybe Later'
    );
  }, 1000);
}

function reportIssue() {
  closeOverlay('overlay-settings');
  const body = [
    'Version: ' + VERSION,
    'Day streak: ' + G.consecutiveDays,
    'Active monkey: ' + (MONKEY_DATA[G.activeMonkey]?.name || G.activeMonkey),
    'Device: ' + navigator.userAgent.substring(0, 150),
    '',
    'Describe the issue below:',
    '',
    '',
  ].join('\n');
  const url = 'mailto:yotameggbreaker@gmail.com'
    + '?subject=' + encodeURIComponent('Egg Smash Adventures — Issue Report')
    + '&body='    + encodeURIComponent(body);
  if (window.AndroidBridge && typeof window.AndroidBridge.openMailto === 'function') {
    window.AndroidBridge.openMailto(url);
  } else {
    const a = document.createElement('a');
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function showSkillsInfo() {
  showConfirm('⚡', 'Skills',
    '<div class="info-blocks">' +
      '<div class="info-block">' +
        '<span class="info-block-title">Unlocking</span>' +
        '<div class="info-row"><span>Skills unlock after completing <span class="info-highlight">2 monkeys</span>. Up to 3 skills total, each costs feathers + gold.</span></div>' +
      '</div>' +
      '<div class="info-block">' +
        '<span class="info-block-title">How they work</span>' +
        '<div class="info-row"><span><span class="info-highlight">Monkey Rage</span> — spends all hammers smashing eggs. Tap button to stop early (unused hammers refunded).</span></div>' +
        '<div class="info-row"><span><span class="info-highlight">Golden Goose</span> — next 50 eggs get a flat +3× base bonus on top of normal rewards.</span></div>' +
        '<div class="info-row"><span><span class="info-highlight">Banana Shake</span> — instantly refills all hammers to max.</span></div>' +
      '</div>' +
      '<div class="info-block">' +
        '<span class="info-block-title">Cooldown & limits</span>' +
        '<div class="info-row"><span>Each skill has an egg-count cooldown. Only one skill active at a time. Activate from tray buttons.</span></div>' +
      '</div>' +
      '<div class="info-block">' +
        '<span class="info-block-title">Upgrades</span>' +
        '<div class="info-row"><span>Each skill upgrades twice — reduces cooldown (300 → 250 → 200 eggs). Costs <span class="info-highlight">150 feathers + 140k gold</span> per upgrade.</span></div>' +
      '</div>' +
    '</div>',
    null, 'Got it!'
  );
  const box = $id('overlay-confirm').querySelector('.popup');
  if (box) box.classList.add('pop-info');
  const yesBtn = $id('confirm-yes');
  const prev = yesBtn.onclick;
  yesBtn.onclick = function() { if (box) box.classList.remove('pop-info'); prev && prev.call(this); };
}

function showPlayInfo() {
  showConfirm('ℹ️', 'How to Play',
    '<div class="info-blocks">' +
      '<div class="info-block">' +
        '<span class="info-block-title">🥚 basics</span>' +
        '<div class="info-row"><span class="info-row-icon">🔨</span><span>Tap an egg to smash it — costs <span class="info-highlight">1 hammer</span></span></div>' +
        '<div class="info-row"><span class="info-row-icon">📦</span><span>Collect all items in a stage to advance tiers</span></div>' +
        '<div class="info-row"><span class="info-row-icon">⭐</span><span>Fill <span class="info-highlight">7 star pieces</span> to trigger Starfall</span></div>' +
        '<div class="info-row"><span class="info-row-icon">🍌</span><span>100% stage items = Crystal Banana reward</span></div>' +
      '</div>' +
      '<div class="info-block">' +
        '<span class="info-block-title">💡 multipliers</span>' +
        '<div class="info-row"><span class="info-row-icon">➕</span><span>Tap a chip to activate — chips <span class="info-highlight">add</span>: x2+x3 = x5</span></div>' +
        '<div class="info-row"><span class="info-row-icon">💰</span><span>Boosts gold, stars &amp; feathers — not items</span></div>' +
        '<div class="info-row"><span class="info-row-icon">🎯</span><span>Save big mults for Gold &amp; Crystal eggs!</span></div>' +
      '</div>' +
      '<div class="info-block">' +
        '<span class="info-block-title">⚡ skills</span>' +
        '<div class="info-row"><span class="info-row-icon">⚡</span><span>Unlock powerful skills after completing <span class="info-highlight">2 monkeys</span> — see the Skills tab for details</span></div>' +
      '</div>' +
      '<div class="info-block">' +
        '<span class="info-block-title">🍌 progression</span>' +
        '<div class="info-row"><span class="info-row-icon">🐵</span><span>Each monkey has unique stages &amp; perks</span></div>' +
        '<div class="info-row"><span class="info-row-icon">✅</span><span>Unlocked monkey perks stack — always active</span></div>' +
        '<div class="info-row"><span class="info-row-icon">☁️</span><span>Cloud Save syncs progress across devices</span></div>' +
      '</div>' +
    '</div>',
    null, 'Got it!'
  );
  const box = $id('overlay-confirm').querySelector('.popup');
  if (box) box.classList.add('pop-info');
  const yesBtn = $id('confirm-yes');
  const prev = yesBtn.onclick;
  yesBtn.onclick = function() { if (box) box.classList.remove('pop-info'); prev && prev.call(this); };
}







// ==================== NAVIGATION ====================
$id('nav-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.nav-tab, .nav-play');
  if (!tab || tab.disabled) return;
  if (tab.classList.contains('active')) return;
  const name = tab.dataset.tab;
  if (name !== 'play' && _rageActive) stopMonkeyRage();
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
  if (name === 'skills') renderSkills();
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

let _smashTimes = [];
let _emptyStreak = 0;

// Hook into applyPrize for easter eggs
const _origApplyPrize = applyPrize;
applyPrize = function(prize, cx, cy) {
  const zone = $id('prize-zone');

  // rare "ouch!" before prize
  if (Math.random() < CONFIG.secretOuchChance) {
    spawnFloat(zone, 'ouch!', '#fca5a5', '', cx, cy - 25);
    G._secretOuch = true; checkAchievements(); saveGame();
  }

  // rare chicken run
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

  // empty streak tracking
  if (prize.type === 'empty') {
    _emptyStreak++;
    if (_emptyStreak >= 3) {
      G._secretStrikes = true; checkAchievements(); saveGame();
    }
  } else {
    _emptyStreak = 0;
  }

  // Speed Demon: 5 eggs in under 5 seconds
  _smashTimes.push(Date.now());
  if (_smashTimes.length > 5) _smashTimes.shift();
  if (!G._secretSpeed && _smashTimes.length === 5 && _smashTimes[4] - _smashTimes[0] < 5000) {
    G._secretSpeed = true; checkAchievements(); saveGame();
  }

  // Call original
  _origApplyPrize(prize, cx, cy);

  // midnight bonus
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

  // l33t gold check
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
});


(() => {
  $id('monkey-avatar').addEventListener('click', () => {
    document.querySelector('.nav-tab[data-tab="monkeys"]').click();
  });
})();


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

// Restore Monkey Rage interruption — refund remaining hammers and start cooldown
if ((G._rageHammersLeft || 0) > 0) {
  const _rageRefund = Math.min(G._rageHammersLeft, G.maxH - G.hammers);
  if (_rageRefund > 0) G.hammers = Math.min(G.maxH, G.hammers + _rageRefund);
  G._rageHammersLeft = 0;
  if (!G.skillLastUsedAt) G.skillLastUsedAt = [-999,-999,-999];
  if (G.skillLastUsedAt[0] === -999) G.skillLastUsedAt[0] = G.totalEggs;
}

// Restore Golden Goose mid-session state
if ((G._gooseEggsLeft || 0) > 0) {
  _gooseActive = true;
  _gooseEggsLeft = G._gooseEggsLeft;
  const _gt = $id('egg-tray-wrap'); if (_gt) _gt.classList.add('goose-tray-active');
}

renderAll();
checkSkillsUnlock();
initCloudSave();
_startCloudAutoSave();
_initNotifBtn();
_syncFloatsUI(G.showFloats !== false);
_syncLogUI(G.showLog !== false);

// Once per session: warn in the log if not synced to cloud.
// Auth resolves asynchronously — wait for _cloudAuthSettled before checking.
// If still unsettled at 3s (slow network/Android), retry once at 8s.
let _noSyncWarned = false;
function _maybeWarnNoSync() {
  if (_cloudUser || _noSyncWarned) return;
  if (!_cloudAuthSettled) { setTimeout(_maybeWarnNoSync, 5000); return; }
  _noSyncWarned = true;
  msg('☁️ Not synced — go to ⚙️ Settings → Cloud Save to back up your progress', 'noSync');
}
setTimeout(_maybeWarnNoSync, 3000);

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

