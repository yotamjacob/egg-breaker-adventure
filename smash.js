// ============================================================
//  Egg Smash Adventures — Smash Engine
//  smash.js  (requires game.js loaded first)
//  Round management, egg rolling, prize logic, balloon eggs,
//  smash handler, starfall, hex effect, collection completion.
// ============================================================

// ==================== ROUND MANAGEMENT ====================
// _roundPending, _spawningRound, _centuryCooldown, _stageEggsCache, _shopNudgeDone, _balloonHold
// all declared in game.js to avoid TDZ — hoisted functions here are called from game.js startup

// Set before applyPrize, read by msg() to tag full-log entries with their source egg
var _prizeEggType = null;

/** Egg types (with spawn weights) that can appear on stage `si`.
 *  `noCentury` excludes the century jackpot egg — the offline Auto-Smasher
 *  simulation (idle.js) never rolls it. */
function availableEggTypes(si, noCentury) {
  const available = [];
  for (const def of CONFIG.eggTypes) {
    // Special unlock: century requires Mr. Monkey completed + cooldown elapsed
    if (def.unlockMonkey0) {
      if (noCentury) continue;
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
  return available;
}

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
  const available = availableEggTypes(si, false);
  const spawnTotal = available.reduce((s, e) => s + e.weight, 0);
  let centuryUsedThisRound = false;
  // Egg effects unlock progressively through Mr. Monkey stages
  const mrStage = G.monkeys && G.monkeys[0] ? (G.monkeys[0].stage || 0) : 0;
  // WARP SURGE — rare round-wide event: every egg (century excepted) spawns as
  // a teleporter, whatever its type. See CONFIG.teleportEgg.surgeChance.
  const warpSurge = mrStage >= CONFIG.teleportEgg.unlockStage
    && Math.random() < (CONFIG.teleportEgg.surgeChance || 0);
  for (let i = 0; i < count; i++) {
    let r = Math.random() * spawnTotal;
    let type = 'normal';
    for (const e of available) {
      r -= e.weight;
      if (r <= 0) { type = e.type; break; }
    }
    if (type === 'century') {
      if (centuryUsedThisRound) type = 'gold';
      else centuryUsedThisRound = true;
    }
    let hp = EGG_HP[type];
    let effects = [];
    if (warpSurge && type !== 'century') {
      // Exclusive, like every teleporter — no runny/timer/hex/balloon on top
      effects.push('teleport'); hp = CONFIG.teleportEgg.hp || hp;
    } else if (mrStage >= 5 && Math.random() < 0.015) {
      effects = ['balloon'];  // exclusive — no other effects (unlocks Stage 6)
    } else {
      if (mrStage >= 1 && Math.random() < 0.05 && type !== 'century') effects.push('runny');  // Stage 2
      if (mrStage >= 2 && Math.random() < 0.05 && ['normal','silver','gold','crystal'].includes(type)) effects.push('timer'); // Stage 3
      // Teleport (Stage 5): silver & gold only — each hit warps it across the
      // tray, and it pays 4x when it finally breaks. EXCLUSIVE — never stacked
      // with runny / timer (rolled above) or hex (rolled below, which skips
      // teleporters) — see CONFIG.teleportEgg (v3.10.3).
      if (effects.length === 0 && mrStage >= CONFIG.teleportEgg.unlockStage
          && CONFIG.teleportEgg.types.indexOf(type) !== -1
          && Math.random() < CONFIG.teleportEgg.chance) { effects.push('teleport'); hp = CONFIG.teleportEgg.hp || hp; }
      const hexChance = mrStage >= 3 ? Math.min(0.015, 0.006 + (mrStage - 3) * 0.0015) : 0;  // 0.6%→0.75%→0.9%→1.05%→1.2%→1.35%→1.5%
      if (hexChance > 0 && Math.random() < hexChance && !effects.includes('teleport') && type !== 'ruby' && type !== 'black' && type !== 'crystal' && type !== 'century' && !G['owned_cleanse']) effects.push('hex');
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
  if (warpSurge) {
    G.warpSurges = (G.warpSurges || 0) + 1;
    msg('🌀 WARP SURGE! Every egg is a teleporter!', 'specials');
    SFX.play('starfall');
    spawnFloat($id('prize-zone'), '🌀 WARP SURGE!', '#7de8ff', 'mega');
    if (typeof checkAchievements === 'function') checkAchievements();
  }
  // Start cooldown if a century egg was rolled this round
  if (eggs.some(e => e.type === 'century')) _centuryCooldown = 100;
  _spawnFxPending = true;   // renderEggTray plays the summon effect for this render only
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
// Set by idle.js while simulating offline smashes: rollPrize() must not
// touch the DOM or the log. `var` so it is never in a TDZ for boot-time callers.
var _quietRoll = false;
var _lastGoldJackpot = false;   // set by resolvePrize (Golden Hammer L10), consumed by applyPrize

function rollPrize(eggType) {
  // Sun Wukong: 72 Transformations — 15% chance to roll prizes from the next egg tier up
  if (hasBonus('wukong') && Math.random() < 0.15) {
    const order = ['normal','silver','gold','crystal','ruby','black'];
    const idx = order.indexOf(eggType);
    if (idx >= 0 && idx < order.length - 1) {
      eggType = order[idx + 1];
      if (!_quietRoll) {
        spawnFloat($id('prize-zone'), '🐒 72 Transformations!', '#f5c542', 'big');
        msg('🐒 72 Transformations! ' + eggType.charAt(0).toUpperCase() + eggType.slice(1) + ' egg prizes!', 'specials');
      }
    }
  }
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

  // Mr Monkey: more item drops; feathers locked until completed
  // Wukon: items rarest (hardest late-game collections)
  // Odin: items a bit rarer
  // All other monkeys: items are rarer (harder to fill later collections)
  if (monkey && monkey.id === 'mr_monkey') {
    w.item *= 1.5;
    if (!G.monkeys[0]?.completed) w.feather = 0;
  } else if (monkey && monkey.id === 'sun_wukong') {
    w.item *= 0.45;
  } else if (monkey && monkey.id === 'odin') {
    w.item *= 0.6;
  } else if (monkey) {
    w.item *= 0.7;
  }

  // Achievement percentage bonuses
  const ab = getAchievementBonuses();
  if (ab.itemPct > 0) w.item *= (1 + ab.itemPct / 100);
  if (ab.starPct > 0) w.star *= (1 + ab.starPct / 100);

  // Hammer mastery (mastery.js): each owned hammer's identity grows with its level
  if (typeof hammerBoost === 'function') {
    w.star    *= 1 + hammerBoost('drumstick', 'starWeight');
    w.empty   *= 1 - hammerBoost('bat', 'emptyCut');
    w.feather *= 1 + hammerBoost('crystal', 'featherWeight');
    w.item    *= 1 + hammerBoost('rainbow', 'itemWeight');
  }

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
    const rawBase = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    // Apply all bonuses to the per-unit base BEFORE multiplying by activeMult so the
    // equation label is always exact (base × mult = total, no rounding drift).
    let base = rawBase * goldMult;
    if (hasBonus('moreGold'))    base *= 1.2;
    if (hasBonus('goldBoost'))   base *= 1.1;
    if (hasBonus('allfather'))   base *= 1.1;
    if (hasBonus('goldBoost15')) base *= 1.15;
    if (hasBonus('goldBoost25')) base *= 1.25;
    if (hasBonus('goldBoost40')) base *= 1.40;
    if (hasBonus('goldBoost50')) base *= 1.50;
    const ab = getAchievementBonuses();
    if (ab.goldPct > 0) base *= (1 + ab.goldPct / 100);
    const _mk = curMonkey();
    if (_mk && _mk.goldScale != null) base *= _mk.goldScale;
    if (G['owned_goldmagnet']) base *= 1.2;
    if (typeof hammerBoost === 'function') {
      base *= 1 + hammerBoost('golden', 'goldMult') + hammerBoost('rainbow', 'goldMult');
      if (hammerPerk('golden') && Math.random() < 0.05) { base *= 5; _lastGoldJackpot = true; }
    }
    const baseVal = Math.round(base);   // round once
    const val = baseVal * G.activeMult; // exact — no rounding drift
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'gold', value: val, baseVal, rawBase, usedMult, label: '+' + val + ' 🪙', color: '#d97706' };
  }

  if (type === 'feather') {
    const fRange = CONFIG.featherDropRange;
    const baseVal = Math.ceil((fRange[0] + Math.random() * (fRange[1] - fRange[0])) * featherMult)
      + (typeof hammerPerk === 'function' && hammerPerk('crystal') ? 1 : 0);
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'feather', value: val, baseVal, usedMult, label: '+' + val + ' 🪶', color: '#059669' };
  }

  if (type === 'hammers') {
    const baseVal = HAMMER_PRIZES[Math.floor(Math.random() * HAMMER_PRIZES.length)];
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'hammers', value: val, baseVal, usedMult, label: '+' + val + ' 🔨', color: '#b45309' };
  }

  if (type === 'star') {
    const baseVal = (eDef.starPieces || 1) + (typeof hammerPerk === 'function' && hammerPerk('drumstick') && Math.random() < 0.25 ? 1 : 0);
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'star', value: val, baseVal, usedMult, label: '+' + val + ' ⭐', color: '#f59e0b' };
  }

  // For prize types not directly multiplied, give bonus gold when mult is active
  const bonusGold = G.activeMult > 1 ? Math.round(CONFIG.multBonusGoldBase * G.activeMult) : 0;
  const usedMultBonus = G.activeMult > 1 ? getSelectedMultValues() : null;

  if (type === 'mult') {
    const val = (hasBonus('unlock123') && Math.random() < CONFIG.mult123Chance)
      ? 123
      : MULT_VALUES[Math.floor(Math.random() * MULT_VALUES.length)];
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
        emoji: item[0], name: item[1], rarity: item[2], quote: (item[3] || '').replace(/^"+|"+$/g, ''),
        label: item[0] + ' ' + item[1] + (isNew ? ' (NEW!)' : ''),
        color: isNew ? '#b45309' : '#78716c',
      };
    }
  }
  // Fallback: give gold instead
  return { type: 'gold', value: 50, label: '+50 🪙', color: '#d97706' };
}

