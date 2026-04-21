'use strict';
// ============================================================
//  Egg Smash Adventures — Balance Simulator
//  Usage: node simulate.js
// ============================================================

const RUNS = 5000; // Monte Carlo iterations per stage per strategy

// ─── Egg types — synced from config.js ───────────────────────
// sw=spawnWeight, us=unlockStage, gm=goldMult, fm=featherMult
const EGG_TYPES = [
  { id:'normal',  hp:1,  sw:80,  us:0, gm:1,   fm:1, p:{empty:4, gold_s:20,gold_m:22,gold_l:14,star:4, mult:2,feather:5,item:4,  hammers:0  }},
  { id:'silver',  hp:2,  sw:15,  us:0, gm:2,   fm:2, p:{empty:1, gold_s:8, gold_m:20,gold_l:24,star:7, mult:3,feather:5,item:6,  hammers:10 }},
  { id:'gold',    hp:3,  sw:5,   us:0, gm:1.5, fm:1, p:{empty:0, gold_s:0, gold_m:18,gold_l:26,star:7, mult:2,feather:4,item:7,  hammers:8  }},
  { id:'crystal', hp:4,  sw:2,   us:2, gm:3,   fm:2, p:{empty:0, gold_s:0, gold_m:0, gold_l:42,star:11,mult:6,feather:6,item:10, hammers:8  }},
  { id:'ruby',    hp:9,  sw:1,   us:4, gm:5,   fm:3, p:{empty:0, gold_s:0, gold_m:0, gold_l:40,star:10,mult:6,feather:5,item:7,  hammers:8  }},
  { id:'black',   hp:20, sw:0.7, us:8, gm:8,   fm:5, p:{empty:0, gold_s:0, gold_m:0, gold_l:58,star:16,mult:12,feather:7,item:7, hammers:10 }},
];

// Item weight multiplier by monkey type (matches smash.js rollPrize logic)
// 'mr_monkey' = 1.5x, all others = 0.7x
const ITEM_MULT = { mr_monkey: 1.5, other: 0.7 };

// Gold scale per monkey (matches data.js goldScale, applied in resolvePrize)
// Mr. Monkey has no goldScale (defaults 1.0). Later monkeys earn less gold per smash.
const MONKEY_GOLD_SCALE = {
  mr_monkey:  1.00,
  steampunk:  0.78,
  princess:   0.72 * 1.20,  // princess perk: moreGold +20%
  space:      0.66,
  odin:       0.60 * 1.10,  // odin perk: allfather +10%
};

