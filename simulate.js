'use strict';
// ============================================================
//  Egg Breaker Adventures — Balance Simulator
//  Usage: node simulate.js
// ============================================================

const RUNS = 5000; // Monte Carlo iterations per stage per strategy

// ─── Egg types (from config.js) ──────────────────────────────
// sw=spawnWeight, us=unlockStage, gm=goldMult, fm=featherMult
const EGG_TYPES = [
  { id:'normal',  hp:1,  sw:80,  us:0, gm:1,   fm:1, p:{empty:5, gold_s:24,gold_m:18,gold_l:8, star:6, mult:2, feather:7, item:21, hammers:0 }},
  { id:'silver',  hp:2,  sw:15,  us:0, gm:2,   fm:2, p:{empty:1, gold_s:11,gold_m:20,gold_l:16,star:10,mult:3, feather:7, item:26, hammers:10}},
  { id:'gold',    hp:3,  sw:5,   us:0, gm:1.5, fm:1, p:{empty:0, gold_s:0, gold_m:18,gold_l:26,star:10,mult:2, feather:6, item:28, hammers:8 }},
  { id:'crystal', hp:4,  sw:2,   us:2, gm:2,   fm:1, p:{empty:0, gold_s:0, gold_m:5, gold_l:30,star:12,mult:4, feather:8, item:38, hammers:11}},
  { id:'ruby',    hp:9,  sw:1,   us:4, gm:3,   fm:2, p:{empty:0, gold_s:0, gold_m:0, gold_l:25,star:10,mult:4, feather:7, item:32, hammers:9 }},
  { id:'black',   hp:20, sw:0.5, us:8, gm:4,   fm:3, p:{empty:0, gold_s:0, gold_m:0, gold_l:30,star:10,mult:5, feather:5, item:25, hammers:10}},
];

const GOLD_RANGES   = { gold_s:[1,5], gold_m:[8,22], gold_l:[30,90] };
const MULT_POOL     = [2,2,2,2,2,2,2,2, 3,3,3,3,3,3, 5,5,5, 10,10, 50,50, 123];
const FEATHER_RANGE = [1, 3];
const HAMMER_PRIZES = [2, 3, 5, 5, 8];
const ITEM_RW       = { 1:5, 2:2, 3:3 };        // rarity → weight for item selection
const DUPE_GOLD     = { 1:[20,60], 2:[80,200], 3:[250,600] };
const MULT_Q_MAX    = 3;
const MULT_BONUS    = 20;                          // bonus gold per mult-unit when prize can't be multiplied
const TIER_PCT      = { bronze:0.40, silver:0.70, gold:1.00 };

// ─── Stage definitions (exact rarities from data.js) ─────────
// si = stage index (0-based globally), items = array of rarity values per item
const STAGES = [
  { label:'S1 Tropical Paradise', si:0, slots:3, items:[1,1,1, 2,2          ] },
  { label:'S2 Jungle Trek',       si:1, slots:3, items:[1,1,1, 2,2,     3   ] },
  { label:'S3 Ocean Depths',      si:2, slots:4, items:[1,1,1, 2,2,     3   ] },
  { label:'S4 Mountain Peak',     si:3, slots:4, items:[1,1,1, 2,2,     3,3 ] },
  { label:'S5 Desert Oasis',      si:4, slots:5, items:[1,1,1, 2,2,     3,3 ] },
  { label:'S6 Frozen Tundra',     si:5, slots:5, items:[1,1,   2,2,2,   3,3 ] },
  { label:'S7 Volcano Island',    si:6, slots:5, items:[1,1,1, 2,2,     3,3 ] },
  { label:'S8 Enchanted Forest',  si:7, slots:6, items:[1,1,   2,2,2,   3,3,3] },
  { label:'S9 Cloud Kingdom',     si:8, slots:7, items:[1,     2,2,2,   3,3,3,3] },
];

// ─── Helpers ─────────────────────────────────────────────────
const ri   = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function wPick(arr, wFn) {
  let tot = arr.reduce((s, x) => s + wFn(x), 0);
  let r = Math.random() * tot;
  for (const x of arr) { r -= wFn(x); if (r <= 0) return x; }
  return arr[arr.length - 1];
}

