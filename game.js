// ============================================================
//  Egg Breaker Adventures
//  game.js
// ============================================================

// ==================== AUDIO ENGINE ====================
const SFX = (() => {
  let ctx;
  let enabled = true;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noise(duration, volume, freqStart, freqEnd) {
    const c = ensure();
    const len = c.sampleRate * duration;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = volume;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freqStart, c.currentTime);
    f.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + duration);
    f.Q.value = 1;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  }

  function tone(freq, duration, volume, type) {
    const c = ensure();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(g).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  function play(name) {
    if (!enabled) return;
    try {
      switch (name) {
        case 'hit':
          noise(0.12, 0.25, 2000, 400);
          tone(180, 0.08, 0.15, 'square');
          break;
        case 'coin':
          tone(880, 0.1, 0.12, 'sine');
          setTimeout(() => tone(1320, 0.15, 0.1, 'sine'), 60);
          break;
        case 'gem':
          tone(1200, 0.08, 0.1, 'sine');
          setTimeout(() => tone(1600, 0.08, 0.08, 'sine'), 50);
          setTimeout(() => tone(2000, 0.2, 0.06, 'sine'), 100);
          break;
        case 'empty':
          tone(150, 0.15, 0.1, 'triangle');
          break;
        case 'critical':
          tone(600, 0.1, 0.15, 'square');
          setTimeout(() => tone(900, 0.1, 0.12, 'square'), 80);
          setTimeout(() => tone(1400, 0.2, 0.1, 'sine'), 160);
          break;
        case 'jackpot':
          [0, 80, 160, 240, 320].forEach((t, i) =>
            setTimeout(() => tone(440 * Math.pow(2, i / 5), 0.3, 0.1, 'sine'), t)
          );
          break;
        case 'levelup':
          [0, 100, 200, 300].forEach((t, i) =>
            setTimeout(() => tone(523 * Math.pow(2, i / 4), 0.25, 0.12, 'sine'), t)
          );
          break;
        case 'achieve':
          tone(880, 0.15, 0.1, 'sine');
          setTimeout(() => tone(1100, 0.15, 0.1, 'sine'), 100);
          setTimeout(() => tone(1320, 0.25, 0.08, 'sine'), 200);
          break;
        case 'buy':
          tone(500, 0.08, 0.1, 'sine');
          setTimeout(() => tone(700, 0.12, 0.08, 'sine'), 60);
          break;
        case 'error':
          tone(200, 0.15, 0.12, 'square');
          break;
      }
    } catch (_) {}
  }

  function toggle() { enabled = !enabled; return enabled; }
  function isOn() { return enabled; }

  return { play, toggle, isOn };
})();

// ==================== PARTICLE SYSTEM ====================
const Particles = (() => {
  let canvas, ctx;
  const particles = [];
  let running = false;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas.parentElement) return;
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = r.width * (window.devicePixelRatio || 1);
    canvas.height = r.height * (window.devicePixelRatio || 1);
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  }

  const SHELL_COLORS = {
    normal:  ['#FEF9F0', '#F5E6C8', '#E8D5A8', '#D4C090'],
    silver:  ['#E8E8E8', '#D0D0D0', '#B8B8B8', '#C0C0C0'],
    gold:    ['#FEFCE8', '#FDE68A', '#FCD34D', '#F59E0B'],
    crystal: ['#E9D5FF', '#C4B5FD', '#A78BFA', '#8B5CF6'],
  };

  function emit(cx, cy, type, count) {
    const colors = SHELL_COLORS[type] || SHELL_COLORS.normal;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.8;
      const speed = 3 + Math.random() * 5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed * (0.7 + Math.random() * 0.6),
        vy: Math.sin(angle) * speed - 2 - Math.random() * 2,
        life: 1,
        decay: 0.012 + Math.random() * 0.008,
        size: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.3,
        gravity: 0.12 + Math.random() * 0.06,
        color: colors[Math.random() * colors.length | 0],
        shape: 'shell',
      });
    }
    if (!running) loop();
  }

  function sparkle(cx, cy, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        decay: 0.02 + Math.random() * 0.015,
        size: 1.5 + Math.random() * 2.5,
        rot: 0, rotV: 0,
        gravity: 0.02,
        color: color || '#FFD700',
        shape: 'star',
      });
    }
    if (!running) loop();
  }

  function update() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vx *= 0.98;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function draw() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2.5);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      if (p.shape === 'shell') {
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(-s, -s * 0.6);
        ctx.lineTo(s * 0.7, -s * 0.4);
        ctx.lineTo(s * 0.4, s * 0.7);
        ctx.lineTo(-s * 0.3, s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        // star / sparkle
        const s = p.size;
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const a = (j * 4 * Math.PI) / 5 - Math.PI / 2;
          const r = j % 2 === 0 ? s : s * 0.4;
          if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function loop() {
    running = true;
    update();
    draw();
    if (particles.length > 0) {
      requestAnimationFrame(loop);
    } else {
      running = false;
    }
  }

  return { init, emit, sparkle, resize };
})();

