// ============================================================
//  Quests — deterministic assignment, progress, claim, rollover
//  Runs quests.js in a vm sandbox with the real CONFIG and stubbed globals.
//  Run: node --test tests/quests.test.js
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
  const ctx = { console, setInterval: unref(setInterval), setTimeout: unref(setTimeout), clearInterval, clearTimeout,
    window: {}, document: { querySelector: () => null, getElementById: () => null } };
  vm.createContext(ctx);
  vm.runInContext(read('config.js'), ctx);
  vm.runInContext(`
    var G = { quests: null, questsCompleted: 0, gold: 0, totalGold: 0, feathers: 0, totalFeathers: 0, starPieces: 0, totalStarPieces: 0,
      hammers: 10, maxH: 50, totalEggs: 0, silverSmashed: 0, goldSmashed: 0, totalItems: 0, roundClears: 0, multUsed: 0, hexesHit: 0,
      purchases: 0, crystalSmashed: 0, offlineReports: 0, collectionsCompleted: 0, stagesCompleted: 0, starfallsUsed: 0,
      skillsUnlocked: [false,false,false], autoTap: { unlocked: false }, monkeys: [{unlocked:true}], totalRageUses: 0, totalGooseUses: 0, totalShakeUses: 0 };
    var saves = 0; function saveGame() { saves++; }
    function localDateStr(d) { const t = d || new Date(); return t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0'); }
    function isStarfallUnlocked() { return false; }
    function msg() {} function formatNum(n) { return String(n); } function updateResources() {} function checkAchievements() {}
    var SFX = { play() {} }; function $id() { return null; } function renderFullLog() {}
    // Minimal album so feasibility checks have something to read
    var MONKEY_DATA = [{ stages: [ { collection: { items: [['a','A',1],['b','B',1],['c','C',2]] } }, { collection: { items: [['d','D',1],['e','E',3]] } } ] }];
    G.monkeys = [{ unlocked: true, stage: 1, tiers: [0,0], collections: [[false,false,false],[false,false]] }];
    G.activeMonkey = 0;
  `, ctx);
  if (over) vm.runInContext(over, ctx);
  vm.runInContext(read('quests.js'), ctx);
  vm.runInContext('this.CONFIG = CONFIG;', ctx);
  return ctx;
}

test('boot assigns 5 daily + 3 weekly for today, deterministically, skipping gated templates', () => {
  const a = world(), b = world();
  assert.equal(a.G.quests.daily.length, a.CONFIG.quests.dailyCount);
  assert.equal(a.G.quests.weekly.length, a.CONFIG.quests.weeklyCount);
  assert.equal(new Set(Array.from(a.G.quests.weekly, x => x.id)).size, a.CONFIG.quests.weeklyCount, 'distinct weeklies');
  assert.deepEqual(Array.from(a.G.quests.daily, x => x.id), Array.from(b.G.quests.daily, x => x.id), 'same day → same set');
  const gated = new Set(a.CONFIG.quests.daily.filter(t => t.need).map(t => t.id));
  assert.ok(a.G.quests.daily.every(x => !gated.has(x.id)), 'no starfall/skills/autotap quests before they are unlocked');
  assert.equal(new Set(a.G.quests.daily.map(x => x.id)).size, a.CONFIG.quests.dailyCount, 'distinct');
  const metrics = Array.from(a.G.quests.daily, x => a.questTemplate(x.id).metric);
  assert.equal(new Set(metrics).size, metrics.length, 'no two daily quests on the same counter: ' + metrics);
});

test('progress is the delta since assignment; claim pays once and counts', () => {
  const w = world('G.totalEggs = 500;');   // pre-existing progress must not count
  const q = w.G.quests; const t0 = w.questTemplate(q.daily[0].id);
  assert.equal(w.questProgress(q.daily[0], t0), 0);
  // Push exactly this quest's metric to target
  const m = t0.metric; if (m === 'skillUses') w.G.totalRageUses += t0.target; else w.G[m] += t0.target;
  assert.equal(w.questsClaimable(), 1);
  const gold = w.G.gold, done = w.G.questsCompleted;
  w.claimQuest('daily', 0);
  assert.equal(q.daily[0].claimed, true);
  assert.equal(w.G.questsCompleted, done + 1);
  if (t0.reward.gold) assert.equal(w.G.gold - gold, w.questGoldReward(t0));
  const g2 = w.G.gold; w.claimQuest('daily', 0); assert.equal(w.G.gold, g2, 'no double claim');
  assert.equal(w.questsClaimable(), 0);
});

test('reward gold does not self-progress "earn gold" quests', () => {
  const w = world();
  // force a gold-metric quest into slot 1 for the check
  w.G.quests.daily[1] = { id: 'gold_5000', base: w.G.totalGold, claimed: false };
  const q0 = w.G.quests.daily[0]; const t0 = w.questTemplate(q0.id);
  if (t0.metric === 'totalGold') return;   // (would be a self-test; skip)
  const m = t0.metric; if (m === 'skillUses') w.G.totalRageUses += t0.target; else w.G[m] += t0.target;
  w.claimQuest('daily', 0);
  const tg = w.questTemplate('gold_5000');
  assert.equal(w.questProgress(w.G.quests.daily[1], tg), 0, 'quest gold bumped the baseline');
});