function rollPrize(p) {
  return wPick(Object.entries(p), ([, w]) => w)[0];
}

// ─── Simulate one full stage (bronze → silver → gold tier) ───
function simStage(stage, useMultStrategy) {
  const eligible = EGG_TYPES.filter(e => e.us <= stage.si);
  const allItems = stage.items.map((r, i) => ({ r, i }));
  const total    = stage.items.length;

  const found  = new Set();
  let hammers  = 0, refunds = 0;
  let gold     = 0, feathers = 0;
  let baseGold = 0, multBoost = 0;
  let multDropped = 0, multUsed = 0, multLost = 0;
  let multQueuedValues = [];                      // the accumulated mult values (not used in no-mult mode)
  let bronzeAt = null, silverAt = null, goldAt = null;

  while (!goldAt && hammers < 500_000) {
    const egg   = wPick(eligible, e => e.sw);
    hammers    += egg.hp;

    // Strategy: consume best queued mult before this break
    let aMult = 1;
    if (useMultStrategy && multQueuedValues.length > 0) {
      multQueuedValues.sort((a, b) => b - a);
      aMult = multQueuedValues.shift();
      multUsed++;
    }

    const prize = rollPrize(egg.p);

    // bonus gold for non-multipliable prizes when a mult was active
    const bonus = () => {
      if (aMult > 1) { const b = MULT_BONUS * aMult; gold += b; multBoost += b; }
    };

    if (prize === 'empty') {
      // nothing

    } else if (prize === 'gold_s' || prize === 'gold_m' || prize === 'gold_l') {
      const [lo, hi] = GOLD_RANGES[prize];
      const base     = Math.floor(ri(lo, hi) * egg.gm);
      const total_g  = Math.floor(base * aMult);
      gold    += total_g;
      baseGold += base;
      if (aMult > 1) multBoost += total_g - base;

    } else if (prize === 'star') {
      bonus();

    } else if (prize === 'feather') {
      feathers += ri(FEATHER_RANGE[0], FEATHER_RANGE[1]) * egg.fm;
      bonus();

    } else if (prize === 'mult') {
      if (multQueuedValues.length < MULT_Q_MAX) {
        multQueuedValues.push(pick(MULT_POOL));
        multDropped++;
      } else {
        multLost++;                                // queue full — mult wasted
      }
      bonus();                                     // if another mult was active: bonus gold

    } else if (prize === 'hammers') {
      refunds += pick(HAMMER_PRIZES);
      bonus();

    } else if (prize === 'item') {
      // Roll item from full pool (same weights regardless of what's found)
      const chosen = wPick(allItems, x => ITEM_RW[x.r]);
      if (!found.has(chosen.i)) {
        found.add(chosen.i);
        const pct = found.size / total;
        if (!bronzeAt && pct >= TIER_PCT.bronze) bronzeAt = hammers;
        if (!silverAt && pct >= TIER_PCT.silver) silverAt = hammers;
        if (!goldAt   && pct >= TIER_PCT.gold)   goldAt   = hammers;
      } else {
        // Duplicate: gold based on rarity
        const [lo, hi] = DUPE_GOLD[chosen.r];
        const dg = ri(lo, hi);
        gold += dg; baseGold += dg;
      }
      bonus();
    }
  }

  goldAt   = goldAt   ?? hammers;
  silverAt = silverAt ?? goldAt;
  bronzeAt = bronzeAt ?? silverAt;

  return {
    bronzeAt, silverAt, goldAt,
    netHammers: goldAt - refunds,
    gold, feathers, baseGold, multBoost, refunds,
    multDropped, multUsed, multLost,
  };
}

// ─── Average N simulation runs ────────────────────────────────
function avgRuns(stage, strategy, n) {
  const sum = {};
  for (let i = 0; i < n; i++) {
    for (const [k, v] of Object.entries(simStage(stage, strategy)))
      sum[k] = (sum[k] ?? 0) + v;
  }
  return Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / n]));
}

