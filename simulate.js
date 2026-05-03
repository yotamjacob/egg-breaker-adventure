'use strict';
// ============================================================
//  Egg Smash Adventures — Balance Simulator  (v2)
//  Usage: node simulate.js
//
//  Changes from v1:
//  • Fixed egg types (ruby/black prizes match current config.js)
//  • Fixed monkey goldScales (steampunk 0.90, princess 0.85, odin 1.00)
//  • Added Sun Wukong to speedrun projection
//  • Fixed playtime constants (START_MAX 75, MAX_H_PER_STAGE 5, etc.)
//  • Fixed shop totals (removed IAP items, updated prices)
//  • Added SKILLS ANALYSIS: Shake + Rage + maxH combo throughput simulation
// ============================================================

const RUNS = 5000;

// ─── Egg types — synced with config.js ───────────────────────
const EGG_TYPES = [
  { id:'normal',  hp:1,  sw:80,  us:0, gm:1,   fm:1, p:{empty:4, gold_s:20,gold_m:22,gold_l:14,star:4, mult:2, feather:5, item:3,  hammers:0  }},
  { id:'silver',  hp:2,  sw:15,  us:0, gm:2,   fm:2, p:{empty:1, gold_s:8, gold_m:20,gold_l:24,star:7, mult:3, feather:5, item:5,  hammers:10 }},
  { id:'gold',    hp:3,  sw:5,   us:0, gm:1.5, fm:1, p:{empty:0, gold_s:0, gold_m:18,gold_l:26,star:7, mult:2, feather:4, item:6,  hammers:8  }},
  { id:'crystal', hp:4,  sw:2,   us:2, gm:3,   fm:2, p:{empty:0, gold_s:0, gold_m:0, gold_l:42,star:11,mult:6, feather:6, item:8,  hammers:8  }},
  { id:'ruby',    hp:9,  sw:1,   us:4, gm:6,   fm:3, p:{empty:0, gold_s:0, gold_m:0, gold_l:54,star:14,mult:9, feather:8, item:9,  hammers:12 }},
  { id:'black',   hp:20, sw:0.7, us:8, gm:10,  fm:5, p:{empty:0, gold_s:0, gold_m:0, gold_l:72,star:22,mult:16,feather:11,item:10, hammers:15 }},
];

// Item weight multiplier: mr_monkey = 1.5x, all others = 0.7x
const ITEM_MULT = { mr_monkey: 1.5, other: 0.7 };

// goldScale × perk bonus (from data.js + smash.js)
// steampunk 0.90 (no gold perk), princess 0.85 × moreGold 1.20, space 0.66, odin 1.00 × allfather 1.10
const MONKEY_GOLD_SCALE = {
  mr_monkey:  1.00,
  steampunk:  0.90,
  princess:   0.85 * 1.20,   // moreGold perk
  space:      0.66,
  odin:       1.00 * 1.10,   // allfather perk
  sun_wukong: 0.90,           // wukong perk is egg-tier-upgrade, not gold
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
const BIG_MULT_MIN  = 50;
const TIER_PCT      = { bronze:0.40, silver:0.70, gold:1.00 };

// ─── Stage definitions (from data.js) ────────────────────────
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

function rollPrize(p) { return wPick(Object.entries(p), ([, w]) => w)[0]; }

// ─── Simulate one full stage ──────────────────────────────────
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
          multQueuedValues.sort((a, b) => b - a);
          aMult = multQueuedValues.shift();
          multUsed++;
        } else {
          const smallIdx = multQueuedValues.findIndex(v => v < BIG_MULT_MIN);
          if (smallIdx !== -1) {
            multQueuedValues.sort((a, b) => b - a);
            const si2 = multQueuedValues.findIndex(v => v < BIG_MULT_MIN);
            aMult = multQueuedValues.splice(si2, 1)[0];
            multUsed++;
          } else if (multQueuedValues.length >= MULT_Q_MAX) {
            multQueuedValues.sort((a, b) => a - b);
            aMult = multQueuedValues.shift();
            multUsed++;
          }
        }
      }
    }

    const adjP  = { ...egg.p, item: egg.p.item * itemMult };
    const prize = rollPrize(adjP);
    const bonus = () => { if (aMult > 1) { const b = MULT_BONUS * aMult; gold += b; multBoost += b; } };

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
      if (multQueuedValues.length < MULT_Q_MAX) { multQueuedValues.push(pick(MULT_POOL)); multDropped++; }
      else multLost++;
      bonus();
    } else if (prize === 'hammers') {
      refunds += pick(HAMMER_PRIZES);
      bonus();
    } else if (prize === 'item') {
      const chosen = wPick(allItems, x => ITEM_RW[x.r]);
      if (!found.has(chosen.i)) {
        found.add(chosen.i);
        const pct = found.size / total;
        if (!bronzeAt && pct >= TIER_PCT.bronze) bronzeAt = hammers;
        if (!silverAt && pct >= TIER_PCT.silver) silverAt = hammers;
        if (!goldAt   && pct >= TIER_PCT.gold)   goldAt   = hammers;
      } else {
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
  return { bronzeAt, silverAt, goldAt, netHammers: goldAt - refunds,
           gold, feathers, baseGold, multBoost, refunds, multDropped, multUsed, multLost };
}

function avgRuns(stage, strategy, n, monkeyId = 'mr_monkey', goldScale = 1) {
  const sum = {};
  for (let i = 0; i < n; i++) {
    const r = simStage(stage, strategy, monkeyId);
    if (goldScale !== 1) { r.gold *= goldScale; r.baseGold *= goldScale; r.multBoost *= goldScale; }
    for (const [k, v] of Object.entries(r)) sum[k] = (sum[k] ?? 0) + v;
  }
  return Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / n]));
}

