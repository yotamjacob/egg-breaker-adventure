// ============================================================
//  The Egg (theegg.js) + legend stages (v3.12.0) — invariants
//  vm sandboxes with the real CONFIG/data, no browser:
//    The Egg
//    - unlock gate, state repair, price curve, buy rules
//    - shards per hit (not per damage), layer overflow, layer rewards
//    - layer gold never progresses "earn gold" quests
//    - blessings granted once each, capped totals, theEggBonus sums
//    - away mode: 10% pace while closed (play or app shut), capped, clock-safe
//    - pacing guard: no snowball (layer 50 is far away), no wall at the start
//    Legend stages (functions extracted from the real game.js)
//    - data shape: one legend stage per monkey, last; 59 stages / 400 items
//    - migrateSave: old saves get padded tiers, and the new stage opens only
//      where the old last stage had reached gold tier; `completed` untouched
//    - completion: legend stages never gate or re-trigger monkey completion
//  Run: node --test tests/theegg.test.js
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** Source of top-level `function name(...) {...}` from a file (brace matching, strings/comments aware). */
function extractFn(src, name) {
  const start = src.search(new RegExp('^function ' + name + '\\(', 'm'));
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error('unbalanced: ' + name);
}

function baseCtx() {
  const unref = fn => (cb, ms) => { const t = fn(cb, ms); if (t && t.unref) t.unref(); return t; };
  const ctx = {
    console, Math, Date, JSON,
    setInterval: unref(setInterval), clearInterval, setTimeout: unref(setTimeout), clearTimeout,
    window: { addEventListener() {} }, performance: { now: () => 0 },
    document: { hidden: false, getElementById: () => null, querySelector: () => null, addEventListener() {} },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  };
  vm.createContext(ctx);
  vm.runInContext(read('config.js'), ctx, { filename: 'config.js' });
  vm.runInContext(read('quotes.js'), ctx, { filename: 'quotes.js' });
  vm.runInContext(read('data.js'), ctx, { filename: 'data.js' });
  return ctx;
}

// ---------------------------------------------------------------
// The Egg
// ---------------------------------------------------------------
function eggWorld(over) {
  const ctx = baseCtx();
  vm.runInContext(`
    var G = {
      monkeys: MONKEY_DATA.map((m, i) => ({ unlocked: i === 0, stage: i === 0 ? 7 : 0 })),
      gold: 0, totalGold: 0, hammers: 50, maxH: 50, stagesCompleted: 0,
      eggLayers: 0, eggCatches: 0, theEgg: null,
    };
    var regenInt = 1, _regenPauseTimer = null;
    var credits = []; function questCredit(m, a) { credits.push([m, a]); }
    var msgs = []; function msg(t) { msgs.push(t); }
    function $id() { return null; }
    function formatNum(n) { return String(Math.floor(n)); }
    function saveGame() {} function updateResources() {} function checkAchievements() {}
    function showAlert() {} function showShopSnack() {} function showConfirm() {} function track() {}
    function startRegen() {} function smashEgg() {}
    var SFX = { play() {} };
  `, ctx);
  if (over) vm.runInContext(over, ctx);
  vm.runInContext(read('theegg.js'), ctx, { filename: 'theegg.js' });
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);

test('The Egg unlocks at Mr. Monkey stage index CONFIG.theEgg.unlockStage', () => {
  const ctx = eggWorld();
  const need = run(ctx, 'CONFIG.theEgg.unlockStage');
  run(ctx, `G.monkeys[0].stage = ${need - 1}`);
  assert.equal(run(ctx, 'theEggUnlocked()'), false);
  run(ctx, `G.monkeys[0].stage = ${need}`);
  assert.equal(run(ctx, 'theEggUnlocked()'), true);
  assert.ok(need >= 5, 'unlock sits towards the end of Mr. Monkey, not at the start');
});

test('theEggState repairs corrupt or missing fields', () => {
  const ctx = eggWorld(`G.theEgg = { layer: -3, hp: NaN, shards: Infinity, lv: { swarm: 999, power: -2, wings: '7' }, blessed: 'x', trickleAt: null };`);
  const st = run(ctx, 'theEggState()');
  assert.equal(st.layer, 1);
  assert.equal(st.hp, run(ctx, 'theEggLayerHp(1)'));
  assert.equal(st.shards, 0);
  assert.equal(st.lv.swarm, run(ctx, 'CONFIG.theEgg.upgrades.swarm.max'));
  assert.equal(st.lv.power, 0);
  assert.equal(st.lv.wings, 0);
  assert.equal(st.lv.magnet, 0);
  assert.deepEqual(Array.from(st.blessed), []);
  assert.ok(Number.isFinite(st.trickleAt), 'clock repaired (boot then starts away mode from it)');
  // Arrays are not a valid state either
  run(ctx, 'G.theEgg = []');
  assert.equal(run(ctx, 'Array.isArray(theEggState())'), false);
});