// ─── Output helpers ──────────────────────────────────────────
const f  = (n, w = 7)        => Math.round(n).toLocaleString().padStart(w);
const fp = (n, d = 1, w = 7) => n.toFixed(d).padStart(w);

// ─── Run everything ──────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════════════════════════');
console.log('  Egg Breaker Adventures — Balance Simulator');
console.log(`  ${RUNS.toLocaleString()} Monte Carlo runs per stage  •  2 strategies: no-mults vs greedy-mults`);
console.log('══════════════════════════════════════════════════════════════════════════════════════════\n');
console.log('  Computing...');

const results = STAGES.map(stage => ({
  stage,
  noMult: avgRuns(stage, false, RUNS),
  greedy: avgRuns(stage, true,  RUNS),
}));

// ─── Table 1: Hammers to each tier ───────────────────────────
for (const [label, key] of [['NO-MULTS', 'noMult'], ['GREEDY-MULTS (use best queued mult each break)', 'greedy']]) {
  console.log(`\n  ── ${label} ──`);
  const H = `  ${'Stage'.padEnd(22)}  N  ${'Bronze'.padStart(7)} ${'Silver'.padStart(7)} ${'Gold'.padStart(7)}  ${'NetH'.padStart(7)}  ${'Refunds'.padStart(8)}  ${'Gold💰'.padStart(8)} ${'Feathers'.padStart(9)}  ${'MultDrop'.padStart(8)} ${'MultUsed'.padStart(9)} ${'MultLost'.padStart(9)}`;
  console.log(H);
  console.log(`  ${'─'.repeat(H.length - 2)}`);
  for (const { stage, [key]: r } of results) {
    console.log(
      `  ${stage.label.padEnd(22)}` +
      `  ${stage.items.length}` +
      `  ${f(r.bronzeAt)}` +
      ` ${f(r.silverAt)}` +
      ` ${f(r.goldAt)}` +
      `  ${f(r.netHammers)}` +
      `  ${f(r.refunds, 8)}` +
      `  ${f(r.gold, 8)}` +
      ` ${f(r.feathers, 9)}` +
      `  ${fp(r.multDropped, 1, 8)}` +
      ` ${fp(r.multUsed,    1, 9)}` +
      ` ${fp(r.multLost,    1, 9)}`
    );
  }
}

// ─── Table 2: Mult strategy impact ───────────────────────────
console.log('\n\n  ── MULT STRATEGY IMPACT ──');
const H2 = `  ${'Stage'.padEnd(22)}  ${'Gold (none)'.padStart(11)}  ${'Gold (greedy)'.padStart(13)}  ${'Boost%'.padStart(7)}  ${'BoostΔ'.padStart(8)}  ${'Avg mult value'.padStart(15)}`;
console.log(H2);
console.log(`  ${'─'.repeat(H2.length - 2)}`);

for (const { stage, noMult, greedy } of results) {
  const pct      = ((greedy.gold / noMult.gold) - 1) * 100;
  const avgMult  = greedy.multUsed > 0 ? greedy.multBoost / greedy.multUsed / MULT_BONUS : 0;
  console.log(
    `  ${stage.label.padEnd(22)}` +
    `  ${f(noMult.gold, 11)}` +
    `  ${f(greedy.gold, 13)}` +
    `  ${fp(pct, 1, 7)}%` +
    `  ${f(greedy.multBoost, 8)}` +
    `  ${fp(avgMult, 1, 14)}x`
  );
}

// ─── Table 3: Stage scaling (gold hammer-efficiency) ─────────
console.log('\n\n  ── GOLD EFFICIENCY (gold per hammer spent, greedy-mults strategy) ──');
const H3 = `  ${'Stage'.padEnd(22)}  ${'Gold/Ham'.padStart(9)}  ${'Feat/Ham'.padStart(9)}  ${'Egg mix at this stage'.padStart(22)}`;
console.log(H3);
console.log(`  ${'─'.repeat(H3.length - 2)}`);

