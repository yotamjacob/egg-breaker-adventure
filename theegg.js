// ============================================================
//  Egg Smash Adventures — The Egg (v3.12.0)
//  theegg.js  (bundled right after idle.js — its boot block needs game.js,
//  smash.js and the rest of the engine to have executed)
//
//  A side mode: a swarm of flying monkeys hits a giant golden egg that never
//  breaks. Its shell comes off in layers, each tougher than the last. Shards
//  (earned per hit) buy swarm upgrades; every few layers a permanent, capped
//  Blessing applies to the main game (CONFIG.theEgg.blessings).
//
//  Split in two:
//    - state + math (no DOM): theEggState, theEggHit, theEggBuy, theEggBonus,
//      theEggCreditTrickle … — covered by tests/theegg.test.js
//    - the panel: a pixel-art scene (sprites from theegg-art.js) over the
//      play tray, opened from the golden-egg button. One rAF loop, only while
//      the panel is open and visible.
//
//  Rules (see CLAUDE.md):
//    - Module state is `var` only. game.js boot can call into here before this
//      file's top level has run; a `let`/`const` there is in its TDZ.
//    - The Egg never progresses quests through gold: layer gold is
//      questCredit()-ed. Its own quests count eggCatches (tap-to-catch events).
//    - Main-game hammers come only from the max-hammer blessings, never from
//      layers, so The Egg can't outpace hammer regen.
//    - Offline: a small shard trickle only — no layers, no blessings.
// ============================================================

// ---------------------------------------------------------------
// State + math (no DOM)
// ---------------------------------------------------------------
function theEggUnlocked() {
  const mp = G.monkeys && G.monkeys[0];
  return !!mp && (mp.stage || 0) >= CONFIG.theEgg.unlockStage;
}

function theEggState() {
  let st = G.theEgg;
  if (!st || typeof st !== 'object' || Array.isArray(st)) st = G.theEgg = {};
  if (!(st.layer >= 1) || !isFinite(st.layer)) st.layer = 1;
  st.layer = Math.floor(st.layer);
  if (typeof st.hp !== 'number' || !(st.hp > 0) || !isFinite(st.hp)) st.hp = theEggLayerHp(st.layer);
  if (typeof st.shards !== 'number' || !(st.shards >= 0) || !isFinite(st.shards)) st.shards = 0;
  if (!st.lv || typeof st.lv !== 'object') st.lv = {};
  const ups = CONFIG.theEgg.upgrades;
  for (const k in ups) {
    let l = st.lv[k];
    if (typeof l !== 'number' || !(l >= 0) || !isFinite(l)) l = 0;
    l = Math.floor(l);
    if (ups[k].max != null && l > ups[k].max) l = ups[k].max;
    st.lv[k] = l;
  }
  if (!Array.isArray(st.blessed)) st.blessed = [];
  if (typeof st.trickleAt !== 'number' || !isFinite(st.trickleAt)) st.trickleAt = 0;
  return st;
}

/** HP of shell layer n (1-based). */
function theEggLayerHp(n) {
  const c = CONFIG.theEgg.layerHp;
  return Math.round(c.base * Math.pow(c.growth, Math.max(0, n - 1)));
}

/** Main-game gold paid when layer n comes off — scaled like quest gold. */
function theEggLayerGold(n) {
  const c = CONFIG.theEgg.layerGold, q = CONFIG.quests;
  const scale = Math.min(1 + (G.stagesCompleted || 0) * q.goldScale, q.goldScaleMax + 1);
  return Math.round(c.base * Math.pow(c.growth, Math.max(0, n - 1)) * scale);
}

function theEggPrice(k) {
  const u = CONFIG.theEgg.upgrades[k];
  return Math.round(u.base * Math.pow(u.growth, theEggState().lv[k]));
}
function theEggMaxed(k) {
  const u = CONFIG.theEgg.upgrades[k];
  return u.max != null && theEggState().lv[k] >= u.max;
}

/** Spend shards on one level of upgrade `k`. Returns true when bought. */
function theEggBuy(k) {
  const st = theEggState();
  if (!CONFIG.theEgg.upgrades[k] || theEggMaxed(k)) return false;
  const price = theEggPrice(k);
  if (st.shards < price) return false;
  st.shards -= price;
  st.lv[k]++;
  return true;
}

/** Is the monkey with this MONKEY_DATA id unlocked (a swarm captain)? */
function _theEggCaptain(id) {
  const i = MONKEY_DATA.findIndex(m => m.id === id);
  return i >= 0 && !!(G.monkeys && G.monkeys[i] && G.monkeys[i].unlocked);
}

/** Everything the swarm can do right now, from upgrade levels + captains. */
function theEggStats() {
  const C = CONFIG.theEgg, U = C.upgrades, lv = theEggState().lv, cap = C.captains;
  let swing = Math.max(U.wings.floor, C.swingSeconds * Math.pow(U.wings.factor, lv.wings));
  if (_theEggCaptain('space')) swing *= cap.space.speedMult;
  let crit = Math.min(U.luck.max * U.luck.perLevel, lv.luck * U.luck.perLevel);
  if (_theEggCaptain('steampunk')) crit += cap.steampunk.critAdd;
  return {
    swarm:     C.startSwarm + lv.swarm,
    dmg:       Math.pow(U.power.mult, lv.power),
    swing,
    crit,
    critMult:  U.luck.critMult,
    tapMult:   C.tapMult + lv.tap * U.tap.perLevel,
    shardMult: _theEggCaptain('princess') ? cap.princess.shardMult : 1,
    eventMult: Math.max(0.2, 1 - lv.magnet * U.magnet.perLevel),
  };
}

/** Average swarm damage per second (no taps, no events). */
function theEggPassiveDps(s) {
  s = s || theEggStats();
  return s.swarm / s.swing * s.dmg * (1 + s.crit * (s.critMult - 1));
}
/** Shards per second the swarm earns on its own (no taps, no events). */
function theEggPassiveIncome(s) {
  s = s || theEggStats();
  const C = CONFIG.theEgg;
  return (s.swarm / s.swing * C.shardsPerHit + theEggPassiveDps(s) * C.damageShare) * s.shardMult;
}

/**
 * Apply one hit. `dmg` is the final damage (crits already in); `tap` marks a
 * player tap (pays shardsPerTap instead of shardsPerHit); `shardX` is the
 * Golden Hour multiplier. Returns the number of layers cleared by this hit.
 */
function theEggHit(dmg, tap, shardX) {
  const st = theEggState(), C = CONFIG.theEgg;
  if (!(dmg > 0) || !isFinite(dmg)) return 0;
  const per = tap ? C.shardsPerTap : C.shardsPerHit;
  st.shards += (per + dmg * C.damageShare) * theEggStats().shardMult * (shardX || 1);
  st.hp -= dmg;
  let cleared = 0;
  // A hit can carry through several thin early layers; cap the loop anyway.
  while (st.hp <= 0 && cleared < 50) {
    const done = st.layer;
    st.layer++;
    st.hp += theEggLayerHp(st.layer);
    cleared++;
    _theEggLayerCleared(done);
  }
  if (st.hp <= 0) st.hp = theEggLayerHp(st.layer);
  return cleared;
}