test('upgrade prices follow base × growth^level; buying deducts and respects max', () => {
  const ctx = eggWorld();
  const U = run(ctx, 'CONFIG.theEgg.upgrades');
  run(ctx, 'theEggState().shards = 1e12');
  for (const k of Object.keys(U)) {
    for (let l = 0; l < 3; l++) {
      const want = Math.round(U[k].base * Math.pow(U[k].growth, l));
      assert.equal(run(ctx, `theEggPrice('${k}')`), want, k + ' L' + l);
      const before = run(ctx, 'theEggState().shards');
      assert.equal(run(ctx, `theEggBuy('${k}')`), true);
      assert.equal(run(ctx, 'theEggState().shards'), before - want);
    }
  }
  run(ctx, `theEggState().lv.luck = CONFIG.theEgg.upgrades.luck.max`);
  assert.equal(run(ctx, `theEggBuy('luck')`), false, 'maxed upgrade cannot be bought');
  run(ctx, 'theEggState().shards = 0');
  assert.equal(run(ctx, `theEggBuy('power')`), false, 'cannot buy without shards');
  assert.equal(run(ctx, `theEggBuy('nope')`), false);
});

test('shards come per hit (plus a small damage share), taps pay more than flyers', () => {
  const ctx = eggWorld();
  const C = run(ctx, 'CONFIG.theEgg');
  run(ctx, 'theEggState()');
  run(ctx, 'theEggHit(1, false)');
  assert.ok(Math.abs(run(ctx, 'G.theEgg.shards') - (C.shardsPerHit + C.damageShare)) < 1e-9);
  run(ctx, 'G.theEgg.shards = 0; theEggHit(1, true)');
  assert.ok(Math.abs(run(ctx, 'G.theEgg.shards') - (C.shardsPerTap + C.damageShare)) < 1e-9);
  run(ctx, 'G.theEgg.shards = 0; theEggHit(1, false, 2)');
  assert.ok(Math.abs(run(ctx, 'G.theEgg.shards') - 2 * (C.shardsPerHit + C.damageShare)) < 1e-9, 'Golden Hour doubles');
  // Damage share stays small: a huge hit must not pay its damage in shards
  run(ctx, 'G.theEgg.shards = 0; G.theEgg.hp = 1e12; theEggHit(1e6, false)');
  assert.ok(run(ctx, 'G.theEgg.shards') <= 1e6 * 0.05);
  assert.equal(run(ctx, 'theEggHit(NaN, false)'), 0);
  assert.equal(run(ctx, 'theEggHit(-5, false)'), 0);
});

test('clearing a layer carries overflow, pays gold and credits it away from quests', () => {
  const ctx = eggWorld();
  const hp1 = run(ctx, 'theEggLayerHp(1)'), hp2 = run(ctx, 'theEggLayerHp(2)');
  const cleared = run(ctx, `theEggHit(${hp1 + 10}, false)`);
  assert.equal(cleared, 1);
  assert.equal(run(ctx, 'G.theEgg.layer'), 2);
  assert.equal(run(ctx, 'G.theEgg.hp'), hp2 - 10);
  assert.equal(run(ctx, 'G.eggLayers'), 1);
  const gold = run(ctx, 'theEggLayerGold(1)');
  assert.ok(gold > 0);
  assert.equal(run(ctx, 'G.gold'), gold);
  assert.equal(run(ctx, 'G.totalGold'), gold);
  assert.deepEqual(JSON.parse(run(ctx, 'JSON.stringify(credits)')), [['totalGold', gold]],
    'layer gold must be questCredit()-ed so "earn gold" quests do not progress');
  // A layer pays no main-game hammers
  assert.equal(run(ctx, 'G.hammers'), 50);
});

