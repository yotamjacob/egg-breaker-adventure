// ============================================================
//  Egg Breaker Adventures – Game Engine
//  game.js  (requires all other JS files loaded first)
// ============================================================

// ── Analytics helper (Umami) ──────────────────────────────────
function track(event, props) {
  try { if (typeof umami !== 'undefined') umami.track(event, props); } catch(e) {}
}


// ==================== GAME STATE ====================
const DEFAULT_STATE = {
  hammers: CONFIG.startingHammers, maxH: CONFIG.startingMaxHammers, gold: 0, starPieces: 0, crystalBananas: 0,
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
  _tourDone: false,
  deviceId: null,
  // Premium purchases (one-time flags + counter)
  premium_starter_pack: false,
  premiumPurchases: 0,
  // Shop upgrades (unique one-time purchases)
  owned_spyglass: false, owned_luckycharm: false, owned_goldmagnet: false,
  owned_eggradar: false, owned_doubledaily: false, owned_starsaver: false,
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
const SAVE_KEY = 'eggBreaker_v2';

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
    if (d.roundEggs) G.roundEggs = d.roundEggs;
    if (!G.monkeys || G.monkeys.length < MONKEY_DATA.length) {
      const fresh = initMonkeys();
      if (G.monkeys) {
        for (let i = 0; i < G.monkeys.length; i++) fresh[i] = G.monkeys[i];
      }
      G.monkeys = fresh;
    }
  } catch (_) {}
  migrateSave(G);
}

function resetGame() {
  showConfirm('⚠️', 'Reset ALL progress?', 'Including trophies and album. This cannot be undone!', function() {
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
    if (regenInt) { clearInterval(regenInt); regenInt = null; }
    invalidateBonusCache();
    invalidateAchieveCache();
    newRound();
    renderAll();
    MUSIC.play(curMonkey().id);
    msg('All progress reset!');
  }, 'Reset');
}


// ==================== DAILY LOGIN ====================
function localDateStr(d) {
  const t = d || new Date();
  return t.getFullYear() + '-' +
    String(t.getMonth() + 1).padStart(2, '0') + '-' +
    String(t.getDate()).padStart(2, '0');
}

function checkDaily() {
  const now = new Date();
  const today = localDateStr(now);
  if (G.lastLoginDate === today) {
    renderDailyCalendar();
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
  if (reward.type === 'maxH')     { G.maxH += dv; G.hammers = Math.min(G.maxH, G.hammers + dv); }
  if (reward.type === 'feathers') { G.feathers += dv; G.totalFeathers += dv; }
  if (reward.type === 'banana')   { G.crystalBananas += dv; }

  G.dailyClaimed = true;
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

const _logLines = [];
const _fullLog   = [];   // timestamped history, max 200 entries
const _FULL_LOG_MAX = 200;
function msg(text, cat) {
  const show = CONFIG.logShow || {};
  if (cat && show[cat] === false) return;
  _logLines.unshift({ text: text, cat: cat || '' });
  if (_logLines.length > 4) _logLines.length = 4;
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
      if (l.cat === 'noHammers') cls += ' log-err';
      else if (l.cat === 'trophies' || l.cat === 'tiers') cls += ' log-green';
      else if (l.cat === 'items') cls += ' log-blue';
      else if (l.cat === 'empty') cls += ' log-gray';
      else if (l.cat === 'discovery') cls += ' log-purple';
      return '<div class="' + cls + '">' + l.text + '</div>';
    }).join('');
}

let _logFilter = '';

function renderFullLog() {
  const el = $id('full-log-list');
  if (!el) return;
  const entries = _logFilter
    ? _fullLog.filter(e => e.cat === _logFilter)
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
    const cls = e.cat === 'trophies' || e.cat === 'tiers'  ? 'log-green'
              : e.cat === 'items'                            ? 'log-blue'
              : e.cat === 'discovery'                        ? 'log-purple'
              : e.cat === 'empty'                            ? 'log-gray'
              : e.cat === 'prizes'                           ? ''
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

// ==================== ROUND MANAGEMENT ====================
let _roundPending  = false;
let _spawningRound = false;
let _centuryCooldown = 0; // rounds remaining before century can spawn again

function newRound() {
  _roundPending  = false;
  _spawningRound = true;
  setTimeout(() => { _spawningRound = false; updateStarBtn(); }, 250);
  if (_centuryCooldown > 0) _centuryCooldown--;
  const prog = curProgress();
  const stage = curStage();
  const count = stage.eggs;
  const eggs = [];
  const si = curActiveStage();
  // Build available egg types for this stage from registry
  const available = [];
  for (const def of CONFIG.eggTypes) {
    // Special unlock: century requires Mr. Monkey completed + cooldown elapsed
    if (def.unlockMonkey0) {
      if (!G.monkeys || !G.monkeys[0] || !G.monkeys[0].completed) continue;
      if (_centuryCooldown > 0) continue;
    } else if (def.unlockStage > si) {
      continue;
    }
    let w = def.spawnWeight;
    // Egg Radar: +50% spawn weight for rare eggs
    if (G['owned_eggradar'] && def.id !== 'normal' && def.id !== 'silver') w *= 1.5;
    available.push({ type: def.id, weight: w });
  }
  const spawnTotal = available.reduce((s, e) => s + e.weight, 0);
  for (let i = 0; i < count; i++) {
    let r = Math.random() * spawnTotal;
    let type = 'normal';
    for (const e of available) {
      r -= e.weight;
      if (r <= 0) { type = e.type; break; }
    }
    const hp = EGG_HP[type];
    // Egg effects unlock progressively through Mr. Monkey stages
    const mrStage = G.monkeys && G.monkeys[0] ? (G.monkeys[0].stage || 0) : 0;
    let effects = [];
    if (mrStage >= 5 && Math.random() < 0.015) {
      effects = ['balloon'];  // exclusive — no other effects (unlocks Stage 6)
    } else {
      if (mrStage >= 1 && Math.random() < 0.05) effects.push('runny');  // Stage 2
      if (mrStage >= 2 && Math.random() < 0.05 && ['normal','silver','gold','crystal'].includes(type)) effects.push('timer'); // Stage 3
      if (mrStage >= 3 && Math.random() < 0.03 && type !== 'ruby' && type !== 'black' && type !== 'crystal' && type !== 'century') effects.push('hex');  // Stage 4+ (ruby/black/crystal/century immune)
    }
    eggs.push({ type, hp, maxHp: hp, broken: false, effects, timer: effects.includes('timer') ? 3.0 : 0 });
    // Discover new egg type
    if (!G.discoveredEggs) G.discoveredEggs = ['normal','silver','gold'];
    if (!G.discoveredEggs.includes(type)) {
      G.discoveredEggs.push(type);
      const def = EGG_REGISTRY[type];
      msg('New egg discovered: ' + def.emoji + ' ' + def.name + '!!', 'discovery');
      SFX.play('achieve');
      saveGame();
    }
  }
  G.roundEggs = eggs;
  // Start cooldown if a century egg was rolled this round
  if (eggs.some(e => e.type === 'century')) _centuryCooldown = 100;
  renderEggTray();
  updateResources();
  saveGame();
}



function multEquation(base, multVals, result, unit, balloonMult, customPrefix) {
  const chipTotal = multVals ? multVals.reduce(function(a, b) { return a + b; }, 0) : 1;
  const totalMult = chipTotal * (balloonMult || 1);
  const prefix = customPrefix !== undefined ? customPrefix : (balloonMult ? '🎈 POP! ' : '');
  return prefix + '+' + result + ' ' + unit + ' (' + totalMult + 'x' + base + ' ' + unit + ')';
}

// ==================== PRIZE ROLLING ====================
function rollPrize(eggType) {
  const w = { ...PRIZE_WEIGHTS[eggType] };
  const monkey = curMonkey();
  const prog = curProgress();

  // All owned equipment + unlocked monkey perks stack permanently
  if (hasBonus('lessEmpty'))    w.empty = Math.max(0, w.empty * 0.4);
  if (hasBonus('moreStars'))    w.star *= 1.15;
  if (hasBonus('moreFeathers')) w.feather *= 1.2;
  if (hasBonus('moreItems'))    w.item *= 1.1;
  if (hasBonus('starBoost'))    w.star *= 1.1;
  if (hasBonus('itemBoost'))    w.item *= 1.15;
  if (hasBonus('allfather'))  { w.star *= 1.1; w.feather *= 1.1; }

  // Achievement percentage bonuses
  const ab = getAchievementBonuses();
  if (ab.itemPct > 0) w.item *= (1 + ab.itemPct / 100);
  if (ab.starPct > 0) w.star *= (1 + ab.starPct / 100);

  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [type, weight] of Object.entries(w)) {
    r -= weight;
    if (r <= 0) return resolvePrize(type, eggType);
  }
  return resolvePrize('gold_s', eggType);
}