/** Rewards for clearing layer `n`: shards, main-game gold, blessings. */
function _theEggLayerCleared(n) {
  const st = theEggState(), C = CONFIG.theEgg;
  st.shards += C.layerShards * n * theEggStats().shardMult;
  G.eggLayers = Math.max(G.eggLayers || 0, n);
  const gold = theEggLayerGold(n);
  G.gold += gold;
  G.totalGold = (G.totalGold || 0) + gold;
  // Gold from The Egg is not gold from eggs — it must not finish "earn gold" quests
  if (typeof questCredit === 'function') questCredit('totalGold', gold);
  const fresh = _theEggGrantBlessings();
  if (typeof _theEggOnLayer === 'function') _theEggOnLayer(n, gold, fresh);
}

/**
 * Grant every blessing whose layer has come off and isn't granted yet.
 * Idempotent (keyed by layer in st.blessed). Returns the newly granted ones.
 */
function _theEggGrantBlessings() {
  const st = theEggState(), cleared = st.layer - 1, fresh = [];
  for (const b of CONFIG.theEgg.blessings) {
    if (b.layer > cleared || st.blessed.indexOf(b.layer) !== -1) continue;
    st.blessed.push(b.layer);
    fresh.push(b);
    if (b.type === 'maxH') {
      // Same shape as a trophy's max-hammer reward
      G.maxH += b.val;
      if (G.hammers < G.maxH) G.hammers = Math.min(G.maxH, G.hammers + b.val);
      if (typeof regenInt !== 'undefined' && !regenInt && G.hammers < G.maxH &&
          (typeof _regenPauseTimer === 'undefined' || !_regenPauseTimer) && typeof startRegen === 'function') startRegen();
    }
    if (typeof msg === 'function') msg('🥚 Egg Blessing: ' + (b.short || b.label), 'specials');
  }
  return fresh;
}

/** Sum of granted blessing values of `type` (goldPct, itemPct, regenSec, starfall, swarmVisit). */
function theEggBonus(type) {
  const st = typeof G !== 'undefined' && G && G.theEgg;
  if (!st || !Array.isArray(st.blessed) || !st.blessed.length) return 0;
  let v = 0;
  for (const b of CONFIG.theEgg.blessings) if (b.type === type && st.blessed.indexOf(b.layer) !== -1) v += b.val;
  return v;
}

/**
 * Offline trickle: shards for the time since `trickleAt` (when The Egg was last
 * open and visible), at `share` of passive income, capped. Clock jumps
 * backwards credit nothing. Always moves trickleAt to `now`. Returns shards.
 */
function theEggCreditTrickle(now) {
  const st = theEggState(), T = CONFIG.theEgg.trickle;
  const prev = st.trickleAt;
  st.trickleAt = now;
  if (!prev || !(now > prev)) return 0;
  const sec = Math.min((now - prev) / 1000, T.capHours * 3600);
  if (sec < T.minSeconds) return 0;
  const amt = Math.floor(theEggPassiveIncome() * T.share * sec);
  if (amt > 0) st.shards += amt;
  return Math.max(0, amt);
}

/** Next blessing still to come, or null. */
function theEggNextBlessing() {
  const st = theEggState();
  for (const b of CONFIG.theEgg.blessings) if (st.blessed.indexOf(b.layer) === -1) return b;
  return null;
}

// ---------------------------------------------------------------
// Panel (canvas + DOM). The scene is pixel art (theegg-art.js): it is drawn
// into a low-res buffer (R.lo, one canvas pixel = one art pixel) and
// upscaled ×R.Pd with smoothing off, so everything sits on one pixel grid.
// All scene coordinates below are art pixels.
// ---------------------------------------------------------------
var _eggOpen = false;
var _eggRaf = 0;
var _eggRt = null;            // runtime while open: canvases, flyers, fx, events
var _eggBootAt = Date.now();
var _eggNextVisitAt = 0;      // Golden Swarm (L50 blessing) schedule
var _eggUpSig = '';           // last rendered upgrade-buttons signature
var _EGG_SWING = 0.3;         // seconds: wind-up → strike (hit lands at 40%) → recover
var _EGG_HATS = ['steampunk', 'princess', 'space', 'odin', 'sun_wukong'];
var _EGG_UPS = [
  { k: 'swarm',  name: 'SWARM',  d: s => s.swarm + ' flyers' },
  { k: 'power',  name: 'POWER',  d: s => 'dmg ×' + _eggFmtX(s.dmg) },
  { k: 'wings',  name: 'WINGS',  d: s => s.swing.toFixed(2) + 's swing' },
  { k: 'luck',   name: 'LUCK',   d: s => Math.round(s.crit * 100) + '% crit' },
  { k: 'tap',    name: 'TAP',    d: s => 'tap ×' + s.tapMult },
  { k: 'magnet', name: 'MAGNET', d: s => 'events +' + Math.round((1 / s.eventMult - 1) * 100) + '%' },
];

function _eggFmtX(v) { return v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : _eggNum(v); }
function _eggFmt(n) { return n < 100 ? (Math.round(n * 10) / 10).toString() : _eggNum(n); }
/** Compact numbers up to the trillions (formatNum stops at M). */
function _eggNum(n) {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  const u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [v, s] of u) if (n >= v) { const x = n / v; return (x < 100 ? Math.floor(x * 10) / 10 : Math.floor(x)) + s; }
  return String(n);
}

function openTheEgg() {
  if (!theEggUnlocked()) {
    showAlert('🥚', 'The Egg appears once Mr. Monkey reaches stage ' + (CONFIG.theEgg.unlockStage + 1) + '.');
    return;
  }
  if ((typeof _rageActive !== 'undefined' && _rageActive) || (typeof _starfallActive !== 'undefined' && _starfallActive)) {
    showShopSnack('Finish the current skill first!');
    return;
  }
  const panel = $id('theegg-panel');
  if (!panel || _eggOpen) return;
  const st = theEggState();
  st.introSeen = true;
  _eggOpen = true;
  // Egg mode: the stage bar steps aside so the scene gets its height (play.css)
  $id('panel-play').classList.add('egg-mode');
  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden', 'false');
  _eggRt = _eggNewRuntime();
  _eggFitPanel();
  _eggInitIcons();
  _eggUpSig = '';
  _eggRenderHud(true);              // cards first: they set how much height the scene gets
  _eggResize();
  // Re-fit the pixel buffer whenever the canvas box changes (cards re-render,
  // rotation, keyboard…) — a stale buffer would be stretched, not re-laid out.
  if (typeof ResizeObserver === 'function') {
    _eggRt.ro = new ResizeObserver(() => { if (_eggOpen) _eggResize(); });
    _eggRt.ro.observe(_eggRt.cv);
  }
  const got = theEggCreditTrickle(Date.now());
  if (got > 0) _eggBanner('WHILE YOU WERE AWAY +' + _eggNum(got) + ' SHARDS');
  if (typeof track === 'function') track('theegg-open', { layer: st.layer });
  SFX.play('star');
  _eggRt.last = performance.now();
  _eggRaf = requestAnimationFrame(_eggFrame);
  updateTheEggBtn();
}

