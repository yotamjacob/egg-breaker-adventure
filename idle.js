// ============================================================
//  Egg Smash Adventures — Auto-Smasher (idle)
//  idle.js  (bundled after game.js, smash.js, shop.js, achievements.js —
//  its top-level boot block relies on all of them having executed)
//
//  A gold-shop helper that taps eggs for the player using hammers.
//    Online:  a timer taps a random unbroken egg every N seconds through
//             the real smashEgg() path (animations, log, trophies for free).
//    Offline: on return, the same rate is simulated for the away time
//             (capped) and a "While you were away" report is shown.
//  Hammers are the fuel, so idle income is bounded by hammer regen — the
//  same ceiling a present player has. Tuning lives in CONFIG.autoTap.
// ============================================================

// ---------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------
function autoTapState() {
  if (!G.autoTap || typeof G.autoTap !== 'object') G.autoTap = { ...DEFAULT_STATE.autoTap };
  return G.autoTap;
}
function _atLevelVal(track, lvl) {
  const t = CONFIG.autoTap[track];
  return t.levels[Math.max(0, Math.min(lvl | 0, t.levels.length - 1))];
}
function autoTapSecPerTap()  { return _atLevelVal('speed',      autoTapState().speedLvl); }
function autoTapCapSeconds() { return _atLevelVal('offlineCap', autoTapState().capLvl) * 3600; }
function autoTapEfficiency() { return _atLevelVal('efficiency', autoTapState().effLvl); }
function autoTapMaxLevel(track) { return CONFIG.autoTap[track].levels.length - 1; }
function autoTapIsMaxed() {
  const st = autoTapState();
  return st.unlocked
    && st.speedLvl >= autoTapMaxLevel('speed')
    && st.capLvl   >= autoTapMaxLevel('offlineCap')
    && st.effLvl   >= autoTapMaxLevel('efficiency');
}
/** The Auto-Smasher can be bought once Mr. Monkey has reached CONFIG.autoTap.unlockStage. */
function autoTapUnlockAvailable() {
  const mp = G.monkeys && G.monkeys[0];
  return !!mp && (mp.stage || 0) >= CONFIG.autoTap.unlockStage;
}

// Shop entries — rendered into #shop-upgrades by renderShop(), bought via
// buyShopItem('autotap', id). `track` maps to CONFIG.autoTap[track].
// `var`, not `const`: renderShop() first runs during game.js boot, before
// this line executes; a `const` would be in its TDZ there and even `typeof`
// throws — which would abort every top-level statement after it in the
// bundle. `var` hoists as undefined, so that first render just skips it.
var SHOP_AUTOTAP = [
  { id: 'autotap',       emoji: '🤖', name: 'Auto-Smasher',    desc: 'Taps eggs for you — even while you are away' },
  { id: 'autotap_speed', emoji: '⏱️', name: 'Smasher Speed',   track: 'speed',      lvlKey: 'speedLvl', fmt: v => v + 's per tap' },
  { id: 'autotap_cap',   emoji: '🌙', name: 'Away Time',       track: 'offlineCap', lvlKey: 'capLvl',   fmt: v => v + 'h away' },
  { id: 'autotap_eff',   emoji: '💰', name: 'Away Efficiency', track: 'efficiency', lvlKey: 'effLvl',   fmt: v => Math.round(v * 100) + '% away gold' },
];

/** Price of the next step for a SHOP_AUTOTAP id, or null when maxed/unlocked already. */
function autoTapPrice(id) {
  const st = autoTapState();
  if (id === 'autotap') return st.unlocked ? null : CONFIG.autoTap.unlockCost;
  const item = SHOP_AUTOTAP.find(s => s.id === id);
  if (!item || !item.track) return null;
  const lvl = st[item.lvlKey] | 0;
  const costs = CONFIG.autoTap[item.track].costs;
  return lvl < costs.length ? costs[lvl] : null;
}

