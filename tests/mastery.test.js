// ============================================================
//  Hammer mastery — XP curve, per-hammer scaling, L5/L10 perks
//  Runs mastery.js in a vm sandbox with the real CONFIG/data.
//  Run: node --test tests/mastery.test.js
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function world(over) {
  const unref = fn => (cb, ms) => { const t = fn(cb, ms); if (t && t.unref) t.unref(); return t; };
  const ctx = { console, setTimeout: unref(setTimeout), setInterval: unref(setInterval), clearTimeout, clearInterval,
    window: {}, document: { querySelector: () => null, getElementById: () => null } };
  vm.createContext(ctx);
  vm.runInContext(read('config.js'), ctx);
  vm.runInContext(read('quotes.js'), ctx);
  vm.runInContext(read('data.js'), ctx);
  vm.runInContext(`
    var G = { hammer: 'golden', ownedHammers: ['default','golden'], hammerXp: {}, hammers: 10, maxH: 50, gold: 0, totalGold: 0, owned_starsaver: false };
    var msgs = []; function msg(t) { msgs.push(t); }
    function $id() { return null; } function formatNum(n) { return String(n); }
    var SFX = { play() {} }; function spawnFloat() {} function checkAchievements() {}
    var Particles = { sparkle() {} };
    function renderShop() {}
  `, ctx);
  if (over) vm.runInContext(over, ctx);
  vm.runInContext(read('mastery.js'), ctx);
  vm.runInContext('this.CONFIG = CONFIG; this.SHOP_HAMMERS = SHOP_HAMMERS;', ctx);
  return ctx;
}

test('levels follow the XP table; only the equipped, owned, non-default hammer trains', () => {
  const w = world();
  const T = w.CONFIG.hammerMastery.xpTable;
  assert.equal(w.hammerLevel('golden'), 1);
  w.addHammerXp(T[1]);           // exactly enough for L2
  assert.equal(w.hammerLevel('golden'), 2);
  w.addHammerXp(T[T.length - 1]);
  assert.equal(w.hammerLevel('golden'), w.CONFIG.hammerMastery.maxLevel, 'caps at max');
  // basic hammer never trains
  w.G.hammer = 'default'; const before = JSON.stringify(w.G.hammerXp);
  w.addHammerXp(500);
  assert.equal(JSON.stringify(w.G.hammerXp), before);
  // an unowned hammer never trains
  w.G.hammer = 'gavel'; w.addHammerXp(500);
  assert.equal(w.hammerXp('gavel'), 0);
});

test('scaling is 0 at L1 and the full configured amount at L10, per hammer', () => {
  const w = world();
  assert.equal(w.hammerBoost('golden', 'goldMult'), 0, 'no bonus before training');
  w.G.hammerXp.golden = w.CONFIG.hammerMastery.xpTable[9];
  assert.equal(w.hammerLevel('golden'), 10);
  assert.equal(w.hammerBoost('golden', 'goldMult'), w.CONFIG.hammerMastery.scale.golden.goldMult);
  // halfway up the levels gives a partial boost
  w.G.hammerXp.golden = w.CONFIG.hammerMastery.xpTable[4];   // L5
  const half = w.hammerBoost('golden', 'goldMult');
  assert.ok(half > 0 && half < w.CONFIG.hammerMastery.scale.golden.goldMult);
  // a hammer you do not own gives nothing even if it has XP
  w.G.hammerXp.gavel = 99999;
  assert.equal(w.hammerBoost('gavel', 'verdict'), 0);
});

test('L10 perks are per hammer and only for owned hammers', () => {
  const w = world();
  assert.equal(w.hammerPerk('golden'), false);
  w.G.hammerXp.golden = w.CONFIG.hammerMastery.xpTable[9];
  assert.equal(w.hammerPerk('golden'), true);
  assert.equal(w.hammerPerk('gavel'), false, 'not owned');
  assert.ok(w.hammerPerkDesc('golden').length > 10);
  w.SHOP_HAMMERS.filter(h => h.cost > 0).forEach(h => assert.ok(w.hammerPerkDesc(h.id), 'every hammer has an L10 perk: ' + h.id));
});

test('mastery stats drive the trophies', () => {
  const w = world("G.ownedHammers = SHOP_HAMMERS.filter(h => h.cost > 0).map(h => h.id).concat('default');");
  let s = w.hammerMasteryStats();
  assert.equal(s.best, 1); assert.equal(s.maxed, 0); assert.equal(s.total, w.SHOP_HAMMERS.filter(h => h.cost > 0).length);
  w.SHOP_HAMMERS.filter(h => h.cost > 0).forEach(h => { w.G.hammerXp[h.id] = w.CONFIG.hammerMastery.xpTable[9]; });
  s = w.hammerMasteryStats();
  assert.equal(s.best, 10); assert.equal(s.maxed, s.total, 'all maxed → Grand Forge');
});

test('xp table is monotonic and matches maxLevel', () => {
  const w = world();
  const T = w.CONFIG.hammerMastery.xpTable;
  assert.equal(T.length, w.CONFIG.hammerMastery.maxLevel);
  for (let i = 1; i < T.length; i++) assert.ok(T[i] > T[i - 1], 'strictly increasing at ' + i);
});

test('mastery.js has no top-level let/const (boot-time TDZ rule)', () => {
  assert.deepEqual(read('mastery.js').split('\n').filter(l => /^(let|const)\s/.test(l)), []);
});