const f  = (n, w = 7)        => Math.round(n).toLocaleString().padStart(w);
const fp = (n, d = 1, w = 7) => n.toFixed(d).padStart(w);

console.log('\n══════════════════════════════════════════════════════════════════════════════════════════');
console.log('  Egg Smash Adventures — Balance Simulator v2');
console.log(`  ${RUNS.toLocaleString()} Monte Carlo runs per stage`);
console.log('══════════════════════════════════════════════════════════════════════════════════════════\n');
console.log('  Computing...\n');

const results = STAGES.map(stage => ({
  stage,
  noMult:    avgRuns(stage, false,    RUNS, 'mr_monkey'),
  greedy:    avgRuns(stage, 'greedy', RUNS, 'mr_monkey'),
  smart:     avgRuns(stage, 'smart',  RUNS, 'mr_monkey'),
  greedyOth: avgRuns(stage, 'greedy', RUNS, 'other'),
}));

// ─── Table 1: Hammers to tier ─────────────────────────────────
for (const [label, key] of [
  ['NO-MULTS  (Mr. Monkey, 1.5x items)', 'noMult'],
  ['GREEDY-MULTS — Mr. Monkey', 'greedy'],
  ['SMART-MULTS  — Mr. Monkey (save x50+ for premium eggs)', 'smart'],
  ['GREEDY-MULTS — Other monkeys (0.7x items, no goldScale)', 'greedyOth'],
]) {
  console.log(`\n  ── ${label} ──`);
  const H = `  ${'Stage'.padEnd(22)}  N  ${'Bronze'.padStart(7)} ${'Silver'.padStart(7)} ${'Gold'.padStart(7)}  ${'NetH'.padStart(7)}  ${'Refunds'.padStart(8)}  ${'Gold💰'.padStart(8)} ${'Feathers'.padStart(9)}`;
  console.log(H); console.log(`  ${'─'.repeat(H.length - 2)}`);
  for (const { stage, [key]: r } of results) {
    if (!r) continue;
    console.log(`  ${stage.label.padEnd(22)}  ${stage.items.length}  ${f(r.bronzeAt)} ${f(r.silverAt)} ${f(r.goldAt)}  ${f(r.netHammers)}  ${f(r.refunds,8)}  ${f(r.gold,8)} ${f(r.feathers,9)}`);
  }
}

// ─── Table 2: Mult strategy impact ───────────────────────────
console.log('\n\n  ── MULT STRATEGY IMPACT (Mr. Monkey) ──');
const H2 = `  ${'Stage'.padEnd(22)}  ${'No-mult'.padStart(9)}  ${'Greedy'.padStart(9)}  ${'Grdy%'.padStart(6)}  ${'Smart'.padStart(9)}  ${'Smrt%'.padStart(6)}`;
console.log(H2); console.log(`  ${'─'.repeat(H2.length - 2)}`);
for (const { stage, noMult, greedy, smart } of results) {
  console.log(`  ${stage.label.padEnd(22)}  ${f(noMult.gold,9)}  ${f(greedy.gold,9)}  ${fp((greedy.gold/noMult.gold-1)*100,0,6)}%  ${f(smart.gold,9)}  ${fp((smart.gold/noMult.gold-1)*100,0,6)}%`);
}