function closeTheEgg() {
  if (!_eggOpen) return;
  _eggOpen = false;
  if (_eggRaf) cancelAnimationFrame(_eggRaf);
  _eggRaf = 0;
  if (_eggRt && _eggRt.ro) _eggRt.ro.disconnect();
  _eggRt = null;
  const panel = $id('theegg-panel');
  if (panel) { panel.classList.add('hidden'); panel.setAttribute('aria-hidden', 'true'); }
  const play = $id('panel-play');
  play.classList.remove('egg-mode');
  // The tray area changes size back: refit the particle canvas and re-place the
  // eggs (renderEggTray keeps each egg's stored spot, clamped) — what a tab switch does.
  requestAnimationFrame(() => {
    if (!play.classList.contains('active') || _eggOpen) return;
    if (typeof Particles !== 'undefined') Particles.resize();
    renderEggTray();
  });
  theEggState().trickleAt = Date.now();
  saveGame();
  updateTheEggBtn();
}

function _eggNewRuntime() {
  return {
    cv: $id('te-canvas'), ctx: null, lo: null, lc: null, dpr: 1, Pd: 3, VW: 0, VH: 0, devW: 0, devH: 0, geo: null,
    flyers: [], fx: [], floats: [], props: [], gems: [], impacts: [], stars: [], clouds: [],
    T: 0, last: 0, shake: 0, flash: 0, hudT: 0, floatBudget: 0,
    kick: { x: 0, y: 0, t: 0 }, eggFlash: 0, glint: null, glintIn: 1.2, ring: null, bolt: null,
    nextEvent: 8 + Math.random() * 6,   // first event soon after opening
    ev: { weak: 0, weakAng: 0, weakHit: false, goose: null, banana: 0, golden: 0, thief: null, thunder: 0, clones: 0 },
  };
}

/** Short phone screens: compact upgrade cards (no effect line) so the scene keeps
 *  its height. Wide panels (desktop) keep the effect line — their cards have room. */
function _eggFitPanel() {
  const panel = $id('theegg-panel');
  if (panel) panel.classList.toggle('te-compact', panel.clientHeight > 0 && panel.clientHeight < 470 && panel.clientWidth < 640);
}

function _eggResize() {
  const R = _eggRt; if (!R || !R.cv) return;
  const r = R.cv.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const devW = Math.max(1, Math.round(r.width * dpr)), devH = Math.max(1, Math.round(r.height * dpr));
  if (R.lo && devW === R.devW && devH === R.devH) return;      // unchanged
  R.dpr = dpr; R.devW = devW; R.devH = devH;
  R.cv.width = R.devW; R.cv.height = R.devH;
  R.ctx = R.cv.getContext('2d');
  // The scene is ~150 art pixels tall on any screen (1.3–2.4 CSS px per art
  // pixel), rounded to whole device pixels so the grid stays even.
  R.Pd = Math.max(2, Math.round(Math.max(1.3, Math.min(2.4, r.height / 150)) * R.dpr));
  R.VW = Math.ceil(R.devW / R.Pd); R.VH = Math.ceil(R.devH / R.Pd);
  R.lo = document.createElement('canvas'); R.lo.width = R.VW; R.lo.height = R.VH;
  R.lc = R.lo.getContext('2d');
  const ry = Math.max(16, Math.round(Math.min(R.VH * 0.27, R.VW * 0.3))), rx = Math.round(ry * 0.76);
  const horizon = Math.round(R.VH * 0.87), nestY = horizon - 1;
  R.geo = { rx, ry, cx: Math.round(R.VW / 2), cy: nestY - Math.round(ry * 0.82), nestY, horizon, nestRx: Math.round(rx * 1.5) };
  R.clouds = [0, 1, 2].map(i => ({ i, x: Math.random() * R.VW, y: 4 + i * Math.round(R.VH * 0.13), sp: 1.2 + i * 0.7 }));
  R.stars = [];
  const n = Math.round(R.VW * horizon / 190);
  for (let i = 0; i < n; i++) R.stars.push({ x: Math.floor(Math.random() * R.VW), y: Math.floor(Math.random() * horizon * 0.78), ph: Math.random() * 6, big: Math.random() < 0.07 });
  eaFlushEggs();
}

/** HUD/upgrade pixel icons — data URLs built once. */
function _eggInitIcons() {
  const set = (id, name, s) => { const el = $id(id); if (el && !el.getAttribute('src')) el.setAttribute('src', eaIconUrl(name, s)); };
  set('te-gem', 'shard', 2);
  set('te-bless-img', 'scroll', 2);
}

function _eggSyncFlyers(s) {
  const R = _eggRt, hats = _EGG_HATS.filter(h => _theEggCaptain(h));
  const want = s.swarm * (R.ev.clones > 0 ? 2 : 1);
  while (R.flyers.length < want) {
    const i = R.flyers.length;
    R.flyers.push({
      a: Math.random() * Math.PI * 2, rr: (i % 3 === 2 ? 1.9 : 1.35) + Math.random() * 0.45, ryk: (i % 3 === 2 ? 1.15 : 0.85) + Math.random() * 0.25,
      sp: (0.2 + Math.random() * 0.28) * (Math.random() < 0.5 ? -1 : 1),
      bob: Math.random() * 6, t: Math.random() * s.swing, swing: 0,
      clone: i >= s.swarm, hat: i < hats.length ? hats[i] : '', x: 0, y: 0, facing: 1,
    });
  }
  if (R.flyers.length > want) R.flyers.length = want;
}

/** A point on the shell's silhouette toward angle `ang` (egg-local ellipse angle). */
function _eggSurface(g, ang) {
  const ny = Math.sin(ang), half = g.rx * (1 + 0.17 * ny);
  return { x: g.cx + Math.cos(ang) * half * 0.98, y: g.cy + ny * g.ry * 0.96 };
}

/** Where flyer `f` is now (orbit + strike lunge). Also stores f.x/f.y/f.facing. */
function _eggFlyerPos(f, g) {
  const R = _eggRt;
  const ox = Math.cos(f.a) * g.rx * f.rr, oy = Math.sin(f.a) * g.ry * f.ryk + Math.sin(R.T * 2.6 + f.bob) * 2;
  let x = g.cx + ox, y = g.cy + oy;
  const facing = ox < 0 ? 1 : -1;
  if (f.swing > 0) {
    const p = 1 - f.swing / _EGG_SWING;
    const l = p < 0.4 ? (p / 0.4) * (p / 0.4) * (3 - 2 * p / 0.4) : Math.max(0, 1 - (p - 0.4) / 0.6);
    const hit = _eggSurface(g, Math.atan2((y - g.cy) / g.ry, (x - g.cx) / g.rx));
    // body position that puts the hammer head (strike pose) on the shell
    const tx = hit.x - 13 * facing, ty = hit.y - 6;
    x += (tx - x) * l * 0.9; y += (ty - y) * l * 0.9;
    f.hitX = hit.x; f.hitY = hit.y;
  }
  f.x = x; f.y = Math.min(y, R.VH - 9); f.facing = facing;
  return f;
}

