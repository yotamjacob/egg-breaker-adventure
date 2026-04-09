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
  hammers: 40, maxH: 40, gold: 0, starPieces: 0, crystalBananas: 0,
  feathers: 0,
  multQueue: [],     // multipliers in hand
  activeMult: 1,     // currently selected mult (1 = none)
  _activeMultIdx: -1,
  hammer: 'default', hat: 'none',
  ownedHammers: ['default'], ownedHats: ['none'],
  eggType: 'normal',
  activeMonkey: 0,
  monkeys: null,     // built in initMonkeys()
  // Round
  roundEggs: null,
  // Daily
  lastLoginDate: null, consecutiveDays: 0, dailyClaimed: false, totalDailyClaims: 0,
  // Regen
  regenCD: 30, fastRegen: false,
  // Stats
  totalEggs: 0, totalGold: 0, totalStarPieces: 0, totalFeathers: 0,
  totalItems: 0, biggestWin: 0, highestMult: 1,
  starfallsUsed: 0, collectionsCompleted: 0, stagesCompleted: 0,
  roundClears: 0,
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
  d.roundEggs = G.roundEggs;
  localStorage.setItem(SAVE_KEY, JSON.stringify(d));
}

function loadGame() {
  G = { ...DEFAULT_STATE, monkeys: initMonkeys(), roundEggs: null };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    for (const k of Object.keys(DEFAULT_STATE)) {
      if (d[k] !== undefined && d[k] !== null) G[k] = d[k];
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
  // Migrate old save data: ensure eggs have hp/maxHp
  if (G.roundEggs) {
    G.roundEggs.forEach(egg => {
      if (egg.maxHp === undefined) {
        egg.maxHp = EGG_HP[egg.type] || 1;
        egg.hp = egg.broken ? 0 : egg.maxHp;
      }
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
  const bonus = Math.min(G.consecutiveDays * 5, 100);
  $id('daily-detail').textContent = '+' + (40 + bonus) + ' hammers';
}

function claimDaily() {
  if (G.dailyClaimed) return;
  const bonus = Math.min(G.consecutiveDays * 5, 100);
  const total = 40 + bonus;
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
  setTimeout(() => el.remove(), cls === 'mega' ? 2000 : 1300);
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
    tray.innerHTML = '<p style="color:var(--gray);font-size:8px;padding:40px 0;font-family:var(--px)">Loading eggs...</p>';
    setTimeout(() => newRound(), 300);
    return;
  }
  G.roundEggs.forEach((egg, i) => {
    const slot = document.createElement('div');
    slot.className = 'egg-slot' + (egg.broken ? ' broken' : '') + (egg.type === 'gold' ? ' gold-egg' : '');
    const damage = egg.maxHp - egg.hp;
    slot.innerHTML = makeEggSVG(egg.type, egg.broken ? egg.maxHp : damage) +
      '<span class="egg-label">' + egg.type +
      (egg.broken ? '' : ' ' + egg.hp + '/' + egg.maxHp) + '</span>';
    if (!egg.broken) {
      slot.addEventListener('click', () => smashEgg(i));
    }
    tray.appendChild(slot);
  });
}

// ==================== PRIZE ROLLING ====================
function rollPrize(eggType) {
  const w = { ...PRIZE_WEIGHTS[eggType] };
  const monkey = curMonkey();
  const prog = curProgress();

  // Equipment bonuses
  const hammerBonus = getHammerBonus();
  const hatBonus = getHatBonus();
  const monkeyPerk = monkey.perk;

  if (hammerBonus === 'lessEmpty') w.empty = Math.max(0, w.empty * 0.4);
  if (hammerBonus === 'moreStars' || monkeyPerk === 'moreStars') w.star *= 1.15;
  if (hammerBonus === 'moreFeathers') w.feather *= 1.2;
  if (hammerBonus === 'moreItems' || monkeyPerk === 'moreItems') w.item *= 1.1;
  if (hatBonus === 'starBoost') w.star *= 1.1;
  if (hatBonus === 'itemBoost') w.item *= 1.15;

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
  const hammerBonus = getHammerBonus();
  const hatBonus = getHatBonus();
  const monkeyPerk = curMonkey().perk;

  if (type === 'empty') return { type: 'empty', value: 0, label: 'Empty!', color: '#9ca3af' };

  if (type.startsWith('gold_')) {
    const range = GOLD_VALUES[type];
    const baseVal = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    let val = Math.round(baseVal * G.activeMult * silverMult * goldMult);
    if (hammerBonus === 'moreGold' || monkeyPerk === 'moreGold') val = Math.round(val * 1.2);
    if (hatBonus === 'goldBoost') val = Math.round(val * 1.1);
    const usedMult = G.activeMult > 1 ? G.activeMult : 0;
    return { type: 'gold', value: val, baseVal, usedMult, label: '+' + val + ' gold', color: '#d97706' };
  }

  if (type === 'feather') {
    const baseVal = Math.ceil((1 + Math.random() * 3) * silverMult);
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? G.activeMult : 0;
    return { type: 'feather', value: val, baseVal, usedMult, label: '+' + val + ' feather' + (val > 1 ? 's' : ''), color: '#059669' };
  }

  if (type === 'hammers') {
    const baseVal = HAMMER_PRIZES[Math.floor(Math.random() * HAMMER_PRIZES.length)];
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? G.activeMult : 0;
    return { type: 'hammers', value: val, baseVal, usedMult, label: '+' + val + ' hammers!', color: '#b45309' };
  }

  if (type === 'star') {
    const baseVal = silverMult > 1 ? 2 : 1;
    const val = G.activeMult > 1 ? Math.round(baseVal * G.activeMult) : baseVal;
    const usedMult = G.activeMult > 1 ? G.activeMult : 0;
    return { type: 'star', value: val, baseVal, usedMult, label: '+' + val + ' star piece' + (val > 1 ? 's' : ''), color: '#f59e0b' };
  }

  // For prize types not directly multiplied, give bonus gold when mult is active
  const bonusGold = G.activeMult > 1 ? Math.round(10 * G.activeMult) : 0;
  const usedMultBonus = G.activeMult > 1 ? G.activeMult : 0;

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
    const baseW = rarity === 1 ? 10 : rarity === 2 ? 5 : 2;
    return collected[i] ? baseW * 0.3 : baseW * 2; // strong pity for uncollected
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
        emoji: item[0], name: item[1], rarity: item[2],
        label: item[0] + ' ' + item[1] + (isNew ? ' (NEW!)' : ''),
        color: isNew ? '#b45309' : '#78716c',
      };
    }
  }
  // Fallback: give gold instead
  return { type: 'gold', value: 50, label: '+50 gold', color: '#d97706' };
}