// ==================== ACHIEVEMENTS ====================
const ACHIEVEMENTS = [
  { id: 'first_smash',  name: 'First Crack',     desc: 'Break your first egg',        icon: '🥚', check: s => s.totalSmashes >= 1 },
  { id: 'smash_10',     name: 'Egg Smasher',      desc: 'Break 10 eggs',               icon: '💪', check: s => s.totalSmashes >= 10 },
  { id: 'smash_50',     name: 'Egg Destroyer',     desc: 'Break 50 eggs',               icon: '🔥', check: s => s.totalSmashes >= 50 },
  { id: 'smash_100',    name: 'Egg Annihilator',   desc: 'Break 100 eggs',              icon: '💥', check: s => s.totalSmashes >= 100 },
  { id: 'smash_500',    name: 'Egg Apocalypse',    desc: 'Break 500 eggs',              icon: '☄️',  check: s => s.totalSmashes >= 500 },
  { id: 'coins_100',    name: 'Coin Collector',    desc: 'Earn 100 total coins',        icon: '🪙', check: s => s.totalCoins >= 100 },
  { id: 'coins_1000',   name: 'Rich Monkey',       desc: 'Earn 1,000 total coins',      icon: '💰', check: s => s.totalCoins >= 1000 },
  { id: 'gems_10',      name: 'Gem Finder',        desc: 'Find 10 total gems',          icon: '💎', check: s => s.totalGems >= 10 },
  { id: 'gems_50',      name: 'Gem Hoarder',       desc: 'Find 50 total gems',          icon: '👑', check: s => s.totalGems >= 50 },
  { id: 'combo_max',    name: 'Combo King',        desc: 'Reach maximum combo',         icon: '⚡', check: s => s.maxComboReached },
  { id: 'level_5',      name: 'Adventurer',        desc: 'Reach level 5',               icon: '⭐', check: s => s.level >= 5 },
  { id: 'level_10',     name: 'Veteran',           desc: 'Reach level 10',              icon: '🌟', check: s => s.level >= 10 },
  { id: 'level_20',     name: 'Legend',             desc: 'Reach level 20',              icon: '🏆', check: s => s.level >= 20 },
  { id: 'silver_egg',   name: 'Silver Standard',   desc: 'Break a silver egg',          icon: '🥈', check: s => s.silverSmashed > 0 },
  { id: 'gold_egg',     name: 'Golden Touch',      desc: 'Break a gold egg',            icon: '🥇', check: s => s.goldSmashed > 0 },
  { id: 'crystal_egg',  name: 'Crystal Clear',     desc: 'Break a crystal egg',         icon: '🔮', check: s => s.crystalSmashed > 0 },
  { id: 'critical',     name: 'Critical Hit!',     desc: 'Land a critical hit',         icon: '💫', check: s => s.criticalHits > 0 },
  { id: 'jackpot',      name: 'JACKPOT!',          desc: 'Hit the jackpot',             icon: '🎰', check: s => s.jackpots > 0 },
  { id: 'shop_first',   name: 'First Purchase',    desc: 'Buy from the shop',           icon: '🛒', check: s => s.purchases > 0 },
  { id: 'streak_10',    name: 'Hot Streak',         desc: 'Get 10 prizes in a row',      icon: '🔥', check: s => s.bestStreak >= 10 },
];