// All owned hammers/hats/monkeys give permanent bonuses (accumulative)
// Cached — call invalidateBonusCache() when equipment or monkeys change
// (_bonusCache / _achieveBonusCache declared in game.js — must exist before INIT runs)
function invalidateBonusCache() { _bonusCache = null; }
function invalidateAchieveCache() { _achieveBonusCache = null; }

function getAllBonuses() {
  if (_bonusCache) return _bonusCache;
  const bonuses = new Set();
  for (const id of G.ownedHammers) {
    const h = SHOP_HAMMERS.find(h => h.id === id);
    if (h && h.bonus) { if (Array.isArray(h.bonus)) h.bonus.forEach(b => bonuses.add(b)); else bonuses.add(h.bonus); }
  }
  for (const id of G.ownedHats) {
    const h = SHOP_HATS.find(h => h.id === id);
    if (h && h.bonus) { if (Array.isArray(h.bonus)) h.bonus.forEach(b => bonuses.add(b)); else bonuses.add(h.bonus); }
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
function _nudgeShopTab() {
  const shopTab = document.querySelector('.nav-tab[data-tab="shop"]');
  if (!shopTab) return;
  shopTab.classList.add('shop-nudge');
  setTimeout(() => shopTab.classList.remove('shop-nudge'), 6000);
}

function noHammerMsg() {
  if (!_shopNudgeDone) {
    _shopNudgeDone = true;
    _nudgeShopTab();
    return 'Out of hammers — buy more in the Shop!';
  }
  return NO_HAMMER_MSGS[Math.floor(Math.random() * NO_HAMMER_MSGS.length)];
}

function _maybeStuckHint() {
  if (G.hammersDepleted % 5 !== 0) return;
  if (curProgress().completed) return;

  // "Almost there" — ≤5 items from next tier: targeted purchase nudge
  try {
    const si = curActiveStage();
    const prog = curProgress();
    const stage = curStage();
    const tier = (prog.tiers || [])[si] || 0;
    if (tier < 2) {
      const found = (prog.collections[si] || []).filter(Boolean).length;
      const total = stage.collection.items.length;
      const tt = CONFIG.tierThresholds;
      const nextThresh = Math.ceil(total * [tt.bronze, tt.silver][tier]);
      const needed = nextThresh - found;
      const goal = tier === 0 ? 'a hammer bonus' : 'unlocking the next stage';
      if (needed > 0 && needed <= 5) {
        msg('⚡ ' + needed + (needed === 1 ? ' item' : ' items') + ' from ' + goal + ' — a Hammer Pack would get you there!', 'tiers');
        return;
      }
    }
  } catch (_) {}

  if (Math.floor(G.hammersDepleted / 5) % 2 === 1) {
    msg('💡 Tip: grind Mr. Monkey stage 9 for gold & upgrades, then come back stronger!', 'tiers');
  } else {
    msg('💡 Tip: check the Premium Shop for gold & hammer boosts — they stack permanently!', 'tiers');
  }
}

function checkSpyglassHint() {
  if (!G['owned_spyglass'] && !G._spyglassHintShown && G.gold >= 5000) {
    G._spyglassHintShown = true;
    msg('💰 You have 5,000 gold! Buy the Spyglass 🔍 in the Shop to reveal egg names.', 'discovery');
    _nudgeShopTab();
    saveGame();
  }
}

// ==================== BALLOON EGG ====================
function startBalloonInflate(index, slot) {
  if (_balloonHold) return;
  const egg = G.roundEggs[index];
  if (!egg || egg.broken || egg.expired) return;
  if (G.hammers < 1) { G.hammersDepleted = (G.hammersDepleted || 0) + 1; msg(noHammerMsg(), 'noHammers'); _maybeStuckHint(); SFX.play('err'); return; }

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

/**
 * Warp a teleport egg to another spot on the tray: beam out where it stands,
 * reappear (beam in) somewhere else. The new position is stored on the egg so
 * a re-render (tab switch) keeps it there. Purely visual + positional — the
 * hit that triggered it has already been applied.
 */
function teleportEgg(index, slot) {
  const egg = G.roundEggs[index];
  const tray = $id('egg-tray');
  if (!egg || !slot || !tray) return;
  const tW = tray.offsetWidth, tH = tray.offsetHeight;
  if (!tW || !tH) return;
  const eW = 76, eH = 110, padX = 12, padTop = 10, padBot = 80;
  const maxX = Math.max(padX, tW - padX - eW);
  const maxY = Math.max(padTop, tH - padBot - eH);
  const from = egg._pos || { x: parseFloat(slot.style.left) || 0, y: parseFloat(slot.style.top) || 0 };

  // Land somewhere NEW: collect candidates that don't overlap another egg and
  // sit at least 35% of the tray diagonal from the start, then pick one at
  // random. (Taking the farthest candidate made the egg ping-pong between the
  // same two far corners every hit — v3.10.6.) If nothing passes the distance
  // filter, fall back to any non-overlapping spot.
  const minD = Math.hypot(maxX - padX, maxY - padTop) * 0.35;
  const far = [], near = [];
  for (let k = 0; k < 48; k++) {
    const x = padX + Math.random() * (maxX - padX);
    const y = padTop + Math.random() * (maxY - padTop);
    let clash = false;
    for (let j = 0; j < G.roundEggs.length; j++) {
      if (j === index) continue;
      const o = G.roundEggs[j]; if (!o || o.broken || o.expired || !o._pos) continue;
      if (Math.abs(o._pos.x - x) < eW * 0.85 && Math.abs(o._pos.y - y) < eH * 0.7) { clash = true; break; }
    }
    if (clash) continue;
    (Math.hypot(x - from.x, y - from.y) >= minD ? far : near).push({ x, y });
  }
  const pool = far.length ? far : near;
  let best = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  if (!best) best = { x: padX + Math.random() * (maxX - padX), y: padTop + Math.random() * (maxY - padTop) };

  const beam = (x, y, cls) => {
    const b = document.createElement('div');
    b.className = 'tele-beam ' + cls;
    b.style.left = (x + eW / 2) + 'px';
    b.style.top  = (y + 44) + 'px';
    tray.appendChild(b);
    setTimeout(() => b.remove(), 420);
  };

  slot.classList.add('tele-out');
  beam(from.x, from.y, 'tele-beam-out');
  SFX.play('starfall');
  Particles.sparkle(from.x + eW / 2, from.y + 44, 14, '#8fd8ff');

  setTimeout(() => {
    egg._pos = best;
    slot.style.left = best.x + 'px';
    slot.style.top  = best.y + 'px';
    slot.classList.remove('tele-out');
    slot.classList.add('tele-in');
    beam(best.x, best.y, 'tele-beam-in');
    Particles.sparkle(best.x + eW / 2, best.y + 44, 18, '#a9d6ff');
    setTimeout(() => slot.classList.remove('tele-in'), 300);
  }, 130);
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
  checkReviewPrompt();

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
    if (prize.type === 'banana')     prize.label = '+' + prize.value + ' 🍌!';
    if (prize.type === 'maxHammers') prize.label = '+' + prize.value + ' max hammers!';
  }
  prize.popPrefix = '🎈 POP! ';

  slot.innerHTML = makeEggSVG(egg.type, egg.maxHp) + eggLabel(egg.type, 0, egg.maxHp, true);

  setTimeout(() => {
    // Hexed eggs: only the curse fires, no prize reward
    if (egg.effects && egg.effects.includes('hex')) {
      applyHex(cx, cy);
    } else {
      _prizeEggType = egg.type;
      applyPrize(prize, cx, cy);
      _prizeEggType = null;
    }
    if (G.activeMult > 1) { consumeMultiplier(); }
    renderMultQueue();
    updateStarBtn();

    if (G.roundEggs.every(e => e.broken || e.expired) && !_roundPending) {
      _roundPending = true;
      G.roundClears++;
      if (!G._secretSweep && G.roundEggs.every(e => e.broken)) { G._secretSweep = true; checkAchievements(); }
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
  if (typeof _rageActive !== 'undefined' && _rageActive) { if (typeof stopMonkeyRage === 'function') stopMonkeyRage(); return; }
  const egg = G.roundEggs[index];
  if (egg.effects && egg.effects.includes('balloon')) return; // balloon eggs use long-press
  if (egg._smashing) return;
  // The tray is emptied by renderEggTray() when the play panel is collapsed
  // (another tab open) and a round changes there. Programmatic taps in that
  // state (Auto-Smasher, Rage) used to take the _smashing lock and then throw
  // on the missing slot, leaving the egg permanently unclickable once the
  // player came back. No slot → no smash; callers simply retry later.
  if (!$id('egg-tray').children[index]) return;
  egg._smashing = true;

  // Each hit costs 1 hammer
  if (G.hammers < 1) {
    G.hammersDepleted = (G.hammersDepleted || 0) + 1;
    egg._smashing = false;
    msg(noHammerMsg(), 'noHammers');
    _maybeStuckHint();
    SFX.play('err');
    return;
  }

  // Animate IMMEDIATELY before any logic
  const slots = $id('egg-tray').children;
  const slot = slots[index];
  const isSpecial = ['crystal','ruby','black','century'].includes(egg.type);

  if (isSpecial) {
    SFX.play('crunch');
    shake(slot, egg.hp <= 1 ? 'lg' : 'md');
    // Slot punch animation
    slot.classList.remove('egg-crunching');
    void slot.offsetWidth;
    slot.classList.add('egg-crunching');
    slot.addEventListener('animationend', () => slot.classList.remove('egg-crunching'), { once: true });
    // White flash overlay
    const flash = document.createElement('div');
    flash.className = 'crunch-flash';
    slot.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove(), { once: true });
    // No tray movement — the slot crunch + flash carry the feedback. The old
    // tray-wiggle translated the whole tray ±4px on every special-egg hit,
    // which read as the screen shaking (removed v3.11.5, same reasoning as
    // the Banana Shake wiggle removal in v3.11.4).
  } else {
    SFX.play('hit');
    // `smashing` drives egg-smash-retro — the squash-and-rotate wiggle that
    // reads as "you hit it". v3.2.1 swapped it for shake(), whose few-pixel
    // translate is nearly invisible on a phone, and the class survived only
    // on the rage/starfall paths. Restored here; specials keep egg-crunch,
    // which is stronger and would otherwise lose the cascade to `smashing`.
    punchEgg(slot);
  }

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
  if (!G._firstSmashAt) {          // activation signal for the acquisition funnel
    G._firstSmashAt = Date.now();
    track('first-smash');
    if (typeof metaTrack === 'function') metaTrack('FirstSmash');
  }
  if (hasBonus('freeEgg') && Math.random() < 0.03) {
    G.hammers = Math.min(G.maxH, G.hammers + 1);
    spawnFloat($id('prize-zone'), 'Free hit!', '#b0bec5', 'big', cx, cy - 30);
    msg('Free hit! (Chef\'s Hat)', 'freehit');
  }

  if (!regenInt && G.hammers < G.maxH) startRegen();

  egg.hp -= 1;

  // Hammer mastery: XP for the equipped hammer + L5 free-hit refund + spark trail
  if (typeof addHammerXp === 'function') {
    addHammerXp(CONFIG.hammerMastery.xpHit);
    const _hl = hammerOwned(G.hammer) ? hammerLevel(G.hammer) : 0;
    if (_hl >= 5) {
      if (Math.random() < CONFIG.hammerMastery.refundChanceL5) { G.hammers += 1; spawnFloat($id('prize-zone'), '⚒️ free hit', '#ffe27a', '', cx, cy - 26); }
      Particles.sparkle(cx, cy - 10, _hl >= 10 ? 8 : 4, hammerSparkColor(G.hammer));
    }
  }

  // Cucumber double hit: 5% chance for a bonus hit (grows with mastery; L10 can chain a third)
  if (hasBonus('doubleHit') && Math.random() < 0.05 + hammerBoost('cucumber', 'doubleHit') && egg.hp > 0) {
    egg.hp -= 1;
    spawnFloat($id('prize-zone'), '🥒 Double hit!', '#4ade80', 'big', cx, cy - 30);
    if (hammerPerk('cucumber') && egg.hp > 0 && Math.random() < 0.5) {
      egg.hp -= 1;
      spawnFloat($id('prize-zone'), '🥒🥒 Triple!', '#4ade80', 'mega', cx, cy - 50);
      msg('🥒 Salad days! Triple hit!', 'cucumber');
    } else {
      msg('🥒 Cucumbah! Double hit!', 'cucumber');
    }
  }

  // Mjǫllnir: 3% chance to grant +7 star pieces (grows with mastery)
  if (hasBonus('mjolnirStarfall') && Math.random() < 0.03 + hammerBoost('mjolnir', 'starfall')) {
    G.starPieces += 7;
    G.totalStarPieces += 7;
    updateStarBtn();
    spawnFloat($id('prize-zone'), '⚡ +7 ✦', '#ffe033', 'big', cx, cy - 30);
    msg('⚡ Mjǫllnir strikes! +7 star pieces', 'mjolnir');
  }

  // Judge Gavel: Order! — 4% chance: instant verdict, egg breaks immediately (not on century)
  if (hasBonus('gavelVerdict') && egg.hp > 0 && egg.type !== 'century' && Math.random() < 0.04 + hammerBoost('gavel', 'verdict')) {
    egg.hp = 0;
    spawnFloat($id('prize-zone'), 'Order!', '#d8a0ff', 'mega', cx, cy - 50);
    msg('⚖️ Order! Verdict: Guilty. The egg is sentenced to break.', 'gavel');
    SFX.play('crunch');
    if (hammerPerk('gavel')) { G.hammers += 1; msg('⚖️ Appeal granted — hammer refunded', 'gavel'); }
  }

  const particleCount = isSpecial
    ? 18 + (egg.maxHp - egg.hp) * 7
    : 8 + (egg.maxHp - egg.hp) * 5;
  Particles.emit(cx, cy, egg.type, particleCount);

  // Teleport egg: every landed hit warps it to a free spot on the tray
  if (egg.hp > 0 && egg.effects && egg.effects.includes('teleport')) {
    G.teleportsChased = (G.teleportsChased || 0) + 1;
    teleportEgg(index, slot);
  }

  if (egg.hp > 0) {
    // Timer eggs: stop countdown after first hit (keep in effects for 3x prize at break)
    if (egg.effects && egg.effects.includes('timer')) {
      egg._timerStopped = true;
      slot.classList.remove('timed');
    }
    // Century egg: +100 gold on every hit before the final break
    if (egg.type === 'century') {
      G.gold += 100;
      G.totalGold += 100;
      spawnFloat($id('prize-zone'), '+100 🪙', '#d97706', '', cx, cy);
      SFX.play('coin');
    }
    const damage = egg.maxHp - egg.hp;
    slot.classList.remove('spawning');   // a hit ends the summon pop for good (see render.js)
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
  if (G.totalEggs === 1) { track('first-break'); if (typeof maybeShowWelcome === 'function') maybeShowWelcome(); }
  if (typeof addHammerXp === 'function') addHammerXp(CONFIG.hammerMastery.xpBreak);
  checkReviewPrompt();
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
  // Teleport egg pays CONFIG.teleportEgg.rewardMult× — same shape as the balloon bonus
  if (prize && egg.effects && egg.effects.includes('teleport')) {
    const tm = CONFIG.teleportEgg.rewardMult;
    G.teleportsCaught = (G.teleportsCaught || 0) + 1;
    if (prize.type === 'mult') {
      prize.count = (prize.count || 1) * tm;
      prize.label = prize.count + '× x' + prize.value + ' mult!';
    } else if (['gold','star','feather','hammers','banana','maxHammers'].includes(prize.type)) {
      const chipTotal = G.activeMult > 1 ? G.activeMult : 0;
      if (chipTotal > 0) {
        prize.value = Math.round(prize.value * (tm + chipTotal) / chipTotal);
        prize.balloonMult = tm + chipTotal;
        prize.usedMult = null;
      } else {
        if (prize.value) prize.value *= tm;
        prize.balloonMult = tm;
      }
      if (prize.type === 'banana')     prize.label = '+' + prize.value + ' 🍌!';
      if (prize.type === 'maxHammers') prize.label = '+' + prize.value + ' max hammers!';
    }
    prize.popPrefix = '✨ CAUGHT! ';
  }

  // Effect eggs get bonus rewards
  const fx = egg.effects || [];
  if (prize && (fx.includes('runny') || fx.includes('timer'))) {
    const chipTotal = G.activeMult > 1 ? G.activeMult : 0;
    if (prize.type === 'mult') {
      // Multiply count, not face value — value must stay a valid MULT_BADGE_VALUES entry
      prize.count = (prize.count || 1) * 3;
      prize.label = 'x3 ' + prize.label;
    } else if (chipTotal > 0) {
      // Additive: egg bonus(3) + chips instead of 3 × chips
      if (prize.value) prize.value = Math.round(prize.value * (3 + chipTotal) / chipTotal);
      prize.usedMult = null; // suppress chips equation; combined value shown in label
      const combinedMult = 3 + chipTotal;
      const v = prize.value;
      if (prize.type === 'gold')         prize.label = 'x' + combinedMult + ' +' + v + ' 🪙';
      else if (prize.type === 'feather') prize.label = 'x' + combinedMult + ' +' + v + ' 🪶';
      else if (prize.type === 'hammers') prize.label = 'x' + combinedMult + ' +' + v + ' 🔨';
      else if (prize.type === 'star')    prize.label = 'x' + combinedMult + ' +' + v + ' ⭐';
      else prize.label = 'x' + combinedMult + ' ' + prize.label;
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
      // Fixed rewards: 10k gold + 50 feathers + 50 star pieces (never multiplied — century is immune to mults)
      const mult = 1;
      // Gold with equipment bonuses
      let gVal = 10000 * mult;
      if (hasBonus('moreGold'))  gVal = Math.round(gVal * 1.2);
      if (hasBonus('goldBoost')) gVal = Math.round(gVal * 1.1);
      if (hasBonus('allfather')) gVal = Math.round(gVal * 1.1);
      if (hasBonus('goldBoost50')) gVal = Math.round(gVal * 1.50);
      const _ab = getAchievementBonuses();
      if (_ab.goldPct > 0) gVal = Math.round(gVal * (1 + _ab.goldPct / 100));
      if (G.stagesCompleted > 0) gVal = Math.round(gVal * (1 + Math.min(G.stagesCompleted * 0.02, 0.30)));
      if (G['owned_goldmagnet']) gVal = Math.round(gVal * 1.2);
      _prizeEggType = 'century';
      applyPrize({ type: 'gold',    value: gVal,     label: '🌀 Century! +' + gVal + ' 🪙',      color: '#d97706' }, cx, cy);
      const fVal = Math.round(50 * mult);
      if (G.monkeys[0]?.completed) applyPrize({ type: 'feather', value: fVal, label: '🌀 +' + fVal + ' 🪶!', color: '#059669' }, cx, cy);
      const sVal = Math.round(50 * mult);
      applyPrize({ type: 'star',    value: sVal,     label: '🌀 +' + sVal + ' star pieces!',     color: '#f59e0b' }, cx, cy);
      if (Math.random() < 0.25) applyPrize(resolvePrize('item', 'century'), cx, cy);
      _prizeEggType = null;
    } else {
      _prizeEggType = egg.type;
      applyPrize(prize, cx, cy);
      _prizeEggType = null;
    }

    // Update egg visual to fully broken
    slot.classList.add('broken');
    slot.innerHTML = makeEggSVG(egg.type, egg.maxHp) +
      eggLabel(egg.type, 0, egg.maxHp, true);

    // Check if all eggs broken — auto-spawn next round
    if (G.roundEggs.every(e => e.broken || e.expired) && !_roundPending) {
      _roundPending = true;
      G.roundClears++;
      if (!G._secretSweep && G.roundEggs.every(e => e.broken)) { G._secretSweep = true; checkAchievements(); }
      checkAchievements();
      setTimeout(() => newRound(), 600);
    }

    // Century eggs are immune to multipliers — preserve the active mult
    if (G.activeMult > 1 && egg.type === 'century') {
      msg('🌀 Century egg! x' + G.activeMult + ' mult preserved.', 'specials');
      renderMultQueue();
    } else if (G.activeMult > 1) {
      consumeMultiplier();
      renderMultQueue();
    }

    updateResources();
    updateStageBar();
    saveGame();
  }, 250);
}

function applyPrize(prize, cx, cy) {
  // Golden Goose: adds base×3 as a flat bonus on top of normal rewards (not ×3 on final)
  // e.g. ruby 10g × 10 = 100g → 100g + 10g×3 = 130g, not 300g
  if (typeof _gooseActive !== 'undefined' && _gooseActive && typeof _prizeEggType !== 'undefined' && _prizeEggType !== 'century') {
    if (prize.type === 'gold' || prize.type === 'feather' || prize.type === 'star' || prize.type === 'hammers') {
      const gooseBase = prize.type === 'gold' ? (prize.rawBase || prize.baseVal) : prize.baseVal;
      const bonus = gooseBase * 3;
      const newVal = prize.value + bonus;
      prize = { ...prize, value: newVal, label: prize.label.replace(/\+(\d+)/, '+' + newVal) };
    }
    _gooseEggsLeft--;
    G._gooseEggsLeft = _gooseEggsLeft;
    if (_gooseEggsLeft <= 0) setTimeout(_finishGoose, 100);
  }

  const zone = $id('prize-zone');

  if (prize.type === 'empty') {
    const emptyCount = G.activeMult > 1 ? G.activeMult : 1;
    G.totalEmpties = (G.totalEmpties || 0) + emptyCount;
    if (typeof hammerPerk === 'function' && hammerPerk('bat')) {
      G.gold += 25; G.totalGold += 25;
      spawnFloat(zone, '🦇 +25 🪙 consolation', '#d97706', '', cx, cy - 22);
    }
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
    if (_lastGoldJackpot) { _lastGoldJackpot = false; spawnFloat(zone, '⭐ JACKPOT ×5', '#FFD700', 'mega', cx, cy - 56); msg('⭐ Golden Hammer jackpot! ×5 gold', 'specials'); }
    const cls = prize.value >= 300 ? 'mega' : prize.value >= 80 ? 'big' : '';
    if (prize.balloonMult || prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, '🪙', prize.balloonMult, prize.popPrefix);
      spawnFloat(zone, eq, '#d97706', cls || 'big', cx, cy);
      msg(eq, 'prizes');
    } else {
      spawnFloat(zone, prize.label, '#d97706', cls, cx, cy);
      msg(prize.label, 'prizes');
    }
    SFX.play('coin');
    const sparkCount = prize.value >= 300 ? 22 : prize.value >= 80 ? 14 : 6;
    Particles.sparkle(cx, cy, sparkCount, '#FFD700');
    spawnCoinFly(cx, cy, prize.value);
  }

  if (prize.type === 'star') {
    G.starPieces += prize.value;
    G.totalStarPieces += prize.value;
    if (prize.balloonMult || prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, '⭐', prize.balloonMult, prize.popPrefix);
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
      spawnFloat(zone, '+' + prize.bonusGold + ' 🪙 (mult bonus)', '#d97706', '', cx, cy - 20);
      msg('+' + prize.bonusGold + ' 🪙 (mult bonus)', 'prizes');
    }
  }

  if (prize.type === 'feather') {
    G.feathers += prize.value;
    G.totalFeathers += prize.value;
    if (prize.balloonMult || prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, '🪶', prize.balloonMult, prize.popPrefix);
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
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, '🔨', prize.balloonMult, prize.popPrefix);
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
      spawnFloat(zone, '+' + prize.bonusGold + ' 🪙 (mult bonus)', '#d97706', '', cx, cy - 20);
      msg('+' + prize.bonusGold + ' 🪙 (mult bonus)', 'prizes');
    }
  }

  if (prize.type === 'maxHammers') {
    G.maxH += prize.value;
    if (G.hammers < G.maxH) G.hammers = Math.min(G.maxH, G.hammers + prize.value);
    const mhLabel = (prize.popPrefix || '') + prize.label;
    spawnFloat(zone, mhLabel, prize.color, 'mega', cx, cy);
    msg(mhLabel, 'prizes');
    SFX.play('levelup');
    Particles.sparkle(cx, cy, 20, '#b45309');
    if (prize.bonusGold) {
      G.gold += prize.bonusGold; G.totalGold += prize.bonusGold;
      spawnFloat(zone, '+' + prize.bonusGold + ' 🪙 (mult bonus)', '#d97706', '', cx, cy - 20);
      msg('+' + prize.bonusGold + ' 🪙 (mult bonus)', 'prizes');
    }
  }

  if (prize.type === 'item') {
    const prog = curProgress();
    const si = curActiveStage();
    const wasNew = prize.isNew;
    if (wasNew) {
      prog.collections[si][prize.index] = true;
      G.totalItems++;
      // Hammer mastery: rare-item XP — Starfall finds count too (v3.11.5)
      if (prize.rarity === 3 && typeof addHammerXp === 'function') addHammerXp(CONFIG.hammerMastery.xpRare);
    }
    if (!wasNew) spawnFloat(zone, prize.label, prize.color, '', cx, cy);
    if (wasNew) {
      SFX.play('item');
      Particles.sparkle(cx, cy, 15, '#F59E0B');
      // Show popup for new item
      msg('New item collected: ' + prize.emoji + ' ' + prize.name, 'items');
      setTimeout(() => showItemToast(prize), 400);
      // First rare item tutorial modal
      if (prize.rarity === 3 && !G._firstRareSeen) {
        G._firstRareSeen = true;
        saveGame();
        setTimeout(() => showConfirm('💎', 'First Rare Item!',
          'Rare items are the hardest to find — nice pull! 🎉<br><br>Collect all items in a stage to complete it. Check your progress in the <strong>Album</strong>.',
          () => { document.querySelector('[data-tab="album"]').click(); },
          'View Album', 'Later'
        ), 1200);
      }
      // Check collection completion
      checkCollectionComplete();
    } else {
      // Duplicate - give gold scaled by rarity × egg goldMult (ruby=3x, black=4x, century=100x)
      const dRange = (CONFIG.duplicateGoldByRarity || {})[prize.rarity] || [20, 60];
      const dupeGold = Math.round((dRange[0] + Math.floor(Math.random() * (dRange[1] - dRange[0] + 1))) * (prize.goldMult || 1))
        * (typeof hammerPerk === 'function' && hammerPerk('rainbow') ? 2 : 1);
      G.gold += dupeGold;
      G.totalGold += dupeGold;
      msg('Duplicate! +' + dupeGold + ' 🪙', 'duplicates');
      SFX.play('coin');
    }
    if (prize.bonusGold) {
      G.gold += prize.bonusGold;
      G.totalGold += prize.bonusGold;
      spawnFloat(zone, '+' + prize.bonusGold + ' 🪙 (mult bonus)', '#d97706');
      msg('+' + prize.bonusGold + ' 🪙 (mult bonus)', 'prizes');
    }
  }

  checkAchievements();
}

