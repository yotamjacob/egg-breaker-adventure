// ============================================================
//  Egg Breaker Adventures – Game Engine
//  game.js  (requires data.js loaded first)
// ============================================================

// ==================== AUDIO ====================
const SFX = (() => {
  let ctx, on = true;
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, vol, type) {
    const c = ensure(), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }
  function noise(dur, vol) {
    const c = ensure(), len = c.sampleRate * dur;
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const s = c.createBufferSource(); s.buffer = buf;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(g).connect(c.destination); s.start();
  }
  function play(n) {
    if (!on) return;
    try {
      // 16-bit chiptune style: square & triangle waves
      if (n === 'hit')     { noise(.08, .2); tone(220, .06, .15, 'square'); tone(110, .04, .1, 'square'); }
      if (n === 'coin')    { tone(988, .08, .12, 'square'); setTimeout(() => tone(1319, .1, .1, 'square'), 50); }
      if (n === 'gem')     { tone(1047, .06, .1, 'square'); setTimeout(() => tone(1319, .06, .08, 'square'), 40); setTimeout(() => tone(1568, .12, .07, 'triangle'), 80); }
      if (n === 'star')    { tone(784, .08, .1, 'square'); setTimeout(() => tone(988, .08, .08, 'square'), 60); setTimeout(() => tone(1319, .12, .07, 'triangle'), 120); }
      if (n === 'item')    { [0,70,140].forEach((t, i) => setTimeout(() => tone(523 + i * 262, .1, .1, 'square'), t)); }
      if (n === 'empty')   { tone(165, .12, .1, 'square'); setTimeout(() => tone(131, .1, .08, 'square'), 60); }
      if (n === 'starfall'){ [0,50,100,150,200,250].forEach((t, i) => setTimeout(() => tone(440 * Math.pow(2, i / 5), .15, .1, 'square'), t)); }
      if (n === 'levelup') { [0,80,160,240].forEach((t, i) => setTimeout(() => tone(523 * Math.pow(2, i / 4), .18, .1, 'square'), t)); }
      if (n === 'achieve') { tone(880, .1, .1, 'square'); setTimeout(() => tone(1047, .1, .09, 'square'), 80); setTimeout(() => tone(1319, .15, .08, 'triangle'), 160); }
      if (n === 'buy')     { tone(523, .06, .1, 'square'); setTimeout(() => tone(659, .08, .08, 'square'), 50); }
      if (n === 'err')     { tone(196, .1, .12, 'square'); setTimeout(() => tone(165, .08, .1, 'square'), 60); }
      if (n === 'tier')    { [0,70,140,210,280].forEach((t, i) => setTimeout(() => tone(523 * Math.pow(2, i / 6), .15, .1, 'square'), t)); }
    } catch (_) {}
  }
  return { play, toggle() { on = !on; return on; }, isOn() { return on; } };
})();

// ==================== PARTICLES ====================
const Particles = (() => {
  let canvas, ctx, ps = [], running = false;
  const COLORS = {
    normal: ['#ffe8b0','#e8c878','#d4a840','#c09028'],
    silver: ['#c8d8e8','#a0b8c8','#88a0b0','#6888a0'],
    gold:   ['#FFD700','#FFA500','#FF8C00','#DAA520'],
  };
  function init(c) { canvas = c; ctx = c.getContext('2d'); resize(); window.addEventListener('resize', resize); }
  function resize() {
    if (!canvas.parentElement) return;
    const r = canvas.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function emit(cx, cy, type, count) {
    const cols = COLORS[type] || COLORS.normal;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 / count) * i + (Math.random() - .5) * .8;
      const sp = 3 + Math.random() * 5;
      ps.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp * (.7 + Math.random() * .6),
        vy: Math.sin(a) * sp - 2 - Math.random() * 2,
        life: 1, decay: .012 + Math.random() * .008,
        sz: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2, rv: (Math.random() - .5) * .3,
        grav: .12 + Math.random() * .06,
        col: cols[Math.random() * cols.length | 0], sh: 'shell',
      });
    }
    if (!running) loop();
  }
  function sparkle(cx, cy, count, col) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3;
      ps.push({
        x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        life: 1, decay: .02 + Math.random() * .015, sz: 1.5 + Math.random() * 2.5,
        rot: 0, rv: 0, grav: .02, col: col || '#FFD700', sh: 'star',
      });
    }
    if (!running) loop();
  }
  function loop() {
    running = true;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.vx *= .98; p.vy += p.grav; p.x += p.vx; p.y += p.vy;
      p.rot += p.rv; p.life -= p.decay;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2.5);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      if (p.sh === 'shell') {
        // Pixel-art: draw as small squares
        const s = Math.round(p.sz);
        ctx.fillRect(-s, -s, s * 2, s * 2);
        // Dark pixel border
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.fillRect(-s, s, s * 2, 1);
        ctx.fillRect(s, -s, 1, s * 2);
      } else {
        // Pixel-art sparkle: cross/plus shape
        const s = Math.round(p.sz);
        ctx.fillRect(-1, -s, 2, s * 2); // vertical
        ctx.fillRect(-s, -1, s * 2, 2); // horizontal
      }
      ctx.restore();
    }
    if (ps.length > 0) requestAnimationFrame(loop); else running = false;
  }
  return { init, emit, sparkle, resize };
})();

// ==================== GAME STATE ====================
const DEFAULT_STATE = {
  hammers: CONFIG.startingHammers, maxH: CONFIG.startingMaxHammers, gold: 0, starPieces: 0, crystalBananas: 0,
  feathers: 0,
  multQueue: [],     // multipliers in hand
  activeMult: 1,     // sum of all selected mults
  _selectedMults: [], // indices of selected multipliers in multQueue
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
  totalEggs: 0, totalGold: 0, totalStarPieces: 0, totalFeathers: 0,
  totalItems: 0, biggestWin: 0, highestMult: 1,
  starfallsUsed: 0, collectionsCompleted: 0, stagesCompleted: 0,
  roundClears: 0, feathersBought: 0, maxMultUsed: 0,
  achieved: [],
  soundOn: true,
};

let G = {};
let regenInt = null;