// ==================== GAME STATE ====================
const DEFAULT_STATE = {
  hammers: 10, maxH: 10, coins: 0, gems: 0, score: 0,
  level: 1, xp: 0,
  mult: 1, maxMult: 5, egg: 'normal',
  smashing: false,
  mBoosted: false, gBoosted: false, autoRegen: false, luckyCharm: false,
  regenCD: 30,
  streak: 0,
  // Lifetime stats
  totalSmashes: 0, totalCoins: 0, totalGems: 0,
  silverSmashed: 0, goldSmashed: 0, crystalSmashed: 0,
  criticalHits: 0, jackpots: 0, purchases: 0,
  bestStreak: 0, maxComboReached: false,
  // Unlocked achievements
  achieved: [],
};

let G = { ...DEFAULT_STATE };
let regenInt = null;
let decayTO = null;

// ==================== PRIZE TABLES ====================
const PRIZES = {
  normal: [
    { t: 'x', w: 15, v: 0  },
    { t: 'c', w: 35, v: 1  },
    { t: 'c', w: 25, v: 3  },
    { t: 'c', w: 15, v: 5  },
    { t: 'g', w: 7,  v: 1  },
    { t: 'g', w: 3,  v: 3  },
  ],
  silver: [
    { t: 'x', w: 8,  v: 0  },
    { t: 'c', w: 30, v: 3  },
    { t: 'c', w: 28, v: 6  },
    { t: 'c', w: 18, v: 12 },
    { t: 'c', w: 8,  v: 20 },
    { t: 'g', w: 6,  v: 2  },
    { t: 'g', w: 2,  v: 5  },
  ],
  gold: [
    { t: 'x', w: 5,  v: 0  },
    { t: 'c', w: 25, v: 10 },
    { t: 'c', w: 28, v: 20 },
    { t: 'c', w: 22, v: 40 },
    { t: 'c', w: 10, v: 80 },
    { t: 'g', w: 7,  v: 3  },
    { t: 'g', w: 3,  v: 10 },
  ],
  crystal: [
    { t: 'x', w: 3,  v: 0  },
    { t: 'c', w: 20, v: 30 },
    { t: 'c', w: 25, v: 60 },
    { t: 'c', w: 25, v: 120},
    { t: 'c', w: 12, v: 250},
    { t: 'g', w: 10, v: 5  },
    { t: 'g', w: 5,  v: 15 },
  ],
};

const EGG_COST = { normal: 1, silver: 2, gold: 3, crystal: 5 };
const EGG_UNLOCK_LEVEL = { normal: 1, silver: 3, gold: 6, crystal: 10 };
const EGG_COLORS = {
  normal:  { fill: '#FEF9F0', stroke: '#D4A853' },
  silver:  { fill: '#E8E8E8', stroke: '#9CA3AF' },
  gold:    { fill: '#FEFCE8', stroke: '#EAB308' },
  crystal: { fill: '#EDE9FE', stroke: '#8B5CF6' },
};

// ==================== HELPERS ====================
function $id(id) { return document.getElementById(id); }

function roll(type) {
  const table = PRIZES[type];
  let total = table.reduce((s, p) => s + p.w, 0);
  // Lucky charm reduces empty weight
  if (G.luckyCharm) {
    const adjusted = table.map(p => ({
      ...p,
      w: p.t === 'x' ? Math.max(1, p.w * 0.4) : p.w
    }));
    total = adjusted.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total;
    for (const prize of adjusted) {
      r -= prize.w;
      if (r <= 0) return prize;
    }
    return adjusted[adjusted.length - 1];
  }
  let r = Math.random() * total;
  for (const prize of table) {
    r -= prize.w;
    if (r <= 0) return prize;
  }
  return table[table.length - 1];
}

function msg(text, color) {
  const el = $id('prize-txt');
  el.style.color = color || '#d97706';
  el.textContent = text;
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.textContent = ''; }, 2600);
}

function spawnFloat(text, color, cls) {
  const zone = $id('prize-zone');
  const el = document.createElement('div');
  el.className = 'prize-float' + (cls ? ' ' + cls : '');
  el.style.color = color;
  el.style.left = (22 + Math.random() * 56) + '%';
  el.style.top = (10 + Math.random() * 22) + '%';
  el.textContent = text;
  zone.appendChild(el);
  setTimeout(() => el.remove(), cls === 'jackpot' ? 2000 : 1300);
}