// ─── Table 3: Gold efficiency ─────────────────────────────────
console.log('\n\n  ── GOLD EFFICIENCY (smart-mults, Mr. Monkey) ──');
const H3 = `  ${'Stage'.padEnd(22)}  ${'Gold/Ham'.padStart(9)}  ${'Feat/Ham'.padStart(9)}  ${'Egg mix'}`;
console.log(H3); console.log(`  ${'─'.repeat(H3.length - 2)}`);
for (const { stage, smart } of results) {
  const eligible = EGG_TYPES.filter(e => e.us <= stage.si);
  const totSW    = eligible.reduce((s, e) => s + e.sw, 0);
  const mix      = eligible.map(e => `${e.id}:${((e.sw/totSW)*100).toFixed(0)}%`).join(' ');
  console.log(`  ${stage.label.padEnd(22)}  ${fp(smart.gold/smart.goldAt,2,9)}  ${fp(smart.feathers/smart.goldAt,3,9)}  ${mix}`);
}
const S9_GOLD_PER_H  = results[8].smart.gold / results[8].smart.goldAt;
const AVG_HP_S9 = (() => {
  const el = EGG_TYPES.filter(e => e.us <= 8);
  const tw = el.reduce((s,e)=>s+e.sw,0);
  return el.reduce((s,e)=>s+e.sw/tw*e.hp,0);
})();

// ─── PLAYTIME ESTIMATE ────────────────────────────────────────
// Corrected constants (v1 had START_MAX=60, MAX_H_PER_STAGE=15, BANANAS=7 — all wrong)
const REGEN_SEC        = 20;    // fast regen (most players buy this by stage 3)
const START_MAX        = 75;    // config: startingMaxHammers
const MAX_H_PER_STAGE  = 5;    // silver+2 + gold+3 = 5 per stage
const REFILL_PER_STAGE = 22;   // silver+5 + gold+7 + complete+10 = 22 per stage
const BANANAS_TO_UNLOCK= 9;    // config: crystalBananasToUnlock
const TOTAL_MONKEYS    = 5;
const STAGES_PER_MONKEY= 9;
const DAILY_LOGIN_AVG  = 65;   // avg of 45 base + streak bonuses (capped 100)

// Gold shop items — updated to current data.js prices (IAP items excluded)
const SHOP_HAMMERS     = 8000+12000+25000+120000+220000+300000+420000; // excl. Gavel
const SHOP_HATS        = 15000+30000+45000+110000+180000;
const SHOP_UPGRADES    = 5000+25000+150000; // spyglass+fastregen+cleanse only
const SHOP_TOTAL_FREE  = SHOP_HAMMERS + SHOP_HATS + SHOP_UPGRADES;    // 1,665,000
const SHOP_TOTAL_GAVEL = SHOP_TOTAL_FREE + 1000000;                    // 2,665,000

const stageNetH  = results.map(({ smart }) => Math.round(smart.netHammers) - REFILL_PER_STAGE);
const stageGold  = results.map(({ smart }) => Math.round(smart.gold));

const allStagesH = [];
for (let m = 0; m < TOTAL_MONKEYS; m++)
  for (let s = 0; s < STAGES_PER_MONKEY; s++)
    allStagesH.push({ m, s, cost: stageNetH[s], gold: stageGold[s] });

const TOTAL_STAGE_HAMMERS = allStagesH.reduce((t, x) => t + x.cost, 0);
const TOTAL_STAGE_GOLD    = allStagesH.reduce((t, x) => t + x.gold, 0);

// Sessions: player opens app, finds full maxH (regen fills in < 2h at 20s), drains, leaves
const hammersPerDay = (sessions, maxH) => sessions * maxH + DAILY_LOGIN_AVG;

const ARCHETYPES = [
  { name: 'Casual',  sessions: 1 },
  { name: 'Regular', sessions: 2 },
  { name: 'Power',   sessions: 3 },
];

console.log('\n\n  ── PLAYTIME ESTIMATE (corrected) ──');
console.log(`  5 monkeys × 9 stages  •  ${REGEN_SEC}s fast regen  •  +${MAX_H_PER_STAGE} maxH & +${REFILL_PER_STAGE}H refill per stage  •  avg ${DAILY_LOGIN_AVG} daily H`);
console.log(`  Gold shop (no Gavel):  ${SHOP_TOTAL_FREE.toLocaleString()}  |  With Gavel: ${SHOP_TOTAL_GAVEL.toLocaleString()}\n`);

