// ============================================================
//  Auto-Smasher offline simulation — accounting invariants
//  Runs idle.js in a vm sandbox with the real CONFIG/data and stubbed
//  game globals, so the balance rules can be checked without a browser:
//    - nothing is simulated when locked / paused / too short / clock jump
//    - offline taps are free (bounded by time × speed), the bar regenerates
//    - the away-time cap bounds taps but regen covers the whole absence
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

test('offline taps are free: bounded by time × speed, and the hammer bar is not spent', () => {
  const w = makeWorld('G.hammers = 10;');
  const rep = w.simulateOffline(H);
  assert.equal(rep.taps, Math.floor(H / w.CONFIG.autoTap.speed.levels[0]), 'one tap per speed interval, no hammer limit');
  assert.equal(rep.eggs, w.G.totalEggs);
  assert.equal(rep.eggs, w.G.autoTapEggs);
  assert.equal(w.G.offlineReports, 1);
  assert.deepEqual(Array.from(w.regenCalls), [H], 'plain regen credited for the whole absence');
  assert.ok(w.G.hammers >= 10, 'the smasher never draws the bar down');
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

test('away time is capped for taps, but hammer regen covers the whole absence', () => {
  const w = makeWorld('G.hammers = 5;');
  const cap = w.CONFIG.autoTap.offlineCap.levels[0] * H;
  const rep = w.simulateOffline(10 * H);
  assert.equal(rep.simulated, cap);
  assert.equal(rep.capped, true);
  assert.equal(rep.effective, w.autoTapEffectiveSeconds(cap));
  assert.equal(rep.taps, Math.floor(w.autoTapEffectiveSeconds(cap) / w.CONFIG.autoTap.speed.levels[0]));
  assert.deepEqual(Array.from(w.regenCalls), [10 * H], 'regen for all 10h, not just the capped window');
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

test('away time has diminishing returns: full rate for the first hour, logarithmic after (v3.10.13)', () => {
  const w = makeWorld();
  const full = w.CONFIG.autoTap.offlineFullRateSeconds;
  assert.equal(full, H, 'first hour at full rate');
  assert.equal(w.autoTapEffectiveSeconds(30 * 60), 30 * 60, 'short absences are not tapered');
  assert.equal(w.autoTapEffectiveSeconds(H), H);
  const e4 = w.autoTapEffectiveSeconds(4 * H), e8 = w.autoTapEffectiveSeconds(8 * H), e24 = w.autoTapEffectiveSeconds(24 * H);
  assert.ok(e4 < 2.5 * H && e4 > 2 * H, `4h away ≈ 2.4h of taps, got ${(e4 / H).toFixed(2)}h`);
  assert.ok(e8 > e4 && e24 > e8, 'still monotonic');
  assert.ok(e24 < 4.5 * H, `24h away stays under 4.5h of taps, got ${(e24 / H).toFixed(2)}h`);
  // A 4h absence at max cap pays well under 4× a 1h one.
  const a = makeWorld('G.autoTap.capLvl = 4;').simulateOffline(H);
  const b = makeWorld('G.autoTap.capLvl = 4;').simulateOffline(4 * H);
  assert.ok(b.gold > a.gold && b.gold < 2.6 * a.gold, `${b.gold} vs ${a.gold}`);
  // Efficiency never reaches 100%: offline gold is always a discount on playing.
  assert.ok(Math.max(...w.CONFIG.autoTap.efficiency.levels) < 1);
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

test('idle.js has no top-level let/const (boot-time callers would hit the TDZ and abort the bundle)', () => {
  // v3.4.2 shipped `let _autoTapNextAt` → every player who had unlocked the
  // Auto-Smasher got a blank tray on reload. See CLAUDE.md "Auto-Smasher".
  const offenders = read('idle.js').split('\n').filter(l => /^(let|const)\s/.test(l));
  assert.deepEqual(offenders, []);
});

test('offline gains are quest-credited: the sim cannot progress dailies or weeklies (v3.11.0)', () => {
  const w = makeWorld(`
    var credits = {};
    function questCredit(metric, amount) { if (amount) credits[metric] = (credits[metric] || 0) + amount; }
  `);
  const rep = w.simulateOffline(4 * H);
  assert.ok(rep.eggs > 0 && w.G.totalGold > 0, 'the sim actually produced something');
  assert.equal(w.credits.totalEggs, w.G.totalEggs, 'every offline egg is discounted from quest progress');
  assert.equal(w.credits.totalGold, w.G.totalGold, 'every offline gold is discounted from quest progress');
  assert.equal(w.credits.roundClears, w.G.roundClears, 'offline round clears are discounted too');
  assert.equal(w.credits.offlineReports, undefined,
    'offlineReports is never credited — the "come back to an away report" quest is about this moment');
});