test('blessings: one each, granted when their layer comes off, capped totals', () => {
  const ctx = eggWorld();
  const B = run(ctx, 'CONFIG.theEgg.blessings');
  const sum = t => B.filter(b => b.type === t).reduce((a, b) => a + b.val, 0);
  assert.equal(sum('maxH'), 25);
  assert.equal(sum('goldPct'), 30);
  assert.equal(sum('itemPct'), 10);
  assert.equal(sum('regenSec'), 4);
  assert.equal(sum('starfall'), 1);
  assert.equal(new Set(B.map(b => b.layer)).size, B.length, 'one blessing per layer');
  // Walk to layer 5: exactly one +10 max hammers
  for (let n = 1; n <= 5; n++) run(ctx, 'theEggHit(G.theEgg ? G.theEgg.hp : theEggLayerHp(1), false)');
  assert.equal(run(ctx, 'G.theEgg.layer'), 6);
  assert.equal(run(ctx, 'G.maxH'), 60);
  assert.equal(run(ctx, 'G.hammers'), 60);
  // Idempotent: granting again does nothing
  run(ctx, '_theEggGrantBlessings(); _theEggGrantBlessings();');
  assert.equal(run(ctx, 'G.maxH'), 60);
  assert.equal(run(ctx, 'theEggBonus("goldPct")'), 0);
  // Jump far ahead: everything granted once, sums equal the caps
  run(ctx, 'G.theEgg.layer = 60; _theEggGrantBlessings();');
  assert.equal(run(ctx, 'G.maxH'), 75);
  assert.equal(run(ctx, 'theEggBonus("goldPct")'), 30);
  assert.equal(run(ctx, 'theEggBonus("itemPct")'), 10);
  assert.equal(run(ctx, 'theEggBonus("regenSec")'), 4);
  assert.equal(run(ctx, 'theEggBonus("starfall")'), 1);
  assert.equal(run(ctx, 'theEggBonus("swarmVisit")'), 1);
  assert.equal(run(ctx, 'G.theEgg.blessed.length'), B.length);
});

test('theEggBonus is safe before The Egg exists', () => {
  const ctx = eggWorld();
  run(ctx, 'G.theEgg = null');
  assert.equal(run(ctx, 'theEggBonus("goldPct")'), 0);
  run(ctx, 'G.theEgg = { blessed: "bad" }');
  assert.equal(run(ctx, 'theEggBonus("goldPct")'), 0);
});

test('away mode: the closed Egg works at a tenth of the passive pace, capped and clock-safe', () => {
  const ctx = eggWorld();
  const A = run(ctx, 'CONFIG.theEgg.away');
  assert.equal(A.speed, 0.1);
  const t0 = 1_700_000_000_000;
  assert.equal(run(ctx, `theEggCreditAway(${t0})`), null, 'first call only starts the clock');
  assert.equal(run(ctx, `theEggCreditAway(${t0 + (A.minSeconds - 1) * 1000})`), null, 'too short');
  assert.equal(run(ctx, 'G.theEgg.trickleAt'), t0, 'a short gap keeps accumulating');
  const inc = run(ctx, 'theEggPassiveIncome()'), dps = run(ctx, 'theEggPassiveDps()');
  const hp0 = run(ctx, 'G.theEgg.hp');
  const r = run(ctx, `theEggCreditAway(${t0 + 3600e3})`);
  assert.ok(Math.abs(r.shards - inc * A.speed * 3600) < 1e-6, 'shards = passive income × speed × time');
  assert.ok(Math.abs((hp0 - run(ctx, 'G.theEgg.hp')) - dps * A.speed * 3600) < 1e-6, 'the shell takes passive damage × speed × time');
  run(ctx, `G.theEgg.trickleAt = ${t0}`);
  const week = run(ctx, `theEggCreditAway(${t0 + 7 * 86400e3})`);
  assert.equal(week.sec, A.capHours * 3600, 'capped per absence');
  run(ctx, `G.theEgg.trickleAt = ${t0 + 3600e3}`);
  assert.equal(run(ctx, `theEggCreditAway(${t0})`), null, 'clock went backwards');
  assert.equal(run(ctx, 'G.theEgg.trickleAt'), t0, 'clock reset to now');
});

