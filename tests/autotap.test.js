// ============================================================
//  Auto-Smasher offline simulation — accounting invariants
//  Runs idle.js in a vm sandbox with the real CONFIG/data and stubbed
//  game globals, so the balance rules can be checked without a browser:
//    - nothing is simulated when locked / paused / too short / clock jump
//    - taps never exceed hammers-in (start pool + regen over the window)
//    - the away-time cap is honoured and the remainder gets plain regen
//    - gold is scaled by efficiency, star pieces are not
//    - at most offlineMaxItems new items, never a rare one
//  Run: node --test tests/autotap.test.js
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function makeWorld(over) {
  // Timers must not keep the test process alive (idle.js starts its online loop at boot)
  const unref = fn => (cb, ms) => { const t = fn(cb, ms); if (t && t.unref) t.unref(); return t; };
  const ctx = {
    console, setInterval: unref(setInterval), clearInterval, setTimeout: unref(setTimeout), clearTimeout,
    window: {}, document: { hidden: false, getElementById: () => null },
  };
  vm.createContext(ctx);
  vm.runInContext(read('config.js'), ctx, { filename: 'config.js' });
  vm.runInContext(read('quotes.js'), ctx, { filename: 'quotes.js' });
  vm.runInContext(read('data.js'), ctx, { filename: 'data.js' });
  // Minimal game globals idle.js touches
  vm.runInContext(`
    var DEFAULT_STATE = { autoTap: { unlocked: false, on: false, speedLvl: 0, capLvl: 0, effLvl: 0 } };
    var G = {
      autoTap: { unlocked: true, on: true, speedLvl: 0, capLvl: 0, effLvl: 0 },
      hammers: 50, maxH: 50, fastRegen: false, regenCD: 30, activeMult: 1,
      gold: 0, totalGold: 0, starPieces: 0, totalStarPieces: 0, feathers: 0, totalFeathers: 0,
      crystalBananas: 0, multQueue: [], totalEggs: 0, totalEmpties: 0, totalItems: 0, roundClears: 0,
      autoTapEggs: 0, offlineReports: 0, offlineGold: 0,
      monkeys: [{ stage: 3, collections: [[false, false, false, false, false]] }],
      activeMonkey: 0,
    };
    var _quietRoll = false;
    var _spawningRound = false, _roundPending = false, _rageActive = false;
    var regenCalls = [];
    function applyOfflineRegen(sec) { regenCalls.push(sec); }
    function curActiveStage() { return 0; }
    function curProgress() { return G.monkeys[0]; }
    function curStage() { return { eggs: 3, collection: { items: [['a','A',1],['b','B',1],['c','C',2],['d','D',3],['e','E',1]] } }; }
    function availableEggTypes() { return [{ type: 'normal', weight: 1 }]; }
    function checkCollectionComplete() {}
    function checkAchievements() {}
    function formatNum(n) { return String(n); }
    function $id() { return null; }
    function msg() {} function track() {} function saveGame() {} function updateResources() {}
    function showShopSnack() {} function showAlert() {} function _whenSplashGone(cb) {}
    var SFX = { play() {} };
    function smashEgg() {}
    function rollPrize() { return { type: 'gold', value: 100 }; }
  `, ctx);
  if (over) vm.runInContext(over, ctx);
  vm.runInContext(read('idle.js'), ctx, { filename: 'idle.js' });
  // Script-scoped consts are not sandbox properties — expose the ones the tests read.
  vm.runInContext('this.CONFIG = CONFIG; this.ACHIEVEMENT_DATA = ACHIEVEMENT_DATA; this.SECRET_ACHIEVEMENTS = SECRET_ACHIEVEMENTS;', ctx);
  return ctx;
}

const H = 3600;

test('nothing simulated when locked, paused, too short, or after a clock jump', () => {
  let w = makeWorld('G.autoTap.unlocked = false;');
  assert.equal(w.simulateOffline(H), null);
  w = makeWorld('G.autoTap.on = false;');
  assert.equal(w.simulateOffline(H), null);
  w = makeWorld();
  assert.equal(w.simulateOffline(30), null, 'below offlineMinSeconds');
  assert.equal(w.simulateOffline(31 * 86400), null, 'beyond offlineMaxSeconds');
  assert.equal(w.G.totalEggs, 0);
});

test('taps never exceed hammers-in (start pool + regen over the simulated window)', () => {
  const w = makeWorld();
  const rep = w.simulateOffline(H);
  const regenIn = Math.floor(H / w.CONFIG.regenInterval);
  assert.ok(rep.taps > 0);
  assert.ok(rep.taps <= 50 + regenIn, `taps ${rep.taps} > ${50 + regenIn}`);
  assert.ok(rep.taps <= Math.floor(H / w.CONFIG.autoTap.speed.levels[0]));
  assert.equal(rep.eggs, w.G.totalEggs);
  assert.equal(rep.eggs, w.G.autoTapEggs);
  assert.equal(w.G.offlineReports, 1);
  assert.ok(w.G.hammers >= 0 && w.G.hammers <= 50 + 1, 'pool never goes negative or far above max');
});