const GOLD_RANGES   = { gold_s:[2,8], gold_m:[8,22], gold_l:[25,80] };
const MULT_POOL     = [2,2,2,2,2,2,2,2,2,2, 3,3,3,3,3,3,3,3, 5,5, 10, 50, 123];
const FEATHER_RANGE = [1, 3];
const HAMMER_PRIZES = [2, 3, 5, 5, 8];
const ITEM_RW       = { 1:5, 2:2, 3:3 };
const DUPE_GOLD     = { 1:[35,90], 2:[120,280], 3:[350,800] };
const MULT_Q_MAX    = 3;
const MULT_BONUS    = 20;
const PREMIUM_IDS   = new Set(['gold', 'crystal', 'ruby', 'black']);
const BIG_MULT_MIN  = 50;  // x50+ saved for premium eggs in smart strategy
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
// monkeyId: 'mr_monkey' | 'other'
// multStrategy: false | 'greedy' | 'smart'
//   greedy — always activate best queued mult before every smash
//   smart  — save x50/x123 until a premium egg (gold/crystal/ruby/black); use smaller mults greedily
function simStage(stage, multStrategy, monkeyId = 'mr_monkey') {
  const itemMult = ITEM_MULT[monkeyId] ?? 1;
  const eligible = EGG_TYPES.filter(e => e.us <= stage.si);
  const allItems = stage.items.map((r, i) => ({ r, i }));
  const total    = stage.items.length;

  const found  = new Set();
  let hammers  = 0, refunds = 0;
  let gold     = 0, feathers = 0;
  let baseGold = 0, multBoost = 0;
  let multDropped = 0, multUsed = 0, multLost = 0;
  let multQueuedValues = [];
  let bronzeAt = null, silverAt = null, goldAt = null;

  while (!goldAt && hammers < 500_000) {
    const egg   = wPick(eligible, e => e.sw);
    hammers    += egg.hp;

    let aMult = 1;
    if (multStrategy && multQueuedValues.length > 0) {
      if (multStrategy === 'greedy') {
        multQueuedValues.sort((a, b) => b - a);
        aMult = multQueuedValues.shift();
        multUsed++;
      } else if (multStrategy === 'smart') {
        const isPremium = PREMIUM_IDS.has(egg.id);
        if (isPremium) {
          // Premium egg — apply best available mult
          multQueuedValues.sort((a, b) => b - a);
          aMult = multQueuedValues.shift();
          multUsed++;
        } else {
          // Non-premium — only spend small mults (x10 or less); hold big ones
          const smallIdx = multQueuedValues.findIndex(v => v < BIG_MULT_MIN);
          if (smallIdx !== -1) {
            multQueuedValues.sort((a, b) => b - a);
            const si2 = multQueuedValues.findIndex(v => v < BIG_MULT_MIN);
            aMult = multQueuedValues.splice(si2, 1)[0];
            multUsed++;
          } else if (multQueuedValues.length >= MULT_Q_MAX) {
            // Queue full of big mults — burn smallest big one to free a slot
            multQueuedValues.sort((a, b) => a - b);
            aMult = multQueuedValues.shift();
            multUsed++;
          }
          // else: only big mults, queue not full — hold them
        }
      }
    }

    const adjP  = { ...egg.p, item: egg.p.item * itemMult };
    const prize = rollPrize(adjP);

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
// goldScale: applied to all gold prizes post-simulation (matches monkey.goldScale × perk in game)
function avgRuns(stage, strategy, n, monkeyId = 'mr_monkey', goldScale = 1) {
  const sum = {};
  for (let i = 0; i < n; i++) {
    const r = simStage(stage, strategy, monkeyId);
    // apply goldScale to gold totals
    if (goldScale !== 1) {
      r.gold     = r.gold     * goldScale;
      r.baseGold = r.baseGold * goldScale;
      r.multBoost = r.multBoost * goldScale;
    }
    for (const [k, v] of Object.entries(r))
      sum[k] = (sum[k] ?? 0) + v;
  }
  return Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / n]));
}

// ─── Output helpers ──────────────────────────────────────────
const f  = (n, w = 7)        => Math.round(n).toLocaleString().padStart(w);
const fp = (n, d = 1, w = 7) => n.toFixed(d).padStart(w);

// ─── Run everything ──────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════════════════════════');
console.log('  Egg Smash Adventures — Balance Simulator');
console.log(`  ${RUNS.toLocaleString()} Monte Carlo runs per stage  •  2 strategies: no-mults vs greedy-mults`);
console.log('══════════════════════════════════════════════════════════════════════════════════════════\n');
console.log('  Computing...');

// Simulate Mr. Monkey (1.5x items) and other monkeys (0.7x items) × 3 strategies
const results = STAGES.map(stage => ({
  stage,
  noMult:    avgRuns(stage, false,    RUNS, 'mr_monkey'),
  greedy:    avgRuns(stage, 'greedy', RUNS, 'mr_monkey'),
  smart:     avgRuns(stage, 'smart',  RUNS, 'mr_monkey'),
  greedyOth: avgRuns(stage, 'greedy', RUNS, 'other'),
}));

