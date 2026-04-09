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
      if (n === 'hit')     { noise(.12, .25); tone(180, .08, .15, 'square'); }
      if (n === 'coin')    { tone(880, .1, .12); setTimeout(() => tone(1320, .15, .1), 60); }
      if (n === 'gem')     { tone(1200, .08, .1); setTimeout(() => tone(1600, .08, .08), 50); setTimeout(() => tone(2000, .2, .06), 100); }
      if (n === 'star')    { tone(700, .1, .1); setTimeout(() => tone(1050, .12, .08), 70); setTimeout(() => tone(1400, .15, .06), 140); }
      if (n === 'item')    { [0,80,160].forEach((t, i) => setTimeout(() => tone(600 + i * 200, .15, .1), t)); }
      if (n === 'empty')   { tone(150, .15, .1, 'triangle'); }
      if (n === 'starfall'){ [0,60,120,180,240,300].forEach((t, i) => setTimeout(() => tone(440 * Math.pow(2, i / 5), .2, .1), t)); }
      if (n === 'levelup') { [0,100,200,300].forEach((t, i) => setTimeout(() => tone(523 * Math.pow(2, i / 4), .25, .1), t)); }
      if (n === 'achieve') { tone(880, .15, .1); setTimeout(() => tone(1100, .15, .1), 100); setTimeout(() => tone(1320, .25, .08), 200); }
      if (n === 'buy')     { tone(500, .08, .1); setTimeout(() => tone(700, .12, .08), 60); }
      if (n === 'err')     { tone(200, .15, .1, 'square'); }
      if (n === 'tier')    { [0,80,160,240,320].forEach((t, i) => setTimeout(() => tone(523 * Math.pow(2, i / 6), .2, .1), t)); }
    } catch (_) {}
  }
  return { play, toggle() { on = !on; return on; }, isOn() { return on; } };
})();