function shake(level) {
  const area = $id('egg-area');
  area.classList.remove('shake-light', 'shake-medium', 'shake-heavy');
  void area.offsetWidth;
  area.classList.add('shake-' + level);
}

function bumpStat(id) {
  const el = $id(id);
  el.classList.remove('stat-bump');
  void el.offsetWidth;
  el.classList.add('stat-bump');
}

// ==================== XP / LEVELS ====================
function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.35, level - 1));
}

function addXP(amount) {
  G.xp += amount;
  let leveled = false;
  while (G.xp >= xpForLevel(G.level)) {
    G.xp -= xpForLevel(G.level);
    G.level++;
    G.maxH += 2;
    G.hammers = Math.min(G.maxH, G.hammers + 5); // bonus hammers on level up
    leveled = true;
  }
  if (leveled) {
    SFX.play('levelup');
    showLevelUp();
  }
}

function showLevelUp() {
  const overlay = $id('levelup-overlay');
  $id('levelup-text').textContent = 'LEVEL ' + G.level + '!';
  $id('levelup-detail').textContent = 'Max hammers: ' + G.maxH + ' | +5 hammers refilled';
  overlay.classList.remove('hidden');
  setTimeout(() => overlay.classList.add('hidden'), 2200);
}

// ==================== SAVE / LOAD ====================
const SAVE_KEY = 'eggBreaker_save';

function saveGame() {
  const data = { ...G };
  delete data.smashing; // don't persist transient state
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    // Merge with defaults so new fields are populated
    for (const key of Object.keys(DEFAULT_STATE)) {
      if (key in data) G[key] = data[key];
    }
    G.smashing = false;
  } catch (_) {}
}

function resetGame() {
  if (!confirm('Reset all progress? This cannot be undone!')) return;
  localStorage.removeItem(SAVE_KEY);
  G = { ...DEFAULT_STATE, achieved: [] };
  regenInt = null;
  decayTO = null;
  updateUI();
  renderAchievements();
  msg('Progress reset!', '#ef4444');
}

// ==================== UI UPDATE ====================
function updateUI() {
  // Stats
  $id('st-h').textContent = G.hammers;
  $id('st-c').textContent = G.coins;
  $id('st-g').textContent = G.gems;
  $id('st-s').textContent = G.score;

  // Level / XP
  const xpNeeded = xpForLevel(G.level);
  $id('level-num').textContent = 'Lv ' + G.level;
  $id('xp-fill').style.width = Math.min(100, (G.xp / xpNeeded) * 100) + '%';
  $id('xp-text').textContent = G.xp + ' / ' + xpNeeded + ' XP';

  // Multiplier
  const pct = Math.min(100, ((G.mult - 1) / (G.maxMult - 1)) * 100);
  $id('mult-bar').style.width = pct + '%';
  $id('mult-lbl').textContent = G.mult.toFixed(1) + 'x';
  const multFill = $id('mult-bar');
  if (G.mult >= G.maxMult) multFill.classList.add('maxed');
  else multFill.classList.remove('maxed');

  // Streak badge
  const sb = $id('streak-badge');
  if (G.streak > 0) {
    sb.classList.remove('hidden');
    sb.textContent = G.streak + ' streak';
    if (G.streak >= 5) sb.classList.add('hot');
    else sb.classList.remove('hot');
  } else {
    sb.classList.add('hidden');
  }

  // Smash button
  const cost = EGG_COST[G.egg];
  $id('smash-btn').disabled = G.hammers < cost || G.smashing;

  // Egg type tabs
  for (const type of Object.keys(EGG_UNLOCK_LEVEL)) {
    const tab = $id('tab-' + type);
    if (!tab) continue;
    const unlocked = G.level >= EGG_UNLOCK_LEVEL[type];
    tab.classList.toggle('locked', !unlocked);
    const reqEl = tab.querySelector('.tab-req');
    if (reqEl) reqEl.style.display = unlocked ? 'none' : '';
  }

  // Egg appearance
  const body = $id('egg-body');
  const c = EGG_COLORS[G.egg];
  body.setAttribute('fill', c.fill);
  body.setAttribute('stroke', c.stroke);

  // Hammer regen
  if (G.hammers < G.maxH) {
    const cd = G.autoRegen ? Math.max(10, G.regenCD) : G.regenCD;
    $id('regen-txt').textContent = 'Next hammer in ' + G.regenCD + 's';
  } else {
    $id('regen-txt').textContent = 'Hammers full!';
  }

  // Sound icon
  $id('sound-icon').textContent = SFX.isOn() ? '🔊' : '🔇';

  // Lifetime stats
  $id('ts-smash').textContent = G.totalSmashes;
  $id('ts-coins').textContent = G.totalCoins;
  $id('ts-gems').textContent = G.totalGems;
  $id('ts-streak').textContent = G.bestStreak;
  $id('ts-crit').textContent = G.criticalHits;
  $id('ts-jack').textContent = G.jackpots;

  saveGame();
}

