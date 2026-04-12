// ============================================================
//  Egg Breaker Adventures – Game Engine
//  game.js  (requires all other JS files loaded first)
// ============================================================


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
  lastLoginDate: null, consecutiveDays: 0, dailyClaimed: false, totalDailyClaims: 0,
  // Regen
  regenCD: CONFIG.regenInterval, fastRegen: false,
  // Stats
  totalEggs: 0, totalEmpties: 0, totalGold: 0, totalStarPieces: 0, totalFeathers: 0,
  totalItems: 0, biggestWin: 0, highestMult: 1,
  starfallsUsed: 0, collectionsCompleted: 0, stagesCompleted: 0,
  roundClears: 0, feathersBought: 0, maxMultUsed: 0,
  achieved: [],
  discoveredEggs: ['normal','silver','gold'], // egg types the player has seen
  soundOn: true,
  autoBuy: false,
};

let G = {};
let regenInt = null;

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
  const d = {};
  for (const k of Object.keys(DEFAULT_STATE)) d[k] = G[k];
  // Save eggs without transient _smashing lock
  if (G.roundEggs) {
    d.roundEggs = G.roundEggs.map(egg => {
      const { _smashing, ...clean } = egg;
      return clean;
    });
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(d));
}

function loadGame() {
  G = { ...DEFAULT_STATE, monkeys: initMonkeys(), roundEggs: null };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    for (const k of Object.keys(DEFAULT_STATE)) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_STATE, k)) continue;
      if (d[k] !== undefined && d[k] !== null && typeof d[k] === typeof DEFAULT_STATE[k]) G[k] = d[k];
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
  // Migrate: add per-stage tiers and activeStage
  if (G.monkeys) {
    G.monkeys.forEach((mp, mi) => {
      if (!mp.tiers) {
        mp.tiers = MONKEY_DATA[mi].stages.map((_, si) => {
          if (si < mp.stage) return 3; // stages before current are complete
          if (si === mp.stage) return mp.tier || 0;
          return 0;
        });
      }
      if (mp.activeStage === undefined) mp.activeStage = mp.stage;
    });
  }
  // Migrate/clean loaded egg data
  if (G.roundEggs) {
    G.roundEggs.forEach(egg => {
      if (egg.maxHp === undefined) {
        egg.maxHp = EGG_HP[egg.type] || 1;
        egg.hp = egg.broken ? 0 : egg.maxHp;
      }
      delete egg._smashing; // clear stale lock from save
    });
  }
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
    msg('All progress reset!');
  }, 'Reset');
}