for (const { stage, greedy } of results) {
  const eligible = EGG_TYPES.filter(e => e.us <= stage.si);
  const totSW    = eligible.reduce((s, e) => s + e.sw, 0);
  const mix      = eligible.map(e => `${e.id}:${((e.sw / totSW) * 100).toFixed(0)}%`).join(' ');
  const gph      = greedy.gold    / greedy.goldAt;
  const fph      = greedy.feathers / greedy.goldAt;
  console.log(
    `  ${stage.label.padEnd(22)}` +
    `  ${fp(gph, 2, 9)}` +
    `  ${fp(fph, 3, 9)}` +
    `  ${mix}`
  );
}

// ─── Table 4: Playtime estimate ───────────────────────────────
// Assumptions:
//   • 5 monkeys, each with 9 stages (same item cost curve as Mr. Monkey)
//   • tierRewards: hitting silver gives +5 maxH & +5 hammers; gold gives +10 maxH & +5 hammers
//     → per stage completed: +15 maxHammers, +10 hammer refill
//   • startingMaxHammers: 60, regenInterval: 30 sec/hammer
//   • crystalBananasToUnlock: 7 (one banana per stage at gold tier)
//   • Daily login bonus: ~60 hammers avg (between base 40 and ~80 streak)
//   • Players drain their max every session; sessions scale with max capacity

const REGEN_SEC         = 30;    // seconds per hammer
const START_MAX         = 60;
const MAX_H_PER_STAGE   = 15;   // +5 (silver) + +10 (gold)
const REFILL_PER_STAGE  = 10;   // +5 (silver) + +5 (gold) hammer gifts
const BANANAS_TO_UNLOCK = 7;
const TOTAL_MONKEYS     = 5;
const STAGES_PER_MONKEY = 9;
const DAILY_LOGIN_AVG   = 60;   // avg hammers from daily login bonus

// ─── Shop totals (from data.js) ──────────────────────────────
// All non-free unique purchasables (cosmetics + permanent upgrades)
// Hammers: drumstick + bat + crystal + golden + rainbow + cucumber + mjolnir
const SHOP_HAMMERS_TOTAL  = 8000 + 12000 + 25000 + 75000 + 150000 + 250000 + 500000;
// Hats: chef + crown + wizard + tophat + pirate
const SHOP_HATS_TOTAL     = 15000 + 30000 + 45000 + 75000 + 120000;
// Unique upgrades: spyglass + fastregen + luckycharm + goldmagnet + eggradar + doubledaily + starsaver
const SHOP_UPGRADES_TOTAL = 5000 + 12500 + 200000 + 300000 + 400000 + 500000 + 600000;
const SHOP_TOTAL          = SHOP_HAMMERS_TOTAL + SHOP_HATS_TOTAL + SHOP_UPGRADES_TOTAL;
// = 1,020,000 + 285,000 + 2,017,500 = 3,322,500 gold

// Net hammer cost per stage (simulator output, greedy strategy, minus tier refills)
const stageNetH  = results.map(({ greedy }) => Math.round(greedy.netHammers) - REFILL_PER_STAGE);
const stageGold  = results.map(({ greedy }) => Math.round(greedy.gold));

// Each monkey has ~same stage cost curve — project it for all 5 monkeys
const allStages = [];
for (let m = 0; m < TOTAL_MONKEYS; m++) {
  for (let s = 0; s < STAGES_PER_MONKEY; s++) {
    allStages.push({ monkey: m + 1, s, cost: stageNetH[s], gold: stageGold[s] });
  }
}
const TOTAL_STAGE_HAMMERS = allStages.reduce((t, x) => t + x.cost, 0);
const TOTAL_STAGE_GOLD    = allStages.reduce((t, x) => t + x.gold, 0);

// After stages done, player farms S9 (highest gold/hammer) for remaining shop gold
const S9_GOLD_PER_H = stageGold[8] / (results[8].greedy.goldAt);  // gold per hammer in S9