function _eggDealHit(dmgBase, crit, x, y, tap, big) {
  const R = _eggRt, s = theEggStats(), g = R.geo;
  if (R.ev.thunder > 0) { crit = true; R.ev.thunder--; }
  const dmg = dmgBase * (crit ? s.critMult : 1);
  const cleared = theEggHit(dmg, tap, R.ev.golden > 0 ? CONFIG.theEgg.events.goldenHour.shards : 1);
  // the shell reacts: kicked away from the blow, white flash
  const dx = g.cx - x, dy = g.cy - y, d = Math.hypot(dx, dy) || 1, k = crit || tap ? 2 : 1;
  R.kick = { x: Math.round(dx / d * k), y: Math.round(dy / d * k), t: crit ? 0.1 : 0.06 };
  if (tap) R.eggFlash = 0.07;                                 // the player's own blow flashes the shell
  R.impacts.push({ x, y, t: crit ? 0.16 : 0.1, big: crit || big, col: crit ? '#ff6b6b' : tap ? '#ffffff' : '#ffe27a' });
  // Routine flyer hits skip sparks once plenty are on screen (a max swarm lands ~100 hits/s)
  const n = crit ? 8 : tap ? 6 : (R.fx.length > 70 ? 0 : 2);
  const T = EA_TIERS[eaTierFor(theEggState().layer)].ramp;
  for (let i = 0; i < n; i++) {
    R.fx.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.9) * 70, life: 0.35 + Math.random() * 0.3, col: Math.random() < 0.4 ? '#ffffff' : T[5 + Math.floor(Math.random() * 3)], sz: 1 });
  }
  if (tap || crit) {
    if (tap || R.floatBudget >= 1) {
      if (!tap) R.floatBudget--;
      // Big numbers are for the player's own taps; swarm crits stay small so a max swarm doesn't drown the egg
      R.floats.push({ x, y: y - 4, vy: -16, life: 0.9, txt: (crit ? 'CRIT ' : '') + _eggFmt(dmg), col: crit ? '#ff6b6b' : '#ffffff', big: tap && (crit || big) });
    }
    if (crit && !_eggReduced()) R.shake = Math.min(3, R.shake + 1.5);
  }
  if (cleared) _eggLayerFx();
}

function _eggReduced() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Called by _theEggLayerCleared (state side) — DOM/canvas feedback only. */
function _theEggOnLayer(n, gold, fresh) {
  if (!_eggOpen || !_eggRt) return;
  const newTier = eaTierFor(n + 1) !== eaTierFor(n);
  if (fresh && fresh.length) {
    _eggBanner('BLESSING! ' + fresh.map(b => (b.short || b.label).toUpperCase()).join(' · '));
    SFX.play('levelup');
  } else if (newTier) {
    _eggBanner('NEW SHELL: ' + EA_TIERS[eaTierFor(n + 1)].name);
    SFX.play('levelup');
  } else {
    _eggBanner('LAYER ' + n + ' CLEARED · +' + _eggNum(gold) + ' GOLD');
    SFX.play('coin');
  }
  updateResources();
  saveGame();
  if (typeof checkAchievements === 'function') checkAchievements();
}

/** A layer comes off: shell chunks fly, a shock ring, shards fly to the counter. */
function _eggLayerFx() {
  const R = _eggRt, g = R.geo, st = theEggState();
  const old = EA_TIERS[eaTierFor(st.layer - 1)].ramp;
  R.flash = 0.7;
  R.ring = { r: g.ry * 0.6, t: 0.45 };
  eaFlushEggs();
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 70;
    R.fx.push({ x: g.cx + Math.cos(a) * g.rx * 0.8, y: g.cy + Math.sin(a) * g.ry * 0.8, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 35, life: 0.8 + Math.random() * 0.6, col: old[2 + Math.floor(Math.random() * 5)], sz: Math.random() < 0.5 ? 2 : 1, grav: 1 });
  }
  for (let i = 0; i < 9; i++) R.gems.push({ x: g.cx + (Math.random() - 0.5) * g.rx, y: g.cy + (Math.random() - 0.5) * g.ry, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, t: 0 });
  if (!_eggReduced()) R.shake = 3;
  SFX.play('crunch');
}

var _eggBannerTimer = null;
function _eggBanner(text) {
  const el = $id('te-banner'); if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(_eggBannerTimer);
  _eggBannerTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

// ---- events ----
function _eggEventPool() {
  const pool = ['weakSpot', 'goose', 'bananaStorm', 'goldenHour', 'thief', 'quake'];
  if (_theEggCaptain('odin')) pool.push('thunder');
  if (_theEggCaptain('sun_wukong')) pool.push('clones');
  return pool;
}
function _eggStartEvent(name) {
  const R = _eggRt, E = CONFIG.theEgg.events, s = theEggStats(), g = R.geo;
  if (name === 'weakSpot')    { R.ev.weak = E.weakSpot.seconds; R.ev.weakAng = -Math.PI * (0.15 + Math.random() * 0.7) + (Math.random() < 0.5 ? 0 : Math.PI * 0.9); R.ev.weakHit = false; _eggBanner('WEAK SPOT! TAP THE GLOW'); }
  if (name === 'goose')       { R.ev.goose = { x: -24, y: Math.round(R.VH * 0.28), vx: (R.VW + 48) / E.goose.seconds }; _eggBanner('GOLDEN GOOSE! TAP IT'); }
  if (name === 'bananaStorm') { R.ev.banana = E.bananaStorm.seconds; _eggBanner('BANANA STORM · SWARM ×' + E.bananaStorm.speed + ' SPEED'); }
  if (name === 'goldenHour')  { R.ev.golden = E.goldenHour.seconds; _eggBanner('GOLDEN HOUR · ×' + E.goldenHour.shards + ' SHARDS'); }
  if (name === 'thief')       { R.ev.thief = { x: R.VW + 20, y: Math.round(R.VH * 0.36), vx: -(R.VW + 40) / E.thief.seconds }; _eggBanner('SHARD THIEF! CATCH THE CROW'); }
  if (name === 'quake') {
    const st = theEggState();
    const dmg = Math.min(st.hp, theEggPassiveDps(s) * E.quake.dpsSeconds);
    if (!_eggReduced()) R.shake = 4;
    _eggBanner('SHELL QUAKE!');
    for (let i = 0; i < 26; i++) R.fx.push({ x: g.cx + (Math.random() - 0.5) * g.nestRx * 2, y: g.nestY + 2, vx: (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 30, life: 0.7 + Math.random() * 0.4, col: Math.random() < 0.5 ? '#8a5a24' : '#5c3816', sz: 1, grav: 1 });
    _eggDealHit(dmg, false, g.cx, g.cy - Math.round(g.ry * 0.2), false, true);
  }
  if (name === 'thunder') {
    R.ev.thunder = E.thunder.hits; R.flash = 0.8;
    const pts = [[g.cx + (Math.random() - 0.5) * 20, 0]];
    for (let y = 8; y < g.cy - g.ry; y += 6 + Math.random() * 4) pts.push([g.cx + (Math.random() - 0.5) * 14, y]);
    pts.push([g.cx, g.cy - g.ry + 2]);
    R.bolt = { t: 0.35, pts };
    _eggBanner("THOR'S THUNDER · " + E.thunder.hits + ' CRITS');
  }
  if (name === 'clones')      { R.ev.clones = E.clones.seconds; _eggBanner('72 CLONES · SWARM ×2'); }
  SFX.play('star');
}
function _eggPickEvent() {
  const pool = _eggEventPool(), E = CONFIG.theEgg.events;
  const w = pool.map(n => (E[n] && E[n].weight) || 1);
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[0];
}

function _eggCatch(label, shards, x, y) {
  const R = _eggRt, st = theEggState();
  st.shards += shards;
  G.eggCatches = (G.eggCatches || 0) + 1;
  R.floats.push({ x, y, vy: -12, life: 1.4, txt: label + ' +' + _eggNum(shards), col: '#ffe27a', big: true });
  for (let i = 0; i < 8; i++) R.gems.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 40, t: 0 });
  R.impacts.push({ x, y, t: 0.18, big: true, col: '#ffe27a' });
  SFX.play('coin');
}