// ==================== CORE SMASH ====================
function smash() {
  const cost = EGG_COST[G.egg];
  if (G.hammers < cost || G.smashing) return;

  G.smashing = true;
  G.hammers -= cost;
  G.totalSmashes++;

  // Track egg type smashes
  if (G.egg === 'silver') G.silverSmashed = (G.silverSmashed || 0) + 1;
  if (G.egg === 'gold') G.goldSmashed = (G.goldSmashed || 0) + 1;
  if (G.egg === 'crystal') G.crystalSmashed = (G.crystalSmashed || 0) + 1;

  // Start regen if needed
  if (!regenInt && G.hammers < G.maxH) startRegen();

  // Hide hint
  $id('hint-txt').classList.add('hidden');

  // Animate hammer
  const hammerEl = $id('hammer');
  hammerEl.classList.remove('hammer-anim');
  void hammerEl.offsetWidth;
  hammerEl.classList.add('hammer-anim');

  // Animate egg
  const eggEl = $id('egg-wrap');
  eggEl.classList.remove('egg-anim');
  void eggEl.offsetWidth;
  eggEl.classList.add('egg-anim');

  // Play hit sound
  SFX.play('hit');

  // Emit shell particles
  const area = $id('egg-area');
  const rect = area.getBoundingClientRect();
  const eggCX = rect.width / 2;
  const eggCY = 155;
  Particles.emit(eggCX, eggCY, G.egg, 10 + Math.random() * 6 | 0);

  // Screen shake
  const shakeLevel = { normal: 'light', silver: 'light', gold: 'medium', crystal: 'heavy' }[G.egg];
  shake(shakeLevel);

  updateUI();

  // Reveal prize after impact
  setTimeout(() => {
    const prize = roll(G.egg);

    // Critical hit chance (5%, or 8% with lucky charm)
    const critChance = G.luckyCharm ? 0.08 : 0.05;
    const isCritical = prize.t !== 'x' && Math.random() < critChance;

    // Jackpot (0.5% on gold/crystal, 0.2% otherwise)
    const jackpotChance = (G.egg === 'gold' || G.egg === 'crystal') ? 0.005 : 0.002;
    const isJackpot = prize.t !== 'x' && Math.random() < jackpotChance;

    $id('cracks').className = 'cracks-shown';

    let xpGained = 1; // base XP for any smash

    if (prize.t === 'x') {
      // Empty
      spawnFloat('Empty!', '#9ca3af');
      msg('Nothing this time...', '#9ca3af');
      SFX.play('empty');
      G.streak = 0;

    } else if (prize.t === 'c') {
      // Coins
      let earned = Math.round(prize.v * G.mult);
      if (isCritical) earned *= 3;
      if (isJackpot) earned *= 10;

      G.coins += earned;
      G.score += earned;
      G.totalCoins += earned;
      G.streak++;
      G.bestStreak = Math.max(G.bestStreak, G.streak);
      xpGained = Math.max(1, Math.floor(earned / 3));

      if (isJackpot) {
        G.jackpots++;
        spawnFloat('JACKPOT! +' + earned, '#f59e0b', 'jackpot');
        msg('JACKPOT! ' + earned + ' coins!!!', '#f59e0b');
        SFX.play('jackpot');
        shake('heavy');
        Particles.sparkle(eggCX, eggCY, 30, '#FFD700');
      } else if (isCritical) {
        G.criticalHits++;
        spawnFloat('CRIT! +' + earned, '#ef4444', 'critical');
        msg('Critical Hit! ' + earned + ' coins!', '#ef4444');
        SFX.play('critical');
        shake('medium');
        Particles.sparkle(eggCX, eggCY, 15, '#FF6B6B');
      } else {
        spawnFloat('+' + earned + ' coins', '#d97706');
        msg(earned + ' coin' + (earned !== 1 ? 's' : '') + ' (' + G.mult.toFixed(1) + 'x)');
        SFX.play('coin');
      }
      bumpStat('st-c');

    } else {
      // Gems
      let gemVal = G.gBoosted ? prize.v * 2 : prize.v;
      if (isCritical) gemVal *= 3;
      if (isJackpot) gemVal *= 10;

      G.gems += gemVal;
      G.score += gemVal * 10;
      G.totalGems += gemVal;
      G.streak++;
      G.bestStreak = Math.max(G.bestStreak, G.streak);
      xpGained = gemVal * 3;

      if (isJackpot) {
        G.jackpots++;
        spawnFloat('JACKPOT! +' + gemVal + ' gems!', '#7c3aed', 'jackpot');
        msg('GEM JACKPOT! ' + gemVal + ' gems!!!', '#7c3aed');
        SFX.play('jackpot');
        shake('heavy');
        Particles.sparkle(eggCX, eggCY, 30, '#A78BFA');
      } else if (isCritical) {
        G.criticalHits++;
        spawnFloat('CRIT! +' + gemVal + ' gems!', '#7c3aed', 'critical');
        msg('Critical! ' + gemVal + ' gem' + (gemVal !== 1 ? 's' : '') + '!', '#7c3aed');
        SFX.play('critical');
        shake('medium');
        Particles.sparkle(eggCX, eggCY, 15, '#C084FC');
      } else {
        spawnFloat('+' + gemVal + ' gems', '#7c3aed');
        msg('Rare! ' + gemVal + ' gem' + (gemVal !== 1 ? 's' : '') + '!', '#7c3aed');
        SFX.play('gem');
      }
      bumpStat('st-g');
    }

    // XP
    addXP(xpGained);

    // Combo multiplier
    G.mult = Math.min(G.maxMult, +(G.mult + 0.5).toFixed(1));
    if (G.mult >= G.maxMult) G.maxComboReached = true;
    if (decayTO) clearTimeout(decayTO);
    decayTO = setTimeout(decayMult, 4000);

    // Check achievements
    checkAchievements();

    // Clean up
    setTimeout(() => {
      $id('cracks').className = 'cracks-hidden';
      hammerEl.classList.remove('hammer-anim');
      G.smashing = false;
      updateUI();
    }, 560);

    updateUI();
  }, 280);
}