test('away mode clears layers like play does: gold (kept out of quests), totals for the banner', () => {
  const ctx = eggWorld();
  const t0 = 1_700_000_000_000;
  // a strong swarm so 8 h at 10% pace breaks a few layers
  run(ctx, `theEggState(); G.theEgg.lv.swarm = 10; G.theEgg.lv.power = 12; G.theEgg.lv.wings = 10; G.theEgg.trickleAt = ${t0}`);
  const r = run(ctx, `theEggCreditAway(${t0 + 8 * 3600e3})`);
  assert.ok(r.layers >= 1, 'layers came off (' + r.layers + ')');
  assert.equal(run(ctx, 'G.theEgg.layer'), 1 + r.layers);
  assert.equal(run(ctx, 'G.eggLayers'), r.layers);
  assert.ok(r.gold > 0 && run(ctx, 'G.gold') === r.gold);
  const credited = JSON.parse(run(ctx, 'JSON.stringify(credits)')).filter(c => c[0] === 'totalGold').reduce((a, c) => a + c[1], 0);
  assert.equal(credited, r.gold, 'all away gold is questCredit()-ed');
  assert.equal(run(ctx, 'G.eggCatches'), 0, 'no events while away');
  const acc = run(ctx, 'G.theEgg.away');
  assert.equal(acc.layers, r.layers);
  assert.ok(Math.abs(acc.shards - r.shards) < 1e-6);
  // much slower than playing: an hour away < 15% of an hour of the swarm alone
  run(ctx, `G.theEgg.trickleAt = ${t0}`);
  const hour = run(ctx, `theEggCreditAway(${t0 + 3600e3})`);
  assert.ok(hour.shards < run(ctx, 'theEggPassiveIncome()') * 3600 * 0.15);
});

test('pacing: the first blessing comes quickly, layer 50 stays far away', () => {
  const ctx = eggWorld();
  // Greedy buyer on the real functions, 1.5 taps/s, no events.
  const result = run(ctx, `(() => {
    const keys = Object.keys(CONFIG.theEgg.upgrades).filter(k => k !== 'magnet');
    const tps = 1.5; let t = 0, at5 = 0;
    for (; t < 7200; t++) {
      for (;;) {
        let best = null, bestP = Infinity;
        for (const k of keys) { if (theEggMaxed(k)) continue; const p = theEggPrice(k); if (p <= theEggState().shards && p < bestP) { bestP = p; best = k; } }
        if (!best || !theEggBuy(best)) break;
      }
      const s = theEggStats();
      const flyerDmg = s.swarm / s.swing * s.dmg * (1 + s.crit * (s.critMult - 1));
      const hits = s.swarm / s.swing;
      for (let i = 0; i < Math.round(hits); i++) theEggHit(flyerDmg / Math.max(1, Math.round(hits)), false);
      theEggHit(tps * s.dmg * s.tapMult, true);
      if (!at5 && G.theEgg.layer > 5) at5 = t;
    }
    return { at5, layer: G.theEgg.layer };
  })()`);
  assert.ok(result.at5 > 4 * 60 && result.at5 < 30 * 60, 'layer 5 in 4–30 minutes (got ' + result.at5 + 's)');
  assert.ok(result.layer < 50, 'layer 50 must not fall within 2 hours (got layer ' + result.layer + ')');
});

test('theegg.js has no top-level let/const (boot-time callers would hit the TDZ)', () => {
  const offenders = read('theegg.js').split('\n').filter(l => /^(let|const)\s/.test(l));
  assert.deepEqual(offenders, []);
});

test('build bundles theegg.js after idle.js', () => {
  const src = read('build.js');
  const i = src.indexOf("'idle.js'"), e = src.indexOf("'theegg.js'");
  assert.ok(i > 0 && e > i);
});

test('egg quests count eggCatches, are gated on The Egg, and need is understood', () => {
  const ctx = baseCtx();
  const all = run(ctx, 'CONFIG.quests.daily.concat(CONFIG.quests.weekly)').filter(q => q.need === 'theegg');
  assert.ok(all.length >= 2);
  for (const q of all) assert.equal(q.metric, 'eggCatches');
  assert.match(read('quests.js'), /need === 'theegg'/);
});