// ---- input ----
function _eggPointer(e) {
  const R = _eggRt; if (!R || !_eggOpen || !R.geo) return;
  e.preventDefault();
  const r = R.cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (R.devW / r.width) / R.Pd, y = (e.clientY - r.top) * (R.devH / r.height) / R.Pd;
  const E = CONFIG.theEgg.events, s = theEggStats(), g = R.geo;
  if (R.ev.goose && Math.hypot(x - R.ev.goose.x, y - R.ev.goose.y) < 16) {
    _eggCatch('GOOSE', Math.max(10, Math.round(theEggPassiveIncome(s) * E.goose.incomeSeconds)), R.ev.goose.x, R.ev.goose.y);
    R.ev.goose = null; return;
  }
  if (R.ev.thief && Math.hypot(x - R.ev.thief.x, y - R.ev.thief.y) < 15) {
    _eggCatch('BAG', Math.max(5, Math.round(theEggPassiveIncome(s) * E.thief.incomeSeconds)), R.ev.thief.x, R.ev.thief.y);
    R.ev.thief = null; return;
  }
  const dx = (x - g.cx) / g.rx, dy = (y - g.cy) / g.ry;
  if (dx * dx + dy * dy > 1.3) return;
  let mult = s.tapMult, big = false;
  if (R.ev.weak > 0) {
    const w = _eggWeakPos(g);
    if (Math.hypot(x - w.x, y - w.y) < 9) {
      mult *= E.weakSpot.mult; big = true;
      if (!R.ev.weakHit) { R.ev.weakHit = true; G.eggCatches = (G.eggCatches || 0) + 1; }
    }
  }
  _eggDealHit(s.dmg * mult, Math.random() < s.crit, x, y, true, big);
  if (!_eggReduced()) R.shake = Math.min(2, R.shake + 0.8);
  SFX.play('hit');
}
function _eggWeakPos(g) {
  const p = _eggSurface(g, _eggRt.ev.weakAng);
  return { x: Math.round(g.cx + (p.x - g.cx) * 0.72), y: Math.round(g.cy + (p.y - g.cy) * 0.72) };
}

// ---- loop ----
function _eggFrame(now) {
  _eggRaf = 0;
  const R = _eggRt;
  if (!_eggOpen || !R || !R.ctx || !R.geo) return;
  if (document.hidden) { R.last = now; return; }   // visibilitychange restarts the loop
  const dt = Math.min(0.05, Math.max(0, (now - R.last) / 1000));
  R.last = now; R.T += dt;
  try { _eggStep(dt); _eggDraw(); } catch (e) { console.error('theegg frame', e); }
  if (now - R.hudT > 200) { R.hudT = now; _eggRenderHud(false); theEggState().trickleAt = Date.now(); }
  _eggRaf = requestAnimationFrame(_eggFrame);
}

function _eggStep(dt) {
  const R = _eggRt, s = theEggStats(), E = CONFIG.theEgg.events, g = R.geo;
  R.floatBudget = Math.min(3, R.floatBudget + dt * 3);   // swarm crit numbers per second
  for (const k of ['weak', 'banana', 'golden', 'clones']) if (R.ev[k] > 0) R.ev[k] = Math.max(0, R.ev[k] - dt);
  R.nextEvent -= dt;
  if (R.nextEvent <= 0) {
    _eggStartEvent(_eggPickEvent());
    const [lo, hi] = E.every;
    R.nextEvent = (lo + Math.random() * (hi - lo)) * s.eventMult;
  }
  _eggSyncFlyers(s);
  const speed = R.ev.banana > 0 ? E.bananaStorm.speed : 1;
  for (const f of R.flyers) {
    f.a += f.sp * dt * (R.ev.banana > 0 ? 1.8 : 1);
    if (f.swing > 0) {
      const p0 = 1 - f.swing / _EGG_SWING;
      f.swing = Math.max(0, f.swing - dt * Math.min(2, speed));
      const p1 = 1 - f.swing / _EGG_SWING;
      if (p0 < 0.4 && p1 >= 0.4 && f.hitX !== undefined) _eggDealHit(s.dmg, Math.random() < s.crit, f.hitX, f.hitY, false, false);
    }
    f.t -= dt * speed;
    if (f.t <= 0) { f.t += s.swing * (0.85 + Math.random() * 0.3); if (f.t < 0) f.t = s.swing; f.swing = _EGG_SWING; }
    _eggFlyerPos(f, g);
  }
  if (R.ev.goose) { R.ev.goose.x += R.ev.goose.vx * dt; R.ev.goose.y = Math.round(R.VH * 0.28 + Math.sin(R.T * 4) * 3); if (R.ev.goose.x > R.VW + 30) R.ev.goose = null; }
  if (R.ev.thief) { R.ev.thief.x += R.ev.thief.vx * dt; R.ev.thief.y = Math.round(R.VH * 0.36 + Math.sin(R.T * 6) * 4); if (R.ev.thief.x < -30) R.ev.thief = null; }
  if (R.ev.banana > 0 && Math.random() < dt * 10) R.props.push({ x: Math.random() * R.VW, y: -12, vy: 45 + Math.random() * 30, rot: Math.floor(Math.random() * 4), spin: Math.random() * 10 });
  if (R.ev.golden > 0 && Math.random() < dt * 22) R.fx.push({ x: Math.random() * R.VW, y: R.VH, vx: 0, vy: -18 - Math.random() * 20, life: 1.6, col: Math.random() < 0.5 ? '#ffe27a' : '#fff6cf', sz: 1 });
  for (let i = R.props.length - 1; i >= 0; i--) { const p = R.props[i]; p.y += p.vy * dt; p.spin += dt * 8; if (p.y > R.VH + 12) R.props.splice(i, 1); }
  for (let i = R.fx.length - 1; i >= 0; i--) {
    const p = R.fx[i]; p.life -= dt;
    if (p.life <= 0) { R.fx.splice(i, 1); continue; }
    p.vy += (p.grav ? 160 : 120) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = R.gems.length - 1; i >= 0; i--) {     // shards home in on the counter (top-left)
    const m = R.gems[i]; m.t += dt;
    const tx = 4, ty = -8, ax = (tx - m.x) * 9, ay = (ty - m.y) * 9;
    m.vx += ax * dt * Math.min(1, m.t * 2); m.vy += ay * dt * Math.min(1, m.t * 2);
    m.vx *= 0.94; m.vy *= 0.94; m.x += m.vx * dt; m.y += m.vy * dt;
    if (m.y < -4 || m.t > 2) R.gems.splice(i, 1);
  }
  for (let i = R.impacts.length - 1; i >= 0; i--) { R.impacts[i].t -= dt; if (R.impacts[i].t <= 0) R.impacts.splice(i, 1); }
  for (let i = R.floats.length - 1; i >= 0; i--) { const f = R.floats[i]; f.life -= dt; f.y += f.vy * dt; if (f.life <= 0) R.floats.splice(i, 1); }
  for (const c of R.clouds) { c.x += c.sp * dt; if (c.x > R.VW + 4) c.x = -44; }
  if (R.kick.t > 0) R.kick.t -= dt;
  if (R.eggFlash > 0) R.eggFlash -= dt;
  if (R.bolt) { R.bolt.t -= dt; if (R.bolt.t <= 0) R.bolt = null; }
  if (R.ring) { R.ring.t -= dt; R.ring.r += dt * 90; if (R.ring.t <= 0) R.ring = null; }
  R.glintIn -= dt;
  if (R.glintIn <= 0) { R.glintIn = 1.2 + Math.random() * 1.6; R.glint = { u: -0.7 + Math.random() * 0.6, v: -0.75 + Math.random() * 0.5, t: 0.45 }; }
  if (R.glint) { R.glint.t -= dt; if (R.glint.t <= 0) R.glint = null; }
  if (R.shake > 0) R.shake = Math.max(0, R.shake - dt * 14);
  if (R.flash > 0) R.flash = Math.max(0, R.flash - dt * 2.5);
}