// ==================== DAILY LOGIN ====================
function checkDaily() {
  const today = new Date().toISOString().slice(0, 10);
  if (G.lastLoginDate === today) {
    renderDailyCalendar();
    return;
  }
  // New day
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (G.lastLoginDate === yesterday) {
    G.consecutiveDays++;
  } else {
    G.consecutiveDays = 1; // streak reset
  }
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

  // Apply reward
  if (reward.type === 'gold')     { G.gold += reward.val; G.totalGold += reward.val; }
  if (reward.type === 'hammers')  { G.hammers = Math.min(G.maxH, G.hammers + reward.val); }
  if (reward.type === 'maxH')     { G.maxH += reward.val; G.hammers = Math.min(G.maxH, G.hammers + reward.val); }
  if (reward.type === 'feathers') { G.feathers += reward.val; G.totalFeathers += reward.val; }
  if (reward.type === 'banana')   { G.crystalBananas += reward.val; }

  G.dailyClaimed = true;
  G.totalDailyClaims = (G.totalDailyClaims || 0) + 1;
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
function msg(text, cat) {
  const show = CONFIG.logShow || {};
  if (cat && show[cat] === false) return;
  _logLines.unshift({ text: text, cat: cat || '' });
  if (_logLines.length > 4) _logLines.length = 4;
  renderLog();
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
let _roundPending = false;

function newRound() {
  _roundPending = false;
  const prog = curProgress();
  const stage = curStage();
  const count = stage.eggs;
  const eggs = [];
  const si = curActiveStage();
  // Build available egg types for this stage from registry
  const available = [];
  for (const def of CONFIG.eggTypes) {
    if (def.unlockStage <= si) {
      available.push({ type: def.id, weight: def.spawnWeight });
    }
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
    eggs.push({ type, hp, maxHp: hp, broken: false });
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
  renderEggTray();
  updateResources();
  saveGame();
}



function multEquation(base, multVals, result, unit) {
  var total = multVals.reduce(function(a, b) { return a + b; }, 0);
  return '+' + result + ' ' + unit + ' (x' + total + ')';
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
    if (hasBonus('moreGold')) val = Math.round(val * 1.2);
    if (hasBonus('goldBoost')) val = Math.round(val * 1.1);
    const ab = getAchievementBonuses();
    if (ab.goldPct > 0) val = Math.round(val * (1 + ab.goldPct / 100));
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
    return { type: 'mult', value: val, bonusGold, usedMult: usedMultBonus, label: 'x' + val + ' multiplier!', color: '#7c3aed' };
  }

  if (type === 'item') {
    const result = rollCollectionItem(eggType);
    result.bonusGold = bonusGold;
    result.usedMult = usedMultBonus;
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
    return rarity === 1 ? rw.common : rarity === 2 ? rw.uncommon : rw.rare;
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
function noHammerMsg() {
  return NO_HAMMER_MSGS[Math.floor(Math.random() * NO_HAMMER_MSGS.length)];
}

// ==================== SMASH EGG ====================
function smashEgg(index) {
  if (!G.roundEggs || G.roundEggs[index].broken) return;
  const egg = G.roundEggs[index];
  if (egg._smashing) return;
  egg._smashing = true;

  // Each hit costs 1 hammer
  if (G.hammers < 1) {
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
  hammerEl.classList.remove('hammer-anim');
  void hammerEl.offsetWidth;
  hammerEl.classList.add('hammer-anim');

  const rect = slot.getBoundingClientRect();
  const wrapRect = $id('egg-tray-wrap').getBoundingClientRect();
  const cx = rect.left - wrapRect.left + rect.width / 2;
  const cy = rect.top - wrapRect.top + rect.height / 2;

  // Now do logic
  G.hammers -= 1;

  if (hasBonus('freeEgg') && Math.random() < 0.03) {
    G.hammers = Math.min(G.maxH, G.hammers + 1);
    msg('Free hit! (Chef\'s Hat)', 'freeHit');
  }

  if (!regenInt && G.hammers < G.maxH) startRegen();

  egg.hp -= 1;

  const particleCount = 4 + (egg.maxHp - egg.hp) * 3;
  Particles.emit(cx, cy, egg.type, particleCount);

  if (egg.hp > 0) {
    const damage = egg.maxHp - egg.hp;
    slot.innerHTML = makeEggSVG(egg.type, damage) +
      '<span class="egg-label">' + egg.type + '<br>' + egg.hp + '/' + egg.maxHp + '</span>';
    setTimeout(() => { egg._smashing = false; }, 300);
    updateResources();
    saveGame();
    return;
  }

  // === Egg broken! ===
  egg.broken = true;
  G.totalEggs++;

  // Track egg type smashes
  if (egg.type !== 'normal') {
    G[egg.type + 'Smashed'] = (G[egg.type + 'Smashed'] || 0) + 1;
  }

  // Roll prize
  const prize = rollPrize(egg.type);

  // Apply prize after short delay
  setTimeout(() => {
    applyPrize(prize, cx, cy);

    // Update egg visual to fully broken
    slot.classList.add('broken');
    slot.innerHTML = makeEggSVG(egg.type, egg.maxHp) +
      '<span class="egg-label">' + egg.type + '</span>';

    // Check if all eggs broken — auto-spawn next round
    if (G.roundEggs.every(e => e.broken) && !_roundPending) {
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
    if (prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'gold');
      spawnFloat(zone, eq, '#d97706', cls || 'big', cx, cy);
      msg(eq);
    } else {
      spawnFloat(zone, prize.label, '#d97706', cls, cx, cy);
      msg(prize.label);
    }
    SFX.play('coin');
    if (prize.value >= 200) Particles.sparkle(cx, cy, 12, '#FFD700');
  }

  if (prize.type === 'star') {
    G.starPieces += prize.value;
    G.totalStarPieces += prize.value;
    if (prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'stars');
      spawnFloat(zone, eq, '#f59e0b', 'big', cx, cy);
      msg(eq);
    } else {
      spawnFloat(zone, prize.label, '#f59e0b', 'big', cx, cy);
      msg(prize.label);
    }
    SFX.play('star');
    Particles.sparkle(cx, cy, 10, '#FCD34D');
    updateStarBtn();
  }

  if (prize.type === 'mult') {
    G.multQueue.push(prize.value);
    G.highestMult = Math.max(G.highestMult, prize.value);
    spawnFloat(zone, prize.label, '#7c3aed', 'big', cx, cy);
    msg(prize.label);
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
    if (prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'feathers');
      spawnFloat(zone, eq, '#059669', 'big', cx, cy);
      msg(eq);
    } else {
      spawnFloat(zone, prize.label, '#059669', '', cx, cy);
      msg(prize.label);
    }
    SFX.play('coin');
  }

  if (prize.type === 'hammers') {
    G.hammers += prize.value;
    if (prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'hammers');
      spawnFloat(zone, eq, '#b45309', 'big', cx, cy);
      msg(eq);
    } else {
      spawnFloat(zone, prize.label, '#b45309', 'big', cx, cy);
      msg(prize.label);
    }
    SFX.play('coin');
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
      setTimeout(() => showItemPopup(prize), 400);
      // Check collection completion
      checkCollectionComplete();
    } else {
      // Duplicate - give some gold instead
      const dRange = CONFIG.duplicateGoldRange;
      const dupeGold = dRange[0] + Math.floor(Math.random() * (dRange[1] - dRange[0] + 1));
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
let _starfallActive = false;
function useStarfall() {
  if (_starfallActive) return;
  if (G.starPieces < CONFIG.starPiecesForStarfall || !G.roundEggs) return;
  _starfallActive = true;
  G.starPieces -= CONFIG.starPiecesForStarfall;
  G.starfallsUsed++;
  SFX.play('starfall');
  msg('STARFALL! All eggs smashed!', 'starfall');

  // Suspend multiplier during starfall — mults only apply to manual taps
  const savedMult = G.activeMult;
  const savedCounts = G._selectedCounts;
  G.activeMult = 1;
  G._selectedCounts = {};

  const wrap = $id('egg-tray-wrap');
  wrap.style.animation = 'starfall-glow 1s ease';
  setTimeout(() => wrap.style.animation = '', 1000);

  // Break all unbroken eggs in sequence
  const unbroken = [];
  G.roundEggs.forEach((e, i) => { if (!e.broken) unbroken.push(i); });

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
      setTimeout(() => slot.classList.remove('smashing'), 450);

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
    }, i * 400);
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
  }, unbroken.length * 400 + 300);
}


// ==================== COLLECTION / STAGE ====================
function checkCollectionComplete() {
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
      showStagePopup(
        'Silver Tier!',
        stage.name + ' — keep collecting for Gold!'
      );
      msg('⬆️ Silver Tier! ' + stage.name + ' +' + reward.maxHammers + ' max hammers', 'tiers');

    } else if (newTier === 2) {
      // Silver → Gold: unlock next stage
      const reward = CONFIG.tierRewards.gold;
      G.maxH += reward.maxHammers;
      G.hammers = Math.min(G.maxH, G.hammers + reward.hammerRefill);
      // Unlock next stage if this is the highest
      if (si >= prog.stage && si < curMonkey().stages.length - 1) {
        prog.stage = si + 1;
      }
      const nextName = si < curMonkey().stages.length - 1
        ? curMonkey().stages[si + 1].name : null;
      showStagePopup(
        'Gold Tier!',
        stage.name + (nextName ? '\nStage ' + (si + 2) + ': ' + nextName + ' unlocked!' : '')
      );
      msg('🥇 Gold Tier! ' + stage.name + (nextName ? ' — ' + nextName + ' unlocked' : ''), 'tiers');

    } else if (newTier >= 3) {
      // Gold → Complete: banana reward
      G.stagesCompleted++;
      G.crystalBananas += CONFIG.crystalBananasPerStage;
      // Also unlock next stage if not already
      if (si >= prog.stage && si < curMonkey().stages.length - 1) {
        prog.stage = si + 1;
      }
      showStagePopup(
        stage.name + ' - 100%',
        '+' + CONFIG.crystalBananasPerStage + ' Crystal Banana'
      );
      msg('✅ Complete! ' + stage.name + ' +' + CONFIG.crystalBananasPerStage + ' 🍌', 'tiers');
      // Check if ALL stages are complete
      if (prog.tiers.every(t => t >= 3)) {
        prog.completed = true;
      }
    }
    // Refresh all UI after any tier change
    setTimeout(() => renderAll(), 100);
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

function showItemPopup(prize) {
  $id('pop-item-icon').textContent = prize.emoji;
  $id('pop-item-name').textContent = prize.name;
  $id('pop-item-quote').textContent = prize.quote || '';
  $id('overlay-item').classList.remove('hidden');
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
  newRound();
  renderAll();
  saveGame();
}

function unlockMonkey(index) {
  if (G.crystalBananas < MONKEY_DATA[index].cost) {
    showAlert('🍌', 'Need ' + MONKEY_DATA[index].cost + ' Crystal Bananas! (have ' + G.crystalBananas + ')');
    SFX.play('err');
    return;
  }
  G.crystalBananas -= MONKEY_DATA[index].cost;
  G.monkeys[index].unlocked = true;
  invalidateBonusCache();
  SFX.play('levelup');
  msg(MONKEY_DATA[index].name + ' unlocked!', '#16a34a');
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
function showShopSnack(text) {
  const el = $id('shop-snack');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(_snackTimeout);
  _snackTimeout = setTimeout(() => el.classList.remove('show'), 1800);
}

function showAlert(icon, text) {
  showConfirm(icon, text, '', null);
  $id('confirm-yes').style.display = 'none';
  const noBtn = $id('overlay-confirm').querySelector('.confirm-no');
  if (noBtn) noBtn.textContent = 'OK';
}

function showConfirm(icon, title, detail, onYes, yesText) {
  $id('confirm-yes').style.display = '';
  $id('confirm-yes').textContent = yesText || 'Buy';
  const noBtn = $id('overlay-confirm').querySelector('.confirm-no');
  if (noBtn) noBtn.textContent = 'Cancel';
  $id('confirm-icon').textContent = icon;
  $id('confirm-title').textContent = title;
  $id('confirm-detail').textContent = detail;
  $id('overlay-confirm').classList.remove('hidden');
  $id('confirm-yes').onclick = function() {
    closeOverlay('overlay-confirm');
    onYes();
  };
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
    SFX.play('buy');
    updateHammerSVG();
    showShopSnack(item.name + ' purchased!');
  }

  if (category === 'hat') {
    const item = SHOP_HATS.find(h => h.id === id);
    if (!item || item.cost === 0) return;
    if (G.ownedHats.includes(id)) {
      showShopSnack('Already owned!');
      return;
    }
    if (G.gold < item.cost) { showAlert('🪙', 'Need ' + formatNum(item.cost) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.ownedHats.push(id);
    invalidateBonusCache();
    G.hat = id;
    G.purchases = (G.purchases || 0) + 1;
    SFX.play('buy');
    showShopSnack(item.name + ' purchased!');
  }

  if (category === 'supply') {
    const item = SHOP_SUPPLIES.find(s => s.id === id);
    if (!item) return;
    if (id === 'fastregen' && G.fastRegen) { showShopSnack('Already purchased!'); return; }
    if (item.unique && id !== 'fastregen' && G['owned_' + id]) { showShopSnack('Already purchased!'); return; }
    if (G.gold < item.cost) { showAlert('🪙', 'Need ' + formatNum(item.cost) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.purchases = (G.purchases || 0) + 1;

    if (id === 'hammers5') { G.hammers = Math.min(G.maxH, G.hammers + 5); showShopSnack('+5 hammers purchased!'); }
    if (id === 'hammers20') { G.hammers = Math.min(G.maxH, G.hammers + 20); showShopSnack('+20 hammers purchased!'); }
    if (id === 'star1') { G.starPieces++; G.totalStarPieces++; updateStarBtn(); showShopSnack('+1 star piece purchased!'); }
    if (id === 'mult5') { G.multQueue.push(5); renderMultQueue(); showShopSnack('x5 multiplier purchased!'); }
    if (id === 'maxhammers') { G.maxH += 5; showShopSnack('+5 max hammers!'); }
    if (id === 'fastregen') { G.fastRegen = true; showShopSnack('Fast Regen unlocked!'); }

    SFX.play('buy');
  }

  checkAchievements();
  updateResources();
  // Flash animation on the card, then re-render
  const cards = $id('shop-' + (category === 'hammer' ? 'hammers' : category === 'hat' ? 'hats' : 'supplies')).children;
  for (const c of cards) {
    if (c.dataset && c.dataset.id === id) {
      c.classList.add('just-bought');
      break;
    }
  }
  setTimeout(() => { renderShop(); saveGame(); }, 250);
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
  };

  for (const a of ACHIEVEMENT_DATA) {
    if (G.achieved.includes(a.id)) continue;
    const fn = checks[a.id];
    if (fn && fn()) {
      G.achieved.push(a.id);
      invalidateAchieveCache();
      grantAchievementReward(a);
      showAchieveToast(a);
      msg('🏆 Trophy: ' + a.name + (a.reward ? ' — ' + a.reward.label : ''), 'trophies');
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
  }, 5000);
}

// ==================== SOUND ====================
function toggleSound() {
  const on = SFX.toggle();
  G.soundOn = on;
  $id('sound-btn').textContent = on ? '🔊' : '🔇';
  saveGame();
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

  checkCollectionComplete();
  checkAchievements();
  updateResources();
  updateStageBar();
  updateOverallProgress();
  renderAlbumStage(stageIdx);
  saveGame();
}




// ==================== NAVIGATION ====================
$id('nav-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.nav-tab, .nav-play');
  if (!tab || tab.disabled) return;
  const name = tab.dataset.tab;
  document.querySelectorAll('.nav-tab, .nav-play').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  tab.classList.add('active');
  $id('panel-' + name).classList.add('active');
  // Refresh content when switching tabs
  if (name === 'play') renderEggTray();
  if (name === 'album') renderAlbum();
  if (name === 'monkeys') renderMonkeys();
  if (name === 'shop') { renderShop(); updateAutoBuyBtn(); }
  if (name === 'stats') renderStats();
  if (name === 'lexicon') renderLexicon();
  if (name === 'daily') renderDailyCalendar();
  if (name === 'achieve') renderAchievements();
});

// ==================== KEYBOARD ====================
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    // Smash first unbroken egg
    if (G.roundEggs) {
      const idx = G.roundEggs.findIndex(egg => !egg.broken);
      if (idx >= 0) smashEgg(idx);
    }
  }
  if (e.code === 'KeyS' && e.ctrlKey) { e.preventDefault(); useStarfall(); }
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
  });
})();