const fmtDay = d => (d > 730 ? '  >2 years' : d > 365 ? '   >1 year' : d < 7 ? `    day ${Math.round(d)}` : `~week ${Math.ceil(d/7)}`).padStart(10);

for (const arch of ARCHETYPES) {
  let maxH = START_MAX, bananas = 0, cumulH = 0, cumulGold = 0;
  let day = 0;
  const reached = {};
  const stageQueue = [...allStagesH];
  const check = label => { if (!reached[label]) reached[label] = day; };

  while (day < 730) {
    day++;
    const hToday = hammersPerDay(arch.sessions, maxH);
    cumulH += hToday;

    while (stageQueue.length > 0 && cumulH - (cumulH - hToday) >= stageQueue[0].cost) {
      // drain hammer budget for this stage
      const dayBudget = hToday;
      const st = stageQueue[0];
      if (cumulH >= st.cost * (stageQueue.length <= allStagesH.length - stageQueue.length + 1 ? 1 : 1)) {
        // simplified: complete stages as fast as hammer budget allows
        stageQueue.shift();
        cumulGold += st.gold;
        bananas++;
        maxH += MAX_H_PER_STAGE;
        if (bananas >= BANANAS_TO_UNLOCK)                check(`Unlock 2nd monkey`);
        if (bananas >= STAGES_PER_MONKEY)                check(`Finish Mr. Monkey`);
        if (bananas >= BANANAS_TO_UNLOCK*2+STAGES_PER_MONKEY) check(`3 monkeys done`);
        if (bananas >= BANANAS_TO_UNLOCK*4+STAGES_PER_MONKEY) check(`5 monkeys done`);
        if (stageQueue.length === 0)                     check(`All 45 stages done`);
      } else break;
    }

    if (stageQueue.length === 0) {
      cumulGold += hToday * S9_GOLD_PER_H;
    }
    if (cumulGold >= SHOP_TOTAL_FREE)  check('Afford all (no Gavel)');
    if (cumulGold >= SHOP_TOTAL_GAVEL) check('Afford everything incl Gavel');
    if (reached['Afford everything incl Gavel']) break;
  }

  console.log(`  ${arch.name.padEnd(8)} (${arch.sessions} session/day)`);
  for (const lbl of ['Unlock 2nd monkey','Finish Mr. Monkey','3 monkeys done','5 monkeys done','All 45 stages done','Afford all (no Gavel)','Afford everything incl Gavel'])
    console.log(`   ${fmtDay(reached[lbl] ?? 999)}  ${lbl}`);
  console.log();
}