function getHammerBonus() {
  const h = SHOP_HAMMERS.find(h => h.id === G.hammer);
  return h ? h.bonus : null;
}
function getHatBonus() {
  const h = SHOP_HATS.find(h => h.id === G.hat);
  return h ? h.bonus : null;
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
    msg('Need a hammer!', '#ef4444');
    SFX.play('err');
    return;
  }

  G.hammers -= 1;

  // Chef hat: 10% chance hit was free
  if (getHatBonus() === 'freeEgg' && Math.random() < 0.1) {
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
    // Re-attach click handler (innerHTML wipes it)
    slot.addEventListener('click', () => smashEgg(index));
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
      spawnFloat(zone, prize.baseVal + ' x' + prize.usedMult + ' = ' + prize.value + ' gold', '#d97706', cls || 'big');
      msg(prize.baseVal + ' x' + prize.usedMult + ' = +' + prize.value + ' gold!', '#d97706');
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
      spawnFloat(zone, prize.baseVal + ' x' + prize.usedMult + ' = ' + prize.value + ' stars', '#f59e0b', 'big');
      msg(prize.baseVal + ' x' + prize.usedMult + ' = +' + prize.value + ' star pieces!', '#f59e0b');
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
      spawnFloat(zone, '+' + prize.bonusGold + ' gold (x' + prize.usedMult + ' bonus)', '#d97706');
    }
  }

  if (prize.type === 'feather') {
    G.feathers += prize.value;
    G.totalFeathers += prize.value;
    if (prize.usedMult) {
      spawnFloat(zone, prize.baseVal + ' x' + prize.usedMult + ' = ' + prize.value + ' feathers', '#059669', 'big');
      msg(prize.baseVal + ' x' + prize.usedMult + ' = +' + prize.value + ' feathers!', '#059669');
    } else {
      spawnFloat(zone, prize.label, '#059669');
      msg(prize.label, '#059669');
    }
    SFX.play('coin');
  }

  if (prize.type === 'hammers') {
    G.hammers = Math.min(G.maxH, G.hammers + prize.value);
    if (prize.usedMult) {
      spawnFloat(zone, prize.baseVal + ' x' + prize.usedMult + ' = ' + prize.value + ' hammers', '#b45309', 'big');
      msg(prize.baseVal + ' x' + prize.usedMult + ' = +' + prize.value + ' hammers!', '#b45309');
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
      const dupeGold = 10 + Math.floor(Math.random() * 30);
      G.gold += dupeGold;
      G.totalGold += dupeGold;
      msg('Duplicate! +' + dupeGold + ' gold', '#78716c');
      SFX.play('coin');
    }
    if (prize.bonusGold) {
      G.gold += prize.bonusGold;
      G.totalGold += prize.bonusGold;
      spawnFloat(zone, '+' + prize.bonusGold + ' gold (x' + prize.usedMult + ' bonus)', '#d97706');
    }
  }

  checkAchievements();
}