// ---------------------------------------------------------------
// Legend stages
// ---------------------------------------------------------------
test('every monkey has exactly one legend stage, and it is the last', () => {
  const ctx = baseCtx();
  const MD = JSON.parse(run(ctx, 'JSON.stringify(MONKEY_DATA)'));
  let stages = 0, items = 0;
  for (const m of MD) {
    const idx = m.stages.map((s, i) => s.legend ? i : -1).filter(i => i >= 0);
    assert.deepEqual(Array.from(idx), [m.stages.length - 1], m.id);
    stages += m.stages.length;
    for (const s of m.stages) for (const it of s.collection.items) { items++; assert.ok(it[3], m.id + ': quote for ' + it[1]); }
    const leg = m.stages[m.stages.length - 1];
    assert.ok(leg.collection.items.filter(i => i[2] === 3).length >= 2, m.id + ' legend has rares');
  }
  assert.equal(stages, 59);
  assert.equal(items, 400);
});

function legendWorld() {
  const ctx = baseCtx();
  const src = read('game.js');
  vm.runInContext(`
    var DEFAULT_STATE = { autoTap: {} };
    function savePremium() {}
    var G = null;
  `, ctx);
  for (const fn of ['initMonkeys', 'migrateSave', 'isLegendStage', 'coreStagesDone', 'legendStagesCompleted'])
    vm.runInContext(extractFn(src, fn), ctx);
  return ctx;
}
/** A pre-3.12 save: tiers/collections sized to the OLD stage counts. */
function oldMonkeys(ctx) {
  return run(ctx, `MONKEY_DATA.map((m, i) => {
    const n = m.stages.length - 1;   // legend stage did not exist
    return { unlocked: i === 0, stage: 0, activeStage: 0, completed: false,
      tiers: Array(n).fill(0), collections: m.stages.slice(0, n).map(s => s.collection.items.map(() => false)) };
  })`);
}

test('migrateSave: completed monkey → tiers/collections padded, legend stage opens, completed stays', () => {
  const ctx = legendWorld();
  const mons = oldMonkeys(ctx);
  mons[0] = { ...mons[0], stage: 8, activeStage: 8, completed: true, tiers: Array(9).fill(3),
    collections: mons[0].collections.map(c => c.map(() => true)) };
  ctx.G = { monkeys: mons, activeMonkey: 0 };
  run(ctx, 'migrateSave(G)');
  const mp = run(ctx, 'G.monkeys[0]');
  assert.equal(mp.tiers.length, 10);
  assert.equal(mp.tiers[9], 0);
  assert.equal(mp.collections.length, 10);
  assert.equal(mp.collections[9].length, 8);
  assert.ok(mp.collections[9].every(x => x === false));
  assert.equal(mp.stage, 9, 'legend stage unlocked');
  assert.equal(mp.activeStage, 8, 'player stays where they were');
  assert.equal(mp.completed, true, 'never un-complete a monkey');
  assert.equal(run(ctx, 'coreStagesDone(MONKEY_DATA[0], G.monkeys[0])'), true);
});

test('migrateSave: in-progress monkeys are only padded, never advanced', () => {
  const ctx = legendWorld();
  const mons = oldMonkeys(ctx);
  mons[0] = { ...mons[0], stage: 4, activeStage: 4, tiers: [3, 3, 3, 3, 1, 0, 0, 0, 0] };
  mons[1] = { ...mons[1], unlocked: true, stage: 8, activeStage: 8, tiers: [3, 3, 3, 3, 3, 3, 3, 3, 1] };
  ctx.G = { monkeys: mons, activeMonkey: 0 };
  run(ctx, 'migrateSave(G)');
  assert.equal(run(ctx, 'G.monkeys[0].stage'), 4);
  assert.equal(run(ctx, 'G.monkeys[1].stage'), 8, 'old last stage below gold tier: legend stays locked');
  assert.equal(run(ctx, 'G.monkeys[1].tiers.length'), 10);
  // Locked monkeys untouched apart from padding
  assert.equal(run(ctx, 'G.monkeys[2].stage'), 0);
});

test('migrateSave: old last stage at gold tier (not complete) opens the legend stage; Odin goes 8 → 9', () => {
  const ctx = legendWorld();
  const mons = oldMonkeys(ctx);
  const odin = run(ctx, `MONKEY_DATA.findIndex(m => m.id === 'odin')`);
  mons[0] = { ...mons[0], stage: 8, tiers: [3, 3, 3, 3, 3, 3, 3, 3, 2] };
  mons[odin] = { ...mons[odin], unlocked: true, stage: 7, tiers: [3, 3, 3, 3, 3, 3, 3, 3] };
  ctx.G = { monkeys: mons, activeMonkey: 0 };
  run(ctx, 'migrateSave(G)');
  assert.equal(run(ctx, 'G.monkeys[0].stage'), 9);
  assert.equal(run(ctx, `G.monkeys[${odin}].stage`), 8);
  assert.equal(run(ctx, `G.monkeys[${odin}].tiers.length`), 9);
  // Running the migration twice changes nothing
  const snap = run(ctx, 'JSON.stringify(G.monkeys)');
  run(ctx, 'migrateSave(G)');
  assert.equal(run(ctx, 'JSON.stringify(G.monkeys)'), snap);
});