function resolvePrize(type, eggType) {
  const eDef = EGG_REGISTRY[eggType] || EGG_REGISTRY.normal;
  const featherMult = eDef.featherMult || 1;
  const goldMult = eDef.goldMult || 1;

  if (type === 'empty') return { type: 'empty', value: 0, label: 'Empty!', color: '#9ca3af' };

  if (type.startsWith('gold_')) {
    const range = GOLD_VALUES[type];
    const baseVal = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    let val = Math.round(baseVal * G.activeMult * goldMult);
    if (hasBonus('moreGold'))  val = Math.round(val * 1.2);
    if (hasBonus('goldBoost')) val = Math.round(val * 1.1);
    if (hasBonus('allfather')) val = Math.round(val * 1.1);
    const ab = getAchievementBonuses();
    if (ab.goldPct > 0) val = Math.round(val * (1 + ab.goldPct / 100));
    // Progressive gold: +2% per completed stage, capped at +30%
    if (G.stagesCompleted > 0) val = Math.round(val * (1 + Math.min(G.stagesCompleted * 0.02, 0.30)));
    if (G['owned_goldmagnet']) val = Math.round(val * 1.2);
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'gold', value: val, baseVal, usedMult, label: '+' + val + ' gold', color: '#d97706' };
  }

  if (type === 'feather') {
    const fRange = CONFIG.featherDropRange;
    const baseVal = Math.ceil((fRange[0] + Math.random() * (fRange[1] - fRange[0])) * featherMult);
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'feather', value: val, baseVal, usedMult, label: '+' + val + ' feather' + (val > 1 ? 's' : ''), color: '#059669' };
  }

  if (type === 'hammers') {
    const baseVal = HAMMER_PRIZES[Math.floor(Math.random() * HAMMER_PRIZES.length)];
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'hammers', value: val, baseVal, usedMult, label: '+' + val + ' hammers!', color: '#b45309' };
  }

  if (type === 'star') {
    const baseVal = eDef.starPieces || 1;
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'star', value: val, baseVal, usedMult, label: '+' + val + ' star piece' + (val > 1 ? 's' : ''), color: '#f59e0b' };
  }

  // For prize types not directly multiplied, give bonus gold when mult is active
  const bonusGold = G.activeMult > 1 ? Math.round(CONFIG.multBonusGoldBase * G.activeMult) : 0;
  const usedMultBonus = G.activeMult > 1 ? getSelectedMultValues() : null;

  if (type === 'mult') {
    let pool = MULT_VALUES;
    if (!hasBonus('unlock123')) pool = pool.filter(v => v !== 123);
    const val = pool[Math.floor(Math.random() * pool.length)];
    const count = G.activeMult > 1 ? G.activeMult : 1;
    const label = count > 1 ? count + '× x' + val + ' mult!' : 'x' + val + ' multiplier!';
    return { type: 'mult', value: val, count, bonusGold, usedMult: usedMultBonus, label, color: '#7c3aed' };
  }

  if (type === 'banana') {
    return { type: 'banana', value: 1, bonusGold, usedMult: usedMultBonus, label: '+1 Crystal Banana!', color: '#f59e0b' };
  }

  if (type === 'maxHammers') {
    return { type: 'maxHammers', value: 3, bonusGold, usedMult: usedMultBonus, label: '+3 max hammers!', color: '#b45309' };
  }

  if (type === 'item') {
    const result = rollCollectionItem(eggType);
    result.bonusGold = bonusGold;
    result.usedMult = usedMultBonus;
    result.goldMult = goldMult;   // passed through so duplicate gold scales with egg type
    return result;
  }

  return { type: 'empty', value: 0, label: 'Empty!', color: '#9ca3af' };
}

function rollCollectionItem(eggType) {
  const si = curActiveStage();
  const stage = curStage();
  const prog = curProgress();
  const items = stage.collection.items;
  const collected = prog.collections[si];

  const weights = items.map((item, i) => {
    const rarity = item[2]; // 1=common, 2=uncommon, 3=rare
    const rw = CONFIG.itemRarityWeights;
    let w = rarity === 1 ? rw.common : rarity === 2 ? rw.uncommon : rw.rare;
    if (G['owned_luckycharm'] && rarity >= 2) w *= 2;
    return w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      const item = items[i];
      const isNew = !collected[i];
      return {
        type: 'item', index: i, isNew,
        emoji: item[0], name: item[1], rarity: item[2], quote: item[3] || '',
        label: item[0] + ' ' + item[1] + (isNew ? ' (NEW!)' : ''),
        color: isNew ? '#b45309' : '#78716c',
      };
    }
  }
  // Fallback: give gold instead
  return { type: 'gold', value: 50, label: '+50 gold', color: '#d97706' };
}

// All owned hammers/hats/monkeys give permanent bonuses (accumulative)
// Cached — call invalidateBonusCache() when equipment or monkeys change
let _bonusCache = null;
let _achieveBonusCache = null;

function invalidateBonusCache() { _bonusCache = null; }
function invalidateAchieveCache() { _achieveBonusCache = null; }

function getAllBonuses() {
  if (_bonusCache) return _bonusCache;
  const bonuses = new Set();
  for (const id of G.ownedHammers) {
    const h = SHOP_HAMMERS.find(h => h.id === id);
    if (h && h.bonus) bonuses.add(h.bonus);
  }
  for (const id of G.ownedHats) {
    const h = SHOP_HATS.find(h => h.id === id);
    if (h && h.bonus) bonuses.add(h.bonus);
  }
  for (let i = 0; i < G.monkeys.length; i++) {
    if (G.monkeys[i].unlocked) {
      const perk = MONKEY_DATA[i].perk;
      if (perk && perk !== 'none') bonuses.add(perk);
    }
  }
  _bonusCache = bonuses;
  return bonuses;
}

function hasBonus(name) {
  return getAllBonuses().has(name);
}

const NO_HAMMER_MSGS = [
  'No hammers? How embarrassing.',
  'Use hammers much?',
  'No more hammers, boo-hoo.',
  'Hammers machine broke.',
  'Nice clicking. Shame about the hammers.',
  'That egg is laughing at you.',
  'The egg wins this round.',
  'Your hammer bag is empty, genius.',
  'Maybe try waiting? Just a thought.',
  'Broke. Literally.',
  'The monkey is disappointed.',
  'Hammer inventory: absolute zero.',
  'Tap harder, that\'ll help. (It won\'t.)',
  'Out of hammers. Out of luck.',
  'Have you tried buying some?',
  'Error 404: hammers not found.',
  'The eggs feel safe right now.',
  'All out. Go touch grass.',
  'Zero hammers. Infinite sadness.',
  'Patience is a virtue you don\'t have.',
];
let _shopNudgeDone = false;
function noHammerMsg() {
  if (!_shopNudgeDone) {
    _shopNudgeDone = true;
    // Pulse the Shop tab to guide the player
    const shopTab = document.querySelector('.nav-tab[data-tab="shop"]');
    if (shopTab) {
      shopTab.classList.add('shop-nudge');
      shopTab.addEventListener('animationend', () => shopTab.classList.remove('shop-nudge'), { once: true });
    }
    return 'Out of hammers — buy more in the Shop!';
  }
  return NO_HAMMER_MSGS[Math.floor(Math.random() * NO_HAMMER_MSGS.length)];
}

// ==================== BALLOON EGG ====================
let _balloonHold = null;
function startBalloonInflate(index, slot) {
  if (_balloonHold) return;
  const egg = G.roundEggs[index];
  if (!egg || egg.broken || egg.expired) return;
  if (G.hammers < 1) { G.hammersDepleted = (G.hammersDepleted || 0) + 1; msg(noHammerMsg(), 'noHammers'); SFX.play('err'); return; }

  let scale = 1;
  const maxScale = 1.8;
  const duration = 1500; // ms to full inflate
  const step = 16;
  const increment = (maxScale - 1) / (duration / step);
  slot.classList.add('inflating');

  _balloonHold = setInterval(() => {
    scale += increment;
    slot.style.transform = 'scale(' + Math.min(scale, maxScale) + ')';
    if (scale >= maxScale) {
      clearInterval(_balloonHold);
      _balloonHold = null;
      popBalloonEgg(index, slot);
    }
  }, step);
}

function cancelBalloonInflate(slot) {
  if (_balloonHold) {
    clearInterval(_balloonHold);
    _balloonHold = null;
  }
  if (slot) {
    slot.style.transform = '';
    slot.classList.remove('inflating');
  }
}

function popBalloonEgg(index, slot) {
  const egg = G.roundEggs[index];
  if (!egg || egg.broken) return;

  G.hammers -= 1;
  if (!regenInt && G.hammers < G.maxH) startRegen();

  egg.broken = true;
  egg.hp = 0;
  G.totalEggs++;
  G.balloonPopped = (G.balloonPopped || 0) + 1;

  if (egg.type !== 'normal') G[egg.type + 'Smashed'] = (G[egg.type + 'Smashed'] || 0) + 1;

  slot.classList.remove('inflating', 'balloon');
  slot.classList.add('broken');
  slot.style.transform = '';

  const rect = slot.getBoundingClientRect();
  const wrapRect = $id('egg-tray-wrap').getBoundingClientRect();
  const cx = rect.left - wrapRect.left + rect.width / 2;
  const cy = rect.top - wrapRect.top + rect.height / 2;

  SFX.play('starfall');
  Particles.emit(cx, cy, egg.type, 30);
  Particles.sparkle(cx, cy, 20, '#FFD700');
  shake(slot, 'md');

  // Roll prize — balloon gives 10x base, additive with any active chip mult
  const prize = rollPrize(egg.type);
  const canMultiply = ['gold','star','feather','hammers','banana','maxHammers'].includes(prize.type);
  const chipTotal = G.activeMult > 1 ? G.activeMult : 0;
  if (prize.type === 'mult') {
    // Balloon gives 10x the number of mult chips
    prize.count = (prize.count || 1) * 10;
    prize.label = prize.count + '× x' + prize.value + ' mult!';
  } else if (canMultiply) {
    if (chipTotal > 0) {
      // Additive: balloon(10) + chips, not 10 × chips
      prize.value = Math.round(prize.value * (10 + chipTotal) / chipTotal);
      prize.balloonMult = 10 + chipTotal;
      prize.usedMult = null; // baked into balloonMult total for display
    } else {
      if (prize.value) prize.value *= 10;
      prize.balloonMult = 10;
    }
    // Update label for prize types that use it directly (banana, maxHammers)
    if (prize.type === 'banana')     prize.label = '+' + prize.value + ' Crystal Banana' + (prize.value !== 1 ? 's' : '') + '!';
    if (prize.type === 'maxHammers') prize.label = '+' + prize.value + ' max hammers!';
  }
  prize.popPrefix = '🎈 POP! ';

  slot.innerHTML = makeEggSVG(egg.type, egg.maxHp) + eggLabel(egg.type, 0, egg.maxHp, true);

  setTimeout(() => {
    // Hexed eggs: only the curse fires, no prize reward
    if (egg.effects && egg.effects.includes('hex')) {
      applyHex(cx, cy);
    } else {
      applyPrize(prize, cx, cy);
    }
    if (G.activeMult > 1) { consumeMultiplier(); }
    renderMultQueue();
    updateStarBtn();

    if (G.roundEggs.every(e => e.broken || e.expired) && !_roundPending) {
      _roundPending = true;
      G.roundClears++;
      checkAchievements();
      setTimeout(() => newRound(), 600);
    }
    updateResources();
    updateStageBar();
    saveGame();
  }, 200);
}