function _eggDraw() {
  const R = _eggRt, c = R.lc, g = R.geo, st = theEggState();
  const tier = EA_TIERS[eaTierFor(st.layer)];
  c.imageSmoothingEnabled = false;
  c.globalAlpha = 1;
  c.drawImage(eaBackdrop(R.VW, R.VH, g.horizon), 0, 0);
  for (const s of R.stars) {                                  // twinkling stars
    const b = Math.sin(R.T * 2.2 + s.ph);
    if (b < -0.35) continue;
    c.fillStyle = b > 0.6 ? '#ffffff' : '#9d93d6';
    c.fillRect(s.x, s.y, 1, 1);
    if (s.big && b > 0.6) { c.fillRect(s.x - 1, s.y, 3, 1); c.fillRect(s.x, s.y - 1, 1, 3); }
  }
  for (const cl of R.clouds) c.drawImage(eaCloud(cl.i), Math.round(cl.x), cl.y);
  // stepped glow, pulsing in 3 steps (Golden Hour holds it at full)
  const pulse = R.ev.golden > 0 ? 2 : Math.min(2, Math.floor((Math.sin(R.T * 2.2) + 1) * 1.5));
  const au = eaAura(tier.aura, g.rx, g.ry, pulse);
  c.globalCompositeOperation = 'lighter';                      // light, not paint: brightens the sky behind
  c.globalAlpha = R.ev.golden > 0 ? 1 : 0.7;
  c.drawImage(au, g.cx - (au.width >> 1), g.cy - (au.height >> 1));
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  if (R.ring) {                                               // shock ring when a layer comes off
    c.fillStyle = tier.aura; c.globalAlpha = Math.min(1, R.ring.t * 3);
    for (let a = 0; a < Math.PI * 2; a += 1 / R.ring.r) c.fillRect(Math.round(g.cx + Math.cos(a) * R.ring.r), Math.round(g.cy + Math.sin(a) * R.ring.r * 0.8), 1, 1);
    c.globalAlpha = 1;
  }
  const nb = eaNest(g.nestRx, 'back'), nf = eaNest(g.nestRx, 'front');
  c.drawImage(nb, g.cx - (nb.width >> 1), g.nestY - (nb.height >> 1));
  for (const f of R.flyers) if (Math.sin(f.a) < 0) _eggDrawFlyer(c, f);
  _eggDrawEgg(c, g, st);
  c.drawImage(nf, g.cx - (nf.width >> 1), g.nestY - (nf.height >> 1));
  for (const f of R.flyers) if (Math.sin(f.a) >= 0) _eggDrawFlyer(c, f);
  for (const p of R.props) c.drawImage(eaBanana((p.rot + Math.floor(p.spin)) % 4), Math.round(p.x) - 6, Math.round(p.y) - 6);
  if (R.ev.goose) {
    const sp = eaGoose(Math.floor(R.T * 9) % 4);
    c.drawImage(sp, Math.round(R.ev.goose.x) - 20, Math.round(R.ev.goose.y) - 15);
    if (Math.floor(R.T * 6) % 2) { c.drawImage(eaImpact(0, '#fff6cf'), Math.round(R.ev.goose.x) - 18, Math.round(R.ev.goose.y) - 16); }
  }
  if (R.ev.thief) c.drawImage(eaCrow(Math.floor(R.T * 10) % 4), Math.round(R.ev.thief.x) - 17, Math.round(R.ev.thief.y) - 14);
  if (R.ev.weak > 0) _eggDrawWeak(c, g);
  if (R.bolt) _eggDrawBolt(c);
  for (const p of R.fx) { c.globalAlpha = Math.min(1, p.life * 2.5); c.fillStyle = p.col; c.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz); }
  c.globalAlpha = 1;
  for (const m of R.gems) c.drawImage(eaShard(false), Math.round(m.x) - 3, Math.round(m.y) - 3);
  for (const im of R.impacts) { const sp = eaImpact(im.big ? 1 : 0, im.col); c.drawImage(sp, Math.round(im.x) - (sp.width >> 1), Math.round(im.y) - (sp.height >> 1)); }
  if (R.ev.golden > 0) { c.fillStyle = 'rgba(255,190,80,0.10)'; c.fillRect(0, 0, R.VW, R.VH); }
  if (R.flash > 0) { c.fillStyle = 'rgba(255,248,220,' + (R.flash * 0.5).toFixed(3) + ')'; c.fillRect(0, 0, R.VW, R.VH); }
  // upscale to the screen
  const x = R.ctx, P = R.Pd, sh = R.shake > 0 ? Math.round((Math.random() - 0.5) * R.shake * 2) : 0, sv = R.shake > 0 ? Math.round((Math.random() - 0.5) * R.shake * 2) : 0;
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#0a0820'; x.fillRect(0, 0, R.devW, R.devH);
  x.drawImage(R.lo, sh * P, sv * P, R.VW * P, R.VH * P);
  // damage numbers in the game's pixel font, crisp on top
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const f of R.floats) {
    const px = Math.round((f.big ? 12 : 9) * R.dpr);
    x.globalAlpha = Math.min(1, f.life * 1.6);
    x.font = px + "px 'Press Start 2P', monospace";
    x.lineWidth = Math.max(2, Math.round(R.dpr * 2)); x.strokeStyle = '#0a0a18';
    x.strokeText(f.txt, f.x * P, f.y * P); x.fillStyle = f.col; x.fillText(f.txt, f.x * P, f.y * P);
  }
  x.globalAlpha = 1;
}