test('fresh monkeys include the legend stage', () => {
  const ctx = legendWorld();
  const mons = run(ctx, 'initMonkeys()');
  const MD = run(ctx, 'MONKEY_DATA');
  mons.forEach((mp, i) => {
    assert.equal(mp.tiers.length, MD[i].stages.length);
    assert.equal(mp.collections.length, MD[i].stages.length);
  });
});

// The real tier-up function, with its UI calls stubbed
function completionWorld() {
  const ctx = legendWorld();
  const src = read('game.js');
  vm.runInContext(`
    var timers = []; setTimeout = (cb) => { timers.push(cb); return 0; };
    var confirms = [], sounds = [], logs = [];
    function showConfirm(icon, title) { confirms.push(title); }
    var SFX = { play(n) { sounds.push(n); } };
    function msg(t) { logs.push(t); } function track() {} function maybeRequestReview() {}
    function $id() { return { classList: { remove() {}, add() {} } }; }
    function checkSkillsUnlock() {} function checkAchievements() {} function saveGame() {}
    function updateResources() {} function updateStageBar() {} function renderAlbum() {}
    function renderMonkeys() {} function renderStats() {} function flashTierUp() {}
    function starfallCost() { return 7; }
    var _stageBannerPending = false;
    function curMonkey() { return MONKEY_DATA[G.activeMonkey]; }
    function curProgress() { return G.monkeys[G.activeMonkey]; }
    function curActiveStage() { return curProgress().activeStage; }
    function curStage() { return curMonkey().stages[curActiveStage()]; }
    G = { monkeys: initMonkeys(), activeMonkey: 0, hammers: 10, maxH: 50, crystalBananas: 0, stagesCompleted: 0,
          tierHammerRefills: 0, skillsUnlockSeen: true, _allMonkeysCongratsSeen: true, _starfallTipSeen: true };
  `, ctx);
  for (const fn of ['checkCollectionComplete', 'calcTotalCollections']) vm.runInContext(extractFn(src, fn), ctx);
  return ctx;
}
function fillStage(ctx, si) {
  run(ctx, `(() => { const mp = curProgress(); mp.activeStage = ${si}; mp.stage = Math.max(mp.stage, ${si});
    mp.collections[${si}] = mp.collections[${si}].map(() => true); checkCollectionComplete(true); timers.splice(0).forEach(f => f()); })()`);
}

test('completing every core stage completes the monkey while the legend stage is still open', () => {
  const ctx = completionWorld();
  for (let si = 0; si < 9; si++) fillStage(ctx, si);
  assert.equal(run(ctx, 'curProgress().completed'), true);
  assert.equal(run(ctx, 'curProgress().stage'), 9, 'legend stage unlocked by the stage before it');
  assert.ok(run(ctx, 'confirms').includes('Mr. Monkey Complete!'));
  // Now the legend stage: its own moment, no second monkey-complete popup
  run(ctx, 'confirms.length = 0; sounds.length = 0;');
  fillStage(ctx, 9);
  assert.equal(run(ctx, 'curProgress().tiers[9]'), 3);
  assert.equal(run(ctx, 'curProgress().completed'), true);
  assert.ok(!run(ctx, 'confirms').includes('Mr. Monkey Complete!'));
  assert.ok(run(ctx, 'sounds').includes('fanfare'));
  assert.equal(run(ctx, 'legendStagesCompleted()'), 1);
  assert.equal(run(ctx, 'G.stagesCompleted'), 10);
  assert.equal(run(ctx, 'G.crystalBananas'), 10);
});