// ==================== SMASH EGG ====================
function smashEgg(index) {
  if (!G.roundEggs || G.roundEggs[index].broken || G.roundEggs[index].expired) return;
  const egg = G.roundEggs[index];
  if (egg.effects && egg.effects.includes('balloon')) return; // balloon eggs use long-press
  if (egg._smashing) return;
  egg._smashing = true;

  // Each hit costs 1 hammer
  if (G.hammers < 1) {
    G.hammersDepleted = (G.hammersDepleted || 0) + 1;
    egg._smashing = false;
    msg(noHammerMsg(), 'noHammers');
    SFX.play('err');
    return;
  }

  // Animate IMMEDIATELY before any logic
  const slots = $id('egg-tray').children;
  const slot = slots[index];
  SFX.play('hit');
  shake(slot, egg.hp <= 1 ? 'md' : 'sm');

  const hammerEl = $id('hammer');
  const rect = slot.getBoundingClientRect();
  const wrapRect = $id('egg-tray-wrap').getBoundingClientRect();
  const cx = rect.left - wrapRect.left + rect.width / 2;
  const cy = rect.top - wrapRect.top + rect.height / 2;

  // Position hammer at egg and animate
  if (!_isDesktop) {
    clearTimeout(hammerEl._hideTimer);
    hammerEl.style.transition = 'none';
    hammerEl.style.left = (cx - 20) + 'px';
    hammerEl.style.top = (cy - 10) + 'px';
    hammerEl.style.opacity = '1';
  }
  hammerEl.classList.remove('hammer-anim');
  void hammerEl.offsetWidth;
  hammerEl.classList.add('hammer-anim');
  if (!_isDesktop) {
    hammerEl._hideTimer = setTimeout(() => {
      hammerEl.style.opacity = '0';
      hammerEl.style.transition = '';
    }, 300);
  }

  // Now do logic
  G.hammers -= 1;

  if (hasBonus('freeEgg') && Math.random() < 0.03) {
    G.hammers = Math.min(G.maxH, G.hammers + 1);
    msg('Free hit! (Chef\'s Hat)', 'specials');
  }

  if (!regenInt && G.hammers < G.maxH) startRegen();

  egg.hp -= 1;

  // Cucumber double hit: 5% chance for a bonus hit
  if (hasBonus('doubleHit') && Math.random() < 0.05 && egg.hp > 0) {
    egg.hp -= 1;
    msg('Cucumbah!', 'specials');
  }

  // Mjǫllnir: 3% chance to call a free Starfall
  if (hasBonus('mjolnirStarfall') && Math.random() < 0.03 && !_starfallActive &&
      G.roundEggs && G.roundEggs.some(e => !e.broken && !e.expired)) {
    setTimeout(() => _doStarfall('⚡ Mjǫllnir calls the storm!', 'specials'), 350);
  }

  const particleCount = 4 + (egg.maxHp - egg.hp) * 3;
  Particles.emit(cx, cy, egg.type, particleCount);

  if (egg.hp > 0) {
    // Timer eggs: stop countdown after first hit (keep in effects for 3x prize at break)
    if (egg.effects && egg.effects.includes('timer')) {
      egg._timerStopped = true;
      slot.classList.remove('timed');
    }
    // Century egg: +10 gold on every hit before the final break
    if (egg.type === 'century') {
      G.gold += 10;
      G.totalGold += 10;
      const rect = slot.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      spawnFloat($id('egg-tray-wrap'), '+10 💰', '#d97706', '', cx, cy);
      SFX.play('coin');
    }
    const damage = egg.maxHp - egg.hp;
    slot.innerHTML = makeEggSVG(egg.type, damage) +
      eggLabel(egg.type, egg.hp, egg.maxHp, false) +
      (egg.effects && egg.effects.includes('timer') ? '<span class="egg-timer">' + formatTimer(egg.timer) + '</span>' : '');
    setTimeout(() => { egg._smashing = false; }, 300);
    updateResources();
    saveGame();
    return;
  }

  // === Egg broken! ===
  egg.broken = true;
  G.totalEggs++;
  if (egg.effects && egg.effects.includes('runny')) G.runnySmashed = (G.runnySmashed || 0) + 1;
  if (egg.effects && egg.effects.includes('timer')) {
    G.timerSmashed = (G.timerSmashed || 0) + 1;
    if (egg.timer > 0 && egg.timer < 0.1) G.timerCloseCall = (G.timerCloseCall || 0) + 1;
  }
  if (egg.effects && egg.effects.includes('runny') && egg.effects.includes('timer')) G.comboSmashed = (G.comboSmashed || 0) + 1;

  // Track egg type smashes
  if (egg.type !== 'normal') {
    G[egg.type + 'Smashed'] = (G[egg.type + 'Smashed'] || 0) + 1;
  }

  // Roll prize (century egg uses fixed multi-reward, not random roll)
  const prize = egg.type !== 'century' ? rollPrize(egg.type) : null;

  // Effect eggs get bonus rewards
  const fx = egg.effects || [];
  if (fx.includes('runny') || fx.includes('timer')) {
    const chipTotal = G.activeMult > 1 ? G.activeMult : 0;
    if (prize.type === 'mult') {
      // Multiply count, not face value — value must stay a valid MULT_BADGE_VALUES entry
      prize.count = (prize.count || 1) * 3;
      prize.label = 'x3 ' + prize.label;
    } else if (chipTotal > 0) {
      // Additive: egg bonus(3) + chips instead of 3 × chips
      if (prize.value) prize.value = Math.round(prize.value * (3 + chipTotal) / chipTotal);
      prize.usedMult = null; // suppress chips equation; combined value shown in label
      const v = prize.value;
      if (prize.type === 'gold')    prize.label = 'x3 +' + v + ' gold';
      else if (prize.type === 'feather') prize.label = 'x3 +' + v + (v !== 1 ? ' feathers' : ' feather');
      else if (prize.type === 'hammers') prize.label = 'x3 +' + v + ' hammers!';
      else if (prize.type === 'star')    prize.label = 'x3 +' + v + ' star piece' + (v !== 1 ? 's' : '');
      else prize.label = 'x3 ' + prize.label;
    } else {
      if (prize.value) prize.value *= 3;
      if (prize.baseVal) prize.baseVal *= 3;
      prize.label = 'x3 ' + prize.label;
    }
  }

  // Apply prize after short delay
  setTimeout(() => {
    // Hexed eggs: only the curse fires, no prize reward
    if (egg.effects && egg.effects.includes('hex')) {
      applyHex(cx, cy);
    } else if (egg.type === 'century') {
      // Fixed rewards: 10k gold + 50 feathers + 50 star pieces (all × active mult), + 25% item
      const mult = G.activeMult > 1 ? G.activeMult : 1;
      // Gold with equipment bonuses
      let gVal = 10000 * mult;
      if (hasBonus('moreGold'))  gVal = Math.round(gVal * 1.2);
      if (hasBonus('goldBoost')) gVal = Math.round(gVal * 1.1);
      if (hasBonus('allfather')) gVal = Math.round(gVal * 1.1);
      const _ab = getAchievementBonuses();
      if (_ab.goldPct > 0) gVal = Math.round(gVal * (1 + _ab.goldPct / 100));
      if (G.stagesCompleted > 0) gVal = Math.round(gVal * (1 + Math.min(G.stagesCompleted * 0.02, 0.30)));
      if (G['owned_goldmagnet']) gVal = Math.round(gVal * 1.2);
      applyPrize({ type: 'gold',    value: gVal,     label: '🌀 Century! +' + gVal + ' gold',    color: '#d97706' }, cx, cy);
      const fVal = Math.round(50 * mult);
      applyPrize({ type: 'feather', value: fVal,     label: '🌀 +' + fVal + ' feathers!',        color: '#059669' }, cx, cy);
      const sVal = Math.round(50 * mult);
      applyPrize({ type: 'star',    value: sVal,     label: '🌀 +' + sVal + ' star pieces!',     color: '#f59e0b' }, cx, cy);
      if (Math.random() < 0.25) applyPrize(resolvePrize('item', 'century'), cx, cy);
    } else {
      applyPrize(prize, cx, cy);
    }

    // Update egg visual to fully broken
    slot.classList.add('broken');
    slot.innerHTML = makeEggSVG(egg.type, egg.maxHp) +
      eggLabel(egg.type, 0, egg.maxHp, true);

    // Check if all eggs broken — auto-spawn next round
    if (G.roundEggs.every(e => e.broken || e.expired) && !_roundPending) {
      _roundPending = true;
      G.roundClears++;
      checkAchievements();
      setTimeout(() => newRound(), 600);
    }

    // Consume the active multiplier after use
    if (G.activeMult > 1) {
      consumeMultiplier();
      renderMultQueue();
    }

    updateResources();
    updateStageBar();
    saveGame();
  }, 250);
}