// ==================== PARTICLES ====================
const Particles = (() => {
  let canvas, ctx, ps = [], running = false;
  const COLORS = {
    normal: ['#FEF9F0','#F5E6C8','#E8D5A8','#D4C090'],
    silver: ['#E8E8E8','#D0D0D0','#B8B8B8'],
    gold:   ['#FEFCE8','#FDE68A','#FCD34D','#F59E0B'],
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
        const s = p.sz;
        ctx.beginPath();
        ctx.moveTo(-s, -s * .6); ctx.lineTo(s * .7, -s * .4);
        ctx.lineTo(s * .4, s * .7); ctx.lineTo(-s * .3, s * .5);
        ctx.closePath(); ctx.fill();
      } else {
        const s = p.sz;
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const a2 = (j * 4 * Math.PI) / 5 - Math.PI / 2;
          const r2 = j % 2 === 0 ? s : s * .4;
          j === 0 ? ctx.moveTo(Math.cos(a2) * r2, Math.sin(a2) * r2)
                   : ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        }
        ctx.closePath(); ctx.fill();
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
  for (let i = 0; i < count; i++) {
    // Determine egg type: mostly what player selected, chance for silver/gold upgrades
    let type = G.eggType;
    // Random upgrade chance based on stage progress
    const r = Math.random();
    if (type === 'normal' && r < 0.08) type = 'silver';
    if (type === 'normal' && r < 0.02) type = 'gold';
    if (type === 'silver' && r < 0.05) type = 'gold';
    eggs.push({ type, broken: false });
  }
  G.roundEggs = eggs;
  $id('hint-txt').classList.remove('hidden');
  renderEggTray();
  updateResources();
  saveGame();
}

// ==================== EGG RENDERING ====================
function makeEggSVG(type, broken) {
  const colors = {
    normal: { f: '#FEF9F0', s: '#D4A853' },
    silver: { f: '#E8E8E8', s: '#9CA3AF' },
    gold:   { f: '#FEFCE8', s: '#EAB308' },
  };
  const c = colors[type] || colors.normal;
  const crack = broken ? `<g>
    <path d="M40 12 L35 28 L42 40 L33 58" stroke="#7A4010" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M52 25 L45 40 L50 55" stroke="#7A4010" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </g>` : '';
  return `<svg width="72" height="90" viewBox="0 0 80 100">
    <ellipse cx="40" cy="90" rx="22" ry="5" fill="rgba(0,0,0,.06)"/>
    <ellipse cx="40" cy="55" rx="30" ry="40" fill="${c.f}" stroke="${c.s}" stroke-width="2.5"/>
    <ellipse cx="30" cy="35" rx="8" ry="12" fill="white" opacity=".25"/>
    ${crack}
  </svg>`;
}

function renderEggTray() {
  const tray = $id('egg-tray');
  tray.innerHTML = '';
  if (!G.roundEggs || G.roundEggs.length === 0) {
    tray.innerHTML = '<p style="color:#78716c;font-size:13px;padding:40px 0">Press <strong>New Round</strong> to start!</p>';
    return;
  }
  G.roundEggs.forEach((egg, i) => {
    const slot = document.createElement('div');
    slot.className = 'egg-slot' + (egg.broken ? ' broken' : '') + (egg.type === 'gold' ? ' gold-egg' : '');
    slot.innerHTML = makeEggSVG(egg.type, egg.broken) +
      '<span class="egg-label">' + egg.type + '</span>';
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
    let val = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    val = Math.round(val * G.activeMult * silverMult * goldMult);
    if (hammerBonus === 'moreGold' || monkeyPerk === 'moreGold') val = Math.round(val * 1.2);
    if (hatBonus === 'goldBoost') val = Math.round(val * 1.1);
    return { type: 'gold', value: val, label: '+' + val + ' gold', color: '#d97706' };
  }

  if (type === 'star') {
    const val = silverMult > 1 ? 2 : 1;
    return { type: 'star', value: val, label: '+' + val + ' star piece' + (val > 1 ? 's' : ''), color: '#f59e0b' };
  }

  if (type === 'mult') {
    const val = MULT_VALUES[Math.floor(Math.random() * MULT_VALUES.length)];
    return { type: 'mult', value: val, label: 'x' + val + ' multiplier!', color: '#7c3aed' };
  }

  if (type === 'feather') {
    const val = Math.ceil((1 + Math.random() * 3) * silverMult);
    return { type: 'feather', value: val, label: '+' + val + ' feather' + (val > 1 ? 's' : ''), color: '#059669' };
  }

  if (type === 'hammers') {
    const val = HAMMER_PRIZES[Math.floor(Math.random() * HAMMER_PRIZES.length)];
    return { type: 'hammers', value: val, label: '+' + val + ' hammers!', color: '#b45309' };
  }

  if (type === 'item') {
    return rollCollectionItem(eggType);
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
  const cost = EGG_COST[egg.type];
  if (G.hammers < cost) {
    msg('Need ' + cost + ' hammer' + (cost > 1 ? 's' : '') + '!', '#ef4444');
    SFX.play('err');
    return;
  }

  G.hammers -= cost;

  // Chef hat: 10% chance egg was free
  if (getHatBonus() === 'freeEgg' && Math.random() < 0.1) {
    G.hammers = Math.min(G.maxH, G.hammers + cost);
    msg('Free egg! (Chef\'s Hat)', '#16a34a');
  }

  G.totalEggs++;
  egg.broken = true;

  // Start regen if needed
  if (!regenInt && G.hammers < G.maxH) startRegen();

  $id('hint-txt').classList.add('hidden');

  // Animate the egg slot
  const slots = $id('egg-tray').children;
  const slot = slots[index];
  slot.classList.add('smashing');
  setTimeout(() => slot.classList.remove('smashing'), 450);

  // Sound & particles
  SFX.play('hit');
  const rect = slot.getBoundingClientRect();
  const wrapRect = $id('egg-tray-wrap').getBoundingClientRect();
  const cx = rect.left - wrapRect.left + rect.width / 2;
  const cy = rect.top - wrapRect.top + rect.height / 2;
  Particles.emit(cx, cy, egg.type, 8 + Math.random() * 5 | 0);
  shake(egg.type === 'gold' ? 'md' : 'sm');

  // Roll prize
  const prize = rollPrize(egg.type);

  // Apply prize
  setTimeout(() => {
    applyPrize(prize, cx, cy);

    // Update egg visual to broken
    slot.classList.add('broken');
    slot.innerHTML = makeEggSVG(egg.type, true) + '<span class="egg-label">' + egg.type + '</span>';

    // Check if all eggs broken
    if (G.roundEggs.every(e => e.broken)) {
      G.roundClears++;
      checkAchievements();
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
    const cls = prize.value >= 200 ? 'big' : prize.value >= 500 ? 'mega' : '';
    spawnFloat(zone, prize.label, '#d97706', cls);
    msg(prize.label, '#d97706');
    SFX.play('coin');
    if (prize.value >= 200) Particles.sparkle(cx, cy, 12, '#FFD700');
  }

  if (prize.type === 'star') {
    G.starPieces += prize.value;
    G.totalStarPieces += prize.value;
    spawnFloat(zone, prize.label, '#f59e0b', 'big');
    msg(prize.label, '#f59e0b');
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
  }

  if (prize.type === 'feather') {
    G.feathers += prize.value;
    G.totalFeathers += prize.value;
    spawnFloat(zone, prize.label, '#059669');
    msg(prize.label, '#059669');
    SFX.play('coin');
  }

  if (prize.type === 'hammers') {
    G.hammers = Math.min(G.maxH, G.hammers + prize.value);
    spawnFloat(zone, prize.label, '#b45309', 'big');
    msg(prize.label, '#b45309');
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
      // Free smash - don't cost hammers
      const egg = G.roundEggs[idx];
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
      Particles.emit(cx, cy, egg.type, 12);
      Particles.sparkle(cx, cy, 8, '#FFD700');
      shake('sm');
      SFX.play('hit');

      const prize = rollPrize(egg.type);
      setTimeout(() => {
        applyPrize(prize, cx, cy);
        slot.classList.add('broken');
        slot.innerHTML = makeEggSVG(egg.type, true) + '<span class="egg-label">' + egg.type + '</span>';
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

// ==================== EGG TYPE ====================
function pickEggType(type) {
  G.eggType = type;
  document.querySelectorAll('.epick').forEach(b => b.classList.remove('active'));
  document.querySelector('.epick[data-type="' + type + '"]').classList.add('active');
  saveGame();
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
  if (!G.soundOn) SFX.toggle(); // sync sound state
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
    id: 'overview', icon: '📖', title: 'Game Overview',
    html: () => `
<p>Egg Breaker Adventures is a recreation of the classic Facebook Flash game originally developed by <strong>DJArts Games</strong> (later Codename Entertainment) which ran from 2008 to 2016. Over its lifetime, players collectively broke more than <strong>70 billion eggs</strong>.</p>
<h4>Core Loop</h4>
<p>Each round presents a set of eggs. Click an egg to smash it with a hammer, revealing a random prize inside. Collect items to complete stage collections, advance through tiers, earn Crystal Bananas, and unlock new monkeys with unique adventures.</p>
<h4>Goal</h4>
<p>Complete all <strong>9 stages</strong> for each of the <strong>4 monkeys</strong> by collecting every item in each stage's collection. Each stage has <strong>3 tiers</strong> (Bronze, Silver, Gold) to push through.</p>
<h4>Keyboard Shortcuts</h4>
<table class="lex-table">
<tr><th>Key</th><th>Action</th></tr>
<tr><td><strong>Space</strong> or <strong>Enter</strong></td><td>Smash the next unbroken egg</td></tr>
<tr><td><strong>R</strong></td><td>Start a new round</td></tr>
<tr><td><strong>Ctrl+S</strong></td><td>Trigger Starfall (if available)</td></tr>
</table>
<p class="lex-tip">Your progress is automatically saved to your browser's local storage every 15 seconds and after every action.</p>
`
  },
  {
    id: 'hammers', icon: '🔨', title: 'Hammers',
    html: () => `
<p>Hammers are the primary resource spent to break eggs. Each egg type costs a different number of hammers.</p>
<h4>Hammer Costs per Egg</h4>
<table class="lex-table">
<tr><th>Egg Type</th><th>Cost</th></tr>
<tr><td>🥚 Normal</td><td class="num">1 hammer</td></tr>
<tr><td>🪨 Silver</td><td class="num">2 hammers</td></tr>
<tr><td>🌟 Gold</td><td class="num">3 hammers</td></tr>
</table>
<h4>Starting Hammers</h4>
<p>You begin with <strong>40 hammers</strong> and a max capacity of <strong>40</strong>. Max capacity increases through tier-ups and shop upgrades.</p>
<h4>Regeneration</h4>
<p>When below max, hammers regenerate automatically:</p>
<table class="lex-table">
<tr><th>Mode</th><th>Rate</th></tr>
<tr><td>Standard</td><td class="num">+1 every 30 seconds</td></tr>
<tr><td>Fast Regen (shop upgrade)</td><td class="num">+1 every 15 seconds</td></tr>
</table>
<h4>Other Sources</h4>
<p><strong>Daily bonus</strong> — 40 + streak bonus hammers per day.<br>
<strong>Silver eggs</strong> — only egg type that can contain hammers as a prize (2, 3, 5, 5, or 8).<br>
<strong>Shop</strong> — buy +5 or +20 hammer packs.<br>
<strong>Tier-ups</strong> — Silver tier gives +5 max hammers & refill; Gold tier gives +10 max hammers & refill.<br>
<strong>Stage complete</strong> — reaching Gold tier refills 5 hammers.</p>
`
  },
  {
    id: 'eggs', icon: '🥚', title: 'Egg Types',
    html: () => {
      // Calculate actual percentages from PRIZE_WEIGHTS
      function pcts(type) {
        const w = PRIZE_WEIGHTS[type];
        const total = Object.values(w).reduce((a, b) => a + b, 0);
        const r = {};
        for (const [k, v] of Object.entries(w)) r[k] = ((v / total) * 100).toFixed(1);
        return r;
      }
      const n = pcts('normal'), s = pcts('silver'), g = pcts('gold');
      return `
<h4>Normal Egg 🥚</h4>
<p>Cost: <strong>1 hammer</strong>. The standard egg. Can be empty. Good for early-game grinding.</p>
<p>During round generation, each Normal egg has an <strong>8% chance</strong> to upgrade to Silver and a <strong>2% chance</strong> to upgrade to Gold (checked independently).</p>

<h4>Silver Egg 🪨</h4>
<p>Cost: <strong>2 hammers</strong>. All prize values are <strong>doubled</strong> (gold amounts multiplied by 2, star pieces give 2 instead of 1, feather amounts doubled). <strong>Cannot be empty.</strong> The <em>only</em> egg type that can contain bonus hammers.</p>
<p>During round generation, Silver eggs have a <strong>5% chance</strong> to upgrade to Gold.</p>

<h4>Gold Egg 🌟</h4>
<p>Cost: <strong>3 hammers</strong>. <strong>Guaranteed never empty</strong> and no small-gold drops. All gold values get a <strong>1.5x bonus</strong>. Highest chance for collection items and large gold.</p>

<h4>Prize Drop Rates by Egg Type</h4>
<table class="lex-table">
<tr><th>Prize</th><th>Normal</th><th>Silver</th><th>Gold</th></tr>
<tr><td>Empty</td><td class="num">${n.empty}%</td><td class="num">${s.empty}%</td><td class="num">${g.empty}%</td></tr>
<tr><td>Gold (small: 5–15)</td><td class="num">${n.gold_s}%</td><td class="num">${s.gold_s}%</td><td class="num">${g.gold_s}%</td></tr>
<tr><td>Gold (medium: 20–60)</td><td class="num">${n.gold_m}%</td><td class="num">${s.gold_m}%</td><td class="num">${g.gold_m}%</td></tr>
<tr><td>Gold (large: 80–250)</td><td class="num">${n.gold_l}%</td><td class="num">${s.gold_l}%</td><td class="num">${g.gold_l}%</td></tr>
<tr><td>Star Piece</td><td class="num">${n.star}%</td><td class="num">${s.star}%</td><td class="num">${g.star}%</td></tr>
<tr><td>Multiplier</td><td class="num">${n.mult}%</td><td class="num">${s.mult}%</td><td class="num">${g.mult}%</td></tr>
<tr><td>Feather</td><td class="num">${n.feather}%</td><td class="num">${s.feather}%</td><td class="num">${g.feather}%</td></tr>
<tr><td>Collection Item</td><td class="num">${n.item}%</td><td class="num">${s.item}%</td><td class="num">${g.item}%</td></tr>
<tr><td>Bonus Hammers</td><td class="num">${n.hammers}%</td><td class="num">${s.hammers}%</td><td class="num">${g.hammers}%</td></tr>
</table>
<p class="lex-warn">These are base rates before equipment and monkey perk modifiers are applied.</p>
`;
    }
  },
  {
    id: 'prizes', icon: '🎁', title: 'Prizes & Rewards',
    html: () => `
<h4>Gold (Currency)</h4>
<p>The primary currency. Used to buy hammers, equipment, and supplies from the shop.</p>
<table class="lex-table">
<tr><th>Tier</th><th>Base Range</th><th>Silver (2x)</th><th>Gold (1.5x)</th></tr>
<tr><td>Small</td><td class="num">5 – 15</td><td class="num">10 – 30</td><td class="hl">N/A (Gold eggs skip small)</td></tr>
<tr><td>Medium</td><td class="num">20 – 60</td><td class="num">40 – 120</td><td class="num">30 – 90</td></tr>
<tr><td>Large</td><td class="num">80 – 250</td><td class="num">160 – 500</td><td class="num">120 – 375</td></tr>
</table>
<p>Gold values are further multiplied by any <strong>active multiplier</strong>, plus equipment and monkey perk bonuses.</p>
<p class="lex-formula">Final Gold = base x egg_bonus x active_mult x equipment_bonus x monkey_perk</p>

<h4>Star Pieces ⭐</h4>
<p>Collect <strong>5 star pieces</strong> to activate <strong>Starfall</strong>, which instantly breaks all remaining eggs in the current round for free (no hammer cost). Normal eggs drop 1 piece; Silver eggs drop 2.</p>

<h4>Multipliers ✖️</h4>
<p>Found inside eggs, multipliers are stored in your <strong>multiplier queue</strong>. Click one to activate it before your next smash — it multiplies the gold value of that smash, then is consumed.</p>
<table class="lex-table">
<tr><th>Possible Values</th><th>Relative Chance</th></tr>
<tr><td class="num">x2</td><td>Common (2 in 8 = 25%)</td></tr>
<tr><td class="num">x3</td><td>Common (2 in 8 = 25%)</td></tr>
<tr><td class="num">x5</td><td>Uncommon (2 in 8 = 25%)</td></tr>
<tr><td class="num">x10</td><td>Rare (1 in 8 = 12.5%)</td></tr>
<tr><td class="num">x50</td><td>Very Rare (1 in 8 = 12.5%)</td></tr>
</table>

<h4>Feathers 🪶</h4>
<p>Stage currency. Base drop: <strong>1–4 feathers</strong> (randomized), doubled from Silver eggs. Currently used as a collectible resource tracked in your stats.</p>

<h4>Bonus Hammers 🔨</h4>
<p><strong>Only found in Silver eggs.</strong> Possible amounts: 2, 3, 5, 5, or 8 hammers (equal chance each). Added directly to your hammer count, up to your max.</p>

<h4>Collection Items 📦</h4>
<p>Themed items specific to each stage (see <strong>Collections</strong> section). New items trigger a popup and count toward stage completion. Duplicates are converted to <strong>10–40 bonus gold</strong>.</p>

<h4>Empty 😅</h4>
<p>No prize. Only possible from Normal eggs (${((PRIZE_WEIGHTS.normal.empty / Object.values(PRIZE_WEIGHTS.normal).reduce((a,b)=>a+b,0)) * 100).toFixed(1)}% base chance). Silver and Gold eggs can never be empty.</p>
`
  },
  {
    id: 'collections', icon: '📚', title: 'Collections & Stages',
    html: () => {
      let stageTable = '';
      const m = MONKEY_DATA[0]; // Use Mr. Monkey as example
      m.stages.forEach((s, i) => {
        stageTable += '<tr><td>' + (i+1) + '</td><td>' + s.name + '</td><td class="num">' +
          s.eggs + '</td><td>' + s.collection.name + '</td><td class="num">' +
          s.collection.items.length + '</td></tr>';
      });
      return `
<h4>How Collections Work</h4>
<p>Each stage has one <strong>collection</strong> — a set of themed items you find inside eggs. Items have three rarities:</p>
<table class="lex-table">
<tr><th>Rarity</th><th>Base Drop Weight</th><th>Pity Weight (uncollected)</th><th>Duplicate Weight</th></tr>
<tr><td class="hl">Common (1)</td><td class="num">10</td><td class="num">20 (2x)</td><td class="num">3 (0.3x)</td></tr>
<tr><td class="hl">Uncommon (2)</td><td class="num">5</td><td class="num">10 (2x)</td><td class="num">1.5 (0.3x)</td></tr>
<tr><td class="hl">Rare (3)</td><td class="num">2</td><td class="num">4 (2x)</td><td class="num">0.6 (0.3x)</td></tr>
</table>
<p class="lex-tip">The pity system gives uncollected items <strong>6.67x higher relative weight</strong> than already-collected items, so it gets progressively easier to find your missing pieces.</p>

<h4>Stage Tiers</h4>
<p>Each stage progresses through three tiers based on how many items you've found:</p>
<table class="lex-table">
<tr><th>Tier</th><th>Threshold</th><th>Reward</th></tr>
<tr><td class="hl">Bronze → Silver</td><td>Collect <strong>50%</strong> of items</td><td>+5 max hammers, +5 hammer refill</td></tr>
<tr><td class="hl">Silver → Gold</td><td>Collect <strong>75%</strong> of items</td><td>+10 max hammers, +5 hammer refill</td></tr>
<tr><td class="hl">Gold (Complete)</td><td>Collect <strong>100%</strong> of items</td><td>+1 Crystal Banana, advance to next stage</td></tr>
</table>

<h4>Eggs Per Round by Stage (Mr. Monkey example)</h4>
<table class="lex-table">
<tr><th>Stage</th><th>Name</th><th>Eggs</th><th>Collection</th><th>Items</th></tr>
${stageTable}
</table>
<p>Later stages have more eggs per round but also more items to collect.</p>

<h4>Duplicate Items</h4>
<p>If you roll an item you already own, it's converted to <strong>10–40 bonus gold</strong> (random within range).</p>
`;
    }
  },
  {
    id: 'monkeys', icon: '🐵', title: 'Monkeys',
    html: () => {
      let rows = '';
      MONKEY_DATA.forEach(m => {
        const totalItems = m.stages.reduce((sum, s) => sum + s.collection.items.length, 0);
        rows += '<tr><td>' + m.emoji + ' ' + m.name + '</td><td class="num">' +
          (m.cost === 0 ? 'Free (starter)' : m.cost + ' 🍌') + '</td><td>' +
          m.perkDesc + '</td><td class="num">' + m.stages.length +
          '</td><td class="num">' + totalItems + '</td></tr>';
      });
      return `
<p>Each monkey is a separate adventure with its own set of 9 stages. Switch between unlocked monkeys freely — progress is tracked independently.</p>
<table class="lex-table">
<tr><th>Monkey</th><th>Unlock Cost</th><th>Perk</th><th>Stages</th><th>Total Items</th></tr>
${rows}
</table>

<h4>Perk Details</h4>
<table class="lex-table">
<tr><th>Perk</th><th>Effect on Prize Weights</th></tr>
<tr><td>🐵 Mr. Monkey</td><td>None (baseline)</td></tr>
<tr><td>🔧 Steampunk — +15% star pieces</td><td>Star Piece drop weight multiplied by <strong>1.15</strong></td></tr>
<tr><td>👸 Princess — +20% gold</td><td>All gold prize values multiplied by <strong>1.2</strong></td></tr>
<tr><td>🚀 Space Cadette — +10% items</td><td>Collection Item drop weight multiplied by <strong>1.1</strong></td></tr>
</table>
<p class="lex-tip">Monkey perks stack with equipment bonuses. For example, Steampunk Monkey + Drumstick Hammer gives a combined 1.15 x 1.15 = <strong>1.32x star piece weight</strong>.</p>

<h4>Crystal Bananas 🍌</h4>
<p>Earned by completing a stage at Gold tier (<strong>1 per stage</strong>). Spent to unlock new monkeys (<strong>9 Crystal Bananas each</strong>). With 4 monkeys x 9 stages, you can earn up to 36 Crystal Bananas total.</p>
`;
    }
  },
  {
    id: 'starfall', icon: '🌟', title: 'Starfall',
    html: () => `
<p>Starfall is a powerful ability that breaks <strong>all remaining unbroken eggs</strong> in the current round — completely free, no hammer cost.</p>
<h4>How to Activate</h4>
<p>Collect <strong>5 Star Pieces</strong>, then click the <strong>⭐ Starfall</strong> button (or press <strong>Ctrl+S</strong>).</p>
<h4>How It Works</h4>
<p>All unbroken eggs are smashed in rapid sequence (one every <strong>400ms</strong>). Each egg produces its own independent prize roll, particle effects, and sounds. The screen glows golden during the cascade.</p>
<h4>Star Piece Sources</h4>
<table class="lex-table">
<tr><th>Source</th><th>Amount</th></tr>
<tr><td>Normal or Gold egg (star prize)</td><td class="num">1 piece</td></tr>
<tr><td>Silver egg (star prize)</td><td class="num">2 pieces</td></tr>
<tr><td>Shop purchase</td><td class="num">1 piece for 2,000 gold</td></tr>
</table>
<p class="lex-tip">Save Starfall for rounds with many eggs (stages 7–9 have 5–7 eggs) to maximize value. Using it on a Gold egg round means every egg is guaranteed non-empty!</p>
`
  },
  {
    id: 'multipliers', icon: '✖️', title: 'Multipliers',
    html: () => `
<p>Multipliers boost the <strong>gold value</strong> of your next smash. They are single-use and consumed after one hit.</p>
<h4>Using Multipliers</h4>
<ol style="margin:4px 0 8px 18px">
<li>Find a multiplier inside an egg — it's added to your <strong>multiplier queue</strong> (shown above the egg tray)</li>
<li>Click a multiplier chip to <strong>activate</strong> it (turns orange)</li>
<li>Smash an egg — the gold value is multiplied, then the multiplier is consumed</li>
<li>Click an active multiplier again to <strong>deactivate</strong> it</li>
</ol>
<h4>Multiplier Values</h4>
<table class="lex-table">
<tr><th>Value</th><th>Probability</th></tr>
<tr><td class="num">x2</td><td>25% <em class="sub">(2 of 8 entries)</em></td></tr>
<tr><td class="num">x3</td><td>25% <em class="sub">(2 of 8 entries)</em></td></tr>
<tr><td class="num">x5</td><td>25% <em class="sub">(2 of 8 entries)</em></td></tr>
<tr><td class="num">x10</td><td>12.5% <em class="sub">(1 of 8 entries)</em></td></tr>
<tr><td class="num">x50</td><td>12.5% <em class="sub">(1 of 8 entries)</em></td></tr>
</table>
<p class="lex-warn">Multipliers only affect gold prizes. Star pieces, feathers, items, and hammer prizes are not multiplied.</p>
<p class="lex-tip">Stack a x50 multiplier with a Gold egg's large gold range (80–250) and Princess Monkey's +20% bonus for massive payouts. Maximum theoretical single smash: 250 x 50 x 1.5 x 1.2 x 1.1 = <strong>24,750 gold</strong>.</p>
`
  },
  {
    id: 'dailylogin', icon: '📅', title: 'Daily Login & Streaks',
    html: () => `
<p>Each day you can claim a <strong>daily hammer bonus</strong> from the box on the Play tab.</p>
<h4>Daily Bonus Formula</h4>
<p class="lex-formula">Hammers = 40 + min(consecutive_days x 5, 100)</p>
<table class="lex-table">
<tr><th>Streak Days</th><th>Bonus</th><th>Total Hammers</th></tr>
<tr><td class="num">Day 1</td><td class="num">+0</td><td class="num">40</td></tr>
<tr><td class="num">Day 2</td><td class="num">+10</td><td class="num">50</td></tr>
<tr><td class="num">Day 5</td><td class="num">+25</td><td class="num">65</td></tr>
<tr><td class="num">Day 10</td><td class="num">+50</td><td class="num">90</td></tr>
<tr><td class="num">Day 20+</td><td class="num">+100 (cap)</td><td class="num">140</td></tr>
</table>
<p class="lex-warn">Missing a day resets your streak to 1. The bonus is capped at your current max hammer capacity.</p>
`
  },
  {
    id: 'shop', icon: '🛒', title: 'Shop & Equipment',
    html: () => {
      let hammerRows = '';
      SHOP_HAMMERS.forEach(h => {
        if (h.cost === 0) return;
        hammerRows += '<tr><td>' + h.emoji + ' ' + h.name + '</td><td class="num">' +
          formatNum(h.cost) + ' gold</td><td>' + h.desc + '</td></tr>';
      });
      let hatRows = '';
      SHOP_HATS.forEach(h => {
        if (h.cost === 0) return;
        hatRows += '<tr><td>' + h.emoji + ' ' + h.name + '</td><td class="num">' +
          formatNum(h.cost) + ' gold</td><td>' + h.desc + '</td></tr>';
      });
      return `
<p>Equipment is permanent — buy once, equip anytime. You can own multiple hammers and hats but only equip one of each at a time.</p>

<h4>Special Hammers</h4>
<table class="lex-table">
<tr><th>Hammer</th><th>Cost</th><th>Effect</th></tr>
${hammerRows}
</table>
<h4>Hammer Bonus Details</h4>
<table class="lex-table">
<tr><th>Bonus</th><th>Exact Mechanic</th></tr>
<tr><td>🍗 +15% star pieces</td><td>Star Piece drop weight x <strong>1.15</strong></td></tr>
<tr><td>🦇 Fewer empty eggs</td><td>Empty weight x <strong>0.4</strong> (60% reduction)</td></tr>
<tr><td>🔮 +20% feathers</td><td>Feather drop weight x <strong>1.2</strong></td></tr>
<tr><td>⭐ 2x gold</td><td>All gold prize values x <strong>1.2</strong> (stacks with other gold bonuses)</td></tr>
<tr><td>🌈 +10% collection items</td><td>Item drop weight x <strong>1.1</strong></td></tr>
</table>

<h4>Hats</h4>
<table class="lex-table">
<tr><th>Hat</th><th>Cost</th><th>Effect</th></tr>
${hatRows}
</table>
<h4>Hat Bonus Details</h4>
<table class="lex-table">
<tr><th>Bonus</th><th>Exact Mechanic</th></tr>
<tr><td>👨‍🍳 10% chance egg was free</td><td>After paying, <strong>10% chance</strong> hammers are refunded</td></tr>
<tr><td>👑 +10% gold</td><td>All gold prize values x <strong>1.1</strong></td></tr>
<tr><td>🧙 +10% stars</td><td>Star Piece drop weight x <strong>1.1</strong></td></tr>
<tr><td>🎩 Multipliers last longer</td><td><em>Reserved for future implementation</em></td></tr>
<tr><td>🏴‍☠️ +15% collection items</td><td>Item drop weight x <strong>1.15</strong></td></tr>
</table>

<h4>Supplies (Consumables)</h4>
<table class="lex-table">
<tr><th>Item</th><th>Cost</th><th>Effect</th><th>Repeatable?</th></tr>
<tr><td>🔨 +5 Hammers</td><td class="num">200 gold</td><td>Adds 5 hammers (up to max)</td><td>Yes</td></tr>
<tr><td>🔨 +20 Hammers</td><td class="num">700 gold</td><td>Adds 20 hammers (up to max)</td><td>Yes</td></tr>
<tr><td>⭐ Star Piece</td><td class="num">2,000 gold</td><td>Adds 1 star piece</td><td>Yes</td></tr>
<tr><td>✖️ x5 Multiplier</td><td class="num">3,000 gold</td><td>Adds x5 to multiplier queue</td><td>Yes</td></tr>
<tr><td>📦 +5 Hammer Cap</td><td class="num">5,000 gold</td><td>Max hammers +5 permanently</td><td>Yes</td></tr>
<tr><td>⚡ Fast Regen</td><td class="num">10,000 gold</td><td>Regen rate: 30s → 15s</td><td>Once only</td></tr>
</table>
`;
    }
  },
  {
    id: 'goldcalc', icon: '🪙', title: 'Gold Calculation Formula',
    html: () => `
<p>When you smash an egg and roll a gold prize, the final value is computed by stacking several multipliers:</p>
<p class="lex-formula">Final = floor(base_roll x active_multiplier x egg_bonus x hammer_bonus x hat_bonus x monkey_perk)</p>
<h4>Multiplier Stack Breakdown</h4>
<table class="lex-table">
<tr><th>Layer</th><th>Value</th><th>Source</th></tr>
<tr><td>Base Roll</td><td class="num">5–250</td><td>Random within tier range</td></tr>
<tr><td>Active Multiplier</td><td class="num">x1 to x50</td><td>Selected from multiplier queue</td></tr>
<tr><td>Egg Bonus</td><td class="num">x1 / x2 / x1.5</td><td>Normal / Silver / Gold</td></tr>
<tr><td>Hammer Perk</td><td class="num">x1 or x1.2</td><td>Golden Hammer equipped</td></tr>
<tr><td>Hat Perk</td><td class="num">x1 or x1.1</td><td>Crown equipped</td></tr>
<tr><td>Monkey Perk</td><td class="num">x1 or x1.2</td><td>Princess Monkey active</td></tr>
</table>
<h4>Maximum Possible Single Gold Win</h4>
<p class="lex-formula">250 x 50 x 2 (silver) x 1.2 (hammer) x 1.1 (hat) x 1.2 (monkey) = <strong>39,600 gold</strong></p>
<p class="lex-tip">In practice, the best consistent setup is Gold eggs + Princess Monkey + Golden Hammer + Crown + a x50 multiplier, yielding up to 250 x 50 x 1.5 x 1.2 x 1.1 x 1.2 = <strong>29,700 gold</strong> per smash.</p>
`
  },
  {
    id: 'rounds', icon: '🎯', title: 'Rounds & Egg Generation',
    html: () => `
<h4>Round Structure</h4>
<p>Each round generates a set of eggs equal to the current stage's <strong>egg count</strong> (3–7 depending on stage). Click "New Round" to generate a fresh set at any time.</p>
<h4>Egg Upgrade Rolls</h4>
<p>When a round is generated, each egg starts as your selected type, then has a chance to upgrade:</p>
<table class="lex-table">
<tr><th>Selected Type</th><th>Upgrade Chance</th></tr>
<tr><td>Normal → Silver</td><td class="num">8%</td></tr>
<tr><td>Normal → Gold</td><td class="num">2%</td></tr>
<tr><td>Silver → Gold</td><td class="num">5%</td></tr>
<tr><td>Gold</td><td>No further upgrades</td></tr>
</table>
<p class="lex-warn">The 2% Normal→Gold and 8% Normal→Silver are checked independently — the Gold check happens first, so effective Silver upgrade rate on Normal is ~7.84%.</p>
<h4>Eggs Per Stage</h4>
<p>Early stages offer 3 eggs per round; later stages offer up to 7. This scales the amount of prizes per round but also requires more hammers.</p>
`
  },
  {
    id: 'pity', icon: '🎰', title: 'Pity System & Drop Mechanics',
    html: () => `
<h4>Collection Item Pity</h4>
<p>When rolling a collection item, the game uses a <strong>weighted pity system</strong> to prevent endless grinding for the last item:</p>
<table class="lex-table">
<tr><th>Item State</th><th>Weight Multiplier</th></tr>
<tr><td>Not yet collected</td><td class="num"><strong>2.0x</strong> base weight</td></tr>
<tr><td>Already collected</td><td class="num"><strong>0.3x</strong> base weight</td></tr>
</table>
<p>This means an uncollected item is <strong>6.67 times more likely</strong> to drop than one you already own. Combined with rarity weights:</p>
<table class="lex-table">
<tr><th>Rarity</th><th>Base Weight</th><th>If Uncollected</th><th>If Collected</th></tr>
<tr><td>Common</td><td class="num">10</td><td class="num">20</td><td class="num">3</td></tr>
<tr><td>Uncommon</td><td class="num">5</td><td class="num">10</td><td class="num">1.5</td></tr>
<tr><td>Rare</td><td class="num">2</td><td class="num">4</td><td class="num">0.6</td></tr>
</table>
<p class="lex-tip">Even Rare items are heavily favored when uncollected. If you're missing one last Rare item and own everything else, your odds are approximately 4 / (sum of all collected weights + 4), which can be 40%+ per item roll.</p>
<h4>Prize Type Selection</h4>
<p>Prize type is selected via weighted random from the prize table. Equipment and monkey perks modify these weights <em>before</em> the roll. All modifiers are multiplicative on the raw weight values.</p>
`
  },
  {
    id: 'equipment', icon: '⚔️', title: 'Bonus Stacking Rules',
    html: () => `
<h4>How Bonuses Combine</h4>
<p>Equipment bonuses modify the <strong>prize weight table</strong> (affecting what you roll) or the <strong>prize value</strong> (affecting how much you get). They stack multiplicatively:</p>
<h4>Weight Modifiers (affect drop chance)</h4>
<table class="lex-table">
<tr><th>Bonus Source</th><th>Affected Weight</th><th>Multiplier</th></tr>
<tr><td>Bat Hammer</td><td>Empty</td><td class="num">x0.4</td></tr>
<tr><td>Drumstick Hammer</td><td>Star Piece</td><td class="num">x1.15</td></tr>
<tr><td>Crystal Hammer</td><td>Feather</td><td class="num">x1.2</td></tr>
<tr><td>Rainbow Hammer</td><td>Item</td><td class="num">x1.1</td></tr>
<tr><td>Wizard Hat</td><td>Star Piece</td><td class="num">x1.1</td></tr>
<tr><td>Pirate Hat</td><td>Item</td><td class="num">x1.15</td></tr>
<tr><td>Steampunk Monkey</td><td>Star Piece</td><td class="num">x1.15</td></tr>
<tr><td>Space Cadette</td><td>Item</td><td class="num">x1.1</td></tr>
</table>
<p><strong>Example:</strong> Steampunk Monkey + Drumstick Hammer + Wizard Hat on Star Pieces:<br>
<span class="lex-formula">8 (base) x 1.15 x 1.15 x 1.1 = <strong>11.6 weight</strong></span> (vs 8 baseline = 45% higher star chance)</p>

<h4>Value Modifiers (affect gold amounts)</h4>
<table class="lex-table">
<tr><th>Bonus Source</th><th>Multiplier</th></tr>
<tr><td>Silver Egg</td><td class="num">x2.0</td></tr>
<tr><td>Gold Egg</td><td class="num">x1.5</td></tr>
<tr><td>Active Multiplier</td><td class="num">x2 to x50</td></tr>
<tr><td>Golden Hammer</td><td class="num">x1.2</td></tr>
<tr><td>Crown Hat</td><td class="num">x1.1</td></tr>
<tr><td>Princess Monkey</td><td class="num">x1.2</td></tr>
</table>
`
  },
  {
    id: 'achievements', icon: '🏆', title: 'Achievements',
    html: () => {
      let rows = '';
      ACHIEVEMENT_DATA.forEach(a => {
        const unlocked = G.achieved.includes(a.id);
        rows += '<tr><td>' + a.icon + '</td><td><strong>' + a.name + '</strong></td><td>' +
          a.desc + '</td><td>' + (unlocked ? '✅' : '—') + '</td></tr>';
      });
      return `
<p>There are <strong>${ACHIEVEMENT_DATA.length} achievements</strong> to unlock. They are tracked automatically and a toast notification appears when you earn one. Achievements have no gameplay effect — they are purely for bragging rights.</p>
<table class="lex-table">
<tr><th></th><th>Name</th><th>Requirement</th><th>Status</th></tr>
${rows}
</table>
`;
    }
  },
  {
    id: 'strategy', icon: '🧠', title: 'Strategy Guide',
    html: () => `
<h4>Early Game (Stages 1–3)</h4>
<p>Use <strong>Normal eggs</strong> to conserve hammers. Focus on filling collections. Save gold — don't buy hammers from the shop early; let regeneration do the work. Claim your daily bonus every day to build a streak.</p>

<h4>Mid Game (Stages 4–6)</h4>
<p>Switch to <strong>Silver eggs</strong> when you have a comfortable hammer supply (60+). Silver eggs can't be empty and have a chance to drop bonus hammers, making them self-sustaining. Buy the <strong>Bat Hammer</strong> early for 60% fewer empties on Normal eggs.</p>

<h4>Late Game (Stages 7–9)</h4>
<p>Use <strong>Gold eggs</strong> for guaranteed value. Save multipliers for Gold egg rounds. Consider the <strong>Golden Hammer</strong> and <strong>Crown Hat</strong> for maximum gold income. Starfall becomes critical — 5–7 free Gold egg smashes per Starfall is extremely powerful.</p>

<h4>Optimal Equipment Builds</h4>
<table class="lex-table">
<tr><th>Goal</th><th>Hammer</th><th>Hat</th><th>Monkey</th></tr>
<tr><td>Max Gold Income</td><td>⭐ Golden</td><td>👑 Crown</td><td>👸 Princess</td></tr>
<tr><td>Fast Collection</td><td>🌈 Rainbow</td><td>🏴‍☠️ Pirate</td><td>🚀 Space Cadette</td></tr>
<tr><td>Star Farming</td><td>🍗 Drumstick</td><td>🧙 Wizard</td><td>🔧 Steampunk</td></tr>
<tr><td>Hammer Economy</td><td>🦇 Bat</td><td>👨‍🍳 Chef's</td><td>Any</td></tr>
</table>

<h4>Multiplier Strategy</h4>
<p>Always save <strong>x10 and x50 multipliers</strong> for Gold eggs' large gold tier (80–250 base). A x50 on a 250-gold roll with full bonuses can yield <strong>30,000+ gold</strong> in one hit.</p>

<h4>Starfall Timing</h4>
<p>Save Starfall for rounds with the most unbroken eggs. Ideal: start a new round on a late stage (5–7 eggs), use Starfall immediately for maximum free prizes. Even better with Gold eggs selected.</p>
`
  },
];

let activeLexSection = null;

function renderLexicon() {
  const toc = $id('lex-toc');
  const content = $id('lex-content');
  toc.innerHTML = '';
  content.innerHTML = '';

  LEXICON_SECTIONS.forEach((sec, i) => {
    // TOC button
    const btn = document.createElement('button');
    btn.className = 'lex-toc-btn';
    btn.textContent = sec.icon + ' ' + sec.title;
    btn.addEventListener('click', () => {
      const el = document.getElementById('lex-' + sec.id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.lex-toc-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    toc.appendChild(btn);

    // Section
    const section = document.createElement('div');
    section.className = 'lex-section';
    section.id = 'lex-' + sec.id;

    const head = document.createElement('div');
    head.className = 'lex-section-head';
    head.innerHTML = '<span class="lex-icon">' + sec.icon + '</span>' +
      '<span class="lex-title">' + sec.title + '</span>' +
      '<span class="lex-toggle">▼</span>';
    head.addEventListener('click', () => {
      head.classList.toggle('collapsed');
    });

    const body = document.createElement('div');
    body.className = 'lex-body';
    body.innerHTML = sec.html();

    section.appendChild(head);
    section.appendChild(body);
    content.appendChild(section);
  });
}

function filterLexicon() {
  const q = $id('lex-search').value.toLowerCase().trim();
  const sections = document.querySelectorAll('.lex-section');
  sections.forEach(sec => {
    if (!q) {
      sec.classList.remove('hidden');
      const head = sec.querySelector('.lex-section-head');
      if (head) head.classList.remove('collapsed');
      return;
    }
    const text = sec.textContent.toLowerCase();
    const match = text.includes(q);
    sec.classList.toggle('hidden', !match);
    if (match) {
      const head = sec.querySelector('.lex-section-head');
      if (head) head.classList.remove('collapsed');
    }
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
  if (e.code === 'KeyR') newRound();
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