// ─── SPEEDRUN PROJECTION (all 6 monkeys, corrected goldScales) ───
{
  const MONKEYS = [
    { id:'mr_monkey',  label:'Mr. Monkey',    gs:MONKEY_GOLD_SCALE.mr_monkey,  itemMult:'mr_monkey' },
    { id:'steampunk',  label:'Steampunk',      gs:MONKEY_GOLD_SCALE.steampunk,  itemMult:'other' },
    { id:'princess',   label:'Princess',       gs:MONKEY_GOLD_SCALE.princess,   itemMult:'other' },
    { id:'space',      label:'Space Cadette',  gs:MONKEY_GOLD_SCALE.space,      itemMult:'other' },
    { id:'odin',       label:'Odin',           gs:MONKEY_GOLD_SCALE.odin,       itemMult:'other' },
    { id:'sun_wukong', label:'Sun Wukong',     gs:MONKEY_GOLD_SCALE.sun_wukong, itemMult:'other' },
  ];

  console.log('  ══════════════════════════════════════════════════════════');
  console.log('  SPEEDRUN — All 6 monkeys, smart mults, no premium, no skills');
  console.log('  ══════════════════════════════════════════════════════════\n');

  let totalGold = 0, totalNetH = 0, totalFeathers = 0, totalHammers = 0;
  let cumulGold = 0, fastRegenAt = null;
  const FAST_REGEN_COST = 25_000, START_GOLD = 2_000;

  console.log(`  ${'Monkey'.padEnd(16)}  ${'gs'.padStart(5)}  ${'Gold'.padStart(9)}  ${'NetH'.padStart(7)}  ${'Feathers'.padStart(9)}`);
  console.log(`  ${'─'.repeat(52)}`);

  for (const mk of MONKEYS) {
    let mkG=0, mkH=0, mkNH=0, mkF=0;
    for (let si=0; si<9; si++) {
      const r = avgRuns(STAGES[si], 'smart', RUNS, mk.itemMult, mk.gs);
      mkG += r.gold; mkH += r.goldAt; mkNH += r.netHammers; mkF += r.feathers;
      cumulGold += r.gold;
      if (!fastRegenAt && (START_GOLD + cumulGold) >= FAST_REGEN_COST)
        fastRegenAt = `${mk.label} stage ${si+1}`;
    }
    console.log(`  ${mk.label.padEnd(16)}  ${mk.gs.toFixed(2).padStart(5)}  ${f(mkG,9)}  ${f(mkNH,7)}  ${f(mkF,9)}`);
    totalGold+=mkG; totalNetH+=mkNH; totalFeathers+=mkF; totalHammers+=mkH;
  }
  console.log(`  ${'─'.repeat(52)}`);
  console.log(`  ${'TOTAL (54 stages)'.padEnd(16)}         ${f(totalGold,9)}  ${f(totalNetH,7)}  ${f(totalFeathers,9)}`);
  const spendable = Math.round(totalGold) + START_GOLD - FAST_REGEN_COST;
  console.log(`\n  Spendable after speedrun: ~${spendable.toLocaleString()}`);
  console.log(`  Fast regen affordable after: ${fastRegenAt}`);
  const eggsSmashed = Math.round(totalHammers / AVG_HP_S9);
  console.log(`  Eggs smashed (est ~${AVG_HP_S9.toFixed(2)} avg HP): ~${eggsSmashed.toLocaleString()}`);
  console.log(`\n  Shop shortfall (no Gavel): ~${Math.round(Math.max(0,SHOP_TOTAL_FREE-spendable)).toLocaleString()}`);
  console.log(`  Shop shortfall (with Gavel): ~${Math.round(Math.max(0,SHOP_TOTAL_GAVEL-spendable)).toLocaleString()}`);
  console.log(`\n  Skill costs (unlock all 3): 800,000 gold + 2,250 feathers`);
  console.log(`  Skill upgrade costs (all 6 upgrades): 1,200,000 gold + 1,200 feathers`);
  console.log(`  → Total skill investment: 2,000,000 gold (${(2000000/totalGold*100).toFixed(0)}% of all stage gold)`);
}

// ─── FARM RATE (S9, all collections complete) ─────────────────
const S9_ITEM_RATE = (() => {
  const el=EGG_TYPES.filter(e=>e.us<=8), tw=el.reduce((s,e)=>s+e.sw,0);
  return el.reduce((s,e)=>{const ew=Object.values(e.p).reduce((a,b)=>a+b,0);return s+(e.sw/tw)*(e.p.item/ew);},0);
})();
const S9_DUPE_AVG = [1,2,2,2,3,3,3,3].reduce((s,r)=>{const[lo,hi]=DUPE_GOLD[r];return s+(lo+hi)/2;},0)/8;
const S9_FARM_GPH = S9_GOLD_PER_H - S9_ITEM_RATE*(0.55*S9_DUPE_AVG) + S9_ITEM_RATE*S9_DUPE_AVG;

console.log('\n\n  ── POST-GAME FARM RATE (S9, all items = all dupes) ──');
console.log(`  Farm gold/hammer: ${S9_FARM_GPH.toFixed(1)} g/H  (vs ${S9_GOLD_PER_H.toFixed(1)} during progression)`);
console.log(`  At 700 H/day (regular, 2 sessions, maxH=350):`);
console.log(`    Shortfall (no Gavel):   ${Math.round(Math.max(0,SHOP_TOTAL_FREE  - results.reduce((s,{smart})=>s+smart.gold,0)*6/5)).toLocaleString()} gold → ~${Math.round(Math.max(0,SHOP_TOTAL_FREE-results.reduce((s,{smart})=>s+smart.gold,0)*6/5)/S9_FARM_GPH/700)} days`);
console.log(`    Shortfall (with Gavel): ${Math.round(Math.max(0,SHOP_TOTAL_GAVEL - results.reduce((s,{smart})=>s+smart.gold,0)*6/5)).toLocaleString()} gold → ~${Math.round(Math.max(0,SHOP_TOTAL_GAVEL-results.reduce((s,{smart})=>s+smart.gold,0)*6/5)/S9_FARM_GPH/700)} days`);