function _eggDrawEgg(c, g, st) {
  const R = _eggRt;
  const dmg = 1 - Math.max(0, st.hp) / theEggLayerHp(st.layer);
  const spr = eaEgg(st.layer, g.rx, g.ry, dmg, false);
  const kx = R.kick.t > 0 ? R.kick.x : 0, ky = R.kick.t > 0 ? R.kick.y : 0;
  const ex = Math.round(g.cx - spr.width / 2 + kx), ey = Math.round(g.cy - spr.height / 2 + ky);
  c.drawImage(spr, ex, ey);
  if (R.eggFlash > 0) {
    c.globalAlpha = Math.min(1, R.eggFlash / 0.08) * 0.7;
    c.drawImage(eaEgg(st.layer, g.rx, g.ry, 0, true), ex, ey);
    c.globalAlpha = 1;
  }
  if (R.glint) {                                              // a star glints on the lit side
    const k = Math.sin((1 - R.glint.t / 0.45) * Math.PI), sp = eaImpact(k > 0.6 ? 1 : 0, '#fff6cf');
    c.globalAlpha = k;
    c.drawImage(sp, Math.round(g.cx + R.glint.u * g.rx) - (sp.width >> 1), Math.round(g.cy + R.glint.v * g.ry) - (sp.height >> 1));
    c.globalAlpha = 1;
  }
}

function _eggDrawFlyer(c, f) {
  const R = _eggRt;
  const p = f.swing > 0 ? 1 - f.swing / _EGG_SWING : 1;
  const pose = f.swing > 0 ? (p < 0.4 ? 1 : p < 0.62 ? 2 : 0) : 0;
  const wing = (Math.floor(R.T * (R.ev.banana > 0 ? 20 : 11) + f.bob * 4)) % 4;
  const spr = eaMonkey(wing, pose, f.hat, f.facing, f.clone);
  const ax = f.facing > 0 ? EA_MONKEY_ANCHOR[0] : EA_MONKEY_W - 1 - EA_MONKEY_ANCHOR[0];
  if (f.clone) c.globalAlpha = 0.85;
  c.drawImage(spr, Math.round(f.x - ax), Math.round(f.y - EA_MONKEY_ANCHOR[1]));
  c.globalAlpha = 1;
}

function _eggDrawWeak(c, g) {
  const R = _eggRt, w = _eggWeakPos(g), r = 5 + Math.round((Math.sin(R.T * 10) + 1) * 1.2);
  for (let a = 0; a < Math.PI * 2; a += 0.5 / r) {
    c.fillStyle = Math.floor(a * r / 2) % 2 ? '#ffffff' : '#ff3b5c';
    c.fillRect(Math.round(w.x + Math.cos(a) * r), Math.round(w.y + Math.sin(a) * r), 1, 1);
  }
  const sp = eaImpact(Math.floor(R.T * 8) % 2, '#ff6b7d');
  c.drawImage(sp, w.x - (sp.width >> 1), w.y - (sp.height >> 1));
}

function _eggDrawBolt(c) {
  const b = _eggRt.bolt;
  c.globalAlpha = Math.min(1, b.t * 5);
  for (let i = 1; i < b.pts.length; i++) {
    const [x0, y0] = b.pts[i - 1], [x1, y1] = b.pts[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= n; s++) {
      const x = Math.round(x0 + (x1 - x0) * s / n), y = Math.round(y0 + (y1 - y0) * s / n);
      c.fillStyle = '#fff38a'; c.fillRect(x - 1, y, 3, 1);
      c.fillStyle = '#ffffff'; c.fillRect(x, y, 1, 1);
    }
  }
  c.globalAlpha = 1;
}

// ---- HUD + upgrades ----
function _eggRenderHud(force) {
  const st = theEggState(), s = theEggStats();
  const set = (id, t) => { const el = $id(id); if (el && el.textContent !== t) el.textContent = t; };
  set('te-shards', _eggNum(st.shards));
  set('te-layer', 'LAYER ' + st.layer + ' · ' + EA_TIERS[eaTierFor(st.layer)].name);
  const nb = theEggNextBlessing();
  set('te-next', nb ? 'BLESSING AT ' + nb.layer : 'ALL BLESSINGS');
  const hp = $id('te-hp');
  if (hp) hp.style.width = Math.max(0, Math.min(100, st.hp / theEggLayerHp(st.layer) * 100)).toFixed(1) + '%';
  const box = $id('te-upgrades'); if (!box) return;
  const sig = _EGG_UPS.map(u => st.lv[u.k] + ':' + (theEggMaxed(u.k) ? 'M' : st.shards >= theEggPrice(u.k) ? 'Y' : 'N')).join('|') +
    '|' + s.swing.toFixed(2) + s.crit + s.shardMult;
  if (!force && sig === _eggUpSig) return;
  _eggUpSig = sig;
  const gem = eaIconUrl('shard', 2);
  box.innerHTML = _EGG_UPS.map(u => {
    const maxed = theEggMaxed(u.k), price = theEggPrice(u.k), ok = !maxed && st.shards >= price;
    return '<button type="button" class="te-up' + (maxed ? ' maxed' : '') + '" data-up="' + u.k + '"' + (ok ? '' : ' aria-disabled="true"') + '>' +
      '<span class="te-up-side"><img class="te-up-ic" src="' + eaIconUrl(u.k, 2) + '" alt=""><span class="te-up-lv">L' + st.lv[u.k] + '</span></span>' +
      '<span class="te-up-body"><span class="te-up-n">' + u.name + '</span>' +
      '<span class="te-up-d">' + u.d(s) + '</span>' +
      '<span class="te-up-c">' + (maxed ? 'MAX' : '<img class="te-gem-sm" src="' + gem + '" alt="">' + _eggNum(price)) + '</span></span></button>';
  }).join('');
}

function _eggUpgradeClick(e) {
  const btn = e.target.closest('.te-up'); if (!btn) return;
  const k = btn.dataset.up;
  if (theEggMaxed(k)) return;
  if (!theEggBuy(k)) { SFX.play('err'); _eggBanner('NEED ' + _eggNum(theEggPrice(k)) + ' SHARDS'); return; }
  SFX.play('buy');
  _eggRenderHud(true);
  saveGame();
}

function showTheEggBlessings() {
  const st = theEggState();
  const rows = CONFIG.theEgg.blessings.map(b => {
    const got = st.blessed.indexOf(b.layer) !== -1;
    return '<div class="te-bless-row' + (got ? ' got' : '') + '"><span class="te-bless-l">' + (got ? '✅' : 'L' + b.layer) + '</span><span>' + b.label + '</span></div>';
  }).join('');
  showConfirm('🥚', 'Egg Blessings', '<div class="te-bless">' + rows + '</div><p class="te-bless-note">Permanent boosts for the main game, one for each milestone layer.</p>', null, 'Got it');
}