test('a legend stage finished first never completes the monkey on its own', () => {
  const ctx = completionWorld();
  for (let si = 0; si < 8; si++) fillStage(ctx, si);
  // Stage 9 to gold tier only (opens the legend stage), then finish the legend
  run(ctx, `(() => { const mp = curProgress(); mp.activeStage = 8; const c = mp.collections[8];
    for (let i = 0; i < Math.ceil(c.length * CONFIG.tierThresholds.silver); i++) c[i] = true; checkCollectionComplete(true); })()`);
  assert.equal(run(ctx, 'curProgress().stage'), 9);
  fillStage(ctx, 9);
  assert.equal(run(ctx, 'curProgress().completed'), false, 'stage 9 is still unfinished');
  fillStage(ctx, 8);
  assert.equal(run(ctx, 'curProgress().completed'), true);
});

// ---------------------------------------------------------------
// Pixel art (theegg-art.js) — grids build without a DOM
// ---------------------------------------------------------------
function artCtx() {
  const ctx = { console, Math };
  vm.createContext(ctx);
  vm.runInContext(read('theegg-art.js'), ctx, { filename: 'theegg-art.js' });
  return ctx;
}
const filled = g => g.c.filter(Boolean).length;

test('theegg-art.js has no top-level let/const and is bundled right before theegg.js', () => {
  assert.deepEqual(read('theegg-art.js').split('\n').filter(l => /^(let|const)\s/.test(l)), []);
  const src = read('build.js');
  const a = src.indexOf("'theegg-art.js'"), e = src.indexOf("'theegg.js'"), i = src.indexOf("'idle.js'");
  assert.ok(i > 0 && a > i && e > a);
});

test('every monkey frame, hat and pose builds, with a dark outline', () => {
  const ctx = artCtx();
  for (const hat of ['', 'steampunk', 'princess', 'space', 'odin', 'sun_wukong'])
    for (let w = 0; w < 4; w++) for (let h = 0; h < 3; h++) {
      const g = run(ctx, `eaMonkeyGrid(${w}, ${h}, '${hat}')`);
      const n = filled(g);
      assert.ok(n > 220 && n < g.w * g.h * 0.75, `monkey ${hat} w${w} h${h}: ${n} px`);
      assert.ok(g.c.includes(run(ctx, 'EA_OUTLINE')), 'outlined');
    }
});

test('every egg tier builds; cracks are seeded and grow with damage', () => {
  const ctx = artCtx();
  const tiers = run(ctx, 'EA_TIERS.length');
  for (let t = 0; t < tiers; t++) {
    const g = run(ctx, `eaEggGrid(${1 + t * 10}, 24, 32, 0, false)`);
    assert.ok(filled(g) > 1500, 'tier ' + t);
  }
  assert.equal(run(ctx, 'eaTierFor(1)'), 0);
  assert.equal(run(ctx, 'eaTierFor(11)'), 1);
  assert.equal(run(ctx, 'eaTierFor(999)'), tiers - 1);
  assert.equal(run(ctx, 'JSON.stringify(eaCrackPaths(7))'), run(ctx, 'JSON.stringify(eaCrackPaths(7))'));
  const glow = d => run(ctx, `eaEggGrid(3, 24, 32, ${d}, false)`).c.filter(c => c === '#fff1a8').length;
  assert.equal(glow(0), 0, 'no cracks on a fresh layer');
  assert.ok(glow(0.3) > 0 && glow(0.3) < glow(1), 'cracks grow');
  const flash = run(ctx, 'eaEggGrid(3, 24, 32, 0.5, true)');
  assert.ok(flash.c.filter(Boolean).every(c => c === '#ffffff'), 'hit flash is a white silhouette');
});