function initMonkeys() {
  return MONKEY_DATA.map((m, i) => ({
    unlocked: i === 0,
    stage: 0, tier: 0,  // 0=bronze,1=silver,2=gold
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
  if (!confirm('Reset ALL progress? This cannot be undone!')) return;
  localStorage.removeItem(SAVE_KEY);
  G = { ...DEFAULT_STATE, monkeys: initMonkeys(), roundEggs: null };
  regenInt = null;
  newRound();
  renderAll();
  msg('Progress reset!', '#ef4444');
}

// ==================== DAILY LOGIN ====================
function checkDaily() {
  const today = new Date().toISOString().slice(0, 10);
  if (G.lastLoginDate === today) {
    if (G.dailyClaimed) {
      $id('daily-box').classList.add('claimed');
      $id('daily-btn').disabled = true;
      $id('daily-btn').textContent = 'Claimed!';
    }
    return;
  }
  // New day
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (G.lastLoginDate === yesterday) {
    G.consecutiveDays++;
  } else {
    G.consecutiveDays = 1;
  }
  G.lastLoginDate = today;
  G.dailyClaimed = false;
  $id('daily-box').classList.remove('claimed');
  $id('daily-btn').disabled = false;
  $id('daily-btn').textContent = 'Claim!';
  $id('daily-day').textContent = G.consecutiveDays;
  const bonus = Math.min(G.consecutiveDays * CONFIG.dailyBonusPerDay, CONFIG.dailyBonusCap);
  $id('daily-detail').textContent = '+' + (CONFIG.dailyBaseHammers + bonus) + ' hammers';
}

function claimDaily() {
  if (G.dailyClaimed) return;
  const bonus = Math.min(G.consecutiveDays * CONFIG.dailyBonusPerDay, CONFIG.dailyBonusCap);
  const total = CONFIG.dailyBaseHammers + bonus;
  G.hammers = Math.min(G.maxH, G.hammers + total);
  G.dailyClaimed = true;
  G.totalDailyClaims = (G.totalDailyClaims || 0) + 1;
  $id('daily-box').classList.add('claimed');
  $id('daily-btn').disabled = true;
  $id('daily-btn').textContent = 'Claimed!';
  msg('+' + total + ' hammers!', '#16a34a');
  SFX.play('coin');
  checkAchievements();
  updateResources();
  saveGame();
}

// ==================== HELPERS ====================
function $id(id) { return document.getElementById(id); }

function msg(text, color) {
  const el = $id('status-txt');
  el.style.color = color || '#d97706';
  el.textContent = text;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = ''; }, 2800);
}

function spawnFloat(zone, text, color, cls) {
  const el = document.createElement('div');
  el.className = 'prize-float' + (cls ? ' ' + cls : '');
  el.style.color = color;
  el.style.left = (20 + Math.random() * 60) + '%';
  el.style.top = (10 + Math.random() * 30) + '%';
  el.textContent = text;
  zone.appendChild(el);
  setTimeout(() => el.remove(), cls === 'mega' ? 3200 : cls === 'big' ? 2700 : 2200);
}

function shake(level) {
  const el = $id('egg-tray-wrap');
  el.classList.remove('shake-sm', 'shake-md', 'shake-lg');
  void el.offsetWidth;
  el.classList.add('shake-' + level);
}

function curMonkey() { return MONKEY_DATA[G.activeMonkey]; }
function curProgress() { return G.monkeys[G.activeMonkey]; }
function curStage() { return curMonkey().stages[curProgress().stage]; }

// ==================== ROUND MANAGEMENT ====================
function newRound() {
  const prog = curProgress();
  if (prog.completed && prog.stage >= curMonkey().stages.length - 1) {
    // All stages done for this monkey
    msg('All stages complete! Try another monkey.', '#7c3aed');
    G.roundEggs = null;
    renderEggTray();
    return;
  }
  const stage = curStage();
  const count = stage.eggs;
  const eggs = [];
  const spawnTotal = EGG_SPAWN_WEIGHTS.normal + EGG_SPAWN_WEIGHTS.silver + EGG_SPAWN_WEIGHTS.gold;
  for (let i = 0; i < count; i++) {
    const r = Math.random() * spawnTotal;
    let type = 'normal';
    if (r < EGG_SPAWN_WEIGHTS.gold) type = 'gold';
    else if (r < EGG_SPAWN_WEIGHTS.gold + EGG_SPAWN_WEIGHTS.silver) type = 'silver';
    const hp = EGG_HP[type];
    eggs.push({ type, hp, maxHp: hp, broken: false });
  }
  G.roundEggs = eggs;
  $id('hint-txt').classList.remove('hidden');
  renderEggTray();
  updateResources();
  saveGame();
}

// ==================== EGG RENDERING (16-bit pixel style) ====================
// damage: 0 = pristine, 1 = light cracks, 2 = heavy cracks, 3+ = broken
function makeEggSVG(type, damage) {
  const colors = {
    normal: { f: '#FEF9F0', s: '#D4A853', h: '#fff8e0', sh: '#b8922e' },
    silver: { f: '#d8dde3', s: '#8899aa', h: '#eceff2', sh: '#667788' },
    gold:   { f: '#FFD700', s: '#B8860B', h: '#ffe44d', sh: '#8B6508' },
  };
  const c = colors[type] || colors.normal;
  const crk = '#5a3010';
  let cracks = '';
  if (damage >= 1) {
    // Light cracks — top-center zigzag
    cracks += `
    <rect x="36" y="20" width="3" height="3" fill="${crk}"/>
    <rect x="33" y="23" width="3" height="3" fill="${crk}"/>
    <rect x="36" y="26" width="3" height="3" fill="${crk}"/>
    <rect x="39" y="29" width="3" height="3" fill="${crk}"/>
    <rect x="36" y="32" width="3" height="3" fill="${crk}"/>`;
  }
  if (damage >= 2) {
    // Heavy cracks — right side + left side
    cracks += `
    <rect x="48" y="28" width="3" height="3" fill="${crk}"/>
    <rect x="45" y="31" width="3" height="3" fill="${crk}"/>
    <rect x="48" y="34" width="3" height="3" fill="${crk}"/>
    <rect x="45" y="37" width="3" height="3" fill="${crk}"/>
    <rect x="24" y="40" width="3" height="3" fill="${crk}"/>
    <rect x="27" y="43" width="3" height="3" fill="${crk}"/>
    <rect x="24" y="46" width="3" height="3" fill="${crk}"/>
    <rect x="33" y="35" width="3" height="3" fill="${crk}"/>`;
  }
  const highlight = `
    <rect x="26" y="22" width="3" height="18" fill="${c.h}" opacity=".5"/>
    <rect x="29" y="19" width="3" height="12" fill="${c.h}" opacity=".35"/>`;
  return `<svg width="72" height="88" viewBox="0 0 80 96" shape-rendering="crispEdges">
    <ellipse cx="40" cy="90" rx="18" ry="4" fill="rgba(0,0,0,.25)"/>
    <ellipse cx="40" cy="50" rx="26" ry="35" fill="${c.s}" />
    <ellipse cx="40" cy="50" rx="23" ry="32" fill="${c.f}" />
    <ellipse cx="40" cy="34" rx="16" ry="10" fill="${c.h}" opacity=".25"/>
    ${highlight}
    <ellipse cx="40" cy="68" rx="18" ry="8" fill="${c.sh}" opacity=".2"/>
    ${cracks}
  </svg>`;
}

function renderEggTray() {
  const tray = $id('egg-tray');
  tray.innerHTML = '';
  if (!G.roundEggs || G.roundEggs.length === 0) {
    newRound();
    return;
  }
  G.roundEggs.forEach((egg, i) => {
    const slot = document.createElement('div');
    slot.className = 'egg-slot' + (egg.broken ? ' broken' : '') + (egg.type === 'gold' ? ' gold-egg' : '');
    const damage = egg.maxHp - egg.hp;
    slot.innerHTML = makeEggSVG(egg.type, egg.broken ? egg.maxHp : damage) +
      '<span class="egg-label">' + egg.type +
      (egg.broken ? '' : ' ' + egg.hp + '/' + egg.maxHp) + '</span>';
    slot.setAttribute('data-idx', String(i));
    if (!egg.broken) slot.onclick = function() { smashEgg(i); };
    tray.appendChild(slot);
  });
}

function getSelectedMultValues() {
  if (!G._selectedMults || G._selectedMults.length === 0) return [];
  return G._selectedMults.map(i => G.multQueue[i]);
}

function multEquation(base, multVals, result, unit) {
  if (multVals.length === 1) {
    return base + ' x' + multVals[0] + ' = ' + result + ' ' + unit;
  }
  return base + ' x(' + multVals.join('+') + ') = ' + result + ' ' + unit;
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
  const silverMult = eggType === 'silver' ? 2 : 1;
  const goldMult = eggType === 'gold' ? 1.5 : 1;

  if (type === 'empty') return { type: 'empty', value: 0, label: 'Empty!', color: '#9ca3af' };

  if (type.startsWith('gold_')) {
    const range = GOLD_VALUES[type];
    const baseVal = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    let val = Math.round(baseVal * G.activeMult * silverMult * goldMult);
    if (hasBonus('moreGold')) val = Math.round(val * 1.2);
    if (hasBonus('goldBoost')) val = Math.round(val * 1.1);
    const ab = getAchievementBonuses();
    if (ab.goldPct > 0) val = Math.round(val * (1 + ab.goldPct / 100));
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'gold', value: val, baseVal, usedMult, label: '+' + val + ' gold', color: '#d97706' };
  }

  if (type === 'feather') {
    const fRange = CONFIG.featherDropRange;
    const baseVal = Math.ceil((fRange[0] + Math.random() * (fRange[1] - fRange[0])) * silverMult);
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
    const baseVal = silverMult > 1 ? CONFIG.starPiecesPerDrop.silver : CONFIG.starPiecesPerDrop.normal;
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? getSelectedMultValues() : null;
    return { type: 'star', value: val, baseVal, usedMult, label: '+' + val + ' star piece' + (val > 1 ? 's' : ''), color: '#f59e0b' };
  }

  // For prize types not directly multiplied, give bonus gold when mult is active
  const bonusGold = G.activeMult > 1 ? Math.round(CONFIG.multBonusGoldBase * G.activeMult) : 0;
  const usedMultBonus = G.activeMult > 1 ? getSelectedMultValues() : null;

  if (type === 'mult') {
    const val = MULT_VALUES[Math.floor(Math.random() * MULT_VALUES.length)];
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
  const stage = curStage();
  const prog = curProgress();
  const items = stage.collection.items;
  const collected = prog.collections[prog.stage];

  // Weight uncollected items higher (pity system)
  const weights = items.map((item, i) => {
    const rarity = item[2]; // 1=common, 2=uncommon, 3=rare
    const rw = CONFIG.itemRarityWeights;
    const baseW = rarity === 1 ? rw.common : rarity === 2 ? rw.uncommon : rw.rare;
    return collected[i] ? baseW * CONFIG.itemDuplicateMultiplier : baseW * CONFIG.itemPityMultiplier;
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
    msg(noHammerMsg(), '#ef4444');
    SFX.play('err');
    return;
  }

  G.hammers -= 1;

  // Chef hat: 10% chance hit was free
  if (hasBonus('freeEgg') && Math.random() < 0.1) {
    G.hammers = Math.min(G.maxH, G.hammers + 1);
    msg('Free hit! (Chef\'s Hat)', '#16a34a');
  }

  // Start regen if needed
  if (!regenInt && G.hammers < G.maxH) startRegen();

  $id('hint-txt').classList.add('hidden');

  // Reduce HP
  egg.hp -= 1;

  // Animate hammer swing
  const hammerEl = $id('hammer');
  hammerEl.classList.remove('hammer-anim');
  void hammerEl.offsetWidth;
  hammerEl.classList.add('hammer-anim');

  // Animate the egg slot
  const slots = $id('egg-tray').children;
  const slot = slots[index];
  slot.classList.add('smashing');
  setTimeout(() => slot.classList.remove('smashing'), 450);

  // Sound & particles (more particles as egg gets weaker)
  SFX.play('hit');
  const rect = slot.getBoundingClientRect();
  const wrapRect = $id('egg-tray-wrap').getBoundingClientRect();
  const cx = rect.left - wrapRect.left + rect.width / 2;
  const cy = rect.top - wrapRect.top + rect.height / 2;
  const particleCount = 4 + (egg.maxHp - egg.hp) * 3;
  Particles.emit(cx, cy, egg.type, particleCount);
  shake(egg.hp <= 0 ? 'md' : 'sm');

  if (egg.hp > 0) {
    // Egg damaged but not broken — update visual with cracks
    const damage = egg.maxHp - egg.hp;
    slot.innerHTML = makeEggSVG(egg.type, damage) +
      '<span class="egg-label">' + egg.type + ' ' + egg.hp + '/' + egg.maxHp + '</span>';
    setTimeout(() => { egg._smashing = false; }, 300);
    updateResources();
    saveGame();
    return;
  }

  // === Egg broken! ===
  egg.broken = true;
  G.totalEggs++;

  // Track egg type smashes
  if (egg.type === 'silver') G.silverSmashed = (G.silverSmashed || 0) + 1;
  if (egg.type === 'gold') G.goldSmashed = (G.goldSmashed || 0) + 1;

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
    if (G.roundEggs.every(e => e.broken)) {
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
    spawnFloat(zone, 'Empty!', '#9ca3af');
    msg('Nothing this time...', '#9ca3af');
    SFX.play('empty');
    return;
  }

  if (prize.type === 'gold') {
    G.gold += prize.value;
    G.totalGold += prize.value;
    G.biggestWin = Math.max(G.biggestWin, prize.value);
    const cls = prize.value >= 500 ? 'mega' : prize.value >= 200 ? 'big' : '';
    if (prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'gold');
      spawnFloat(zone, eq, '#d97706', cls || 'big');
      msg(eq + '!', '#d97706');
    } else {
      spawnFloat(zone, prize.label, '#d97706', cls);
      msg(prize.label, '#d97706');
    }
    SFX.play('coin');
    if (prize.value >= 200) Particles.sparkle(cx, cy, 12, '#FFD700');
  }

  if (prize.type === 'star') {
    G.starPieces += prize.value;
    G.totalStarPieces += prize.value;
    if (prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'stars');
      spawnFloat(zone, eq, '#f59e0b', 'big');
      msg(eq + '!', '#f59e0b');
    } else {
      spawnFloat(zone, prize.label, '#f59e0b', 'big');
      msg(prize.label, '#f59e0b');
    }
    SFX.play('star');
    Particles.sparkle(cx, cy, 10, '#FCD34D');
    updateStarBtn();
  }

  if (prize.type === 'mult') {
    G.multQueue.push(prize.value);
    G.highestMult = Math.max(G.highestMult, prize.value);
    spawnFloat(zone, prize.label, '#7c3aed', 'big');
    msg(prize.label, '#7c3aed');
    SFX.play('gem');
    renderMultQueue();
    if (prize.bonusGold) {
      G.gold += prize.bonusGold;
      G.totalGold += prize.bonusGold;
      spawnFloat(zone, '+' + prize.bonusGold + ' gold (mult bonus)', '#d97706');
    }
  }

  if (prize.type === 'feather') {
    G.feathers += prize.value;
    G.totalFeathers += prize.value;
    if (prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'feathers');
      spawnFloat(zone, eq, '#059669', 'big');
      msg(eq + '!', '#059669');
    } else {
      spawnFloat(zone, prize.label, '#059669');
      msg(prize.label, '#059669');
    }
    SFX.play('coin');
  }

  if (prize.type === 'hammers') {
    // Silver egg hammer prizes allow overflow above max
    G.hammers += prize.value;
    if (prize.usedMult) {
      const eq = multEquation(prize.baseVal, prize.usedMult, prize.value, 'hammers');
      spawnFloat(zone, eq, '#b45309', 'big');
      msg(eq + '!', '#b45309');
    } else {
      spawnFloat(zone, prize.label, '#b45309', 'big');
      msg(prize.label, '#b45309');
    }
    SFX.play('coin');
  }

  if (prize.type === 'item') {
    const prog = curProgress();
    const wasNew = prize.isNew;
    if (wasNew) {
      prog.collections[prog.stage][prize.index] = true;
      G.totalItems++;
    }
    spawnFloat(zone, prize.label, prize.color, wasNew ? 'big' : '');
    if (wasNew) {
      SFX.play('item');
      Particles.sparkle(cx, cy, 15, '#F59E0B');
      // Show popup for new item
      setTimeout(() => showItemPopup(prize), 400);
      // Check collection completion
      checkCollectionComplete();
    } else {
      // Duplicate - give some gold instead
      const dRange = CONFIG.duplicateGoldRange;
      const dupeGold = dRange[0] + Math.floor(Math.random() * (dRange[1] - dRange[0] + 1));
      G.gold += dupeGold;
      G.totalGold += dupeGold;
      msg('Duplicate! +' + dupeGold + ' gold', '#78716c');
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
function useStarfall() {
  if (G.starPieces < CONFIG.starPiecesForStarfall || !G.roundEggs) return;
  G.starPieces -= CONFIG.starPiecesForStarfall;
  G.starfallsUsed++;
  SFX.play('starfall');
  msg('STARFALL! All eggs smashed!', '#f59e0b');

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
      shake('sm');
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
    G.roundClears++;
    checkAchievements();
    updateStarBtn();
    updateResources();
    setTimeout(() => newRound(), 600);
  }, unbroken.length * 400 + 300);
}