test('day rollover auto-claims completed quests and rolls a fresh set; week key is the Monday', () => {
  const w = world();
  const a = w.G.quests.daily[0]; const t = w.questTemplate(a.id);
  const m = t.metric; if (m === 'skillUses') w.G.totalRageUses += t.target; else w.G[m] += t.target;
  w.G.quests.day = '2000-01-01';
  const gold = w.G.gold, done = w.G.questsCompleted;
  w.ensureQuests();
  assert.equal(w.G.questsCompleted, done + 1, 'auto-claimed');
  if (t.reward.gold) assert.ok(w.G.gold > gold);
  assert.equal(w.G.quests.day, w.questDayKey());
  assert.ok(w.G.quests.daily.every(x => !x.claimed && x.base >= 0));
  const wk = w.questWeekKey(new Date(2026, 7, 20)); // Thu 20 Aug 2026 → Mon 17 Aug
  assert.equal(wk, '2026-08-17');
});

test('gold reward scales with stages completed, capped', () => {
  const w = world();
  const t = w.CONFIG.quests.daily.find(x => x.reward.gold);
  const base = w.questGoldReward(t);
  w.G.stagesCompleted = 10; const mid = w.questGoldReward(t);
  w.G.stagesCompleted = 999; const cap = w.questGoldReward(t);
  assert.ok(mid > base && cap >= mid);
  assert.equal(cap, Math.round(t.reward.gold * (w.CONFIG.quests.goldScaleMax + 1) / 10) * 10);
});

test('quests.js has no top-level let/const (boot-time TDZ rule)', () => {
  assert.deepEqual(read('quests.js').split('\n').filter(l => /^(let|const)\s/.test(l)), []);
});

test('impossible quests are never offered: album fully collected → no item/collection quests', () => {
  const w = world(`
    G.monkeys = [{ unlocked: true, stage: 1, tiers: [3,3], collections: [[true,true,true],[true,true]] }];
  `);
  const ids = Array.from(w.G.quests.daily, a => a.id);
  const cfg = w.CONFIG.quests;
  const byId = id => cfg.daily.find(t => t.id === id);
  assert.ok(ids.every(id => byId(id).metric !== 'totalItems'), 'no "find N items" with a complete album: ' + ids);
  assert.ok(ids.every(id => byId(id).metric !== 'collectionsCompleted'), 'no "complete a collection" either');
  assert.equal(w.questFeasible(byId('items_5')), false);
  assert.equal(w.questFeasible(byId('eggs_60')), true);
});

test('non-gameplay gains do not progress quests (items bought, trophy/daily/quest rewards)', () => {
  const w = world();
  // Force known quests: items, star pieces, gold
  w.G.quests.daily[0] = { id: 'items_5',   base: w.questMetric('totalItems'),      claimed: false };
  w.G.quests.daily[1] = { id: 'stars_10',  base: w.questMetric('totalStarPieces'), claimed: false };
  w.G.quests.daily[2] = { id: 'gold_5000', base: w.questMetric('totalGold'),       claimed: false };
  // Album item bought with feathers (shop.js) — counter goes up, quest must not
  w.G.totalItems += 5;  w.questCredit('totalItems', 5);
  // Trophy reward (achievements.js) / daily login (game.js)
  w.G.totalStarPieces += 10; w.questCredit('totalStarPieces', 10);
  w.G.totalGold += 5000;     w.questCredit('totalGold', 5000);
  assert.equal(w.questsClaimable(), 0, 'nothing became claimable from rewards/purchases');
  // …and real gameplay still counts
  w.G.totalItems += w.questTemplate('items_5').target;
  assert.equal(w.questsClaimable(), 1);
});

test('rollover cannot auto-claim a quest that only "progressed" via credited sources', () => {
  const w = world();
  w.G.quests.daily[0] = { id: 'items_5', base: w.questMetric('totalItems'), claimed: false };
  w.G.totalItems += 5; w.questCredit('totalItems', 5);
  const gold = w.G.gold, done = w.G.questsCompleted;
  w.G.quests.day = '2000-01-01';
  w.ensureQuests();
  assert.equal(w.G.questsCompleted, done, 'no auto-claim');
  assert.equal(w.G.gold, gold);
});

test('legacy save with a single weekly object migrates to an array and tops up to weeklyCount', () => {
  const w = world();
  const t = w.CONFIG.quests.weekly[0];
  w.G.quests.weekly = { id: t.id, base: 0, claimed: false };   // pre-v3.10.0 shape
  w.ensureQuests();
  assert.ok(Array.isArray(w.G.quests.weekly));
  assert.equal(w.G.quests.weekly.length, w.CONFIG.quests.weeklyCount);
  assert.equal(w.G.quests.weekly[0].id, t.id, 'existing weekly kept in slot 0');
  assert.equal(w.questsClaimable(), 0);
});