// ==================== MULTIPLIER DECAY ====================
function decayMult() {
  if (G.mult > 1) {
    G.mult = Math.max(1, +(G.mult - 0.5).toFixed(1));
    updateUI();
    if (G.mult > 1) {
      decayTO = setTimeout(decayMult, 720);
    }
  }
}

// ==================== HAMMER REGEN ====================
function startRegen() {
  G.regenCD = G.autoRegen ? 15 : 30;
  regenInt = setInterval(() => {
    G.regenCD--;
    if (G.regenCD <= 0) {
      G.hammers = Math.min(G.maxH, G.hammers + 1);
      if (G.hammers >= G.maxH) {
        clearInterval(regenInt);
        regenInt = null;
      } else {
        G.regenCD = G.autoRegen ? 15 : 30;
      }
    }
    updateUI();
  }, 1000);
}

// ==================== EGG SELECTION ====================
function selEgg(e, type) {
  e.stopPropagation();
  if (G.level < EGG_UNLOCK_LEVEL[type]) {
    msg('Reach level ' + EGG_UNLOCK_LEVEL[type] + ' first!', '#ef4444');
    SFX.play('error');
    return;
  }
  G.egg = type;
  document.querySelectorAll('.egg-tab').forEach(b => b.classList.remove('selected'));
  $id('tab-' + type).classList.add('selected');
  updateUI();
}