function updateStarBtn() {
  const btn = $id('star-btn');
  const ready = G.starPieces >= CONFIG.starPiecesForStarfall && G.roundEggs && !G.roundEggs.every(e => e.broken);
  btn.disabled = !ready;
  $id('star-lbl').textContent = ready
    ? '- Tap to activate!'
    : '(' + G.starPieces + '/' + CONFIG.starPiecesForStarfall + ')';
}

// ==================== COLLECTION / STAGE ====================
function checkCollectionComplete() {
  const prog = curProgress();
  const stage = curStage();
  const collected = prog.collections[prog.stage];
  const total = stage.collection.items.length;
  const found = collected.filter(Boolean).length;

  // Tier thresholds
  const tt = CONFIG.tierThresholds;
  const thresholds = [
    Math.ceil(total * tt.bronze),
    Math.ceil(total * tt.silver),
    Math.ceil(total * tt.gold),
  ];

  if (prog.tier < 3 && found >= thresholds[prog.tier]) {
    // Tier up!
    const tierNames = ['Bronze', 'Silver', 'Gold'];
    const oldTier = prog.tier;
    prog.tier++;

    if (prog.tier >= 3) {
      // Stage complete!
      G.stagesCompleted++;
      G.crystalBananas += CONFIG.crystalBananasPerStage;
      SFX.play('tier');

      showStagePopup(
        'Stage Complete!',
        stage.name + ' - Gold! +' + CONFIG.crystalBananasPerStage + ' Crystal Banana'
      );

      // Advance to next stage
      if (prog.stage < curMonkey().stages.length - 1) {
        prog.stage++;
        prog.tier = 0;
        G.hammers = G.maxH; // refill hammers on new stage
        setTimeout(() => {
          newRound();
          renderAll();
        }, 300);
      } else {
        prog.completed = true;
      }
    } else {
      // Tier up reward
      SFX.play('tier');
      const reward = prog.tier === 1 ? CONFIG.tierRewards.silver : CONFIG.tierRewards.gold;
      G.maxH += reward.maxHammers;
      G.hammers = Math.min(G.maxH, G.hammers + reward.hammerRefill);
      showStagePopup(
        tierNames[prog.tier] + ' Tier!',
        stage.name + ' - +' + reward.maxHammers + ' max hammers'
      );
    }
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

// ==================== MULTIPLIER QUEUE ====================
function recalcActiveMult() {
  if (!G._selectedMults || G._selectedMults.length === 0) {
    G.activeMult = 1;
  } else {
    G.activeMult = G._selectedMults.reduce((sum, idx) => sum + G.multQueue[idx], 0);
  }
  $id('active-mult').textContent = 'x' + G.activeMult;
}

function renderMultQueue() {
  const q = $id('mult-queue');
  q.innerHTML = '';
  if (!G._selectedMults) G._selectedMults = [];
  G.multQueue.forEach((val, i) => {
    const chip = document.createElement('span');
    const isSelected = G._selectedMults.includes(i);
    chip.className = 'mult-chip' + (isSelected ? ' active' : '');
    chip.textContent = 'x' + val;
    chip.addEventListener('click', () => {
      if (isSelected) {
        G._selectedMults = G._selectedMults.filter(idx => idx !== i);
      } else {
        G._selectedMults.push(i);
      }
      recalcActiveMult();
      renderMultQueue();
    });
    q.appendChild(chip);
  });
  recalcActiveMult();
}

function consumeMultiplier() {
  if (G.activeMult > 1 && G._selectedMults && G._selectedMults.length > 0) {
    G.maxMultUsed = Math.max(G.maxMultUsed || 0, G.activeMult);
    G._lastMultCount = G._selectedMults.length; // for achievement check
    // Remove selected indices from queue (highest first to preserve indices)
    const sorted = [...G._selectedMults].sort((a, b) => b - a);
    for (const idx of sorted) {
      G.multQueue.splice(idx, 1);
    }
    G._selectedMults = [];
    G.activeMult = 1;
  }
}

// ==================== HAMMER REGEN ====================
function startRegen() {
  G.regenCD = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
  regenInt = setInterval(() => {
    G.regenCD--;
    if (G.regenCD <= 0) {
      G.hammers = Math.min(G.maxH, G.hammers + 1);
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
function switchMonkey(index) {
  if (!G.monkeys[index].unlocked) return;
  G.activeMonkey = index;
  G.roundEggs = null;
  newRound();
  renderAll();
  saveGame();
}

function unlockMonkey(index) {
  if (G.crystalBananas < MONKEY_DATA[index].cost) {
    msg('Need ' + MONKEY_DATA[index].cost + ' Crystal Bananas!', '#ef4444');
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
function buyShopItem(category, id) {
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
    if (G.gold < item.cost) { msg('Need ' + item.cost + ' gold!', '#ef4444'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.ownedHammers.push(id);
    invalidateBonusCache();
    G.hammer = id;
    G.purchases = (G.purchases || 0) + 1;
    SFX.play('buy');
    updateHammerSVG();
    msg('Bought ' + item.name + '!', '#16a34a');
  }

  if (category === 'hat') {
    const item = SHOP_HATS.find(h => h.id === id);
    if (!item || item.cost === 0) return;
    if (G.ownedHats.includes(id)) {
      msg('Already owned — bonus is always active!', '#9ca3af');
      return;
    }
    if (G.gold < item.cost) { msg('Need ' + item.cost + ' gold!', '#ef4444'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.ownedHats.push(id);
    invalidateBonusCache();
    G.hat = id;
    G.purchases = (G.purchases || 0) + 1;
    SFX.play('buy');
    msg('Bought ' + item.name + '!', '#16a34a');
  }

  if (category === 'supply') {
    const item = SHOP_SUPPLIES.find(s => s.id === id);
    if (!item) return;
    if (item.unique && G['owned_' + id]) { msg('Already purchased!', '#9ca3af'); return; }
    if (G.gold < item.cost) { msg('Need ' + item.cost + ' gold!', '#ef4444'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.purchases = (G.purchases || 0) + 1;

    if (id === 'hammers5') G.hammers = Math.min(G.maxH, G.hammers + 5);
    if (id === 'hammers20') G.hammers = Math.min(G.maxH, G.hammers + 20);
    if (id === 'star1') { G.starPieces++; G.totalStarPieces++; updateStarBtn(); }
    if (id === 'mult5') { G.multQueue.push(5); renderMultQueue(); }
    if (id === 'maxhammers') G.maxH += 5;
    if (id === 'fastregen') { G.fastRegen = true; G['owned_fastregen'] = true; }

    SFX.play('buy');
    msg('Purchased!', '#16a34a');
  }

  checkAchievements();
  updateResources();
  renderShop();
  saveGame();
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
  };

  for (const a of ACHIEVEMENT_DATA) {
    if (G.achieved.includes(a.id)) continue;
    const fn = checks[a.id];
    if (fn && fn()) {
      G.achieved.push(a.id);
      invalidateAchieveCache();
      grantAchievementReward(a);
      showAchieveToast(a);
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

// ==================== UI RENDERING ====================
function updateResources() {
  $id('res-h').textContent = G.hammers + '/' + G.maxH;
  $id('res-g').textContent = formatNum(G.gold);
  $id('res-s').textContent = G.starPieces + '/' + CONFIG.starPiecesForStarfall;
  $id('res-b').textContent = G.crystalBananas;
  $id('res-f').textContent = G.feathers;

  // Regen text
  if (G.hammers < G.maxH) {
    $id('regen-txt').textContent = 'Next hammer: ' + G.regenCD + 's';
  } else {
    $id('regen-txt').textContent = 'Hammers: ' + G.hammers + '/' + G.maxH;
  }

  updateStarBtn();
  updateOverallProgress();
}

function updateOverallProgress() {
  let totalItems = 0, foundItems = 0;
  let totalStages = 0, doneStages = 0;
  let unlockedMonkeys = 0;

  MONKEY_DATA.forEach((m, mi) => {
    const mp = G.monkeys[mi];
    if (mp.unlocked) unlockedMonkeys++;
    m.stages.forEach((s, si) => {
      totalStages++;
      const items = s.collection.items;
      totalItems += items.length;
      if (mp.unlocked && mp.collections[si]) {
        foundItems += mp.collections[si].filter(Boolean).length;
      }
      if (mp.unlocked && (si < mp.stage || (si === mp.stage && mp.tier >= 3))) {
        doneStages++;
      }
    });
  });

  const pct = totalItems > 0 ? Math.round((foundItems / totalItems) * 100) : 0;
  $id('overall-pct').textContent = pct + '%';
  $id('overall-fill').style.width = pct + '%';
  $id('overall-detail').innerHTML =
    '<span>Items: <strong>' + foundItems + '/' + totalItems + '</strong></span>' +
    '<span>Stages: <strong>' + doneStages + '/' + totalStages + '</strong></span>' +
    '<span>Monkeys: <strong>' + unlockedMonkeys + '/' + MONKEY_DATA.length + '</strong></span>';
}

function updateStageBar() {
  const prog = curProgress();
  const stage = curStage();
  const items = stage.collection.items;
  const collected = prog.collections[prog.stage];
  const found = collected.filter(Boolean).length;
  const total = items.length;
  const tierNames = ['Bronze', 'Silver', 'Gold'];
  const tierIdx = Math.min(prog.tier, 2);

  $id('stage-name').textContent = 'Stage ' + (prog.stage + 1) + ': ' + stage.name;
  const tierEl = $id('stage-tier');
  tierEl.textContent = prog.tier >= 3 ? 'Complete' : tierNames[tierIdx];
  tierEl.className = 'stage-tier ' + (prog.tier >= 3 ? 'complete' : tierNames[tierIdx].toLowerCase());

  const pct = Math.min(100, (found / total) * 100);
  const fill = $id('stage-fill');
  fill.style.width = pct + '%';
  fill.className = 'prog-fill' + (found >= total ? ' complete' : '');
  $id('stage-detail').textContent = found + '/' + total + ' items';
}

function renderAll() {
  const monkey = curMonkey();
  $id('monkey-avatar').textContent = monkey.emoji;
  $id('monkey-subtitle').textContent = monkey.name;
  $id('sound-btn').textContent = G.soundOn ? '🔊' : '🔇';

  updateResources();
  updateStageBar();
  updateHammerSVG();
  renderEggTray();
  renderMultQueue();
  renderAlbum();
  renderMonkeys();
  renderShop();
  renderStats();
  checkDaily();
}

function renderAlbum() {
  const monkey = curMonkey();
  const prog = curProgress();
  const stagesDiv = $id('album-stages');
  stagesDiv.innerHTML = '';

  monkey.stages.forEach((stage, i) => {
    const btn = document.createElement('button');
    btn.className = 'album-stage-btn';
    if (i === prog.stage) btn.classList.add('active');
    if (i < prog.stage || (i === prog.stage && prog.tier >= 3)) btn.classList.add('complete');
    btn.textContent = (i + 1) + '. ' + stage.name;
    btn.disabled = i > prog.stage;
    btn.addEventListener('click', () => renderAlbumStage(i));
    stagesDiv.appendChild(btn);
  });

  renderAlbumStage(prog.stage);
}

function featherCost(rarity, stageIdx) {
  const C = CONFIG;
  const rarityKey = rarity === 1 ? 'common' : rarity === 2 ? 'uncommon' : 'rare';
  const base = C.featherItemCost[rarityKey];
  return Math.round(base * Math.pow(C.featherStageMultiplier, stageIdx));
}

let _albumStageIdx = 0; // track which stage the album is viewing

function renderAlbumStage(stageIdx) {
  _albumStageIdx = stageIdx;
  const monkey = curMonkey();
  const prog = curProgress();
  const stage = monkey.stages[stageIdx];
  const collected = prog.collections[stageIdx] || [];
  const div = $id('album-items');

  // Calculate pity info for this stage
  const totalItems = stage.collection.items.length;
  const foundCount = collected.filter(Boolean).length;
  const missingCount = totalItems - foundCount;
  const rw = CONFIG.itemRarityWeights;
  const pM = CONFIG.itemPityMultiplier;
  const dM = CONFIG.itemDuplicateMultiplier;

  let pityExplain = '';
  if (missingCount > 0) {
    pityExplain = '<div class="pity-bar">' +
      '<span class="pity-info">' + missingCount + ' missing — Items you haven\'t found yet have a higher drop rate.</span>' +
      '</div>';
  } else {
    pityExplain = '<div class="pity-bar complete">' +
      '<span class="pity-label">Collection complete!</span>' +
      '</div>';
  }

  let html = pityExplain + '<div class="album-grid">';
  stage.collection.items.forEach((item, i) => {
    const found = collected[i];
    const rarityClass = 'rarity-' + item[2];
    const rarityLabel = ['', 'Common', 'Uncommon', 'Rare'][item[2]];
    const cost = featherCost(item[2], stageIdx);

    const quote = item[3] ? item[3].replace(/^"|"$/g, '') : '';
    const tipText = found
      ? item[1] + (quote ? ' — ' + quote : '')
      : (quote ? '??? — ' + quote : '???');
    const tipEsc = tipText.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;');
    html += '<div class="album-item ' + (found ? 'found' : 'locked') + '" data-tip="' + tipEsc + '">';
    html += '<span class="item-emoji">' + (found ? item[0] : '❓') + '</span>';
    html += '<span class="item-name">' + (found ? item[1] : '???') + '</span>';
    html += '<span class="album-rarity ' + rarityClass + '">' + rarityLabel + '</span>';
    if (!found) {
      html += '<button class="feather-buy-btn" data-idx="' + i + '" data-cost="' + cost + '">' +
        cost + ' 🪶</button>';
    }
    html += '</div>';
  });
  html += '</div>';
  div.innerHTML = html;

  // Event delegation for buy buttons
  div.onclick = (e) => {
    const btn = e.target.closest('.feather-buy-btn');
    if (btn) buyAlbumItem(stageIdx, parseInt(btn.dataset.idx), parseInt(btn.dataset.cost));
  };

  // Update active button
  document.querySelectorAll('.album-stage-btn').forEach((b, i) => {
    b.classList.toggle('active', i === stageIdx);
  });
}

function buyAlbumItem(stageIdx, itemIdx, cost) {
  if (G.feathers < cost) {
    msg('Need ' + cost + ' feathers!', '#ef4444');
    SFX.play('err');
    return;
  }
  const prog = curProgress();
  if (prog.collections[stageIdx][itemIdx]) {
    msg('Already found!', '#9ca3af');
    return;
  }
  G.feathers -= cost;
  prog.collections[stageIdx][itemIdx] = true;
  G.totalItems++;
  G.feathersBought = (G.feathersBought || 0) + 1;
  SFX.play('item');

  const monkey = curMonkey();
  const item = monkey.stages[stageIdx].collection.items[itemIdx];
  msg('Bought ' + item[0] + ' ' + item[1] + '!', '#059669');

  checkCollectionComplete();
  checkAchievements();
  updateResources();
  updateStageBar();
  updateOverallProgress();
  renderAlbumStage(stageIdx);
  saveGame();
}

function renderMonkeys() {
  const grid = $id('monkey-grid');
  grid.innerHTML = '';
  MONKEY_DATA.forEach((m, i) => {
    const mp = G.monkeys[i];
    const isActive = i === G.activeMonkey;
    const card = document.createElement('div');
    card.className = 'monkey-card' + (isActive ? ' active' : '') + (!mp.unlocked ? ' locked' : '');

    let inner = '<span class="m-emoji">' + m.emoji + '</span>';
    inner += '<span class="m-name">' + m.name + '</span>';
    inner += '<span class="m-perk">' + m.perkDesc + '</span>';

    if (mp.unlocked) {
      const stageNum = mp.completed ? curMonkey().stages.length : mp.stage + 1;
      inner += '<span class="m-progress">Stage ' + stageNum + '/' + m.stages.length + '</span>';
      if (!isActive) {
        card.addEventListener('click', () => switchMonkey(i));
      }
    } else {
      inner += '<span class="m-cost">' + m.cost + ' 🍌 Crystal Bananas</span>';
      inner += '<button class="monkey-unlock-btn" ' +
        (G.crystalBananas < m.cost ? 'disabled' : '') +
        '>Unlock</button>';
    }

    card.innerHTML = inner;

    if (!mp.unlocked) {
      const btn = card.querySelector('.monkey-unlock-btn');
      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); unlockMonkey(i); });
    }

    grid.appendChild(card);
  });
}

// Bonus descriptions for tooltips
const BONUS_INFO = {
  lessEmpty:    { stat: 'Empty egg chance',   effect: 'x0.4 (60% reduction)', unit: '' },
  moreStars:    { stat: 'Star piece weight',  effect: 'x1.15 (+15%)',         unit: '' },
  moreFeathers: { stat: 'Feather weight',     effect: 'x1.2 (+20%)',          unit: '' },
  moreItems:    { stat: 'Item drop weight',   effect: 'x1.1 (+10%)',          unit: '' },
  moreGold:     { stat: 'Gold value',         effect: 'x1.2 (+20%)',          unit: '' },
  freeEgg:      { stat: 'Free hit chance',    effect: '10%',                  unit: '' },
  goldBoost:    { stat: 'Gold value',         effect: 'x1.1 (+10%)',          unit: '' },
  starBoost:    { stat: 'Star piece weight',  effect: 'x1.1 (+10%)',          unit: '' },
  multBoost:    { stat: 'Multiplier duration', effect: 'Extended',            unit: '' },
  itemBoost:    { stat: 'Item drop weight',   effect: 'x1.15 (+15%)',         unit: '' },
};

function buildShopTooltip(bonus, owned) {
  if (!bonus || !BONUS_INFO[bonus]) return '';
  const info = BONUS_INFO[bonus];
  if (owned) return info.stat + ': ' + info.effect + ' (active)';
  const already = hasBonus(bonus);
  if (already) return info.stat + ': already active from another source';
  return info.stat + ': ' + info.effect + ' on purchase';
}

function buildSupplyTooltip(id) {
  switch (id) {
    case 'hammers5':   return 'Adds 5 hammers (current: ' + G.hammers + '/' + G.maxH + ')';
    case 'hammers20':  return 'Adds 20 hammers (current: ' + G.hammers + '/' + G.maxH + ')';
    case 'star1':      return 'Adds 1 star piece (current: ' + G.starPieces + '/' + CONFIG.starPiecesForStarfall + ')';
    case 'mult5':      return 'Adds x5 to your multiplier queue (current queue: ' + G.multQueue.length + ')';
    case 'maxhammers': return 'Hammer cap +5 (current max: ' + G.maxH + ' → ' + (G.maxH + 5) + ')';
    case 'fastregen':  return 'Hammer regen: ' + CONFIG.regenInterval + 's → ' + CONFIG.fastRegenInterval + 's per hammer';
    default: return '';
  }
}

function renderShop() {
  // Hammers
  const hGrid = $id('shop-hammers');
  hGrid.innerHTML = '';
  SHOP_HAMMERS.forEach(h => {
    if (h.cost === 0) return;
    const owned = G.ownedHammers.includes(h.id);
    const isCursor = G.hammer === h.id;
    const tip = buildShopTooltip(h.bonus, owned);
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : '') + (isCursor ? ' equipped' : '');
    if (tip) card.setAttribute('data-tip', tip);
    card.innerHTML =
      '<span class="s-emoji">' + h.emoji + '</span>' +
      '<span class="s-name">' + h.name + '</span>' +
      '<span class="s-desc">' + h.desc + '</span>' +
      (owned
        ? '<span class="s-status">OWNED' + (isCursor ? ' (cursor)' : ' — click for cursor') + '</span>'
        : '<span class="s-cost">' + formatNum(h.cost) + ' 🪙</span>');
    card.addEventListener('click', () => buyShopItem('hammer', h.id));
    hGrid.appendChild(card);
  });

  // Hats
  const hatGrid = $id('shop-hats');
  hatGrid.innerHTML = '';
  SHOP_HATS.forEach(h => {
    if (h.cost === 0) return;
    const owned = G.ownedHats.includes(h.id);
    const tip = buildShopTooltip(h.bonus, owned);
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : '');
    if (tip) card.setAttribute('data-tip', tip);
    card.innerHTML =
      '<span class="s-emoji">' + h.emoji + '</span>' +
      '<span class="s-name">' + h.name + '</span>' +
      '<span class="s-desc">' + h.desc + '</span>' +
      (owned
        ? '<span class="s-status">OWNED (always active)</span>'
        : '<span class="s-cost">' + formatNum(h.cost) + ' 🪙</span>');
    if (!owned) card.addEventListener('click', () => buyShopItem('hat', h.id));
    hatGrid.appendChild(card);
  });

  // Supplies
  const sGrid = $id('shop-supplies');
  sGrid.innerHTML = '';
  SHOP_SUPPLIES.forEach(s => {
    const isOwned = s.unique && G['owned_' + s.id];
    const tip = buildSupplyTooltip(s.id);
    const card = document.createElement('div');
    card.className = 'shop-card' + (isOwned ? ' owned' : '');
    if (tip) card.setAttribute('data-tip', tip);
    card.innerHTML =
      '<span class="s-emoji">' + s.emoji + '</span>' +
      '<span class="s-name">' + s.name + '</span>' +
      (isOwned
        ? '<span class="s-status">PURCHASED</span>'
        : '<span class="s-cost">' + formatNum(s.cost) + ' 🪙</span>');
    if (!isOwned) card.addEventListener('click', () => buyShopItem('supply', s.id));
    sGrid.appendChild(card);
  });
}

function renderStats() {
  const stats = $id('life-stats');
  stats.innerHTML = [
    ['Eggs broken', G.totalEggs],
    ['Gold earned', formatNum(G.totalGold)],
    ['Star pieces', G.totalStarPieces],
    ['Feathers', G.totalFeathers],
    ['Items found', G.totalItems],
    ['Biggest win', formatNum(G.biggestWin)],
    ['Highest mult', 'x' + G.highestMult],
    ['Starfalls', G.starfallsUsed],
    ['Collections', G.collectionsCompleted],
    ['Stages done', G.stagesCompleted],
    ['Round clears', G.roundClears],
    ['Daily claims', G.totalDailyClaims || 0],
  ].map(([k, v]) => '<span>' + k + ': <strong>' + v + '</strong></span>').join('');

  const grid = $id('achieve-grid');
  grid.innerHTML = '';
  ACHIEVEMENT_DATA.forEach(a => {
    const unlocked = G.achieved.includes(a.id);
    const card = document.createElement('div');
    card.className = 'achieve-card ' + (unlocked ? 'unlocked' : 'locked');
    const rewardLabel = a.reward ? a.reward.label : '';
    card.innerHTML =
      '<span class="a-icon">' + a.icon + '</span>' +
      '<div><span class="a-name">' + a.name + '</span><br>' +
      '<span class="a-desc">' + a.desc + '</span>' +
      (rewardLabel ? '<br><span class="a-reward">' + rewardLabel + '</span>' : '') +
      '</div>';
    grid.appendChild(card);
  });
}

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// ==================== LEXICON ====================
function buildLexicon() {
  const C = CONFIG;
  const spawnTotal = C.eggSpawnWeights.normal + C.eggSpawnWeights.silver + C.eggSpawnWeights.gold;
  const pct = (type) => (C.eggSpawnWeights[type] / spawnTotal * 100).toFixed(0);
  const emptyPct = (type) => {
    const w = C.prizeWeights[type];
    const t = Object.values(w).reduce((a,b) => a + b, 0);
    return (w.empty / t * 100).toFixed(0);
  };
  const uniqueMults = [...new Set(C.multiplierValues)].sort((a,b) => a - b);
  const pityRatio = (C.itemPityMultiplier / C.itemDuplicateMultiplier).toFixed(1);
  const minGold = C.goldValues.gold_s[0];
  const maxGold = C.goldValues.gold_l[1];
  const minHammer = Math.min(...C.hammerPrizeAmounts);
  const maxHammer = Math.max(...C.hammerPrizeAmounts);
  const dupMin = C.duplicateGoldRange[0];
  const dupMax = C.duplicateGoldRange[1];
  const fMin = C.featherDropRange[0];
  const fMax = C.featherDropRange[1];

  return [
  {
    id: 'basics', icon: '📖', title: 'How to Play',
    html: () => `
<p>Smash eggs, win prizes, complete collections. Each round gives you 3–7 eggs — click one to break it with a hammer. Collect themed items to clear stages, earn Crystal Bananas, and unlock new monkeys.</p>
<p><strong>Keys:</strong> Space/Enter = smash, Ctrl+S = starfall.</p>
<p>Progress auto-saves to your browser.</p>
`
  },
  {
    id: 'eggs', icon: '🥚', title: 'Eggs & Hammers',
    html: () => `
<p>Each hit costs <strong>1 hammer</strong>. Eggs spawn randomly each round — rarer eggs take more hits but give better prizes.</p>
<table class="lex-table">
<tr><th>Egg</th><th>HP</th><th>Spawn Rate</th><th>Special</th></tr>
<tr><td>🥚 Normal</td><td class="num">${C.eggHP.normal}</td><td class="num">~${pct('normal')}%</td><td>Can be empty (~${emptyPct('normal')}%)</td></tr>
<tr><td>🪨 Silver</td><td class="num">${C.eggHP.silver}</td><td class="num">~${pct('silver')}%</td><td>Never empty, 2x prizes, can drop bonus hammers</td></tr>
<tr><td>🌟 Gold</td><td class="num">${C.eggHP.gold}</td><td class="num">~${pct('gold')}%</td><td>Never empty, 1.5x gold, best item drop rate</td></tr>
</table>
<p>You start with <strong>${C.startingHammers} hammers</strong>. They regenerate at +1 every ${C.regenInterval}s (${C.fastRegenInterval}s with Fast Regen from the shop). Daily login gives ${C.dailyBaseHammers} + up to ${C.dailyBonusCap} bonus hammers based on your streak. Tier-ups also increase your max.</p>
`
  },
  {
    id: 'prizes', icon: '🎁', title: 'What\'s Inside',
    html: () => `
<p><strong>Gold</strong> — main currency (${minGold}–${maxGold} base, boosted by egg type, multipliers, and equipment). Spend it in the shop.</p>
<p><strong>Star Pieces</strong> — collect ${C.starPiecesForStarfall} to trigger <strong>Starfall</strong>, which smashes all remaining eggs for free. Normal/Gold eggs drop ${C.starPiecesPerDrop.normal}, Silver drops ${C.starPiecesPerDrop.silver}.</p>
<p><strong>Multipliers</strong> — ${uniqueMults.map(v => 'x' + v).join(', ')}. Stored in a queue. Click one to activate it before your next smash — it boosts gold, feathers, stars, and hammers. Other prizes get bonus gold.</p>
<p><strong>Feathers</strong> — spend in the Album tab to buy missing collection items directly (${fMin}–${fMax} per drop, doubled from silver eggs). Prices increase with stage and rarity.</p>
<p><strong>Collection Items</strong> — themed items for the current stage. New ones count toward completion. Duplicates convert to ${dupMin}–${dupMax} gold.</p>
<p><strong>Bonus Hammers</strong> — Silver eggs only. ${minHammer}–${maxHammer} free hammers.</p>
`
  },
  {
    id: 'progress', icon: '📚', title: 'Stages & Collections',
    html: () => `
<p>Each monkey has <strong>${MONKEY_DATA[0].stages.length} stages</strong>. Each stage has a themed collection of items in three rarities (Common, Uncommon, Rare). A <strong>pity system</strong> makes uncollected items ~${pityRatio}x more likely to drop.</p>
<table class="lex-table">
<tr><th>Tier</th><th>Collect</th><th>Reward</th></tr>
<tr><td class="hl">Bronze → Silver</td><td class="num">${Math.round(C.tierThresholds.bronze * 100)}%</td><td>+${C.tierRewards.silver.maxHammers} max hammers</td></tr>
<tr><td class="hl">Silver → Gold</td><td class="num">${Math.round(C.tierThresholds.silver * 100)}%</td><td>+${C.tierRewards.gold.maxHammers} max hammers</td></tr>
<tr><td class="hl">Gold (done)</td><td class="num">${Math.round(C.tierThresholds.gold * 100)}%</td><td>+${C.crystalBananasPerStage} Crystal Banana, next stage</td></tr>
</table>
<p>Later stages have more eggs per round (up to 7) but also more items to find.</p>
`
  },
  {
    id: 'monkeys', icon: '🐵', title: 'Monkeys',
    html: () => {
      let rows = '';
      MONKEY_DATA.forEach(m => {
        rows += '<tr><td>' + m.emoji + ' ' + m.name + '</td><td class="num">' +
          (m.cost === 0 ? 'Free' : m.cost + ' 🍌') + '</td><td>' + m.perkDesc + '</td></tr>';
      });
      return `
<p>Each monkey is a separate adventure with ${MONKEY_DATA[0].stages.length} stages. Unlock new ones with Crystal Bananas (${C.crystalBananasPerStage} per completed stage). Perks stack with equipment.</p>
<table class="lex-table">
<tr><th>Monkey</th><th>Cost</th><th>Perk</th></tr>
${rows}
</table>
`;
    }
  },
  {
    id: 'shop', icon: '🛒', title: 'Shop',
    html: () => {
      let hRows = '';
      SHOP_HAMMERS.forEach(h => { if (h.cost > 0) hRows += '<tr><td>' + h.emoji + ' ' + h.name + '</td><td class="num">' + formatNum(h.cost) + '</td><td>' + h.desc + '</td></tr>'; });
      let hatRows = '';
      SHOP_HATS.forEach(h => { if (h.cost > 0) hatRows += '<tr><td>' + h.emoji + ' ' + h.name + '</td><td class="num">' + formatNum(h.cost) + '</td><td>' + h.desc + '</td></tr>'; });
      return `
<p><strong>Hammers</strong> — permanent. Once bought, the bonus is always active. Click to change your cursor appearance.</p>
<table class="lex-table"><tr><th>Hammer</th><th>Cost</th><th>Effect</th></tr>${hRows}</table>
<p><strong>Hats</strong> — permanent. Once bought, the bonus is always active. All bonuses stack.</p>
<table class="lex-table"><tr><th>Hat</th><th>Cost</th><th>Effect</th></tr>${hatRows}</table>
<p><strong>Supplies</strong> — consumables: hammer packs, star pieces (${formatNum(SHOP_SUPPLIES.find(s=>s.id==='star1').cost)}), multipliers (${formatNum(SHOP_SUPPLIES.find(s=>s.id==='mult5').cost)}), +5 hammer cap (${formatNum(SHOP_SUPPLIES.find(s=>s.id==='maxhammers').cost)}), fast regen (${formatNum(SHOP_SUPPLIES.find(s=>s.id==='fastregen').cost)}, one-time).</p>
<p>All bonuses are permanent once purchased and stack multiplicatively — hammers, hats, and monkey perks all accumulate.</p>
`;
    }
  },
  {
    id: 'tips', icon: '🧠', title: 'Quick Tips',
    html: () => {
      const bigMult = Math.max(...C.multiplierValues);
      return `
<p><strong>Early on:</strong> smash Normal eggs, claim dailies, let hammers regen naturally.</p>
<p><strong>Mid game:</strong> Silver eggs can't be empty and drop bonus hammers — self-sustaining once you have enough.</p>
<p><strong>Late game:</strong> Gold eggs + saved multipliers = massive rewards. Starfall on a late-stage round is the ultimate move.</p>
<p><strong>Save x${bigMult} multipliers</strong> for Gold egg large-gold rolls (${C.goldValues.gold_l[0]}–${C.goldValues.gold_l[1]} base). One lucky hit can net huge gold.</p>
<p><strong>Best builds:</strong> Princess + Golden Hammer + Crown for gold farming. Space Cadette + Rainbow + Pirate for fast collection completion.</p>
`;
    }
  },
  ];
}

function renderLexicon() {
  const content = $id('lex-content');
  content.innerHTML = '';
  buildLexicon().forEach(sec => {
    const section = document.createElement('div');
    section.className = 'lex-section';
    section.innerHTML =
      '<div class="lex-section-head">' +
        '<span class="lex-icon">' + sec.icon + '</span>' +
        '<span class="lex-title">' + sec.title + '</span>' +
      '</div>' +
      '<div class="lex-body">' + sec.html() + '</div>';
    content.appendChild(section);
  });
}

// ==================== NAVIGATION ====================
$id('nav-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.nav-tab');
  if (!tab) return;
  const name = tab.dataset.tab;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  tab.classList.add('active');
  $id('panel-' + name).classList.add('active');
  // Refresh content when switching tabs
  if (name === 'album') renderAlbum();
  if (name === 'monkeys') renderMonkeys();
  if (name === 'shop') renderShop();
  if (name === 'stats') renderStats();
  if (name === 'lexicon') renderLexicon();
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

// ==================== HAMMER CURSOR VISUALS ====================
function makeHammerSVG(hammerId) {
  const S = 'shape-rendering="crispEdges"';
  switch (hammerId) {

    // ---- DRUMSTICK: A giant turkey leg ----
    case 'drumstick': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <!-- Bone handle -->
      <rect x="18" y="0" width="8" height="58" rx="1" fill="#F5F0DC" stroke="#D4C9A8" stroke-width="1"/>
      <circle cx="22" cy="3" r="5" fill="#F5F0DC" stroke="#D4C9A8" stroke-width="1"/>
      <circle cx="22" cy="3" r="2" fill="#E8E0C8"/>
      <!-- Joint -->
      <ellipse cx="22" cy="56" rx="7" ry="5" fill="#D4A860" stroke="#B8862E" stroke-width="1"/>
      <!-- Meat -->
      <ellipse cx="22" cy="76" rx="16" ry="20" fill="#C8642A" stroke="#8B4513" stroke-width="1.5"/>
      <ellipse cx="22" cy="72" rx="13" ry="14" fill="#E87830"/>
      <ellipse cx="17" cy="68" rx="5" ry="7" fill="#F09848" opacity=".6"/>
      <!-- Crispy bits -->
      <rect x="10" y="82" width="4" height="3" rx="1" fill="#A04818"/>
      <rect x="28" y="78" width="4" height="3" rx="1" fill="#A04818"/>
      <rect x="18" y="90" width="5" height="3" rx="1" fill="#A04818"/>
    </svg>`;

    // ---- BAT: Sleek dark batmobile-inspired weapon ----
    case 'bat': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs><linearGradient id="bat-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a3a50"/><stop offset="100%" stop-color="#0f0f1e"/>
      </linearGradient></defs>
      <!-- Carbon fiber handle -->
      <rect x="19" y="0" width="6" height="60" fill="#1a1a2e" stroke="#0a0a18" stroke-width="1"/>
      <rect x="20" y="5" width="1" height="50" fill="#2a2a40" opacity=".5"/>
      <rect x="23" y="5" width="1" height="50" fill="#2a2a40" opacity=".3"/>
      <!-- Grip rings -->
      <rect x="17" y="10" width="10" height="2" fill="#3a3a50"/>
      <rect x="17" y="16" width="10" height="2" fill="#3a3a50"/>
      <rect x="17" y="22" width="10" height="2" fill="#3a3a50"/>
      <!-- Bat wing head -->
      <polygon points="22,58 0,72 4,82 14,78 22,92 30,78 40,82 44,72 22,58" fill="url(#bat-g)" stroke="#0a0a18" stroke-width="1.5"/>
      <!-- Wing membrane lines -->
      <line x1="22" y1="62" x2="6" y2="74" stroke="#2a2a3e" stroke-width="1"/>
      <line x1="22" y1="62" x2="38" y2="74" stroke="#2a2a3e" stroke-width="1"/>
      <line x1="22" y1="62" x2="14" y2="78" stroke="#1a1a30" stroke-width="1"/>
      <line x1="22" y1="62" x2="30" y2="78" stroke="#1a1a30" stroke-width="1"/>
      <!-- Eyes -->
      <ellipse cx="16" cy="72" rx="3" ry="2" fill="#ff3030"/>
      <ellipse cx="28" cy="72" rx="3" ry="2" fill="#ff3030"/>
      <ellipse cx="16" cy="72" rx="1.5" ry="1" fill="#ff8080"/>
      <ellipse cx="28" cy="72" rx="1.5" ry="1" fill="#ff8080"/>
      <!-- Glow -->
      <ellipse cx="22" cy="75" rx="10" ry="8" fill="#ff3030" opacity=".08"/>
    </svg>`;

    // ---- CRYSTAL: Magical floating crystal mace ----
    case 'crystal': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs><linearGradient id="crys-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#C9B0FF"/><stop offset="50%" stop-color="#9B7ED8"/><stop offset="100%" stop-color="#6B4E9B"/>
      </linearGradient></defs>
      <!-- Ornate staff -->
      <rect x="19" y="0" width="6" height="60" fill="#6B4E9B" stroke="#4B3070" stroke-width="1"/>
      <!-- Staff wrapping -->
      <rect x="18" y="8" width="8" height="2" fill="#9B7ED8" opacity=".6"/>
      <rect x="18" y="14" width="8" height="2" fill="#9B7ED8" opacity=".6"/>
      <rect x="18" y="20" width="8" height="2" fill="#9B7ED8" opacity=".6"/>
      <!-- Crystal holder ring -->
      <ellipse cx="22" cy="58" rx="10" ry="4" fill="#7B5EAB" stroke="#4B3070" stroke-width="1"/>
      <!-- Main crystal -->
      <polygon points="22,52 8,72 14,96 30,96 36,72" fill="url(#crys-g)" stroke="#7B5EB8" stroke-width="1.5"/>
      <!-- Crystal facets -->
      <polygon points="22,56 14,72 22,88" fill="#B090E8" opacity=".4"/>
      <polygon points="22,56 30,72 22,88" fill="#8060C0" opacity=".3"/>
      <!-- Inner glow -->
      <ellipse cx="22" cy="76" rx="6" ry="10" fill="#E0D0FF" opacity=".25"/>
      <!-- Sparkle points -->
      <rect x="15" y="66" width="2" height="2" fill="#fff" opacity=".7"/>
      <rect x="26" y="74" width="2" height="2" fill="#fff" opacity=".6"/>
      <rect x="20" y="82" width="2" height="2" fill="#fff" opacity=".5"/>
      <!-- Magic glow -->
      <ellipse cx="22" cy="76" rx="14" ry="18" fill="#9B7ED8" opacity=".1"/>
    </svg>`;

    // ---- GOLDEN: Royal scepter with golden orb ----
    case 'golden': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs><radialGradient id="gold-orb">
        <stop offset="0%" stop-color="#FFE44D"/><stop offset="60%" stop-color="#FFD700"/><stop offset="100%" stop-color="#B8860B"/>
      </radialGradient></defs>
      <!-- Royal staff -->
      <rect x="19" y="0" width="6" height="56" fill="#DAA520" stroke="#8B6508" stroke-width="1"/>
      <!-- Gold filigree -->
      <rect x="17" y="6" width="10" height="3" rx="1" fill="#FFD700"/>
      <rect x="17" y="14" width="10" height="3" rx="1" fill="#FFD700"/>
      <rect x="16" y="22" width="12" height="3" rx="1" fill="#FFD700"/>
      <!-- Crown base -->
      <polygon points="10,56 22,48 34,56 32,62 12,62" fill="#DAA520" stroke="#8B6508" stroke-width="1"/>
      <!-- Crown prongs -->
      <rect x="12" y="50" width="3" height="8" fill="#FFD700"/>
      <rect x="20" y="46" width="4" height="10" fill="#FFD700"/>
      <rect x="29" y="50" width="3" height="8" fill="#FFD700"/>
      <!-- Jewels on crown -->
      <circle cx="13" cy="51" r="2" fill="#ff3030"/>
      <circle cx="22" cy="47" r="2.5" fill="#60a5fa"/>
      <circle cx="31" cy="51" r="2" fill="#4ade80"/>
      <!-- Golden orb -->
      <circle cx="22" cy="78" r="18" fill="url(#gold-orb)" stroke="#8B6508" stroke-width="1.5"/>
      <ellipse cx="18" cy="72" rx="5" ry="6" fill="#FFE44D" opacity=".35"/>
      <!-- Cross on top of orb -->
      <rect x="20" y="62" width="4" height="12" fill="#B8860B"/>
      <rect x="16" y="66" width="12" height="3" fill="#B8860B"/>
      <!-- Shine -->
      <circle cx="16" cy="70" r="2" fill="#fff" opacity=".3"/>
    </svg>`;

    // ---- RAINBOW: Prismatic warhammer with swirling colors ----
    case 'rainbow': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs>
        <linearGradient id="rb-h" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ff6b6b"/><stop offset="25%" stop-color="#ffd700"/>
          <stop offset="50%" stop-color="#4ade80"/><stop offset="75%" stop-color="#60a5fa"/>
          <stop offset="100%" stop-color="#c084fc"/>
        </linearGradient>
        <linearGradient id="rb-head" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff6b6b"/><stop offset="20%" stop-color="#ffa500"/>
          <stop offset="40%" stop-color="#ffd700"/><stop offset="60%" stop-color="#4ade80"/>
          <stop offset="80%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#c084fc"/>
        </linearGradient>
      </defs>
      <!-- Rainbow handle -->
      <rect x="19" y="0" width="6" height="62" fill="url(#rb-h)" stroke="#888" stroke-width="1"/>
      <!-- Stars on handle -->
      <rect x="20" y="8" width="3" height="3" fill="#fff" opacity=".5"/>
      <rect x="21" y="20" width="3" height="3" fill="#fff" opacity=".4"/>
      <rect x="20" y="34" width="3" height="3" fill="#fff" opacity=".5"/>
      <rect x="21" y="46" width="3" height="3" fill="#fff" opacity=".3"/>
      <!-- Collar -->
      <ellipse cx="22" cy="60" rx="8" ry="4" fill="url(#rb-head)" stroke="#888" stroke-width="1"/>
      <!-- Hammer head - chunky warhammer shape -->
      <rect x="0" y="64" width="44" height="20" rx="2" fill="url(#rb-head)" stroke="#888" stroke-width="1.5"/>
      <!-- Facet lines -->
      <rect x="0" y="72" width="44" height="2" fill="rgba(255,255,255,.2)"/>
      <rect x="0" y="64" width="44" height="4" fill="rgba(255,255,255,.15)"/>
      <!-- Side spikes -->
      <polygon points="0,68 -4,74 0,80" fill="url(#rb-head)" stroke="#888" stroke-width="1"/>
      <polygon points="44,68 48,74 44,80" fill="url(#rb-head)" stroke="#888" stroke-width="1"/>
      <!-- Bottom face -->
      <rect x="2" y="84" width="40" height="8" rx="1" fill="url(#rb-head)" stroke="#888" stroke-width="1"/>
      <rect x="4" y="86" width="36" height="4" fill="rgba(255,255,255,.15)"/>
      <!-- Sparkle -->
      <rect x="6" y="67" width="2" height="2" fill="#fff" opacity=".6"/>
      <rect x="34" y="70" width="2" height="2" fill="#fff" opacity=".5"/>
      <rect x="18" y="87" width="2" height="2" fill="#fff" opacity=".5"/>
      <!-- Glow -->
      <ellipse cx="22" cy="76" rx="18" ry="14" fill="#ffd700" opacity=".06"/>
    </svg>`;

    // ---- DEFAULT: Basic wooden hammer ----
    default: return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <!-- Wooden handle -->
      <rect x="19" y="0" width="6" height="74" rx="1" fill="#8B4513" stroke="#6B3410" stroke-width="1"/>
      <!-- Wood grain -->
      <line x1="21" y1="4" x2="21" y2="68" stroke="#7a3c10" stroke-width=".5" opacity=".4"/>
      <line x1="23" y1="8" x2="23" y2="60" stroke="#9a5c20" stroke-width=".5" opacity=".3"/>
      <!-- Iron collar -->
      <rect x="17" y="60" width="10" height="10" rx="1" fill="#7a5c1e" stroke="#5a3c0e" stroke-width="1"/>
      <rect x="18" y="62" width="8" height="2" fill="#9a7c3e" opacity=".5"/>
      <!-- Iron head -->
      <rect x="2" y="68" width="40" height="24" rx="2" fill="#585858" stroke="#383838" stroke-width="1"/>
      <!-- Top bevel -->
      <rect x="2" y="68" width="40" height="9" rx="2" fill="#7a7a7a"/>
      <rect x="4" y="70" width="36" height="3" fill="#8a8a8a" opacity=".4"/>
      <!-- Bottom face -->
      <rect x="2" y="86" width="40" height="6" rx="1" fill="#666"/>
      <!-- Rivets -->
      <circle cx="8" cy="73" r="2" fill="#5a5a5a" stroke="#444" stroke-width=".5"/>
      <circle cx="36" cy="73" r="2" fill="#5a5a5a" stroke="#444" stroke-width=".5"/>
      <circle cx="8" cy="86" r="2" fill="#5a5a5a" stroke="#444" stroke-width=".5"/>
      <circle cx="36" cy="86" r="2" fill="#5a5a5a" stroke="#444" stroke-width=".5"/>
    </svg>`;
  }
}

function updateHammerSVG() {
  $id('hammer').innerHTML = makeHammerSVG(G.hammer);
}

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
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
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