function applyPrize(prize, cx, cy) {
  const zone = $id('prize-zone');

  if (prize.type === 'empty') {
    const emptyCount = G.activeMult > 1 ? G.activeMult : 1;
    G.totalEmpties = (G.totalEmpties || 0) + emptyCount;
    if (emptyCount > 1) {
      spawnFloat(zone, emptyCount + ' empties!', '#9ca3af', '', cx, cy);
      msg(emptyCount + ' empties!', 'empty');
    } else {
      spawnFloat(zone, 'Empty!', '#9ca3af', '', cx, cy);
      msg('Empty', 'empty');
    }
    SFX.play('empty');
    checkAchievements();
    return;
  }

  if (prize.type === 'gold') {
    G.gold += prize.value;
    G.totalGold += prize.value;
    G.biggestWin = Math.max(G.biggestWin, prize.value);
    const cls = prize.value >= 500 ? 'mega' : prize.value >= 200 ? 'big' : '';
    if (prize.balloonMult || prize.usedMult) {
      // Compute displayBase so equation is always correct: totalMult × displayBase = prize.value
      const _chipTot = prize.usedMult ? prize.usedMult.reduce((a, b) => a + b, 0) : 1;
      const _totMult = _chipTot * (prize.balloonMult || 1);
      const displayBase = Math.round(prize.value / _totMult);
      const eq = multEquation(displayBase, prize.usedMult, prize.value, 'gold', prize.balloonMult, prize.popPrefix);
      spawnFloat(zone, eq, '#d97706', cls || 'big', cx, cy);
      msg(eq, 'prizes');
    } else {
      spawnFloat(zone, prize.label, '#d97706', cls, cx, cy);
      msg(prize.label, 'prizes');
    }
    SFX.play('coin');
    if (prize.value >= 200) Particles.sparkle(cx, cy, 12, '#FFD700');
  }

  if (prize.type === 'star') {
    G.starPieces += prize.value;
    G.totalStarPieces += prize.value;
    if (prize.balloonMult || prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'stars', prize.balloonMult, prize.popPrefix);
      spawnFloat(zone, eq, '#f59e0b', 'big', cx, cy);
      msg(eq, 'prizes');
    } else {
      spawnFloat(zone, prize.label, '#f59e0b', 'big', cx, cy);
      msg(prize.label, 'prizes');
    }
    SFX.play('star');
    Particles.sparkle(cx, cy, 10, '#FCD34D');
    updateStarBtn();
  }

  if (prize.type === 'mult') {
    const multCount = prize.count || 1;
    let added = 0;
    for (let i = 0; i < multCount && G.multQueue.length < 50; i++) { G.multQueue.push(prize.value); added++; G.multDropped = (G.multDropped || 0) + 1; }
    G.highestMult = Math.max(G.highestMult, prize.value);
    const displayLabel = (prize.popPrefix || '') + (added > 1 ? added + '× x' + prize.value + ' mult!' : 'x' + prize.value + ' multiplier!');
    spawnFloat(zone, displayLabel, '#7c3aed', 'big', cx, cy);
    msg(displayLabel, 'prizes');
    SFX.play('gem');
    renderMultQueue();
    if (prize.bonusGold) {
      G.gold += prize.bonusGold;
      G.totalGold += prize.bonusGold;
      spawnFloat(zone, '+' + prize.bonusGold + ' gold (mult bonus)', '#d97706', '', cx, cy - 20);
    }
  }

  if (prize.type === 'feather') {
    G.feathers += prize.value;
    G.totalFeathers += prize.value;
    if (prize.balloonMult || prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'feathers', prize.balloonMult, prize.popPrefix);
      spawnFloat(zone, eq, '#059669', 'big', cx, cy);
      msg(eq, 'prizes');
    } else {
      spawnFloat(zone, prize.label, '#059669', '', cx, cy);
      msg(prize.label, 'prizes');
    }
    SFX.play('coin');
  }

  if (prize.type === 'hammers') {
    G.hammers += prize.value;
    if (prize.balloonMult || prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'hammers', prize.balloonMult, prize.popPrefix);
      spawnFloat(zone, eq, '#b45309', 'big', cx, cy);
      msg(eq, 'prizes');
    } else {
      spawnFloat(zone, prize.label, '#b45309', 'big', cx, cy);
      msg(prize.label, 'prizes');
    }
    SFX.play('coin');
  }

  if (prize.type === 'banana') {
    G.crystalBananas += prize.value;
    const bananaLabel = (prize.popPrefix || '') + prize.label;
    spawnFloat(zone, bananaLabel, prize.color, 'mega', cx, cy);
    msg(bananaLabel, 'prizes');
    SFX.play('levelup');
    Particles.sparkle(cx, cy, 20, '#F59E0B');
    if (prize.bonusGold) {
      G.gold += prize.bonusGold; G.totalGold += prize.bonusGold;
      spawnFloat(zone, '+' + prize.bonusGold + ' gold (mult bonus)', '#d97706', '', cx, cy - 20);
    }
  }

  if (prize.type === 'maxHammers') {
    G.maxH += prize.value;
    const mhLabel = (prize.popPrefix || '') + prize.label;
    spawnFloat(zone, mhLabel, prize.color, 'mega', cx, cy);
    msg(mhLabel, 'prizes');
    SFX.play('levelup');
    Particles.sparkle(cx, cy, 20, '#b45309');
    if (prize.bonusGold) {
      G.gold += prize.bonusGold; G.totalGold += prize.bonusGold;
      spawnFloat(zone, '+' + prize.bonusGold + ' gold (mult bonus)', '#d97706', '', cx, cy - 20);
    }
  }

  if (prize.type === 'item') {
    const prog = curProgress();
    const si = curActiveStage();
    const wasNew = prize.isNew;
    if (wasNew) {
      prog.collections[si][prize.index] = true;
      G.totalItems++;
    }
    spawnFloat(zone, prize.label, prize.color, wasNew ? 'big' : '', cx, cy);
    if (wasNew) {
      SFX.play('item');
      Particles.sparkle(cx, cy, 15, '#F59E0B');
      // Show popup for new item
      msg('New item collected: ' + prize.emoji + ' ' + prize.name, 'items');
      setTimeout(() => showItemToast(prize), 400);
      // Check collection completion
      checkCollectionComplete();
    } else {
      // Duplicate - give gold scaled by rarity × egg goldMult (ruby=3x, black=4x, century=100x)
      const dRange = (CONFIG.duplicateGoldByRarity || {})[prize.rarity] || [20, 60];
      const dupeGold = Math.round((dRange[0] + Math.floor(Math.random() * (dRange[1] - dRange[0] + 1))) * (prize.goldMult || 1));
      G.gold += dupeGold;
      G.totalGold += dupeGold;
      msg('Duplicate! +' + dupeGold + ' gold', 'duplicates');
      SFX.play('coin');
    }
    if (prize.bonusGold) {
      G.gold += prize.bonusGold;
      G.totalGold += prize.bonusGold;
      spawnFloat(zone, '+' + prize.bonusGold + ' gold (mult bonus)', '#d97706');
    }
  }

  checkAchievements();
}

// ==================== STARFALL ====================
function starfallCost() {
  return G['owned_starsaver'] ? CONFIG.starPiecesForStarfall - 1 : CONFIG.starPiecesForStarfall;
}

function isStarfallUnlocked() {
  return G.monkeys && G.monkeys[0] && G.monkeys[0].tiers && G.monkeys[0].tiers[0] >= 3;
}