// ==================== SHOP ====================
function buy(item) {
  if (item === 'h') {
    if (G.coins < 10) { msg('Need 10 coins!', '#ef4444'); SFX.play('error'); return; }
    G.coins -= 10;
    G.hammers = Math.min(G.maxH, G.hammers + 5);
    msg('+5 hammers!', '#16a34a');

  } else if (item === 'cap') {
    if (G.coins < 30) { msg('Need 30 coins!', '#ef4444'); SFX.play('error'); return; }
    G.coins -= 30;
    G.maxH += 5;
    msg('Max hammers now ' + G.maxH + '!', '#16a34a');

  } else if (item === 'm') {
    if (G.coins < 25) { msg('Need 25 coins!', '#ef4444'); SFX.play('error'); return; }
    if (G.mBoosted) { msg('Already purchased!', '#9ca3af'); return; }
    G.coins -= 25;
    G.maxMult = 8;
    G.mBoosted = true;
    msg('Multiplier cap raised to 8x!', '#16a34a');

  } else if (item === 'g') {
    if (G.coins < 50) { msg('Need 50 coins!', '#ef4444'); SFX.play('error'); return; }
    if (G.gBoosted) { msg('Already purchased!', '#9ca3af'); return; }
    G.coins -= 50;
    G.gBoosted = true;
    msg('Gems now give 2x!', '#7c3aed');

  } else if (item === 'auto') {
    if (G.gems < 3) { msg('Need 3 gems!', '#ef4444'); SFX.play('error'); return; }
    if (G.autoRegen) { msg('Already purchased!', '#9ca3af'); return; }
    G.gems -= 3;
    G.autoRegen = true;
    msg('Hammer regen is now 2x faster!', '#16a34a');

  } else if (item === 'luck') {
    if (G.gems < 8) { msg('Need 8 gems!', '#ef4444'); SFX.play('error'); return; }
    if (G.luckyCharm) { msg('Already purchased!', '#9ca3af'); return; }
    G.gems -= 8;
    G.luckyCharm = true;
    msg('Lucky Charm active! Fewer empty eggs!', '#16a34a');
  }

  G.purchases++;
  SFX.play('buy');
  checkAchievements();
  updateUI();
}

// ==================== ACHIEVEMENTS ====================
let achievePopupTimeout = null;

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (G.achieved.includes(a.id)) continue;
    if (a.check(G)) {
      G.achieved.push(a.id);
      showAchievePopup(a);
      SFX.play('achieve');
    }
  }
  renderAchievements();
}

function showAchievePopup(a) {
  const popup = $id('achieve-popup');
  $id('achieve-popup-icon').textContent = a.icon;
  $id('achieve-popup-name').textContent = a.name;
  $id('achieve-popup-desc').textContent = a.desc;
  popup.classList.remove('hidden');
  popup.classList.add('show');
  clearTimeout(achievePopupTimeout);
  achievePopupTimeout = setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => popup.classList.add('hidden'), 400);
  }, 3000);
}

function renderAchievements() {
  const grid = $id('achievements-grid');
  grid.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const unlocked = G.achieved.includes(a.id);
    const card = document.createElement('div');
    card.className = 'achieve-card ' + (unlocked ? 'unlocked' : 'locked');
    card.innerHTML =
      '<span class="achieve-icon">' + a.icon + '</span>' +
      '<div class="achieve-info">' +
        '<span class="achieve-name">' + a.name + '</span>' +
        '<span class="achieve-desc">' + a.desc + '</span>' +
      '</div>';
    grid.appendChild(card);
  }
  $id('achieve-count').textContent = G.achieved.length + ' / ' + ACHIEVEMENTS.length;
}

// ==================== SOUND TOGGLE ====================
function toggleSound() {
  SFX.toggle();
  updateUI();
}

// ==================== KEYBOARD SUPPORT ====================
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    smash();
  }
});

// ==================== INIT ====================
loadGame();
Particles.init($id('particle-canvas'));
renderAchievements();
updateUI();

// Start regen timer if needed after load
if (G.hammers < G.maxH && !regenInt) startRegen();

// Auto-save periodically
setInterval(saveGame, 10000);

// Close level-up overlay on click
$id('levelup-overlay').addEventListener('click', function () {
  this.classList.add('hidden');
});