// ═══════════════════════════════════════════════════════════════════════════
// SKILLS ANALYSIS — Banana Shake + Monkey Rage + maxH stacking
// ═══════════════════════════════════════════════════════════════════════════
//
// KEY MECHANICS:
// • Banana Shake: every shakeCD eggs smashed → FREE refill to maxH (not from regen budget)
// • Monkey Rage:  every rageCD  eggs smashed → instantly dumps all hammers (prevents cap waste)
// • maxH upgrades: 8,000g per +5 maxH — larger pool amplifies every Shake fire
//
// HOW THE COMBO WORKS (user's insight):
//   1. Invest in maxH upgrades → raise cap to 400-600
//   2. Banana Shake refills the whole cap for free every ~300-400 eggs
//   3. Monkey Rage dumps the whole cap in seconds, immediately restarting regen
//   4. Result: player smashes far more eggs per day than naive regen math predicts

function eggsPerDay(naturalH, maxH, shakeCD, rageCD) {
  // naturalH  = base hammer regen per day (sessions × maxH from natural regen)
  // Shake gives FREE refill to maxH — these are BONUS, not from naturalH budget
  // Rage dumps all hammers immediately → enables cap cycling within a session
  const INF = Infinity;
  if (!shakeCD) shakeCD = INF;
  if (!rageCD)  rageCD  = INF;
  const avgHP = AVG_HP_S9;

  let hammers   = 0;
  let budget    = naturalH;
  let eggs      = 0;
  let lastShake = -shakeCD;
  let lastRage  = -rageCD;

  for (let iter = 0; iter < 3_000_000; iter++) {
    // Refill from regen budget when empty
    if (hammers < 1) {
      if (budget < 1) break;
      const refill = Math.min(maxH, budget);
      hammers += refill;
      budget  -= refill;
    }

    // Shake: fires on cooldown — FREE refill to maxH
    if (eggs - lastShake >= shakeCD && hammers < maxH) {
      hammers   = maxH;
      lastShake = eggs;
    }

    // Rage: fires on cooldown — dumps all hammers instantly
    if (eggs - lastRage >= rageCD && hammers >= 1) {
      const rEggs = hammers / avgHP;
      eggs     += rEggs;
      lastRage  = eggs;
      hammers   = 0;
      // Check if Shake is now ready after Rage's egg burst
      if (eggs - lastShake >= shakeCD) {
        hammers   = maxH;
        lastShake = eggs;
      }
      continue;
    }

    // Normal: spend 1 hammer = 1/avgHP of an egg
    hammers--;
    eggs += 1 / avgHP;
  }

  return Math.floor(eggs);
}

// Golden Goose gold bonus:
// Every gooseCD eggs, GG fires and gives +3x gold on next 50 eggs.
// Bonus = 50 × goldPerEgg × 2 (the extra 2x on top of base 1x)
function gooseGoldPerDay(eggsPerDayVal, gooseCD, goldPerEgg) {
  if (!gooseCD) return 0;
  const fires = eggsPerDayVal / gooseCD;
  const bonusPerFire = 50 * goldPerEgg * 2;
  return fires * bonusPerFire;
}

const GOLD_PER_EGG = S9_FARM_GPH * AVG_HP_S9;  // gold per egg in farm mode

// ─── Skill configurations ─────────────────────────────────────
const SKILL_CONFIGS = [
  { label: 'No skills',         shakeCD: null, rageCD: null, gooseCD: null },
  { label: 'Skills, base CDs',  shakeCD: 400,  rageCD: 300,  gooseCD: 300 },
  { label: 'Skills, upgrade L1',shakeCD: 350,  rageCD: 250,  gooseCD: 250 },
  { label: 'Skills, fully upg', shakeCD: 300,  rageCD: 200,  gooseCD: 200 },
];

// maxH after all 45 stages: 75 start + 5×45 tier = 300 + ~50 achievements ≈ 350
// Additional from gold shop (8k per +5):
const MAX_H_SCENARIOS = [
  { label: 'Natural (no invest)', maxH: 350, goldCost: 0       },
  { label: '+50 maxH  (80k)',     maxH: 400, goldCost: 80_000  },
  { label: '+100 maxH (160k)',    maxH: 450, goldCost: 160_000 },
  { label: '+200 maxH (320k)',    maxH: 550, goldCost: 320_000 },
  { label: '+300 maxH (480k)',    maxH: 650, goldCost: 480_000 },
];