function showTheEggInfo() {
  showConfirm('🥚', 'The Egg',
    'Your flying monkeys hit the golden egg on their own; <strong>tap the egg</strong> to hit it harder yourself. It never breaks, but its shell comes off in <strong>layers</strong>, and every 10 layers it grows a new shell.<br><br>' +
    'Every hit drops <strong>shards</strong> for swarm upgrades. Each layer pays gold, and milestone layers grant permanent <strong>Blessings</strong> for the main game.<br><br>' +
    'Watch for events: tap the <strong>goose</strong>, the <strong>crow</strong> and the <strong>glowing weak spot</strong>. Every monkey you unlock joins the swarm. While The Egg is closed the swarm keeps chipping a few shards.',
    null, 'Got it');
}

// ---- tray button, unlock intro, Golden Swarm visits ----
function updateTheEggBtn() {
  const btn = $id('theegg-btn'); if (!btn) return;
  const on = theEggUnlocked();
  btn.classList.toggle('hidden', !on);
  if (!on) return;
  const img = $id('theegg-btn-img');
  // Set lazily: a new player who can't see the button never downloads it (boot budget)
  if (img && !img.getAttribute('src')) img.setAttribute('src', 'img/cracked_golden_egg_icon.png');
  const st = theEggState();
  const ready = !_eggOpen && Object.keys(CONFIG.theEgg.upgrades).some(k => !theEggMaxed(k) && st.shards >= theEggPrice(k));
  btn.classList.toggle('ready', ready);
}

function _eggAnyOverlayOpen() {
  return !!document.querySelector('.overlay:not(.hidden)');
}

function _theEggTick() {
  try {
    updateTheEggBtn();
    if (_eggOpen && !theEggUnlocked()) closeTheEgg();   // e.g. a hard reset while it was open
    if (!theEggUnlocked() || document.hidden) return;
    const st = theEggState();
    const playOn = $id('panel-play') && $id('panel-play').classList.contains('active');
    // One-time intro, once the boot modals have had their turn
    if (!st.introSeen && !_eggOpen && playOn && Date.now() - _eggBootAt > 8000 && !_eggAnyOverlayOpen()) {
      const sp = $id('splash-screen');
      if (!sp || sp.classList.contains('fade-out')) {
        st.introSeen = true;
        saveGame();
        showConfirm('🥚', 'The Egg has appeared!',
          'A giant golden egg that <strong>never breaks</strong>. Send a swarm of flying monkeys at it, upgrade them with shards, and earn permanent <strong>Blessings</strong> for your main game.<br><br>Open it any time from the golden egg button in the tray.',
          openTheEgg, 'Take a look', 'Later');
      }
    }
    _eggMaybeVisit(playOn);
  } catch (e) { /* never let the side mode take the game down */ }
}

/** L50 blessing: now and then a golden flyer smashes a tray egg for free. */
function _eggMaybeVisit(playOn) {
  if (!theEggBonus('swarmVisit') || _eggOpen || !playOn) return;
  const now = Date.now();
  const [lo, hi] = CONFIG.theEgg.swarmVisitEvery;
  if (!_eggNextVisitAt) { _eggNextVisitAt = now + (lo + Math.random() * (hi - lo)) * 1000; return; }
  if (now < _eggNextVisitAt) return;
  _eggNextVisitAt = now + (lo + Math.random() * (hi - lo)) * 1000;
  if ((typeof _rageActive !== 'undefined' && _rageActive) || (typeof _starfallActive !== 'undefined' && _starfallActive)) return;
  if ((typeof _spawningRound !== 'undefined' && _spawningRound) || (typeof _roundPending !== 'undefined' && _roundPending)) return;
  if (!G.roundEggs || _eggAnyOverlayOpen()) return;
  const tray = $id('egg-tray'); if (!tray || !tray.children.length) return;
  const idxs = [];
  G.roundEggs.forEach((e, i) => {
    if (!e.broken && !e.expired && !e._smashing && e.type !== 'century' && !(e.effects || []).includes('balloon') && tray.children[i]) idxs.push(i);
  });
  if (!idxs.length) return;
  const idx = idxs[Math.floor(Math.random() * idxs.length)];
  const slot = tray.children[idx];
  const zone = $id('prize-zone');
  const wrapR = $id('egg-tray-wrap').getBoundingClientRect(), sR = slot.getBoundingClientRect();
  const tx = sR.left - wrapR.left + sR.width / 2, ty = sR.top - wrapR.top + sR.height * 0.35;
  if (zone) {
    const v = document.createElement('img');
    v.className = 'te-visitor';
    v.alt = '';
    v.src = eaIconUrl('flyer', 2);
    // Sprite faces right (hammer on its right); coming from the right it is mirrored
    const fromRight = tx < wrapR.width / 2;
    if (fromRight) v.style.transform = 'scaleX(-1)';
    v.style.left = (fromRight ? wrapR.width + 20 : -80) + 'px';
    v.style.top = Math.max(0, ty - 70) + 'px';
    zone.appendChild(v);
    // land with the hammer head (≈ +27px, +13px from the body at 2×) on the egg
    requestAnimationFrame(() => { v.style.left = (fromRight ? tx - 10 : tx - 62) + 'px'; v.style.top = (ty - 40) + 'px'; });
    setTimeout(() => v.remove(), 1400);
  }
  setTimeout(() => {
    try {
      const egg = G.roundEggs && G.roundEggs[idx];
      if (!egg || egg.broken || egg.expired || egg._smashing || !$id('egg-tray').children[idx]) return;
      // Free hit: lend a hammer, smash, and take it back if the smash didn't
      // happen. smashEgg spends the hammer and drops egg.hp synchronously, so
      // hp (not the hammer count, which refunds/prizes also move) tells.
      const hpBefore = egg.hp;
      G.hammers += 1;
      smashEgg(idx);
      if (!(egg.hp < hpBefore)) G.hammers -= 1;
      updateResources();
    } catch (e) { /* never break play */ }
  }, 650);
}

// ---------------------------------------------------------------
// Boot
// ---------------------------------------------------------------
(function _theEggBoot() {
  try {
    if (G.theEgg) theEggState();   // repair a stored state; fresh players get one on first open
    const cv = $id('te-canvas');
    if (cv) cv.addEventListener('pointerdown', _eggPointer);
    const ups = $id('te-upgrades');
    if (ups) ups.addEventListener('click', _eggUpgradeClick);
    // Leaving the Play tab closes The Egg (the loop and canvas only live while it's on screen)
    const nav = $id('nav-tabs');
    if (nav) nav.addEventListener('click', e => {
      const tab = e.target.closest('.nav-tab, .nav-play');
      if (tab && !tab.disabled && tab.dataset.tab !== 'play') closeTheEgg();
    });
    window.addEventListener('resize', () => { if (_eggOpen) { _eggFitPanel(); _eggResize(); } });
    document.addEventListener('visibilitychange', () => {
      if (!_eggOpen || !_eggRt) return;
      if (document.hidden) { theEggState().trickleAt = Date.now(); saveGame(); return; }
      const got = theEggCreditTrickle(Date.now());
      if (got > 0) _eggBanner('WHILE YOU WERE AWAY +' + _eggNum(got) + ' SHARDS');
      _eggRt.last = performance.now();
      if (!_eggRaf) _eggRaf = requestAnimationFrame(_eggFrame);
    });
    updateTheEggBtn();
    setInterval(_theEggTick, 1000);
  } catch (e) { console.error('theegg boot failed', e); }
})();