const ARCHETYPES = [
  { name: 'Casual',  sessions: 1, minPerSess: 20 },
  { name: 'Regular', sessions: 2, minPerSess: 25 },
  { name: 'Power',   sessions: 3, minPerSess: 45 },
];

const hammersPerDay = (arch, maxH) => {
  const regenPerSess = Math.floor((arch.minPerSess * 60) / REGEN_SEC);
  return Math.min(maxH, regenPerSess) * arch.sessions + DAILY_LOGIN_AVG;
};

console.log('\n\n  ── PLAYTIME ESTIMATE ──');
console.log(`  5 monkeys × 9 stages  •  30 sec regen  •  +15 maxH & +10H refill per stage  •  avg 60 daily login H`);
console.log(`  Shop totals: hammers ${SHOP_HAMMERS_TOTAL.toLocaleString()} + hats ${SHOP_HATS_TOTAL.toLocaleString()} + upgrades ${SHOP_UPGRADES_TOTAL.toLocaleString()} = ${SHOP_TOTAL.toLocaleString()} gold to buy everything\n`);

const fmtDay = d => typeof d === 'number'
  ? (d < 7 ? `day ${d}` : `~week ${Math.ceil(d / 7)}`).padStart(10)
  : '    >1 year';

for (const arch of ARCHETYPES) {
  let maxH = START_MAX, bananas = 0, cumulH = 0, cumulGold = 0;
  let day = 0, hammersBank = maxH;
  const reached = {};
  const stageQueue = [...allStages];

  const check = label => { if (!reached[label]) reached[label] = day; };

  while (day < 730) {
    day++;
    hammersBank = Math.min(hammersBank + hammersPerDay(arch, maxH), maxH * 2);

    // Complete stages with available hammers
    while (stageQueue.length > 0 && hammersBank >= stageQueue[0].cost) {
      const st = stageQueue.shift();
      hammersBank -= st.cost;
      cumulH      += st.cost;
      cumulGold   += st.gold;
      bananas++;
      maxH        += MAX_H_PER_STAGE;

      if (bananas >= BANANAS_TO_UNLOCK)                          check('Unlock Steampunk (7 bananas)');
      if (bananas >= STAGES_PER_MONKEY)                         check('Finish Mr. Monkey (all 9 stages)');
      if (bananas >= BANANAS_TO_UNLOCK * 2 + STAGES_PER_MONKEY) check('3 monkeys unlocked (mid-game)');
      if (bananas >= BANANAS_TO_UNLOCK * 4 + STAGES_PER_MONKEY) check('All 5 monkeys unlocked');
      if (stageQueue.length === 0)                              check('All 45 stages complete');
    }

    // After stages done: farm S9 with remaining hammers for shop gold
    if (stageQueue.length === 0) {
      cumulGold += hammersBank * S9_GOLD_PER_H;
      hammersBank = 0;
    }

    if (cumulGold >= SHOP_TOTAL) check('Afford all shop items (true end-game)');
    if (reached['Afford all shop items (true end-game)']) break;
  }

  const sessMin  = arch.sessions * arch.minPerSess;
  const startHpD = hammersPerDay(arch, START_MAX);
  const peakHpD  = hammersPerDay(arch, maxH);
  console.log(`  ${arch.name.padEnd(8)}  (${arch.sessions}×${arch.minPerSess} min/day ≈ ${sessMin} min  •  ${Math.round(startHpD)}→${Math.round(peakHpD)} H/day)`);
  const order = [
    'Unlock Steampunk (7 bananas)',
    'Finish Mr. Monkey (all 9 stages)',
    '3 monkeys unlocked (mid-game)',
    'All 5 monkeys unlocked',
    'All 45 stages complete',
    'Afford all shop items (true end-game)',
  ];
  for (const label of order) console.log(`    ${fmtDay(reached[label])}  ${label}`);
  console.log();
}