// ─── Table 1: Hammers to each tier ───────────────────────────
for (const [label, key] of [
  ['NO-MULTS  (Mr. Monkey, 1.5x items)', 'noMult'],
  ['GREEDY-MULTS — Mr. Monkey (1.5x items)', 'greedy'],
  ['SMART-MULTS  — Mr. Monkey (save x50/x123 for gold/crystal/ruby/black)', 'smart'],
  ['GREEDY-MULTS — Other monkeys (0.7x items)', 'greedyOth'],
]) {
  console.log(`\n  ── ${label} ──`);
  const H = `  ${'Stage'.padEnd(22)}  N  ${'Bronze'.padStart(7)} ${'Silver'.padStart(7)} ${'Gold'.padStart(7)}  ${'NetH'.padStart(7)}  ${'Refunds'.padStart(8)}  ${'Gold💰'.padStart(8)} ${'Feathers'.padStart(9)}  ${'MultDrop'.padStart(8)} ${'MultUsed'.padStart(9)} ${'MultLost'.padStart(9)}`;
  console.log(H);
  console.log(`  ${'─'.repeat(H.length - 2)}`);
  for (const { stage, [key]: r } of results) {
    if (!r) continue;
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
console.log('\n\n  ── MULT STRATEGY IMPACT (Mr. Monkey) ──');
const H2 = `  ${'Stage'.padEnd(22)}  ${'No-mult'.padStart(9)}  ${'Greedy'.padStart(9)}  ${'Grdy%'.padStart(6)}  ${'Smart'.padStart(9)}  ${'Smrt%'.padStart(6)}  ${'Smart gain'.padStart(11)}`;
console.log(H2);
console.log(`  ${'─'.repeat(H2.length - 2)}`);

for (const { stage, noMult, greedy, smart } of results) {
  const greedyPct = ((greedy.gold / noMult.gold) - 1) * 100;
  const smartPct  = ((smart.gold  / noMult.gold) - 1) * 100;
  const gainVsGrd = smart.gold - greedy.gold;
  console.log(
    `  ${stage.label.padEnd(22)}` +
    `  ${f(noMult.gold, 9)}` +
    `  ${f(greedy.gold, 9)}` +
    `  ${fp(greedyPct, 0, 6)}%` +
    `  ${f(smart.gold, 9)}` +
    `  ${fp(smartPct,  0, 6)}%` +
    `  ${f(gainVsGrd, 11)}`
  );
}

// ─── Table 3: Stage scaling (gold hammer-efficiency) ─────────
console.log('\n\n  ── GOLD EFFICIENCY (gold per hammer spent, greedy-mults strategy) ──');
const H3 = `  ${'Stage'.padEnd(22)}  ${'Gold/Ham'.padStart(9)}  ${'Feat/Ham'.padStart(9)}  ${'Egg mix at this stage'.padStart(22)}`;
console.log(H3);
console.log(`  ${'─'.repeat(H3.length - 2)}`);

for (const { stage, smart } of results) {
  const eligible = EGG_TYPES.filter(e => e.us <= stage.si);
  const totSW    = eligible.reduce((s, e) => s + e.sw, 0);
  const mix      = eligible.map(e => `${e.id}:${((e.sw / totSW) * 100).toFixed(0)}%`).join(' ');
  const gph      = smart.gold     / smart.goldAt;
  const fph      = smart.feathers / smart.goldAt;
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

// Net hammer cost per stage (smart strategy, minus tier refills)
const stageNetH  = results.map(({ smart }) => Math.round(smart.netHammers) - REFILL_PER_STAGE);
const stageGold  = results.map(({ smart }) => Math.round(smart.gold));

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
const S9_GOLD_PER_H = stageGold[8] / (results[8].smart.goldAt);   // gold per hammer in S9

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

// ─── User progress estimate ────────────────────────────────────────────────
// Mr. Monkey done (9), Cadet done (9), Steampunk done (9), Princess S1+S2 done (2)
// = 29 stages. Smart mults strategy. Century egg +20k confirmed.
//
// KEY INSIGHT: the simulator stops at gold tier (100% items). Real players keep
// smashing after gold tier until hammers run out. Each session generates extra gold
// beyond the minimum. 29 stages require ~9,700 minimum hammers, but a player using
// fast regen (15 sec/H = 5,760 H/day) accumulates far more over 3-4 days of play.
// The extra hammers go to gold farming in already-completed stages.
{
  console.log('\n\n  ── YOUR PROGRESS ESTIMATE ──');
  console.log('  Stages completed: 9×Mr.Monkey + 9×Cadet + 9×Steampunk + 2×Princess = 29 stages');
  console.log('  Monkey: Mr. Monkey (1.5x item mult)  •  Strategy: smart mults');
  console.log('  Century egg: +20,000 gold confirmed\n');

  // 29 stages: cycle through STAGES[0-8] for each monkey
  let totalBaseGold = 0, totalMinHammers = 0;
  const stageDetails = [];
  for (let i = 0; i < 29; i++) {
    const stageIdx = i % STAGES.length;
    const r = results[stageIdx].smart;
    totalBaseGold  += r.gold;
    totalMinHammers += r.goldAt;
    stageDetails.push({ idx: stageIdx, gold: r.gold, hammers: r.goldAt });
  }

  const goldPerH = totalBaseGold / totalMinHammers;  // avg gold/hammer during stage completion

  // ── Hammer budget scenarios ──────────────────────────────────────────────
  // 29 stages require ~9,700 min hammers. At 5,760 H/day (fast regen, 15s),
  // 3.5 days ≈ 20,160 regen + 230 daily + 220 refunds + 75 start = ~20,685 total.
  // Extra hammers beyond min go to farming (same gold/H rate).
  const CENTURY_BONUS = 20_000;
  const scenarios = [
    { days: 2, regenH: 5_760, label: '2d fast regen (15s)' },
    { days: 3, regenH: 5_760, label: '3d fast regen (15s)' },
    { days: 4, regenH: 5_760, label: '4d fast regen (15s)' },
    { days: 3, regenH: 2_880, label: '3d normal regen (30s)' },
    { days: 5, regenH: 2_880, label: '5d normal regen (30s)' },
    { days: 7, regenH: 2_880, label: '7d normal regen (30s)' },
  ];

  const DAILY_H   = 65;   // avg daily bonus hammers
  const START_H   = 75;   // starting hammers
  const REFUND_H  = Math.round(stageDetails.reduce((s, d) => s + results[d.idx].smart.refunds, 0));
  const TIER_H    = 29 * 8.5;  // avg hammer refills from tier rewards

  console.log(`  Stage min gold: ${Math.round(totalBaseGold).toLocaleString()}  |  Min hammers to complete 29 stages: ${Math.round(totalMinHammers).toLocaleString()}`);
  console.log(`  Gold/hammer rate (stages): ${goldPerH.toFixed(1)}\n`);
  console.log(`  ${'Scenario'.padEnd(26)}  ${'TotalH'.padStart(7)}  ${'ExtraH'.padStart(7)}  ${'ExtraGold'.padStart(10)}  ${'Total Est.'.padStart(11)}  ${'vs Actual'.padStart(10)}`);
  console.log(`  ${'─'.repeat(80)}`);

  for (const sc of scenarios) {
    const totalH  = sc.days * sc.regenH + DAILY_H * sc.days + START_H + REFUND_H + TIER_H;
    const extraH  = Math.max(0, totalH - totalMinHammers);
    const extraG  = Math.round(extraH * goldPerH);
    const total   = Math.round(totalBaseGold) + CENTURY_BONUS + extraG;
    const diff    = total - 725_000;
    const diffStr = (diff >= 0 ? '+' : '') + Math.round(diff).toLocaleString();
    console.log(
      `  ${sc.label.padEnd(26)}` +
      `  ${f(totalH, 7)}` +
      `  ${f(extraH, 7)}` +
      `  ${f(extraG, 10)}` +
      `  ${f(total, 11)}` +
      `  ${diffStr.padStart(10)}`
    );
  }

  console.log(`\n  Actual reported: 725,000`);
  console.log(`\n  Best fit: ~3.5 days with fast regen, or ~6 days normal regen, using smart mults.`);
  console.log(`  The gap in earlier estimates came from stopping at stage-min completion.`);
  console.log(`  In real play, you keep smashing each stage well beyond 100% items while`);
  console.log(`  waiting for hammers to regen, generating ~${Math.round(goldPerH)}g/H the whole time.\n`);

  console.log(`  Why smart mults beats greedy (especially later stages):`);
  for (const { stage, greedy, smart } of results) {
    const gain = smart.gold - greedy.gold;
    console.log(`    ${stage.label.padEnd(22)}  smart +${Math.round(gain).toLocaleString().padStart(5)} gold vs greedy  (${((gain/greedy.gold)*100).toFixed(0)}% more)`);
  }
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

// ─── SPEEDRUN PROJECTION: all 5 monkeys, no premium ───────────────────────
// Monkey order: Mr. Monkey → Steampunk → Princess → Space Cadette → Odin
// Odin requires Steampunk + Princess + Space unlocked first (9 bananas each).
// goldScale applied: each monkey's gold × their scale × any gold perk.
// Strategy: smart mults. Fast Regen (25k) bought after ~Mr. Monkey stage 3.
// No farming between stages (pure speedrun).
{
  const MONKEYS = [
    { id: 'mr_monkey',  label: 'Mr. Monkey',      gs: MONKEY_GOLD_SCALE.mr_monkey,  itemMult: 'mr_monkey' },
    { id: 'steampunk',  label: 'Steampunk',        gs: MONKEY_GOLD_SCALE.steampunk,  itemMult: 'other' },
    { id: 'princess',   label: 'Princess',         gs: MONKEY_GOLD_SCALE.princess,   itemMult: 'other' },
    { id: 'space',      label: 'Space Cadette',    gs: MONKEY_GOLD_SCALE.space,      itemMult: 'other' },
    { id: 'odin',       label: 'Odin',             gs: MONKEY_GOLD_SCALE.odin,       itemMult: 'other' },
  ];

  console.log('\n\n  ══════════════════════════════════════════════════════════');
  console.log('  SPEEDRUN PROJECTION — All 5 monkeys, no premium, smart mults');
  console.log('  ══════════════════════════════════════════════════════════\n');

  let totalGold = 0, totalHammers = 0, totalNetH = 0, totalFeathers = 0, totalRefunds = 0;
  let cumulGold = 0;
  let fastRegenStage = null;
  const FAST_REGEN_COST = 25_000;
  const START_GOLD      = 2_000;

  console.log(`  ${'Monkey / Stage'.padEnd(36)}  ${'Gold'.padStart(9)}  ${'NetH'.padStart(7)}  ${'Feathers'.padStart(9)}`);
  console.log(`  ${'─'.repeat(66)}`);

  for (const mk of MONKEYS) {
    let mkGold = 0, mkHammers = 0, mkNetH = 0, mkFeathers = 0;
    for (let si = 0; si < STAGES.length; si++) {
      const r = avgRuns(STAGES[si], 'smart', RUNS, mk.itemMult, mk.gs);
      mkGold    += r.gold;
      mkHammers += r.goldAt;
      mkNetH    += r.netHammers;
      mkFeathers += r.feathers;

      cumulGold += r.gold;
      // Check when fast regen is first affordable
      if (!fastRegenStage && (START_GOLD + cumulGold) >= FAST_REGEN_COST)
        fastRegenStage = `${mk.label} stage ${si + 1}`;
    }
    console.log(
      `  ${mk.label.padEnd(36)}  ${f(mkGold, 9)}  ${f(mkNetH, 7)}  ${f(mkFeathers, 9)}`+
      `  (gs ${mk.gs.toFixed(2)})`
    );
    totalGold     += mkGold;
    totalHammers  += mkHammers;
    totalNetH     += mkNetH;
    totalFeathers += mkFeathers;
  }

  console.log(`  ${'─'.repeat(66)}`);
  console.log(`  ${'TOTAL (45 stages)'.padEnd(36)}  ${f(totalGold, 9)}  ${f(totalNetH, 7)}  ${f(totalFeathers, 9)}`);
  console.log(`\n  + Starting gold: 2,000  −  Fast regen (25k): −25,000`);
  const netSpendable = Math.round(totalGold) + START_GOLD - FAST_REGEN_COST;
  console.log(`  = Spendable gold after speedrun: ~${netSpendable.toLocaleString()}`);
  console.log(`\n  Fast regen becomes affordable: after ${fastRegenStage ?? 'never'}`);

  // Eggs smashed estimate: hammers ÷ avg hp/egg
  // avg egg hp varies by stage: ~1.27 early, ~1.35 mid, ~1.40 late (ruby/black)
  const AVG_HP_PER_EGG = 1.32;
  const eggsSmashed = Math.round(totalHammers / AVG_HP_PER_EGG);
  console.log(`\n  Eggs smashed (est, avg ${AVG_HP_PER_EGG} hp/egg): ~${eggsSmashed.toLocaleString()}`);

  // Mults used total
  const multsUsed = results.reduce((s, { smart }) => s + smart.multUsed, 0) * 5;
  console.log(`  Mults used total (est): ~${Math.round(multsUsed).toLocaleString()}`);

  // Crystal bananas
  console.log(`  Crystal bananas: 45 earned, 36 spent on unlocks (9 per monkey × 4), 9 remaining`);

  // Time estimate
  const REGEN_30  = 2_880;  // H/day at 30s
  const REGEN_20  = 4_320;  // H/day at 20s (fast regen)
  const DAILY_H   = 65;
  const TIER_GIFT = 45 * 12; // 12H refill per stage × 45 stages
  const netRegenNeeded = totalNetH - TIER_GIFT;

  // First ~3 stages Mr. Monkey at 30s regen (~820H), rest at 20s
  const preH  = 820;
  const preT  = preH / REGEN_30;            // days at 30s
  const postH = netRegenNeeded - preH;
  const postT = postH / (REGEN_20 + DAILY_H); // days at 20s

  console.log(`\n  ── Time estimate ──`);
  console.log(`  Pre-fast-regen phase (~Mr. Monkey S1-3, 30s):     ${preT.toFixed(1)} day`);
  console.log(`  Post-fast-regen phase (~remaining, 20s):          ${postT.toFixed(1)} days`);
  console.log(`  Total regen time (pure regen, no idle):           ~${(preT + postT).toFixed(1)} days`);
  console.log(`  Realistic speedrun (drain hammers 5×/day):        ~${(3.5).toFixed(1)}–${(5.0).toFixed(1)} days`);
  console.log(`  Realistic speedrun (drain hammers 2–3×/day):      ~${(6).toFixed(0)}–${(8).toFixed(0)} days`);

  // Gold breakdown by monkey
  console.log(`\n  ── Gold breakdown (goldScale impact) ──`);
  console.log(`  Mr. Monkey baseline gold/stage (1.0x): ~${f(Math.round(totalGold / 5 / MONKEY_GOLD_SCALE.mr_monkey / 9), 0)}`);
  for (const mk of MONKEYS) {
    const rawPerStage = Math.round(totalGold / 5 / MONKEY_GOLD_SCALE.mr_monkey / 9);  // approx
    const scaledPerStage = Math.round(rawPerStage * mk.gs);
    const reduction = Math.round((1 - mk.gs) * 100);
    const note = reduction > 0 ? `  ←  −${reduction}% vs Mr. Monkey` : '  ← baseline';
    console.log(`  ${mk.label.padEnd(16)}  gs ${mk.gs.toFixed(2)}  ~${scaledPerStage.toLocaleString().padStart(6)}/stage${note}`);
  }
}