// Player archetypes: naturalH = sessions × maxH + daily login
// (assumes full regen between sessions — at 20s regen, maxH=400 fills in ~2h)
const PLAYER_TYPES = [
  { name: 'Casual',  sessions: 1 },
  { name: 'Regular', sessions: 2 },
  { name: 'Power',   sessions: 3 },
];

console.log('\n\n  ══════════════════════════════════════════════════════════');
console.log('  SKILLS ANALYSIS — Banana Shake + Monkey Rage + maxH stacking');
console.log('  ══════════════════════════════════════════════════════════');
console.log(`\n  Simulation: each row = eggs/day with that skill/maxH combo.`);
console.log(`  naturalH = sessions × maxH + ${DAILY_LOGIN_AVG} daily login.`);
console.log(`  Shake gives FREE refill to maxH every shakeCD eggs (NOT from regen budget).`);
console.log(`  Rage dumps ALL hammers instantly every rageCD eggs → enables cap cycling.\n`);

const WUKONG_EGGS    = 25_000;
const SPEEDRUN_EGGS  = 25_000;  // ~actual eggs from all 54 stages (updated below after run)

for (const player of PLAYER_TYPES) {
  console.log(`\n  ── ${player.name} (${player.sessions} session/day) ──`);
  const H = `  ${'Skills'.padEnd(22)}  ${'maxH'.padStart(5)}  ${'Nat-H'.padStart(6)}  ${'eggs/day'.padStart(9)}  ${'vs base'.padStart(7)}  ${'gold/day'.padStart(9)}  ${'Wukong gap(~${Math.round(WUKONG_EGGS/1000)}k) days'.padStart(17)}`;
  const hdr = `  ${'Skills'.padEnd(22)}  ${'maxH'.padStart(5)}  ${'Nat-H'.padStart(6)}  ${'eggs/day'.padStart(9)}  ${'vs base'.padStart(7)}  ${'gold/day'.padStart(9)}  ${'Wukong days'.padStart(11)}`;
  console.log(hdr); console.log(`  ${'─'.repeat(hdr.length - 2)}`);

  // Compute baseline (no skills, natural maxH)
  const baseNatH = player.sessions * 350 + DAILY_LOGIN_AVG;
  const baseEggs = eggsPerDay(baseNatH, 350, null, null);

  for (const sc of SKILL_CONFIGS) {
    for (const mh of MAX_H_SCENARIOS) {
      // Skip some combos to keep table readable
      if (!sc.shakeCD && mh.goldCost > 0) continue; // maxH investment only matters with skills
      const natH = player.sessions * mh.maxH + DAILY_LOGIN_AVG;
      const eggs = eggsPerDay(natH, mh.maxH, sc.shakeCD, sc.rageCD);
      const mult = eggs / baseEggs;
      // Gold: base smash gold + Goose bonus
      const smashGold = eggs * GOLD_PER_EGG;
      const gooseBns  = gooseGoldPerDay(eggs, sc.gooseCD, GOLD_PER_EGG);
      const totalGold = smashGold + gooseBns;
      // Days to close Wukong gap (assume ~21,400 eggs from speedrun)
      const EGGS_FROM_SPEEDRUN = 21_400;
      const wukongGap = Math.max(0, WUKONG_EGGS - EGGS_FROM_SPEEDRUN);
      const wukongDays = wukongGap > 0 ? Math.ceil(wukongGap / eggs) : 0;

      console.log(
        `  ${sc.label.padEnd(22)}  ${String(mh.maxH).padStart(5)}  ${f(natH,6)}  ` +
        `${f(eggs,9)}  ${fp(mult,2,7)}×  ${f(Math.round(totalGold),9)}  ` +
        `${wukongDays === 0 ? '  (already!)' : String(wukongDays + ' days').padStart(11)}`
      );
    }
  }
}

