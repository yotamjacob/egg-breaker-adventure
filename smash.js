// ============================================================
//  Egg Smash Adventures — Smash Engine
//  smash.js  (requires game.js loaded first)
//  Round management, egg rolling, prize logic, balloon eggs,
//  smash handler, starfall, hex effect, collection completion.
// ============================================================

// ==================== ROUND MANAGEMENT ====================
// _roundPending, _spawningRound, _centuryCooldown, _stageEggsCache, _shopNudgeDone, _balloonHold
// all declared in game.js to avoid TDZ — hoisted functions here are called from game.js startup

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

  // Mr Monkey: slightly more item drops
  if (monkey && monkey.id === 'mr_monkey') w.item *= 1.5;

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
    const rawBase = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    // Apply all bonuses to the per-unit base BEFORE multiplying by activeMult so the
    // equation label is always exact (base × mult = total, no rounding drift).
    let base = rawBase * goldMult;
    if (hasBonus('moreGold'))  base *= 1.2;
    if (hasBonus('goldBoost')) base *= 1.1;
    if (hasBonus('allfather')) base *= 1.1;
    const ab = getAchievementBonuses();
    if (ab.goldPct > 0) base *= (1 + ab.goldPct / 100);
    // Progressive gold: +2% per completed stage, capped at +30%
    if (G.stagesCompleted > 0) base *= (1 + Math.min(G.stagesCompleted * 0.02, 0.30));
    if (G['owned_goldmagnet']) base *= 1.2;
    const baseVal = Math.round(base);   // round once
    const val = baseVal * G.activeMult; // exact — no rounding drift
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'gold', value: val, baseVal, usedMult, label: '+' + val + ' 🪙', color: '#d97706' };
  }

  if (type === 'feather') {
    const fRange = CONFIG.featherDropRange;
    const baseVal = Math.ceil((fRange[0] + Math.random() * (fRange[1] - fRange[0])) * featherMult);
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
    const baseVal = eDef.starPieces || 1;
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'star', value: val, baseVal, usedMult, label: '+' + val + ' ⭐', color: '#f59e0b' };
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
  if (!_shopNudgeDone) {
    _shopNudgeDone = true;
    const shopTab = document.querySelector('.nav-tab[data-tab="shop"]');
    if (shopTab) shopTab.classList.add('shop-nudge');
    return 'Out of hammers — buy more in the Shop!';
  }
  return NO_HAMMER_MSGS[Math.floor(Math.random() * NO_HAMMER_MSGS.length)];
}

function checkSpyglassHint() {
  if (!G['owned_spyglass'] && !G._spyglassHintShown && G.gold >= 5000) {
    G._spyglassHintShown = true;
    msg('💰 You have 5,000 gold! Buy the Spyglass 🔍 in the Shop to reveal egg names.', 'discovery');
    const shopTab = document.querySelector('.nav-tab[data-tab="shop"]');
    if (shopTab) shopTab.classList.add('shop-nudge');
    saveGame();
  }
}

// ==================== BALLOON EGG ====================
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
    msg('Free hit! (Chef\'s Hat)', 'freehit');
  }

  if (!regenInt && G.hammers < G.maxH) startRegen();

  egg.hp -= 1;

  // Cucumber double hit: 5% chance for a bonus hit
  if (hasBonus('doubleHit') && Math.random() < 0.05 && egg.hp > 0) {
    egg.hp -= 1;
    msg('🥒 Cucumbah! Double hit!', 'cucumber');
  }

  // Mjǫllnir: 3% chance to grant +7 star pieces
  if (hasBonus('mjolnirStarfall') && Math.random() < 0.03) {
    G.starPieces += 7;
    G.totalStarPieces += 7;
    updateStarBtn();
    msg('⚡ Mjǫllnir strikes! +7 star pieces', 'mjolnir');
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
      spawnFloat($id('egg-tray-wrap'), '+10 🪙', '#d97706', '', cx, cy);
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
      applyPrize({ type: 'gold',    value: gVal,     label: '🌀 Century! +' + gVal + ' 🪙',      color: '#d97706' }, cx, cy);
      const fVal = Math.round(50 * mult);
      applyPrize({ type: 'feather', value: fVal,     label: '🌀 +' + fVal + ' 🪶!',              color: '#059669' }, cx, cy);
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
      // prize.baseVal already has all bonuses baked in at the per-unit level, so the
      // equation label is always exact: totalMult × baseVal = prize.value (no rounding drift).
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, '🪙', prize.balloonMult, prize.popPrefix);
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
    G.hammers = Math.min(G.maxH, G.hammers + prize.value);
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
    }
    if (!wasNew) spawnFloat(zone, prize.label, prize.color, '', cx, cy);
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