// ─── Farm rate estimate (S9 in full-farm mode, all collections done) ─────
// In farm mode every "item" prize roll is a duplicate → gives dupe gold.
// During first-time S9 completion the sim already tracks this; in pure farm
// mode every item roll pays out. We compute the delta.
const S9_ITEM_RATE = (() => {
  const eligible = EGG_TYPES.filter(e => e.us <= 8);
  const totSW    = eligible.reduce((s, e) => s + e.sw, 0);
  return eligible.reduce((s, e) => {
    const tw = Object.values(e.p).reduce((a, b) => a + b, 0);
    return s + (e.sw / totSW) * (e.p.item / tw);
  }, 0);
})();

// S9 rarity mix: [1, 2,2,2, 3,3,3,3] → avg dupe gold
const S9_ITEMS_RARITY = [1, 2,2,2, 3,3,3,3];
const S9_DUPE_AVG = S9_ITEMS_RARITY.reduce((s, r) => {
  const [lo, hi] = DUPE_GOLD[r];
  return s + (lo + hi) / 2;
}, 0) / S9_ITEMS_RARITY.length;

// During first-time S9 completion, roughly ~55% of item rolls were new (no gold)
// and ~45% were dupes. In pure farm, 100% are dupes.
const S9_ITEM_DUPE_RATE_FIRSTTIME = 0.45;
const S9_FIRSTTIME_ITEM_GPH = S9_ITEM_RATE * S9_ITEM_DUPE_RATE_FIRSTTIME * S9_DUPE_AVG;
const S9_FARM_ITEM_GPH       = S9_ITEM_RATE * S9_DUPE_AVG;
const S9_OTHER_GPH           = S9_GOLD_PER_H - S9_FIRSTTIME_ITEM_GPH;
const S9_FARM_GPH            = S9_OTHER_GPH + S9_FARM_ITEM_GPH;

console.log(`  Shop breakdown:`);
console.log(`    Hammers  (7 items):  ${SHOP_HAMMERS_TOTAL.toLocaleString().padStart(10)} gold`);
console.log(`    Hats     (5 items):  ${SHOP_HATS_TOTAL.toLocaleString().padStart(10)} gold`);
console.log(`    Upgrades (7 unique): ${SHOP_UPGRADES_TOTAL.toLocaleString().padStart(10)} gold`);
console.log(`    ─────────────────────────────────────`);
console.log(`    Total:               ${SHOP_TOTAL.toLocaleString().padStart(10)} gold`);
console.log(`    Earned from 45 stages (est):  ${Math.round(TOTAL_STAGE_GOLD).toLocaleString().padStart(10)} gold  (${Math.round(TOTAL_STAGE_GOLD/SHOP_TOTAL*100)}% of shop cost)`);
console.log(`    Shortfall to farm:            ${Math.round(Math.max(0, SHOP_TOTAL - TOTAL_STAGE_GOLD)).toLocaleString().padStart(10)} gold`);
const shortfall = Math.max(0, SHOP_TOTAL - TOTAL_STAGE_GOLD);
console.log(`\n  Farming (S9, all collections complete):`);
console.log(`    Gold/hammer during progression:  ${S9_GOLD_PER_H.toFixed(1)} gold/H`);
console.log(`    Gold/hammer in farm mode:        ${S9_FARM_GPH.toFixed(1)} gold/H  (all items now dupes → +dupe gold per item roll)`);
console.log(`    Hammers needed to clear shortfall: ${Math.round(shortfall / S9_FARM_GPH).toLocaleString()}`);
console.log(`    → Regular player (160 H/day):  ${Math.round(shortfall / S9_FARM_GPH / 160)} days of pure farming after all stages done`);
console.log(`    → Power player   (240 H/day):  ${Math.round(shortfall / S9_FARM_GPH / 240)} days of pure farming after all stages done`);

console.log('\n  Notes:');
console.log('    • Bronze/Silver/Gold hammer thresholds are NOT affected by mult strategy — items drop at the same rate.');
console.log('    • Mults only boost gold income. NetH = Gold-tier hammers minus hammer-prize refunds.');
console.log('    • MultDrop = mults that entered the queue; MultLost = mults wasted because queue was full.');
console.log('    • Greedy strategy = before each break, activate the highest-value queued mult.');
console.log('    • Stages 6-9 exact rarities read from data.js.\n');