test('The Egg scene uses no emoji', () => {
  const emoji = /\p{Extended_Pictographic}/u;
  for (const f of ['theegg-art.js']) assert.ok(!emoji.test(read(f)), f + ' has emoji');
  // theegg.js: only the shared dialog icons, the main-game log line (its 🏆/🤖 style)
  // and the blessing checkmark may use them — never anything drawn in the scene
  const scene = read('theegg.js').split('\n').filter(l => emoji.test(l) && !/showConfirm\(|showAlert\(|msg\(|✅/.test(l));
  assert.deepEqual(scene, []);
});

// ---------------------------------------------------------------
// "What's new" card (news.js)
// ---------------------------------------------------------------
function newsWorld(gState, stored) {
  const store = {};
  if (stored) store._ebaNewsSeen = stored;
  const ctx = {
    console, Math, Date,
    setTimeout: () => 0,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    document: { addEventListener() {}, querySelector: () => null, hidden: false },
    G: gState, $id: () => null, _whenSplashGone() {},
  };
  vm.createContext(ctx);
  vm.runInContext(read('news.js'), ctx, { filename: 'news.js' });
  return { ctx, store };
}

test('news card: never for a first-time player, once for a returning one', () => {
  const fresh = newsWorld({ totalEggs: 0, stagesCompleted: 0 });
  assert.equal(fresh.ctx._newsPending, false);
  assert.equal(fresh.store._ebaNewsSeen, run(fresh.ctx, 'NEWS_ID'), 'a new player is marked seen so it never appears later');
  const back = newsWorld({ totalEggs: 1200, stagesCompleted: 6 });
  assert.equal(back.ctx._newsPending, true, 'returning player: queued (shown after splash/overlays)');
  assert.equal(back.store._ebaNewsSeen, undefined, 'not marked seen until actually shown');
  const seen = newsWorld({ totalEggs: 1200 }, run(back.ctx, 'NEWS_ID'));
  assert.equal(seen.ctx._newsPending, false, 'already seen: nothing');
});

test('news card: no top-level let/const, bundled after theegg.js, holds The Egg intro', () => {
  assert.deepEqual(read('news.js').split('\n').filter(l => /^(let|const)\s/.test(l)), []);
  const src = read('build.js');
  assert.ok(src.indexOf("'news.js'") > src.indexOf("'theegg.js'"));
  assert.match(read('theegg.js'), /_newsPending/);
  // storage blocked (private mode): treated as seen, never throws
  const ctx = { console, Math, Date, setTimeout: () => 0, localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }, document: { addEventListener() {} }, G: { totalEggs: 5 }, $id: () => null };
  vm.createContext(ctx);
  assert.doesNotThrow(() => vm.runInContext(read('news.js'), ctx));
  assert.equal(ctx._newsPending, false);
});

test('v3.12.2 slowdown: one starting flyer; launch-day saves keep their flyer count once', () => {
  const ctx = eggWorld();
  assert.equal(run(ctx, 'CONFIG.theEgg.startSwarm'), 1);
  assert.equal(run(ctx, 'theEggStats().swarm'), 1, 'fresh state: 1 flyer');
  assert.equal(run(ctx, 'CONFIG.theEgg.startSwarm + CONFIG.theEgg.upgrades.swarm.max'), 24, 'cap stays at 24 flyers');
  // a launch-day save: 3 base flyers + 2 bought = 5 flyers
  run(ctx, 'G.theEgg = { layer: 4, shards: 50, lv: { swarm: 2, power: 1 } }');
  assert.equal(run(ctx, 'theEggStats().swarm'), 5, 'still 5 flyers after the change');
  assert.equal(run(ctx, 'G.theEgg.v'), 2);
  run(ctx, 'theEggState(); theEggState();');
  assert.equal(run(ctx, 'theEggStats().swarm'), 5, 'migration runs once');
  // an untouched launch-day state (only saw the intro) gets nothing
  run(ctx, 'G.theEgg = { introSeen: true }');
  assert.equal(run(ctx, 'theEggStats().swarm'), 1);
});

test('v3.12.3 retune: max-hammer blessings earned at the old +5 are topped up once, never paid twice', () => {
  // a v3.12.2 save: layers 5 and 25 granted under the old +5 values, no st.mh record
  const ctx = eggWorld(`G.maxH = 60; G.hammers = 20; G.theEgg = { v: 2, layer: 27, blessed: [5, 10, 15, 20, 25] };`);
  // boot already ran _theEggGrantBlessings(): old 10 recorded, new 25 owed → +15
  assert.equal(run(ctx, 'G.theEgg.mh'), 25);
  assert.equal(run(ctx, 'G.maxH'), 75);
  run(ctx, '_theEggGrantBlessings(); theEggState(); _theEggGrantBlessings();');
  assert.equal(run(ctx, 'G.maxH'), 75, 'idempotent');
  assert.ok(run(ctx, 'msgs').some(m => /upgraded: \+15 max hammers/.test(m)));
  // only layer 5 earned before → +5 top-up
  const c2 = eggWorld(`G.maxH = 55; G.hammers = 55; G.theEgg = { v: 2, layer: 7, blessed: [5] };`);
  assert.equal(run(c2, 'G.maxH'), 60);
  // a brand-new state never gets a phantom top-up
  const c3 = eggWorld(`G.maxH = 50; G.theEgg = { introSeen: true };`);
  assert.equal(run(c3, 'G.maxH'), 50);
});