function godMode() {
  G.hammers = G.maxH;
  msg('Hammers refilled!', '#e74c3c');
  SFX.play('tier');
  updateResources();
  saveGame();
}

// ==================== INIT ====================
loadGame();

if (G.soundOn === false && SFX.isOn()) SFX.toggle();

Particles.init($id('particle-canvas'));

if (!G.roundEggs || G.roundEggs.length === 0) newRound();

renderAll();

$id('version-tag').textContent = 'Egg Breaker Adventures v' + VERSION;

if (G.hammers < G.maxH && !regenInt) startRegen();

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



// Hammer follows mouse (desktop only, hidden on touch via CSS)
(() => {
  const wrap = $id('egg-tray-wrap');
  const hammer = $id('hammer');

  if (matchMedia('(hover:hover)').matches) {
    wrap.style.cursor = 'none';
    let _rafPending = false;
    wrap.addEventListener('mousemove', (e) => {
      if (_rafPending) return;
      _rafPending = true;
      requestAnimationFrame(() => {
        const r = wrap.getBoundingClientRect();
        hammer.style.left = (e.clientX - r.left - 20) + 'px';
        hammer.style.top = (e.clientY - r.top - 80) + 'px';
        _rafPending = false;
      });
    });
    wrap.addEventListener('mouseleave', () => { hammer.style.opacity = '0'; });
    wrap.addEventListener('mouseenter', () => { hammer.style.opacity = '1'; });
  }

  // Double-tap zoom prevention handled by CSS touch-action:manipulation
})();