// ==================== HEX EFFECT ====================
const HEX_TYPES = [
  { id: 'loseGold',     apply: () => { const lost = Math.max(1, Math.ceil(G.gold * 0.01)); G.gold = Math.max(0, G.gold - lost); return '😈 -' + lost + ' gold'; } },
  { id: 'loseFeathers', apply: () => { const lost = Math.max(1, Math.ceil(G.feathers * 0.01)); G.feathers = Math.max(0, G.feathers - lost); return '😈 -' + lost + ' feathers'; } },
  { id: 'loseHammers',  apply: () => { const lost = Math.max(1, Math.ceil(G.hammers * 0.01)); G.hammers = Math.max(0, G.hammers - lost); return '😈 -' + lost + ' hammers'; } },
  { id: 'regenPause',   apply: () => { pauseRegen(30); return '😈 Regen paused 30s'; } },
];

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
  const hex = HEX_TYPES[Math.floor(Math.random() * HEX_TYPES.length)];
  const text = hex.apply();
  G.hexesHit = (G.hexesHit || 0) + 1;
  spawnFloat(zone, text, '#ff4444', 'big', cx, cy - 30);
  msg(text, 'prizes');
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

  // Break all unbroken eggs in sequence — century eggs are immune
  const unbroken = [];
  G.roundEggs.forEach((e, i) => { if (!e.broken && !e.expired && e.type !== 'century') unbroken.push(i); });

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
        slot.innerHTML = makeEggSVG(egg.type, egg.maxHp) + '<span class="egg-label">' + egg.type + '</span>';
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

    G.roundClears++;
    checkAchievements();
    updateStarBtn();
    updateResources();
    setTimeout(() => newRound(), 600);
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

    if (newTier === 1) {
      // Bronze → Silver (no reward, just milestone)
      msg('⬆️ Silver Tier! ' + stage.name, 'tiers');

    } else if (newTier === 2) {
      // Silver → Gold: unlock next stage
      const reward = CONFIG.tierRewards.gold;
      G.maxH += reward.maxHammers;
      G.hammers = Math.min(G.maxH, G.hammers + reward.hammerRefill);
      G.tierHammerRefills = (G.tierHammerRefills || 0) + reward.hammerRefill;
      // Unlock next stage if this is the highest
      if (si >= prog.stage && si < curMonkey().stages.length - 1) {
        prog.stage = si + 1;
      }
      const nextName = si < curMonkey().stages.length - 1
        ? curMonkey().stages[si + 1].name : null;
      msg('🥇 Gold Tier! ' + stage.name + (nextName ? ' — ' + nextName + ' unlocked' : ''), 'tiers');

    } else if (newTier >= 3) {
      // Gold → Complete: banana reward
      track('stage-complete', { monkey: curMonkey().name, stage: stage.name });
      G.stagesCompleted++;
      G.crystalBananas += CONFIG.crystalBananasPerStage;
      // Also unlock next stage if not already
      if (si >= prog.stage && si < curMonkey().stages.length - 1) {
        prog.stage = si + 1;
      }
      msg('✅ Complete! ' + stage.name + ' +' + CONFIG.crystalBananasPerStage + ' 🍌', 'tiers');
      // Check if ALL stages are complete
      if (prog.tiers.every(t => t >= 3)) {
        prog.completed = true;
        SFX.play('complete');
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

function showStagePopup(title, detail) {
  $id('pop-stage-title').textContent = title;
  $id('pop-stage-detail').textContent = detail;
  $id('overlay-stage').classList.remove('hidden');
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
function startRegen() {
  // Only regen when below max — overflow hammers are preserved
  if (G.hammers >= G.maxH) { clearInterval(regenInt); regenInt = null; return; }
  G.regenCD = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
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
  prog.activeStage = stageIdx;
  G.roundEggs = null;
  newRound();
  updateStageBar();
  saveGame();
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
    showAlert('⚡', req.hint || 'A special item is required to unlock this warrior.');
    SFX.play('err');
    return;
  }
  if (G.crystalBananas < MONKEY_DATA[index].cost) {
    showAlert('🍌', 'Need ' + MONKEY_DATA[index].cost + ' Crystal Bananas! (have ' + G.crystalBananas + ')');
    SFX.play('err');
    return;
  }
  G.crystalBananas -= MONKEY_DATA[index].cost;
  G.monkeys[index].unlocked = true;
  invalidateBonusCache();
  track('monkey-unlock', { monkey: MONKEY_DATA[index].name });
  SFX.play('levelup');
  msg(MONKEY_DATA[index].name + ' unlocked!', 'discovery');
  checkAchievements();
  renderMonkeys();
  updateResources();
  saveGame();
}

// ==================== SHOP ====================
function toggleAutoBuy() {
  G.autoBuy = !G.autoBuy;
  const btn = $id('auto-buy-btn');
  btn.textContent = G.autoBuy ? 'ON' : 'OFF';
  btn.classList.toggle('on', G.autoBuy);
  saveGame();
}


let _snackTimeout = null;
function showMultInfo() {
  showConfirm('✖️', 'How Multipliers Work',
    'Tap a chip to select it. Selected mults ADD together — x2 + x3 = x5. Applies to gold, stars, feathers and hammers.\n\nDoes NOT apply to: starfall, hexed eggs, or collection items (those give bonus gold instead).\n\nTip: save big mults for gold or crystal eggs!',
    null, 'Got it'
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
    '🥚 Egg Breaker Adventures — Lifetime Stats',
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
  if (noBtn) noBtn.textContent = 'OK';
}

function showConfirm(icon, title, detail, onYes, yesText) {
  const yesBtn = $id('confirm-yes');
  const noBtn  = $id('overlay-confirm').querySelector('.confirm-no');
  $id('confirm-icon').textContent  = icon;
  $id('confirm-title').textContent = title;
  $id('confirm-detail').textContent = detail;
  if (onYes) {
    yesBtn.style.display = '';
    yesBtn.textContent   = yesText || 'Buy';
    yesBtn.onclick       = function() { closeOverlay('overlay-confirm'); onYes(); };
    if (noBtn) noBtn.textContent = 'Cancel';
  } else {
    yesBtn.style.display = 'none';
    if (noBtn) noBtn.textContent = yesText || 'Got it';
  }
  $id('overlay-confirm').classList.remove('hidden');
}
function cancelConfirm() { closeOverlay('overlay-confirm'); }

function buyShopItem(category, id) {
  // Confirmation for non-consumable items when auto-buy is off
  const isConsumable = category === 'supply' && !SHOP_SUPPLIES.find(s => s.id === id)?.unique;
  if (!G.autoBuy && !isConsumable) {
    const item = category === 'hammer' ? SHOP_HAMMERS.find(h => h.id === id)
              : category === 'hat' ? SHOP_HATS.find(h => h.id === id)
              : SHOP_SUPPLIES.find(s => s.id === id);
    if (item && item.cost > 0) {
      const alreadyOwned = (category === 'hammer' && G.ownedHammers.includes(id))
                        || (category === 'hat' && G.ownedHats.includes(id))
                        || (category === 'supply' && item.unique && (id === 'fastregen' ? G.fastRegen : G['owned_' + id]));
      if (!alreadyOwned && G.gold >= item.cost) {
        showConfirm(item.emoji || '🛒', 'Buy ' + item.name + '?', formatNum(item.cost) + ' gold', function() {
          doBuyShopItem(category, id);
        });
        return;
      }
    }
  }
  doBuyShopItem(category, id);
}

function doBuyShopItem(category, id) {
  if (category === 'hammer') {
    const item = SHOP_HAMMERS.find(h => h.id === id);
    if (!item || item.cost === 0) return;
    if (G.ownedHammers.includes(id)) {
      // Toggle cursor appearance (bonus is always active regardless)
      G.hammer = G.hammer === id ? 'default' : id;
      SFX.play('buy');
      updateHammerSVG();
      renderShop();
      saveGame();
      return;
    }
    if (G.gold < item.cost) { showAlert('🪙', 'Need ' + formatNum(item.cost) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.ownedHammers.push(id);
    invalidateBonusCache();
    G.hammer = id;
    G.purchases = (G.purchases || 0) + 1;
    track('shop-purchase', { item: item.name, category: 'hammer' });
    SFX.play('buy');
    updateHammerSVG();
    showShopSnack(item.name + ' purchased!');
  }

  if (category === 'hat') {
    const item = SHOP_HATS.find(h => h.id === id);
    if (!item || item.cost === 0) return;
    if (G.ownedHats.includes(id)) {
      if (G.hat === id) { G.hat = 'none'; invalidateBonusCache(); renderAll(); saveGame(); showShopSnack(item.name + ' removed!'); return; }
      G.hat = id;
      invalidateBonusCache();
      renderAll();
      saveGame();
      showShopSnack(item.name + ' equipped!');
      return;
    }
    if (G.gold < item.cost) { showAlert('🪙', 'Need ' + formatNum(item.cost) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.ownedHats.push(id);
    invalidateBonusCache();
    G.hat = id;
    G.purchases = (G.purchases || 0) + 1;
    track('shop-purchase', { item: item.name, category: 'hat' });
    SFX.play('buy');
    showShopSnack(item.name + ' purchased!');
    checkAchievements();
    updateResources();
    renderAll(); renderPremiumShop(); saveGame();
    const hatCard = [...$id('shop-hats').children].find(c => c.dataset && c.dataset.id === id);
    if (hatCard) hatCard.classList.add('just-bought');
    return;
  }

  if (category === 'supply') {
    const item = SHOP_SUPPLIES.find(s => s.id === id);
    if (!item) return;
    if (id === 'fastregen' && G.fastRegen) { showShopSnack('Already purchased!'); return; }
    if (item.unique && id !== 'fastregen' && G['owned_' + id]) { showShopSnack('Already purchased!'); return; }
    // Block purchases that have no room
    if ((id === 'hammers5' || id === 'hammers20') && G.hammers >= G.maxH) { showShopSnack('Hammers already full!'); SFX.play('err'); return; }
    if (G.gold < item.cost) { showAlert('🪙', 'Need ' + formatNum(item.cost) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.purchases = (G.purchases || 0) + 1;
    track('shop-purchase', { item: item.name, category: item.type });

    if (id === 'hammers5') { G.hammers = Math.min(G.maxH, G.hammers + 5); G.shopHammers5 = (G.shopHammers5 || 0) + 1; showShopSnack('+5 hammers purchased!'); }
    if (id === 'hammers20') { G.hammers = Math.min(G.maxH, G.hammers + 20); G.shopHammers20 = (G.shopHammers20 || 0) + 1; showShopSnack('+20 hammers purchased!'); }
    if (id === 'star1') { G.starPieces++; G.totalStarPieces++; updateStarBtn(); showShopSnack('+1 star piece purchased!'); }
    if (id === 'mult5') { if (G.multQueue.length < 50) { G.multQueue.push(5); G.shopMult5 = (G.shopMult5 || 0) + 1; } renderMultQueue(); showShopSnack('x5 multiplier purchased!'); }
    if (id === 'maxhammers') { G.maxH += 5; showShopSnack('+5 max hammers!'); }
    if (id === 'fastregen') { G.fastRegen = true; showShopSnack('Fast Regen unlocked!'); }
    if (id === 'spyglass') { G['owned_spyglass'] = true; renderEggTray(); showShopSnack('Spyglass unlocked!'); }

    SFX.play('buy');
  }

  checkAchievements();
  updateResources();
  // Re-render immediately (no delay), then flash the fresh card
  renderShop(); renderPremiumShop(); saveGame();
  const grids = category === 'supply'
    ? [...$id('shop-consumables').children, ...$id('shop-upgrades').children]
    : [...$id('shop-' + (category === 'hammer' ? 'hammers' : 'hats')).children];
  for (const c of grids) {
    if (c.dataset && c.dataset.id === id) {
      c.classList.add('just-bought');
      break;
    }
  }
}

// ==================== ACHIEVEMENTS ====================
let toastTimeout = null;

function grantAchievementReward(a) {
  if (!a.reward) return;
  const r = a.reward;
  if (r.type === 'maxH')       { G.maxH += r.val; G.hammers = Math.min(G.maxH, G.hammers + r.val); }
  if (r.type === 'gold')       { G.gold += r.val; G.totalGold += r.val; }
  if (r.type === 'feathers')   { G.feathers += r.val; G.totalFeathers += r.val; }
  if (r.type === 'starPieces') { G.starPieces += r.val; G.totalStarPieces += r.val; }
  // goldPct, itemPct, starPct are passive — applied in getAchievementBonuses()
}

// Sum all percentage bonuses from unlocked achievements (cached)
function getAchievementBonuses() {
  if (_achieveBonusCache) return _achieveBonusCache;
  let goldPct = 0, itemPct = 0, starPct = 0;
  for (const id of G.achieved) {
    const a = ACHIEVEMENT_DATA.find(a => a.id === id);
    if (!a || !a.reward) continue;
    if (a.reward.type === 'goldPct') goldPct += a.reward.val;
    if (a.reward.type === 'itemPct') itemPct += a.reward.val;
    if (a.reward.type === 'starPct') starPct += a.reward.val;
  }
  _achieveBonusCache = { goldPct, itemPct, starPct };
  return _achieveBonusCache;
}

function checkAchievements() {
  const checks = {
    // Eggs smashed
    first_smash:  () => G.totalEggs >= 1,
    smash_50:     () => G.totalEggs >= 50,
    smash_200:    () => G.totalEggs >= 200,
    smash_1000:   () => G.totalEggs >= 1000,
    smash_5000:   () => G.totalEggs >= 5000,
    smash_10000:  () => G.totalEggs >= 10000,
    // Gold earned
    gold_1000:    () => G.totalGold >= 1000,
    gold_50000:   () => G.totalGold >= 50000,
    gold_500000:  () => G.totalGold >= 500000,
    gold_2000000: () => G.totalGold >= 2000000,
    // Star pieces
    stars_10:     () => G.totalStarPieces >= 10,
    stars_50:     () => G.totalStarPieces >= 50,
    stars_200:    () => G.totalStarPieces >= 200,
    // Starfall
    starfall_1:   () => G.starfallsUsed >= 1,
    starfall_10:  () => G.starfallsUsed >= 10,
    starfall_50:  () => G.starfallsUsed >= 50,
    // Collections
    coll_1:       () => G.collectionsCompleted >= 1,
    coll_5:       () => G.collectionsCompleted >= 5,
    coll_15:      () => G.collectionsCompleted >= 15,
    coll_30:      () => G.collectionsCompleted >= 30,
    // Items found
    items_10:     () => G.totalItems >= 10,
    items_50:     () => G.totalItems >= 50,
    items_100:    () => G.totalItems >= 100,
    items_200:    () => G.totalItems >= 200,
    // Stages
    stage_1:      () => G.stagesCompleted >= 1,
    stage_9:      () => G.stagesCompleted >= 9,
    stage_18:     () => G.stagesCompleted >= 18,
    stage_36:     () => G.stagesCompleted >= 36,
    // Monkeys
    monkey_2:     () => G.monkeys.filter(m => m.unlocked).length >= 2,
    monkey_all:   () => G.monkeys.every(m => m.unlocked),
    // Feathers
    feathers_50:  () => G.totalFeathers >= 50,
    feathers_500: () => G.totalFeathers >= 500,
    feather_buy:  () => (G.feathersBought || 0) >= 1,
    feather_buy10:() => (G.feathersBought || 0) >= 10,
    // Multipliers
    mult_found:   () => G.highestMult >= 2,
    mult_50:      () => G.highestMult >= 50,
    mult_123:     () => G.highestMult >= 123,
    mult_stack:   () => (G._lastMultCount || 0) >= 3,
    mult_big:     () => (G.maxMultUsed || 0) >= 20,
    // Silver & Gold eggs
    silver_10:    () => (G.silverSmashed || 0) >= 10,
    silver_100:   () => (G.silverSmashed || 0) >= 100,
    gold_egg_10:  () => (G.goldSmashed || 0) >= 10,
    gold_egg_50:  () => (G.goldSmashed || 0) >= 50,
    crystal_1:    () => (G.crystalSmashed || 0) >= 1,
    crystal_25:   () => (G.crystalSmashed || 0) >= 25,
    ruby_1:       () => (G.rubySmashed || 0) >= 1,
    ruby_25:      () => (G.rubySmashed || 0) >= 25,
    black_1:      () => (G.blackSmashed || 0) >= 1,
    black_10:     () => (G.blackSmashed || 0) >= 10,
    // Daily login
    streak_5:     () => G.consecutiveDays >= 5,
    streak_20:    () => G.consecutiveDays >= 20,
    daily_10:     () => (G.totalDailyClaims || 0) >= 10,
    daily_100:    () => (G.totalDailyClaims || 0) >= 100,
    // Shopping
    buy_hammer:   () => G.ownedHammers.length > 1,
    buy_hat:      () => G.ownedHats.length > 1,
    buy_all_h:    () => G.ownedHammers.length >= SHOP_HAMMERS.length,
    buy_all_hat:  () => G.ownedHats.length >= SHOP_HATS.length,
    shop_10:      () => (G.purchases || 0) >= 10,
    // Rounds
    round_clear:  () => G.roundClears >= 1,
    round_50:     () => G.roundClears >= 50,
    round_500:    () => G.roundClears >= 500,
    // Biggest win
    bigwin_500:   () => G.biggestWin >= 500,
    bigwin_5000:  () => G.biggestWin >= 5000,
    bigwin_50000: () => G.biggestWin >= 50000,
    // Hammer overflow
    overflow:     () => G.hammers > G.maxH,
    // Empties
    empty_10:     () => (G.totalEmpties || 0) >= 10,
    empty_50:     () => (G.totalEmpties || 0) >= 50,
    empty_200:    () => (G.totalEmpties || 0) >= 200,
    empty_500:    () => (G.totalEmpties || 0) >= 500,
    empty_1000:   () => (G.totalEmpties || 0) >= 1000,
    // Egg effects
    runny_1:      () => (G.runnySmashed || 0) >= 1,
    runny_25:     () => (G.runnySmashed || 0) >= 25,
    runny_100:    () => (G.runnySmashed || 0) >= 100,
    timer_1:      () => (G.timerSmashed || 0) >= 1,
    timer_25:     () => (G.timerSmashed || 0) >= 25,
    timer_100:    () => (G.timerSmashed || 0) >= 100,
    timer_close:  () => (G.timerCloseCall || 0) >= 1,
    missed_1:     () => (G.timerMissed || 0) >= 1,
    missed_10:    () => (G.timerMissed || 0) >= 10,
    combo_effect: () => (G.comboSmashed || 0) >= 1,
    century_1:    () => (G.centurySmashed || 0) >= 1,
    hex_1:        () => (G.hexesHit || 0) >= 1,
    hex_10:       () => (G.hexesHit || 0) >= 10,
    hex_50:       () => (G.hexesHit || 0) >= 50,
    balloon_1:    () => (G.balloonPopped || 0) >= 1,
    balloon_10:   () => (G.balloonPopped || 0) >= 10,
    balloon_50:   () => (G.balloonPopped || 0) >= 50,
    // Premium
    premium_first:     () => (G.premiumPurchases || 0) >= 1,
    premium_starter:   () => !!G.premium_starter_pack,
    premium_supporter: () => (G.premiumPurchases || 0) >= 3,
    // Secrets
    secret_flip:     () => G._secretFlip,
    secret_omelette: () => G._secretOmelette,
    secret_42:       () => G._secret42,
    secret_ouch:     () => G._secretOuch,
    secret_chicken:  () => G._secretChicken,
    secret_midnight: () => G._secretMidnight,
    secret_leet:     () => G._secretLeet,
    secret_strikes:  () => G._secretStrikes,
    secret_chef:     () => G._secretChef,
  };

  const allAchievements = ACHIEVEMENT_DATA.concat(SECRET_ACHIEVEMENTS);
  for (const a of allAchievements) {
    if (G.achieved.includes(a.id)) continue;
    const fn = checks[a.id];
    if (fn && fn()) {
      G.achieved.push(a.id);
      invalidateAchieveCache();
      grantAchievementReward(a);
      showAchieveToast(a);
      const isSecret = SECRET_ACHIEVEMENTS.some(s => s.id === a.id);
      msg((isSecret ? '🔮 Secret: ' : '🏆 Trophy: ') + a.name + (a.reward ? ' — ' + a.reward.label : ''), 'trophies');
      SFX.play('achieve');
    }
  }
}

function showAchieveToast(a) {
  const t = $id('toast-achieve');
  $id('toast-icon').textContent = a.icon;
  $id('toast-name').textContent = a.name;
  $id('toast-desc').textContent = a.desc + (a.reward ? ' — ' + a.reward.label : '');
  t.classList.remove('hidden');
  // Force reflow
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.classList.add('hidden'), 400);
  }, 4000);
}

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


function buyAlbumItem(stageIdx, itemIdx, cost) {
  if (G.feathers < cost) {
    showAlert('🪶', 'Need ' + cost + ' feathers! (have ' + G.feathers + ')');
    SFX.play('err');
    return;
  }
  const prog = curProgress();
  if (prog.collections[stageIdx][itemIdx]) {
    msg('Already found!', 'shop');
    return;
  }
  G.feathers -= cost;
  prog.collections[stageIdx][itemIdx] = true;
  G.totalItems++;
  G.feathersBought = (G.feathersBought || 0) + 1;
  SFX.play('item');

  const monkey = curMonkey();
  const item = monkey.stages[stageIdx].collection.items[itemIdx];
  msg('Bought ' + item[0] + ' ' + item[1] + '!', 'shop');

  checkCollectionComplete(true);
  checkAchievements();
  updateResources();
  updateStageBar();
  updateOverallProgress();
  renderAlbumStage(stageIdx);
  saveGame();
}




// ==================== PREMIUM / PAYPAL ====================
const _SUPABASE_URL  = 'https://hhpikvqeopscjdzuhbfk.supabase.co';
const _SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocGlrdnFlb3BzY2pkenVoYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzA2NDUsImV4cCI6MjA5MTcwNjY0NX0.-iYI6Wf8eREEBKFxfty7ot1Ke8AqjC73xlT7KCTZaqc';
const _PAYPAL_CLIENT = 'AShS0nOeix44W4CifOSTB6pL4gvi6k3O_j6CXAmvCanfDKm9PXhjkED8PBZIOHk0aHdqHLtD1LyH9kLd';

const PREMIUM_PRODUCTS = [
  // ── Packs ────────────────────────────────────────────────────────────────
  { id: 'starter_pack', name: 'Starter Pack',   emoji: '🎁', price: '$2.99', desc: '25,000 gold + 50 hammers + 3 Crystal Bananas', featured: true, oneTime: true },
  { id: 'gold_s',       name: 'Gold Pack S',    emoji: '🪙', price: '$0.99', desc: '10,000 gold' },
  { id: 'gold_m',       name: 'Gold Pack M',    emoji: '💰', price: '$2.99', desc: '50,000 gold' },
  { id: 'gold_l',       name: 'Gold Pack L',    emoji: '🏆', price: '$7.99', desc: '200,000 gold' },
  { id: 'hammers',      name: 'Hammer Pack',    emoji: '🔨', price: '$0.99', desc: '100 hammers' },
  { id: 'bananas',      name: 'Monkey Key',     emoji: '🍌', price: '$1.99', desc: '7 Crystal Bananas — unlock any monkey instantly', oneTime: false },
  // ── Premium upgrades (moved from gold shop — too long to grind) ──────────
  { id: 'luckycharm',  name: 'Lucky Charm',    emoji: '🍀', price: '$2.99', desc: '2x rare item drop chance', oneTime: true, boughtKey: 'owned_luckycharm' },
  { id: 'eggradar',    name: 'Egg Radar',       emoji: '📡', price: '$3.99', desc: '+50% rare egg spawns',    oneTime: true, boughtKey: 'owned_eggradar' },
  { id: 'doubledaily', name: 'Double Daily',    emoji: '📅', price: '$3.99', desc: '2x daily login rewards',  oneTime: true, boughtKey: 'owned_doubledaily' },
  { id: 'starsaver',   name: 'Star Saver',      emoji: '✨', price: '$2.99', desc: 'Starfall costs 6 stars instead of 7', oneTime: true, boughtKey: 'owned_starsaver' },
  { id: 'goldmagnet',  name: 'Golden Magnet',   emoji: '🧲', price: '$1.99', desc: '+20% gold from all egg drops', oneTime: true, boughtKey: 'owned_goldmagnet' },
];

function getDeviceId() {
  if (!G.deviceId) {
    G.deviceId = 'eba-' + crypto.randomUUID();
    saveGame();
  }
  return G.deviceId;
}

let _paypalReady = false;
let _paypalLoading = false;

function loadPayPalSDK() {
  return new Promise((resolve, reject) => {
    if (_paypalReady) { resolve(); return; }
    if (_paypalLoading) {
      const wait = setInterval(() => { if (_paypalReady) { clearInterval(wait); resolve(); } }, 100);
      return;
    }
    _paypalLoading = true;
    const s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + _PAYPAL_CLIENT + '&currency=USD';
    s.onload  = () => { _paypalReady = true; _paypalLoading = false; resolve(); };
    s.onerror = () => { _paypalLoading = false; reject(new Error('PayPal SDK failed to load')); };
    document.head.appendChild(s);
  });
}

async function initPremiumShop() {
  try {
    await loadPayPalSDK();
  } catch (e) {
    msg('Could not load payment system. Check your connection.');
    return;
  }
  const deviceId = getDeviceId();
  for (const product of PREMIUM_PRODUCTS) {
    const el = document.getElementById('paypal-btn-' + product.id);
    if (!el || el.dataset.rendered) continue;
    el.dataset.rendered = '1';
    const pid = product.id;
    paypal.Buttons({
      style: { layout: 'horizontal', color: 'gold', shape: 'rect', label: 'pay', height: 35, tagline: false },
      createOrder: async () => {
        const res = await fetch(_SUPABASE_URL + '/functions/v1/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': _SUPABASE_ANON },
          body: JSON.stringify({ device_id: deviceId, product_id: pid }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.paypal_order_id;
      },
      onApprove: async (data) => {
        const res = await fetch(_SUPABASE_URL + '/functions/v1/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': _SUPABASE_ANON },
          body: JSON.stringify({ device_id: deviceId, paypal_order_id: data.orderID, product_id: pid }),
        });
        const result = await res.json();
        if (result.error) { msg('Payment error: ' + result.error); return; }
        applyPurchaseReward(pid, result.reward);
      },
      onError: () => msg('Payment failed. Please try again.'),
    }).render('#paypal-btn-' + pid);
  }
}

function applyPurchaseReward(productId, reward) {
  if (reward.gold)    { G.gold += reward.gold; G.totalGold += reward.gold; }
  if (reward.hammers) { G.hammers += reward.hammers; }
  if (reward.bananas) { G.crystalBananas += reward.bananas; }
  if (productId === 'starter_pack') G.premium_starter_pack = true;
  // Premium upgrades: set owned flag by boughtKey
  const prod = PREMIUM_PRODUCTS.find(p => p.id === productId);
  if (prod && prod.boughtKey) G[prod.boughtKey] = true;
  G.premiumPurchases = (G.premiumPurchases || 0) + 1;
  track('premium-purchase', { product: productId });
  checkAchievements();
  saveGame();
  updateResources();
  renderPremiumShop();
  const parts = [];
  if (reward.gold)    parts.push(reward.gold.toLocaleString() + ' gold');
  if (reward.hammers) parts.push(reward.hammers + ' hammers');
  if (reward.bananas) parts.push(reward.bananas + ' Crystal Bananas');
  if (parts.length > 0) {
    msg('🎉 ' + parts.join(' + ') + ' added to your account!');
  } else {
    msg('🎉 ' + (prod ? prod.name : 'Upgrade') + ' unlocked!');
  }
  SFX.play('buy');
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
  if (name === 'shop') { renderShop(); updateAutoBuyBtn(); }
  if (name === 'stats') renderStats();
  if (name === 'lexicon') renderLexicon();
  if (name === 'daily') renderDailyCalendar();
  if (name === 'achieve') renderAchievements();
  if (name === 'premium') renderPremiumShop();
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

// ==================== ONBOARDING TOUR ====================
const TOUR_STEPS = [
  { icon: '🥚', title: 'Welcome!', body: 'Welcome to Egg Breaker Adventures Revival!\n\nA love letter to the classic 2008 Facebook game.\nReady for a quick tour?' },
  { icon: '🔨', title: 'Smash Eggs', body: 'Tap or click eggs to smash them!\nEach hit costs 1 hammer.\nDifferent eggs have different HP — harder eggs give better rewards.' },
  { icon: '🪙', title: 'Prizes', body: 'Break eggs to win gold, star pieces, feathers, multipliers, and collection items.\nSome eggs can be empty — that\'s life.' },
  { icon: '✖️', title: 'Multipliers', body: 'Earn multiplier badges (x2, x3, x5...) from eggs.\n\nSelect one or more from the mult bar before smashing — they ADD together!\nx2 + x3 = x5 total reward.\n\nMults are consumed after each smash, so save big ones for rare eggs!' },
  { icon: '⭐', title: 'Starfall', body: 'Collect 5 star pieces to trigger Starfall — it smashes ALL remaining eggs for free!\nUnlocks after completing Stage 1.' },
  { icon: '📚', title: 'Collections', body: 'Each stage has themed items to collect.\nReach 40% for Silver, 70% for Gold (unlocks next stage), and 100% for a Crystal Banana!' },
  { icon: '🐵', title: 'Monkeys', body: 'You start with Mr. Monkey.\nEarn Crystal Bananas by completing stages, then unlock new monkeys with unique perks.' },
  { icon: '🛒', title: 'Shop', body: 'Spend gold on hammers, hats, and upgrades.\nEvery purchase gives permanent bonuses that stack.' },
  { icon: '💾', title: 'Save & Load', body: 'Progress auto-saves to your browser.\n\nTo back up or transfer your save, go to Stats → Export Save. It generates a shareable code.\n\nPaste it into Stats → Load Save on any device to restore.' },
  { icon: '💡', title: 'Tips', body: 'Save multipliers for rare eggs — they multiply gold, stars, feathers, and hammers.\n\nWatch for glowing eggs — runny ones move and timed ones expire!\n\nGood luck and happy smashing!' },
];

let _tourStep = 0;
function startTour() {
  _tourStep = 0;
  showTourStep();
}
function showTourStep() {
  const step = TOUR_STEPS[_tourStep];
  $id('tour-icon').textContent = step.icon;
  $id('tour-title').textContent = step.title;
  $id('tour-body').textContent = step.body;
  // Dots
  $id('tour-dots').innerHTML = TOUR_STEPS.map((_, i) =>
    '<span class="tour-dot' + (i === _tourStep ? ' active' : '') + '"></span>'
  ).join('');
  // Button labels
  const isLast = _tourStep >= TOUR_STEPS.length - 1;
  $id('tour-next').textContent = isLast ? 'Let\'s go!' : 'Next';
  $id('tour-skip').textContent = _tourStep === 0 ? 'Skip' : 'Back';
  $id('overlay-tour').classList.remove('hidden');
}
$id('tour-next').addEventListener('click', () => {
  if (_tourStep >= TOUR_STEPS.length - 1) {
    closeOverlay('overlay-tour');
    G._tourDone = true;
    saveGame();
  } else {
    _tourStep++;
    showTourStep();
  }
});
$id('tour-skip').addEventListener('click', () => {
  if (_tourStep === 0) {
    closeOverlay('overlay-tour');
    G._tourDone = true;
    saveGame();
  } else {
    _tourStep--;
    showTourStep();
  }
});

// ==================== INIT ====================
loadGame();
if (!G.firstPlayDate) { G.firstPlayDate = Date.now(); }

// Offline hammer regen — apply hammers earned while the app was closed
if (G._savedAt > 0 && G.hammers < G.maxH) {
  const elapsed = Math.floor((Date.now() - G._savedAt) / 1000);
  if (elapsed > 0) {
    const interval = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
    if (elapsed >= G.regenCD) {
      const earned = 1 + Math.floor((elapsed - G.regenCD) / interval);
      G.hammers = Math.min(G.maxH, G.hammers + earned);
    }
  }
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

$id('version-tag').textContent = 'Egg Breaker Adventures v' + VERSION;

// PWA shortcut deep-linking: ?tab=play|album|shop|monkeys etc.
(function() {
  const tab = new URLSearchParams(location.search).get('tab');
  if (tab) {
    const btn = document.querySelector('[data-tab="' + tab + '"]');
    if (btn) btn.click();
  }
})();

if (G.hammers < G.maxH && !regenInt) startRegen();

// Show tour for first-time users (no eggs broken yet = new player)
if (!G._tourDone && G.totalEggs === 0) {
  setTimeout(startTour, 500);
}

// Stage bar click → Album tab
$id('stage-bar').addEventListener('click', () => {
  document.querySelectorAll('.nav-tab, .nav-play').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.nav-tab[data-tab="album"]').classList.add('active');
  $id('panel-album').classList.add('active');
  renderAlbum();
});

// Auto-save
setInterval(saveGame, 15000);



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

// ==================== CLOUD SAVE ====================
function initCloudSave() {
  if (typeof supabase === 'undefined') return;
  _sbClient = supabase.createClient(_SUPABASE_URL, _SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  _sbClient.auth.onAuthStateChange(async (event, session) => {
    // If we're in the middle of an intentional unlink, ignore any SIGNED_IN that
    // fires (can happen if Supabase auto-refreshes the token immediately after signOut).
    if (_cloudUnlinking && event === 'SIGNED_IN') return;
    if (event === 'SIGNED_OUT') _cloudUnlinking = false;
    // Cache the full session — gives us a fresh access_token without any network calls.
    // onAuthStateChange fires on TOKEN_REFRESHED too, so _cloudSession stays current.
    _cloudSession = session || null;
    _cloudUser = session ? session.user : null;
    _renderCloudModal();
    if (event === 'SIGNED_IN') await _onCloudSignIn();
  });
  // Restore session on page load (handles OAuth redirect-back)
  _sbClient.auth.getSession().then(({ data }) => {
    _cloudSession = data.session || null;
    _cloudUser = data.session ? data.session.user : null;
    _renderCloudModal();
  });
}

function openCloudSaveModal() {
  closeOverlay('overlay-settings');
  $id('overlay-cloudsave').classList.remove('hidden');
  _renderCloudModal();
  // Fetch last cloud save timestamp if linked
  if (_sbClient && _cloudUser) {
    _sbClient.from('game_saves').select('saved_at').eq('user_id', _cloudUser.id).maybeSingle()
      .then(({ data }) => {
        if (data) { G._cloudSavedAt = new Date(data.saved_at).getTime(); _renderCloudModal(); }
      }).catch(() => {});
  }
}

function _renderCloudModal() {
  const linked   = !!_cloudUser;
  const linkBtn  = $id('cloud-link-btn');
  const saveBtn  = $id('cloud-save-action-btn');
  const loadBtn  = $id('cloud-load-action-btn');
  const tsEl     = $id('cloud-timestamp');
  const cbEl     = $id('cloud-autosave-cb');
  if (!linkBtn) return;
  if (linked) {
    linkBtn.classList.add('cloud-link-linked');
    $id('cloud-link-label').textContent = '✓ ' + _cloudUser.email;
  } else {
    linkBtn.classList.remove('cloud-link-linked');
    $id('cloud-link-label').textContent = 'Link Google Account';
  }
  saveBtn.disabled = !linked;
  loadBtn.disabled = !linked;
  const delBtn = $id('cloud-delete-action-btn');
  if (delBtn) delBtn.disabled = !linked;
  tsEl.textContent = G._cloudSavedAt
    ? 'Last cloud save: ' + _timeAgo(G._cloudSavedAt)
    : 'Last cloud save: never';
  if (cbEl) {
    cbEl.checked  = !!G.cloudAutoSave;
    cbEl.disabled = !linked;
    cbEl.closest('.cloud-autosave-row').classList.toggle('disabled', !linked);
  }
}

function _startCloudAutoSave() {
  _stopCloudAutoSave();
  if (!G.cloudAutoSave || !_sbClient || !_cloudUser) return;
  _cloudSyncTimer = setInterval(async () => {
    try {
      await _syncToCloud();
      msg('☁️ Auto-saved to cloud');
    } catch (e) {
      console.warn('[cloud] auto-save failed:', e);
    }
  }, 15 * 60 * 1000);
}

// On a 401 (expired token cached before Supabase finished refreshing), call
// refreshSession() directly — it's a plain HTTP POST that won't hang like the
// DB auth interceptor — then update _cloudSession for the next request.
async function _refreshCloudSession() {
  const result = await Promise.race([
    _sbClient.auth.refreshSession(),
    new Promise((_, r) => setTimeout(() => r(new Error('refresh timeout')), 5000)),
  ]);
  if (result.data && result.data.session) {
    _cloudSession = result.data.session;
    return true;
  }
  return false;
}

function _stopCloudAutoSave() {
  if (_cloudSyncTimer) { clearInterval(_cloudSyncTimer); _cloudSyncTimer = null; }
}

function toggleCloudAutoSave(checked) {
  if (!_sbClient || !_cloudUser) { G.cloudAutoSave = false; _renderCloudModal(); return; }
  G.cloudAutoSave = checked;
  if (checked) _startCloudAutoSave(); else _stopCloudAutoSave();
  saveGame();
  _renderCloudModal();
}

function linkGoogleAccount() {
  if (!_sbClient) return;
  if (_cloudUser) {
    // overlay-confirm has z-index:950, overlay-cloudsave has z-index:900 —
    // confirm appears on top without closing the cloud modal first.
    showConfirm('☁️', 'Unlink Google account?', _cloudUser.email, function() {
      // Clear state immediately — don't wait for signOut to resolve.
      // _cloudUnlinking prevents onAuthStateChange(SIGNED_IN) from restoring the user
      // if Supabase fires a token refresh right after signOut.
      _cloudUnlinking = true;
      _cloudUser = null;
      _stopCloudAutoSave();
      closeOverlay('overlay-cloudsave');
      track('cloud-save', { action: 'unlink' });
      _renderCloudModal();
      showShopSnack('Google account unlinked.');
      _sbClient.auth.signOut()
        .then(() => { _cloudUnlinking = false; })
        .catch(e => { console.error('[cloud] signOut error:', e); _cloudUnlinking = false; });
    }, 'Unlink');
    return;
  }
  _sbClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/' },
  });
}

async function deleteCloudData() {
  if (!_sbClient || !_cloudUser) return;
  showConfirm('🗑️', 'Delete all cloud data?', 'This removes your save from our servers. Your local save is unaffected.', async function() {
    try {
      await _sbClient.from('game_saves').delete().eq('user_id', _cloudUser.id);
      G._cloudSavedAt = 0;
      saveGame();
      track('cloud-save', { action: 'delete-data' });
      await _sbClient.auth.signOut();
      _cloudUser = null;
      _stopCloudAutoSave();
      _renderCloudModal();
      showShopSnack('Cloud data deleted.');
    } catch (e) {
      showShopSnack('Delete failed. Try again.');
    }
  }, 'Delete');
}

async function _onCloudSignIn() {
  if (!_sbClient || !_cloudUser) return;
  track('cloud-save', { action: 'link' });
  _startCloudAutoSave();
  _renderCloudModal();
  // Only show "linked" on a real OAuth redirect — SIGNED_IN also fires on session
  // restore after page refresh, so we gate on auth params being present in the URL.
  const _isOAuthRedirect = window.location.hash.includes('access_token') ||
                           window.location.search.includes('code=');
  if (_isOAuthRedirect) showShopSnack('☁️ Google account linked!');

  // Smart load: compare cloud vs local timestamps and act accordingly
  try {
    const { data } = await _sbClient
      .from('game_saves').select('save_data, saved_at')
      .eq('user_id', _cloudUser.id).maybeSingle();

    if (!data) return; // no cloud save on record — nothing to do

    const cloudTs  = new Date(data.saved_at).getTime();
    G._cloudSavedAt = cloudTs;
    _renderCloudModal();

    const localEmpty  = G.totalEggs === 0;           // fresh install / new device
    const cloudNewer  = cloudTs > (G._savedAt || 0); // cloud has more recent progress

    if (localEmpty) {
      // No local progress — silently restore cloud save
      _applyCloudSave(data.save_data);
      track('cloud-save', { action: 'load' });
      showShopSnack('☁️ Cloud save loaded!');
    } else if (cloudNewer) {
      // Both sides have progress but cloud is newer — ask the player
      showConfirm('☁️', 'Load cloud save?',
        'Found a cloud save from ' + _timeAgo(cloudTs) + '.\nLoad it? Your current local progress will be replaced.',
        function() {
          _applyCloudSave(data.save_data);
          track('cloud-save', { action: 'load' });
          showShopSnack('☁️ Cloud save loaded!');
        }, 'Load it');
    }
    // local is newer — do nothing; auto-save will sync local → cloud shortly
  } catch (e) {
    console.warn('[cloud] sign-in check failed:', e);
  }
}

function cloudSaveManual() {
  if (!_sbClient || !_cloudUser) return;
  showConfirm('☁️', 'Save to cloud?', 'This will overwrite your current cloud save.', function() {
    closeOverlay('overlay-cloudsave');
    showShopSnack('☁️ Saving...', 12000);
    const _timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
    Promise.race([_syncToCloud(), _timeout])
      .then(() => showShopSnack('☁️ Saved to cloud!'))
      .catch(e => { showShopSnack('⚠️ Save failed.'); console.warn('[cloud] save error:', e); });
  }, 'Save');
}

function cloudLoadManual() {
  if (!_sbClient || !_cloudUser) return;
  showConfirm('📥', 'Load from cloud?', 'This will overwrite your current game progress.', function() {
    closeOverlay('overlay-cloudsave');
    showShopSnack('☁️ Loading...', 12000);
    const _timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
    const _load = (async function() {
      if (!_cloudSession) { _cloudUser = null; _renderCloudModal(); throw new Error('no session'); }
      const _doLoadFetch = (token) => fetch(
        _SUPABASE_URL + '/rest/v1/game_saves?select=save_data&user_id=eq.' + _cloudUser.id,
        { headers: { 'apikey': _SUPABASE_ANON, 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' } }
      );
      let resp = await _doLoadFetch(_cloudSession.access_token);
      if (resp.status === 401) {
        const refreshed = await _refreshCloudSession();
        if (!refreshed) throw new Error('HTTP 401 — session expired');
        resp = await _doLoadFetch(_cloudSession.access_token);
      }
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const rows = await resp.json();
      if (!rows.length) throw new Error('no data');
      _applyCloudSave(rows[0].save_data);
      track('cloud-save', { action: 'load' });
    })();
    Promise.race([_load, _timeout])
      .then(() => showShopSnack('☁️ Cloud save loaded!'))
      .catch(e => {
        if (e.message === 'no data') { showShopSnack('No cloud save found.'); return; }
        showShopSnack('⚠️ Load failed.');
        console.warn('[cloud] load error:', e);
      });
  }, 'Load');
}

async function _syncToCloud() {
  if (!_sbClient || !_cloudUser) return;
  const d = {};
  for (const k of Object.keys(DEFAULT_STATE)) d[k] = G[k];
  if (G.roundEggs) {
    d.roundEggs = G.roundEggs.map(egg => { const { _smashing, ...clean } = egg; return clean; });
  }
  const json = JSON.stringify(d);
  const compressed = 'lz:' + LZString.compressToUTF16(json);
  // Calculate when hammers will be full (for push notification scheduling)
  const regenSec    = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
  const secsToFull  = G.hammers < G.maxH ? (G.maxH - G.hammers) * regenSec : 0;
  const hammersFullAt = secsToFull > 0
    ? new Date(Date.now() + secsToFull * 1000).toISOString()
    : null;
  // Use the session token cached by onAuthStateChange.
  // If it's expired (401), refresh once then retry — covers the race where
  // onAuthStateChange fires before _recoverAndRefresh finishes its refresh.
  if (!_cloudSession) { _cloudUser = null; _renderCloudModal(); throw new Error('no session'); }
  const _doSaveFetch = (token) => fetch(_SUPABASE_URL + '/rest/v1/game_saves', {
    method: 'POST',
    headers: {
      'apikey':        _SUPABASE_ANON,
      'Authorization': 'Bearer ' + token,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id:         _cloudUser.id,
      save_data:       compressed,
      saved_at:        new Date(G._savedAt).toISOString(),
      last_seen_at:    new Date().toISOString(),
      hammers_full_at: hammersFullAt,
    }),
  });
  let resp = await _doSaveFetch(_cloudSession.access_token);
  if (resp.status === 401) {
    const refreshed = await _refreshCloudSession();
    if (!refreshed) throw new Error('HTTP 401 — session expired');
    resp = await _doSaveFetch(_cloudSession.access_token);
  }
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  G._cloudSavedAt = G._savedAt;
  saveGame();
  track('cloud-save', { action: 'save' });
}

function _applyCloudSave(saveData) {
  try {
    const json = saveData.startsWith('lz:')
      ? LZString.decompressFromUTF16(saveData.slice(3)) : saveData;
    const d = JSON.parse(json);
    for (const k of Object.keys(DEFAULT_STATE)) {
      if (d[k] !== undefined && d[k] !== null &&
          (DEFAULT_STATE[k] === null || typeof d[k] === typeof DEFAULT_STATE[k])) {
        G[k] = d[k];
      }
    }
    if (d.roundEggs) G.roundEggs = d.roundEggs;
    migrateSave(G);
    saveGame();
    renderAll();
    MUSIC.play(curMonkey().id);
  } catch (e) {
    console.warn('[cloud] restore failed:', e);
  }
}

function _timeAgo(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// ==================== PUSH NOTIFICATIONS ====================
const _VAPID_PUBLIC = 'BGdua8JjkIIkYoN5DKeIWLl9ic0s_W9iPyBopA00Smqr1n_4X7ikxQ5PnK9aasLwnFtqyF243nRS256KeY-aYEw';

function _urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64  = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function toggleNotifications() {
  const label = $id('notif-toggle-label');

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    msg('Push notifications are not supported on this browser.');
    return;
  }

  // Already subscribed — unsubscribe
  if (localStorage.getItem('eba_push_sub')) {
    try {
      const sw  = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch (_) {}
    localStorage.removeItem('eba_push_sub');
    label.textContent = 'Notifications: Off';
    return;
  }

  // Request permission
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    msg('Notification permission denied.');
    return;
  }

  try {
    const sw  = await navigator.serviceWorker.ready;
    const sub = await sw.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: _urlBase64ToUint8Array(_VAPID_PUBLIC),
    });
    await fetch(_SUPABASE_URL + '/functions/v1/subscribe-push', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': _SUPABASE_ANON },
      body:    JSON.stringify({ device_id: getDeviceId(), subscription: sub.toJSON() }),
    });
    localStorage.setItem('eba_push_sub', '1');
    label.textContent = 'Notifications: On';
  } catch (e) {
    console.warn('[push] subscribe failed', e);
    msg('Could not enable notifications. Try again.');
  }
}

function _initNotifBtn() {
  const btn   = $id('notif-toggle-btn');
  const label = $id('notif-toggle-label');
  if (!btn || !label) return;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    btn.style.display = 'none';
    return;
  }
  const hasSub = localStorage.getItem('eba_push_sub');
  if (hasSub && Notification.permission === 'granted') {
    label.textContent = 'Notifications: On';
  } else {
    if (hasSub) localStorage.removeItem('eba_push_sub'); // permission was revoked
    label.textContent = 'Notifications: Off';
  }
}