/** Called from doBuyShopItem('autotap', id). Returns true when a purchase happened. */
function buyAutoTapUpgrade(id) {
  const st = autoTapState();
  const item = SHOP_AUTOTAP.find(s => s.id === id);
  if (!item) return false;
  if (id === 'autotap') {
    if (st.unlocked) { showShopSnack('Already purchased!'); return false; }
    if (!autoTapUnlockAvailable()) { showShopSnack('Reach Mr. Monkey stage ' + (CONFIG.autoTap.unlockStage + 1) + ' first!'); SFX.play('err'); return false; }
  } else if (!st.unlocked) {
    showShopSnack('Unlock the Auto-Smasher first!'); SFX.play('err'); return false;
  }
  const price = autoTapPrice(id);
  if (price == null) { showShopSnack('Already maxed!'); return false; }
  if (G.gold < price) { showAlert('🪙', 'Need ' + formatNum(price) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return false; }
  G.gold -= price;
  G.purchases = (G.purchases || 0) + 1;
  track('shop-purchase', { item: item.name, category: 'autotap' });
  if (id === 'autotap') {
    st.unlocked = true;
    st.on = true;
    showShopSnack('Auto-Smasher unlocked — it is tapping for you!');
    msg('🤖 Auto-Smasher online. Tap the robot in the tray to pause it.', 'specials');
  } else {
    st[item.lvlKey] = (st[item.lvlKey] | 0) + 1;
    G.autoTapUpgrades = (G.autoTapUpgrades || 0) + 1;
    showShopSnack(item.name + ' → ' + item.fmt(_atLevelVal(item.track, st[item.lvlKey])));
  }
  SFX.play('buy');
  startAutoTap();   // picks up the new rate / state (no-op when off)
  updateAutoBtn();
  return true;
}

// ---------------------------------------------------------------
// Online loop
// ---------------------------------------------------------------
let _autoTapTimer = null;
let _autoTapUiTimer = null;
let _autoTapNextAt = 0;     // ms timestamp of the next scheduled tap (for the pill countdown)

function startAutoTap() {
  stopAutoTap();
  const st = autoTapState();
  if (!st.unlocked || !st.on) return;
  const ms = autoTapSecPerTap() * 1000;
  _autoTapNextAt = Date.now() + ms;
  _autoTapTimer = setInterval(_autoTapTick, ms);
  _autoTapUiTimer = setInterval(_autoTapCountdown, 250);
  _autoTapCountdown();
}
function stopAutoTap() {
  if (_autoTapTimer)   { clearInterval(_autoTapTimer);   _autoTapTimer = null; }
  if (_autoTapUiTimer) { clearInterval(_autoTapUiTimer); _autoTapUiTimer = null; }
  _autoTapNextAt = 0;
  _autoTapCountdown();
}
/** Pill countdown: seconds until the next scheduled tap. */
function _autoTapCountdown() {
  const el = $id('auto-btn-cd');
  if (!el) return;
  if (!_autoTapNextAt) { el.textContent = ''; return; }
  const s = Math.max(0, Math.ceil((_autoTapNextAt - Date.now()) / 1000));
  el.textContent = s + 's';
}
function _autoTapTick() {
  _autoTapNextAt = Date.now() + autoTapSecPerTap() * 1000;
  try {
    const st = autoTapState();
    if (!st.unlocked || !st.on) { stopAutoTap(); return; }
    if (document.hidden) return;
    if (typeof _rageActive !== 'undefined' && _rageActive) return;
    if (_spawningRound || _roundPending) return;
    if (G.hammers < 1 || !G.roundEggs) return;
    const idxs = [];
    G.roundEggs.forEach((e, i) => {
      if (!e.broken && !e.expired && !e._smashing && !(e.effects || []).includes('balloon')) idxs.push(i);
    });
    if (!idxs.length) return;
    const before = G.totalEggs;
    smashEgg(idxs[Math.floor(Math.random() * idxs.length)]);
    if (G.totalEggs > before) G.autoTapEggs = (G.autoTapEggs || 0) + (G.totalEggs - before);
  } catch (e) { /* never let the idle loop take the game down */ }
}

function toggleAutoTap() {
  const st = autoTapState();
  if (!st.unlocked) return;
  st.on = !st.on;
  if (st.on) startAutoTap(); else stopAutoTap();
  updateAutoBtn();
  msg(st.on ? '🤖 Auto-Smasher on' : '🤖 Auto-Smasher paused', 'specials');
  SFX.play('buy');
  saveGame();
}

function updateAutoBtn() {
  const btn = $id('auto-btn');
  if (!btn) return;
  const st = autoTapState();
  if (!st.unlocked) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden');
  btn.classList.toggle('on', !!st.on);
  const txt = $id('auto-btn-txt');
  if (txt) txt.textContent = st.on ? 'AUTO ON' : 'AUTO OFF';
  _autoTapCountdown();
  btn.title = st.on
    ? 'Auto-Smasher: on (a tap every ' + autoTapSecPerTap() + 's) — tap to pause'
    : 'Auto-Smasher: paused — tap to resume';
}

// ---------------------------------------------------------------
// Offline simulation
// ---------------------------------------------------------------
/**
 * Simulate what the Auto-Smasher would have done during `elapsedSec` away.
 * Mutates G (gold, items, counters, hammer pool) and returns a summary for
 * the report, or null when nothing should be simulated (locked, paused,
 * too short, absurd clock jump).
 *
 * The hammer pool is walked tap by tap: regen accrues at the live rate but
 * only while below maxH, exactly as it would have with a player present.
 * Regen for any time beyond the cap is credited afterwards via
 * applyOfflineRegen(), so a capped absence never loses plain regen.
 *
 * `deps` (tests only): { rng, rollPrize }.
 */
function simulateOffline(elapsedSec, deps) {
  deps = deps || {};
  const rng = deps.rng || Math.random;
  const roll = deps.rollPrize || rollPrize;
  const cfg = CONFIG.autoTap;
  const st = autoTapState();
  if (!st.unlocked || !st.on) return null;
  if (!(elapsedSec >= cfg.offlineMinSeconds) || elapsedSec > cfg.offlineMaxSeconds) return null;

  const capSec = autoTapCapSeconds();
  const simSec = Math.min(elapsedSec, capSec);
  const secPerTap = autoTapSecPerTap();
  const regen = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
  const eff = autoTapEfficiency();
  const si = curActiveStage();
  const stage = curStage();
  const prog = curProgress();
  const types = availableEggTypes(si, true);
  const totalW = types.reduce((s, t) => s + t.weight, 0);
  const pickType = () => {
    let r = rng() * totalW;
    for (const t of types) { r -= t.weight; if (r <= 0) return t.type; }
    return 'normal';
  };
  const newEggs = () => Array.from({ length: stage.eggs }, () => { const t = pickType(); return { type: t, hp: EGG_HP[t] || 1 }; });

  const sum = {
    elapsed: elapsedSec, simulated: simSec, capped: elapsedSec > capSec,
    taps: 0, eggs: 0, roundClears: 0, empties: 0,
    gold: 0, stars: 0, feathers: 0, hammers: 0, mults: 0, bananas: 0, maxH: 0,
    items: [], dupes: 0, efficiency: eff,
  };
  const pool = { h: G.hammers };
  let eggs = newEggs();
  let regenAcc = 0;
  const nTaps = Math.floor(simSec / secPerTap);
  const savedMult = G.activeMult;
  G.activeMult = 1;           // no multipliers while away
  _quietRoll = true;
  try {
    for (let k = 0; k < nTaps; k++) {
      regenAcc += secPerTap / regen;
      const whole = Math.floor(regenAcc);
      if (whole > 0) { regenAcc -= whole; if (pool.h < G.maxH) pool.h = Math.min(G.maxH, pool.h + whole); }
      if (pool.h < 1) continue;
      pool.h -= 1;
      sum.taps++;
      const egg = eggs.find(e => e.hp > 0);
      egg.hp -= 1;
      if (egg.hp > 0) continue;
      sum.eggs++;
      G.totalEggs++;
      G.autoTapEggs = (G.autoTapEggs || 0) + 1;
      _countEggType(egg.type);
      _applyPrizeQuiet(roll(egg.type), egg.type, sum, pool, prog, si, cfg, eff, rng);
      if (eggs.every(e => e.hp <= 0)) { sum.roundClears++; G.roundClears++; eggs = newEggs(); }
    }
  } finally {
    G.activeMult = savedMult;
    _quietRoll = false;
  }
  G.hammers = pool.h;
  G.regenCD = regen;
  if (elapsedSec > simSec && G.hammers < G.maxH) applyOfflineRegen(elapsedSec - simSec);
  G.offlineReports = (G.offlineReports || 0) + 1;
  G.offlineGold = (G.offlineGold || 0) + sum.gold;
  if (typeof checkCollectionComplete === 'function') checkCollectionComplete(true);
  if (typeof checkAchievements === 'function') checkAchievements();
  return sum;
}

function _countEggType(type) {
  if (type === 'silver')  G.silverSmashed  = (G.silverSmashed  || 0) + 1;
  if (type === 'gold')    G.goldSmashed    = (G.goldSmashed    || 0) + 1;
  if (type === 'crystal') G.crystalSmashed = (G.crystalSmashed || 0) + 1;
  if (type === 'ruby')    G.rubySmashed    = (G.rubySmashed    || 0) + 1;
  if (type === 'black')   G.blackSmashed   = (G.blackSmashed   || 0) + 1;
}

/** applyPrize() without DOM/SFX; gold is scaled by `eff`, prize hammers refuel the pool. */
function _applyPrizeQuiet(prize, eggType, sum, pool, prog, si, cfg, eff, rng) {
  if (!prize) return;
  const addGold = v => { v = Math.round(v * eff); if (v <= 0) return; G.gold += v; G.totalGold += v; sum.gold += v; };
  switch (prize.type) {
    case 'empty':      G.totalEmpties = (G.totalEmpties || 0) + 1; sum.empties++; break;
    case 'gold':       addGold(prize.value); break;
    case 'star':       G.starPieces += prize.value; G.totalStarPieces += prize.value; sum.stars += prize.value; break;
    case 'feather':    G.feathers += prize.value; G.totalFeathers += prize.value; sum.feathers += prize.value; break;
    case 'hammers':    pool.h += prize.value; sum.hammers += prize.value; break;
    case 'mult':
      if (G.multQueue.length < 50) { G.multQueue.push(prize.value); G.multDropped = (G.multDropped || 0) + 1; sum.mults++; }
      break;
    case 'banana':     G.crystalBananas += 1; sum.bananas++; break;
    case 'maxHammers': G.maxH += prize.value; sum.maxH += prize.value; break;
    case 'item': {
      const canKeep = prize.isNew
        && sum.items.length < cfg.offlineMaxItems
        && (cfg.offlineAllowRare || prize.rarity < 3);
      if (canKeep) {
        prog.collections[si][prize.index] = true;
        G.totalItems++;
        sum.items.push({ emoji: prize.emoji, name: prize.name, rarity: prize.rarity });
      } else {
        // Duplicate (or an item the sim may not hand out) → gold, as online
        const dRange = (CONFIG.duplicateGoldByRarity || {})[prize.rarity] || [20, 60];
        const dupe = Math.round((dRange[0] + Math.floor(rng() * (dRange[1] - dRange[0] + 1))) * (prize.goldMult || 1));
        addGold(dupe);
        sum.dupes++;
      }
      break;
    }
    default: break;
  }
}

// ---------------------------------------------------------------
// "While you were away" report
// ---------------------------------------------------------------
function _fmtAway(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + m + 'm';
  return Math.max(1, m) + 'm';
}

function showOfflineReport(sum) {
  const ov = $id('overlay-offline');
  if (!ov || !sum || sum.taps <= 0) return;
  $id('offline-time').textContent = 'Away ' + _fmtAway(sum.elapsed)
    + (sum.capped ? ' — smashed for the first ' + _fmtAway(sum.simulated) : '');
  const rows = [];
  const row = (icon, label, val) => rows.push('<div class="offline-row"><span class="offline-ic">' + icon + '</span><span class="offline-lbl">' + label + '</span><strong class="offline-val">' + val + '</strong></div>');
  row('🥚', 'Eggs smashed', formatNum(sum.eggs));
  if (sum.gold)     row('🪙', 'Gold', '+' + formatNum(sum.gold));
  if (sum.stars)    row('⭐', 'Star pieces', '+' + sum.stars);
  if (sum.feathers) row('🪶', 'Feathers', '+' + sum.feathers);
  if (sum.hammers)  row('🔨', 'Hammers found', '+' + sum.hammers);
  if (sum.mults)    row('✖️', 'Multipliers', '+' + sum.mults);
  if (sum.bananas)  row('🍌', 'Crystal bananas', '+' + sum.bananas);
  if (sum.maxH)     row('🔨', 'Max hammers', '+' + sum.maxH);
  if (sum.items.length) {
    row('📦', 'New items', sum.items.map(i => i.emoji).join(' '));
  }
  $id('offline-rows').innerHTML = rows.join('');
  const hint = $id('offline-hint');
  if (hint) {
    hint.textContent = autoTapIsMaxed()
      ? 'The Auto-Smasher is fully upgraded.'
      : 'Upgrade the Auto-Smasher in the Shop to earn more while away.';
  }
  ov.classList.remove('hidden');
  SFX.play('achieve');
}

// ---------------------------------------------------------------
// Boot: simulate the absence recorded by game.js, then start the loop.
// game.js leaves the hammer pool untouched when it knows this will run.
// ---------------------------------------------------------------
(function _idleBoot() {
  try {
    if (typeof _bootElapsedSec === 'number' && _bootElapsedSec > 0) {
      const rep = simulateOffline(_bootElapsedSec);
      if (rep && rep.taps > 0) {
        saveGame();
        updateResources();
        _whenSplashGone(() => showOfflineReport(rep));
      }
    }
  } catch (e) { console.error('idle boot failed', e); }
  startAutoTap();
})();