test('gold is scaled by efficiency; star pieces are not', () => {
  const w = makeWorld(`
    var n = 0;
    function rollPrize() { n++; return n % 2 ? { type: 'gold', value: 100 } : { type: 'star', value: 2 }; }
  `);
  const rep = w.simulateOffline(H);
  const eff = w.CONFIG.autoTap.efficiency.levels[0];
  assert.ok(eff < 1, 'level-0 efficiency is below 100%');
  const goldEggs = Math.ceil(rep.eggs / 2), starEggs = Math.floor(rep.eggs / 2);
  assert.equal(rep.gold, goldEggs * Math.round(100 * eff));
  assert.equal(rep.stars, starEggs * 2);
  assert.equal(w.G.gold, rep.gold);
  assert.equal(w.G.starPieces, rep.stars);
  assert.equal(w.G.offlineGold, rep.gold);
});

test('away time is capped and the remainder still gets plain hammer regen', () => {
  const w = makeWorld();
  const cap = w.CONFIG.autoTap.offlineCap.levels[0] * H;
  const rep = w.simulateOffline(10 * H);
  assert.equal(rep.simulated, cap);
  assert.equal(rep.capped, true);
  assert.ok(rep.taps <= 50 + Math.floor(cap / w.CONFIG.regenInterval));
  assert.deepEqual(Array.from(w.regenCalls), [10 * H - cap], 'regen credited for the uncapped remainder');
});

test('at most offlineMaxItems new items, never a rare; the rest pay out as duplicates', () => {
  const w = makeWorld(`
    var k = 0;
    // Alternate: new common item, new rare item — indexes cycle through the stage's items
    function rollPrize() {
      k++;
      const rare = k % 2 === 0;
      const idx = rare ? 3 : (k % 3);           // idx 3 is the rare 'D'
      const isNew = !G.monkeys[0].collections[0][idx];
      return { type: 'item', index: idx, isNew, emoji: 'x', name: 'X', rarity: rare ? 3 : 1, goldMult: 1 };
    }
  `);
  const rep = w.simulateOffline(H);
  assert.ok(rep.eggs > 6, 'enough eggs to exercise the cap');
  assert.equal(rep.items.length, w.CONFIG.autoTap.offlineMaxItems);
  assert.ok(rep.items.every(i => i.rarity < 3), 'no rare items offline');
  assert.equal(w.G.monkeys[0].collections[0][3], false, 'the rare slot is untouched');
  assert.equal(w.G.totalItems, rep.items.length);
  assert.ok(rep.dupes > 0 && rep.gold > 0, 'rejected/duplicate items convert to gold');
});

test('faster speed and longer cap levels strictly increase what a long absence yields', () => {
  const base = makeWorld();
  const a = base.simulateOffline(24 * H);
  const up = makeWorld('G.autoTap.speedLvl = 4; G.autoTap.capLvl = 4; G.autoTap.effLvl = 3;');
  const b = up.simulateOffline(24 * H);
  assert.ok(b.taps > a.taps, `${b.taps} > ${a.taps}`);
  assert.ok(b.gold > a.gold);
  assert.equal(b.capped, false);
});

test('shop pricing walks the level tables and returns null when maxed', () => {
  const w = makeWorld();
  assert.equal(w.autoTapPrice('autotap'), null, 'already unlocked');
  assert.equal(w.autoTapPrice('autotap_speed'), w.CONFIG.autoTap.speed.costs[0]);
  w.G.autoTap.speedLvl = w.CONFIG.autoTap.speed.costs.length;
  assert.equal(w.autoTapPrice('autotap_speed'), null);
  w.G.autoTap.capLvl = w.CONFIG.autoTap.offlineCap.costs.length;
  w.G.autoTap.effLvl = w.CONFIG.autoTap.efficiency.costs.length;
  assert.equal(w.autoTapIsMaxed(), true);
});

test('every Auto-Smasher achievement id has a check and no id collides', () => {
  const w = makeWorld();
  const ids = w.ACHIEVEMENT_DATA.concat(w.SECRET_ACHIEVEMENTS).map(a => a.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate achievement id');
  const src = read('achievements.js');
  for (const id of ids.filter(i => i.startsWith('auto_'))) {
    assert.ok(new RegExp('\\b' + id + ':').test(src), 'missing check for ' + id);
  }
});