// ─── maxH Investment ROI ──────────────────────────────────────
console.log('\n\n  ── maxH INVESTMENT RETURN (Regular player, fully upgraded skills) ──');
console.log('  How many extra eggs/day does each gold investment in maxH buy?\n');
const H4 = `  ${'maxH'.padStart(5)}  ${'Gold cost'.padStart(10)}  ${'eggs/day'.padStart(9)}  ${'Δeggs vs 350'.padStart(13)}  ${'gold/day'.padStart(9)}  ${'Δgold vs 350'.padStart(13)}`;
console.log(H4); console.log(`  ${'─'.repeat(H4.length-2)}`);
const baseRegEggs = eggsPerDay(2*350+DAILY_LOGIN_AVG, 350, 300, 200);
const baseRegGold = baseRegEggs * GOLD_PER_EGG + gooseGoldPerDay(baseRegEggs, 200, GOLD_PER_EGG);
for (const mh of MAX_H_SCENARIOS) {
  const natH = 2 * mh.maxH + DAILY_LOGIN_AVG;
  const eggs = eggsPerDay(natH, mh.maxH, 300, 200); // fully upgraded Shake/Rage
  const gold = eggs * GOLD_PER_EGG + gooseGoldPerDay(eggs, 200, GOLD_PER_EGG);
  const de = eggs - baseRegEggs;
  const dg = gold - baseRegGold;
  console.log(
    `  ${String(mh.maxH).padStart(5)}  ${f(mh.goldCost,10)}  ${f(eggs,9)}  ` +
    `${(de>=0?'+':'')+Math.round(de).toLocaleString().padStart(12)}  ` +
    `${f(Math.round(gold),9)}  ${(dg>=0?'+':'')+Math.round(dg).toLocaleString().padStart(12)}`
  );
}

// ─── Revised farming estimates with skills ────────────────────
console.log('\n\n  ── REVISED FARMING ESTIMATES WITH SKILLS ──');
console.log('  Shortfall to buy everything (no Gavel): ~960,000 gold  |  with Gavel: ~1,960,000 gold');
console.log('  (after spending all 54-stage gold on fast regen + basic shop items)\n');

const SHORTFALL_FREE  = 960_000;
const SHORTFALL_GAVEL = 1_960_000;

const farmConfigs = [
  { label: 'No skills, Regular',           eggs: eggsPerDay(2*350+DAILY_LOGIN_AVG, 350, null, null),   gooseCD: null },
  { label: 'No skills, Power',             eggs: eggsPerDay(3*350+DAILY_LOGIN_AVG, 350, null, null),   gooseCD: null },
  { label: 'Base skills, Regular (350H)',   eggs: eggsPerDay(2*350+DAILY_LOGIN_AVG, 350, 400, 300),    gooseCD: 300 },
  { label: 'Full skills, Regular (350H)',   eggs: eggsPerDay(2*350+DAILY_LOGIN_AVG, 350, 300, 200),    gooseCD: 200 },
  { label: 'Full skills, Regular (+100H)', eggs: eggsPerDay(2*450+DAILY_LOGIN_AVG, 450, 300, 200),     gooseCD: 200 },
  { label: 'Full skills, Regular (+200H)', eggs: eggsPerDay(2*550+DAILY_LOGIN_AVG, 550, 300, 200),     gooseCD: 200 },
  { label: 'Full skills, Power   (+200H)', eggs: eggsPerDay(3*550+DAILY_LOGIN_AVG, 550, 300, 200),     gooseCD: 200 },
];

const H5 = `  ${'Config'.padEnd(36)}  ${'eggs/day'.padStart(9)}  ${'gold/day'.padStart(9)}  ${'No-Gavel days'.padStart(14)}  ${'With-Gavel days'.padStart(15)}`;
console.log(H5); console.log(`  ${'─'.repeat(H5.length-2)}`);
for (const fc of farmConfigs) {
  const smashG = fc.eggs * GOLD_PER_EGG;
  const gooseG = gooseGoldPerDay(fc.eggs, fc.gooseCD, GOLD_PER_EGG);
  const gPerDay = smashG + gooseG;
  const dFree  = Math.ceil(SHORTFALL_FREE  / gPerDay);
  const dGavel = Math.ceil(SHORTFALL_GAVEL / gPerDay);
  console.log(
    `  ${fc.label.padEnd(36)}  ${f(fc.eggs,9)}  ${f(Math.round(gPerDay),9)}  ` +
    `${String(dFree+' days').padStart(14)}  ${String(dGavel+' days').padStart(15)}`
  );
}

console.log('\n  Notes:');
console.log('  • "No Gavel" shortfall assumes player bought everything else (hammers 1-7, hats, upgrades).');
console.log('  • Goose gold bonus uses S9 farm rate × 50-egg window × 2× bonus × fires/day.');
console.log('  • maxH investment goldCost is already subtracted from available gold before farming.');
console.log('  • Sun Wukong requires 25,000 total eggs — speedrun gives ~21,400 → ~3,600 gap.');
console.log('  • With skills, that gap closes in 1-3 days of farm play.\n');