// ==================== STARFALL ====================
function useStarfall() {
  if (G.starPieces < 5 || !G.roundEggs) return;
  G.starPieces -= 5;
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
  btn.disabled = G.starPieces < 5 || !G.roundEggs || G.roundEggs.every(e => e.broken);
  $id('star-lbl').textContent = '(' + G.starPieces + '/5)';
}

// ==================== COLLECTION / STAGE ====================
function checkCollectionComplete() {
  const prog = curProgress();
  const stage = curStage();
  const collected = prog.collections[prog.stage];
  const total = stage.collection.items.length;
  const found = collected.filter(Boolean).length;

  // Tier thresholds
  const thresholds = [
    Math.ceil(total * 0.5),  // bronze
    Math.ceil(total * 0.75), // silver
    total,                    // gold (all)
  ];

  if (prog.tier < 3 && found >= thresholds[prog.tier]) {
    // Tier up!
    const tierNames = ['Bronze', 'Silver', 'Gold'];
    const oldTier = prog.tier;
    prog.tier++;

    if (prog.tier >= 3) {
      // Stage complete!
      G.stagesCompleted++;
      G.crystalBananas++;
      SFX.play('tier');

      showStagePopup(
        'Stage Complete!',
        stage.name + ' - Gold! +1 Crystal Banana'
      );

      // Advance to next stage
      if (prog.stage < curMonkey().stages.length - 1) {
        prog.stage++;
        prog.tier = 0;
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
      const rewards = ['+5 max hammers', '+10 max hammers'];
      G.maxH += prog.tier === 1 ? 5 : 10;
      G.hammers = Math.min(G.maxH, G.hammers + 5);
      showStagePopup(
        tierNames[prog.tier] + ' Tier!',
        stage.name + ' - ' + rewards[prog.tier - 1]
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
function renderMultQueue() {
  const q = $id('mult-queue');
  q.innerHTML = '';
  G.multQueue.forEach((val, i) => {
    const chip = document.createElement('span');
    chip.className = 'mult-chip' + (G.activeMult === val && G._activeMultIdx === i ? ' active' : '');
    chip.textContent = 'x' + val;
    chip.addEventListener('click', () => {
      if (G.activeMult === val && G._activeMultIdx === i) {
        // Deselect
        G.activeMult = 1;
        G._activeMultIdx = -1;
      } else {
        G.activeMult = val;
        G._activeMultIdx = i;
      }
      renderMultQueue();
      $id('active-mult').textContent = 'x' + G.activeMult;
    });
    q.appendChild(chip);
  });
  $id('active-mult').textContent = 'x' + G.activeMult;

  // After using a multiplier, remove it from queue
  if (G.activeMult > 1 && G._activeMultIdx >= 0) {
    // Will be consumed after smash
  }
}

// Consume the active multiplier after smash (called in smashEgg)
// Actually let's handle this properly: when activeMult > 1 is used, remove from queue
function consumeMultiplier() {
  if (G.activeMult > 1 && G._activeMultIdx >= 0 && G._activeMultIdx < G.multQueue.length) {
    G.multQueue.splice(G._activeMultIdx, 1);
    G.activeMult = 1;
    G._activeMultIdx = -1;
  }
}

// ==================== HAMMER REGEN ====================
function startRegen() {
  G.regenCD = G.fastRegen ? 15 : 30;
  regenInt = setInterval(() => {
    G.regenCD--;
    if (G.regenCD <= 0) {
      G.hammers = Math.min(G.maxH, G.hammers + 1);
      if (G.hammers >= G.maxH) {
        clearInterval(regenInt); regenInt = null;
      } else {
        G.regenCD = G.fastRegen ? 15 : 30;
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
      // Equip it
      G.hammer = id;
      SFX.play('buy');
      renderShop();
      saveGame();
      return;
    }
    if (G.gold < item.cost) { msg('Need ' + item.cost + ' gold!', '#ef4444'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.ownedHammers.push(id);
    G.hammer = id;
    G.purchases = (G.purchases || 0) + 1;
    SFX.play('buy');
    msg('Bought ' + item.name + '!', '#16a34a');
  }

  if (category === 'hat') {
    const item = SHOP_HATS.find(h => h.id === id);
    if (!item || item.cost === 0) return;
    if (G.ownedHats.includes(id)) {
      G.hat = id;
      SFX.play('buy');
      renderShop();
      saveGame();
      return;
    }
    if (G.gold < item.cost) { msg('Need ' + item.cost + ' gold!', '#ef4444'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.ownedHats.push(id);
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

function checkAchievements() {
  const checks = {
    first_smash: () => G.totalEggs >= 1,
    smash_50: () => G.totalEggs >= 50,
    smash_200: () => G.totalEggs >= 200,
    smash_1000: () => G.totalEggs >= 1000,
    gold_1000: () => G.totalGold >= 1000,
    gold_50000: () => G.totalGold >= 50000,
    gold_500000: () => G.totalGold >= 500000,
    stars_10: () => G.totalStarPieces >= 10,
    starfall_1: () => G.starfallsUsed >= 1,
    starfall_10: () => G.starfallsUsed >= 10,
    coll_1: () => G.collectionsCompleted >= 1,
    coll_5: () => G.collectionsCompleted >= 5,
    coll_15: () => G.collectionsCompleted >= 15,
    stage_1: () => G.stagesCompleted >= 1,
    stage_9: () => G.stagesCompleted >= 9,
    monkey_2: () => G.monkeys.filter(m => m.unlocked).length >= 2,
    monkey_all: () => G.monkeys.every(m => m.unlocked),
    streak_5: () => G.consecutiveDays >= 5,
    streak_20: () => G.consecutiveDays >= 20,
    mult_50: () => G.highestMult >= 50,
    buy_hammer: () => G.ownedHammers.length > 1,
    buy_hat: () => G.ownedHats.length > 1,
    daily_100: () => (G.totalDailyClaims || 0) >= 100,
    round_clear: () => G.roundClears >= 1,
  };

  for (const a of ACHIEVEMENT_DATA) {
    if (G.achieved.includes(a.id)) continue;
    const fn = checks[a.id];
    if (fn && fn()) {
      G.achieved.push(a.id);
      showAchieveToast(a);
      SFX.play('achieve');
    }
  }
}

function showAchieveToast(a) {
  const t = $id('toast-achieve');
  $id('toast-icon').textContent = a.icon;
  $id('toast-name').textContent = a.name;
  $id('toast-desc').textContent = a.desc;
  t.classList.remove('hidden');
  // Force reflow
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.classList.add('hidden'), 400);
  }, 3000);
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
  $id('res-h').textContent = G.hammers;
  $id('res-g').textContent = formatNum(G.gold);
  $id('res-s').textContent = G.starPieces + '/5';
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
  $id('stage-detail').textContent = found + '/' + total + ' items • ' + stage.collection.name;
}

function renderAll() {
  const monkey = curMonkey();
  $id('monkey-avatar').textContent = monkey.emoji;
  $id('monkey-subtitle').textContent = monkey.name;
  $id('sound-btn').textContent = G.soundOn ? '🔊' : '🔇';

  updateResources();
  updateStageBar();
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

function renderAlbumStage(stageIdx) {
  const monkey = curMonkey();
  const prog = curProgress();
  const stage = monkey.stages[stageIdx];
  const collected = prog.collections[stageIdx] || [];
  const div = $id('album-items');

  let html = '<div class="album-coll-name">' + stage.collection.name + '</div>';
  html += '<div class="album-grid">';
  stage.collection.items.forEach((item, i) => {
    const found = collected[i];
    const rarityClass = 'rarity-' + item[2];
    const rarityLabel = ['', 'Common', 'Uncommon', 'Rare'][item[2]];
    html += '<div class="album-item ' + (found ? 'found' : 'locked') + '">';
    html += '<span class="item-emoji">' + (found ? item[0] : '❓') + '</span>';
    html += '<span class="item-name">' + (found ? item[1] : '???') + '</span>';
    html += '<span class="album-rarity ' + rarityClass + '">' + rarityLabel + '</span>';
    html += '</div>';
  });
  html += '</div>';
  div.innerHTML = html;

  // Update active button
  document.querySelectorAll('.album-stage-btn').forEach((b, i) => {
    b.classList.toggle('active', i === stageIdx);
  });
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

function renderShop() {
  // Hammers
  const hGrid = $id('shop-hammers');
  hGrid.innerHTML = '';
  SHOP_HAMMERS.forEach(h => {
    if (h.cost === 0) return; // skip default
    const owned = G.ownedHammers.includes(h.id);
    const equipped = G.hammer === h.id;
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : '') + (equipped ? ' equipped' : '');
    card.innerHTML =
      '<span class="s-emoji">' + h.emoji + '</span>' +
      '<span class="s-name">' + h.name + '</span>' +
      '<span class="s-desc">' + h.desc + '</span>' +
      (owned
        ? '<span class="s-status">' + (equipped ? 'EQUIPPED' : 'Click to equip') + '</span>'
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
    const equipped = G.hat === h.id;
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : '') + (equipped ? ' equipped' : '');
    card.innerHTML =
      '<span class="s-emoji">' + h.emoji + '</span>' +
      '<span class="s-name">' + h.name + '</span>' +
      '<span class="s-desc">' + h.desc + '</span>' +
      (owned
        ? '<span class="s-status">' + (equipped ? 'EQUIPPED' : 'Click to equip') + '</span>'
        : '<span class="s-cost">' + formatNum(h.cost) + ' 🪙</span>');
    card.addEventListener('click', () => buyShopItem('hat', h.id));
    hatGrid.appendChild(card);
  });

  // Supplies
  const sGrid = $id('shop-supplies');
  sGrid.innerHTML = '';
  SHOP_SUPPLIES.forEach(s => {
    const isOwned = s.unique && G['owned_' + s.id];
    const card = document.createElement('div');
    card.className = 'shop-card' + (isOwned ? ' owned' : '');
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
    card.innerHTML =
      '<span class="a-icon">' + a.icon + '</span>' +
      '<div><span class="a-name">' + a.name + '</span><br>' +
      '<span class="a-desc">' + a.desc + '</span></div>';
    grid.appendChild(card);
  });
}

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// ==================== LEXICON ====================
const LEXICON_SECTIONS = [
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
<tr><td>🥚 Normal</td><td class="num">1</td><td class="num">~75%</td><td>Can be empty (~12%)</td></tr>
<tr><td>🪨 Silver</td><td class="num">2</td><td class="num">~18%</td><td>Never empty, 2x prizes, can drop bonus hammers</td></tr>
<tr><td>🌟 Gold</td><td class="num">3</td><td class="num">~7%</td><td>Never empty, 1.5x gold, best item drop rate</td></tr>
</table>
<p>You start with <strong>40 hammers</strong>. They regenerate at +1 every 30s (15s with Fast Regen from the shop). Daily login gives 40 + up to 100 bonus hammers based on your streak. Tier-ups also increase your max.</p>
`
  },
  {
    id: 'prizes', icon: '🎁', title: 'What\'s Inside',
    html: () => `
<p><strong>Gold</strong> — main currency (5–250 base, boosted by egg type, multipliers, and equipment). Spend it in the shop.</p>
<p><strong>Star Pieces</strong> — collect 5 to trigger <strong>Starfall</strong>, which smashes all remaining eggs for free.</p>
<p><strong>Multipliers</strong> — x2, x3, x5, x10, or x50. Stored in a queue. Click one to activate it before your next smash — it boosts gold, then gets consumed. Only affects gold prizes.</p>
<p><strong>Feathers</strong> — bonus collectible currency.</p>
<p><strong>Collection Items</strong> — themed items for the current stage. New ones count toward completion. Duplicates convert to 10–40 gold.</p>
<p><strong>Bonus Hammers</strong> — Silver eggs only. 2–8 free hammers.</p>
`
  },
  {
    id: 'progress', icon: '📚', title: 'Stages & Collections',
    html: () => `
<p>Each monkey has <strong>9 stages</strong>. Each stage has a themed collection of 5–8 items in three rarities (Common, Uncommon, Rare). A <strong>pity system</strong> makes uncollected items ~7x more likely to drop.</p>
<table class="lex-table">
<tr><th>Tier</th><th>Collect</th><th>Reward</th></tr>
<tr><td class="hl">Bronze → Silver</td><td class="num">50%</td><td>+5 max hammers</td></tr>
<tr><td class="hl">Silver → Gold</td><td class="num">75%</td><td>+10 max hammers</td></tr>
<tr><td class="hl">Gold (done)</td><td class="num">100%</td><td>+1 Crystal Banana, next stage</td></tr>
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
<p>Each monkey is a separate adventure with 9 stages. Unlock new ones with Crystal Bananas (1 per completed stage). Perks stack with equipment.</p>
<table class="lex-table">
<tr><th>Monkey</th><th>Cost</th><th>Perk</th></tr>
${rows}
</table>
`;
    }
  },
  {
    id: 'shop', icon: '🛒', title: 'Shop',
    html: () => `
<p><strong>Hammers</strong> — permanent equipment, one equipped at a time. Effects range from fewer empties (Bat, 8K gold) to +20% gold (Golden, 50K gold) to +10% items (Rainbow, 100K gold).</p>
<p><strong>Hats</strong> — permanent, one equipped. 10% free eggs (Chef, 10K), +10% gold (Crown, 20K), +10% stars (Wizard, 30K), +15% items (Pirate, 80K).</p>
<p><strong>Supplies</strong> — consumables: hammer packs (200–700 gold), star pieces (2K), multipliers (3K), +5 max hammers (5K), fast regen (10K, one-time).</p>
<p>All bonuses stack multiplicatively with each other and monkey perks.</p>
`
  },
  {
    id: 'tips', icon: '🧠', title: 'Quick Tips',
    html: () => `
<p><strong>Early on:</strong> use Normal eggs, claim dailies, let hammers regen naturally.</p>
<p><strong>Mid game:</strong> switch to Silver eggs — no empties plus bonus hammer drops make them self-sustaining.</p>
<p><strong>Late game:</strong> Gold eggs + saved multipliers = massive gold. Starfall on a 7-egg Gold round is the ultimate move.</p>
<p><strong>Save x50 multipliers</strong> for Gold egg large-gold rolls. One lucky hit can net 30,000+ gold.</p>
<p><strong>Best builds:</strong> Princess + Golden Hammer + Crown for gold farming. Space Cadette + Rainbow + Pirate for fast collection completion.</p>
`
  },
];

function renderLexicon() {
  const content = $id('lex-content');
  content.innerHTML = '';
  LEXICON_SECTIONS.forEach(sec => {
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

// ==================== INIT ====================
loadGame();

// Ensure sound state matches saved preference
if (G.soundOn === false && SFX.isOn()) SFX.toggle();

Particles.init($id('particle-canvas'));

// Generate initial round if none
if (!G.roundEggs || G.roundEggs.length === 0) newRound();

renderAll();

// Start regen if needed
if (G.hammers < G.maxH && !regenInt) startRegen();

// Auto-save
setInterval(saveGame, 15000);

// Hammer follows mouse inside egg tray
(() => {
  const wrap = $id('egg-tray-wrap');
  const hammer = $id('hammer');
  wrap.addEventListener('mousemove', (e) => {
    const r = wrap.getBoundingClientRect();
    // Position hammer so the head (bottom of SVG) is at the cursor
    hammer.style.left = (e.clientX - r.left - 20) + 'px';
    hammer.style.top = (e.clientY - r.top - 80) + 'px';
  });
  wrap.addEventListener('mouseleave', () => {
    hammer.style.opacity = '0';
  });
  wrap.addEventListener('mouseenter', () => {
    hammer.style.opacity = '1';
  });
})();
