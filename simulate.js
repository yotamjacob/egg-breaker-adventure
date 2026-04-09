#!/usr/bin/env node
// ============================================================
//  Egg Breaker Adventures – Completion Time Simulator
//  simulate.js
//
//  Run with: node simulate.js
//  Uses config.js and data.js values to Monte Carlo simulate
//  how long a dedicated player takes to 100% the game.
//
//  Assumptions:
//    - Player taps 1 egg per second (1 hammer spent per second)
//    - Player always smashes eggs as fast as possible
//    - Player uses multipliers on gold eggs when available
//    - Player triggers starfall as soon as they have 5 star pieces
//    - Player plays one monkey at a time, sequentially
//    - Hammer regen runs in parallel (1 per 30s standard)
//    - Daily login gives hammers once per day
//    - No shop purchases (conservative estimate)
//    - No equipment bonuses (baseline only)
// ============================================================

// Load config and data
const _fs = require('fs');
const _load = (f) => new Function(_fs.readFileSync(__dirname + '/' + f, 'utf8').replace(/^const /gm, 'var ') + '; return { CONFIG, MONKEY_DATA };')();
var CONFIG, MONKEY_DATA;
(() => {
  const _c = new Function(_fs.readFileSync(__dirname + '/config.js', 'utf8').replace(/^const /gm, 'var ') + '; return CONFIG;')();
  CONFIG = _c;
  const _d = new Function('CONFIG', _fs.readFileSync(__dirname + '/data.js', 'utf8').replace(/^const /gm, 'var ') + '; return { MONKEY_DATA, PRIZE_WEIGHTS, GOLD_VALUES, MULT_VALUES, HAMMER_PRIZES, EGG_HP, EGG_SPAWN_WEIGHTS, ACHIEVEMENT_DATA };')(CONFIG);
  MONKEY_DATA = _d.MONKEY_DATA;
})();

const RUNS = 5000;

// -------------------- Helpers --------------------
function weightedRoll(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randRange(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// -------------------- Simulate one full playthrough --------------------
function simulateGame() {
  const C = CONFIG;

  let totalTaps = 0;       // 1 tap = 1 second
  let hammers = C.startingHammers;
  let maxH = C.startingMaxHammers;
  let starPieces = 0;
  let gold = 0;
  let multQueue = [];
  let crystalBananas = 0;

  // Hammer regen: track fractional regen
  // Every tap is 1 second, so every tap gives 1/regenInterval of a hammer
  const regenRate = 1 / C.regenInterval;

  // Daily bonus: one claim per 86400 taps (seconds in a day)
  const SECONDS_PER_DAY = 86400;
  let nextDailyClaim = 0;
  let consecutiveDays = 0;

  // Egg spawn weights
  const spawnTotal = C.eggSpawnWeights.normal + C.eggSpawnWeights.silver + C.eggSpawnWeights.gold;

  function spawnEggType() {
    const r = Math.random() * spawnTotal;
    if (r < C.eggSpawnWeights.gold) return 'gold';
    if (r < C.eggSpawnWeights.gold + C.eggSpawnWeights.silver) return 'silver';
    return 'normal';
  }

  function rollPrizeType(eggType) {
    return weightedRoll(C.prizeWeights[eggType]);
  }

  function rollItemIsNew(items, collected) {
    const rw = C.itemRarityWeights;
    const weights = items.map((item, i) => {
      const baseW = item[2] === 1 ? rw.common : item[2] === 2 ? rw.uncommon : rw.rare;
      return collected[i] ? baseW * C.itemDuplicateMultiplier : baseW * C.itemPityMultiplier;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return collected[i] ? -1 : i; // -1 = duplicate, else index
    }
    return -1;
  }

  // Wait for hammers (simulates idle regen + time passing)
  function waitForHammers(needed) {
    if (hammers >= needed) return;
    const deficit = needed - hammers;
    const ticksNeeded = Math.ceil(deficit / regenRate);
    totalTaps += ticksNeeded;
    hammers += ticksNeeded * regenRate;

    // Check daily claims during wait
    while (totalTaps >= nextDailyClaim) {
      consecutiveDays++;
      const bonus = Math.min(consecutiveDays * C.dailyBonusPerDay, C.dailyBonusCap);
      hammers = Math.min(maxH, hammers + C.dailyBaseHammers + bonus);
      nextDailyClaim += SECONDS_PER_DAY;
    }

    hammers = Math.min(maxH, hammers);
  }

  // Process each monkey sequentially
  // First monkey is free, others cost crystal bananas
  const monkeyOrder = [0]; // start with mr monkey
  const monkeysToUnlock = [1, 2, 3];

  function playMonkey(monkeyIdx) {
    const monkey = MONKEY_DATA[monkeyIdx];

    for (let stageIdx = 0; stageIdx < monkey.stages.length; stageIdx++) {
      const stage = monkey.stages[stageIdx];
      const items = stage.collection.items;
      const collected = items.map(() => false);
      let collectedCount = 0;
      const totalItems = items.length;

      // Keep smashing until all items collected (gold tier = 100%)
      while (collectedCount < totalItems) {

        // Generate a round of eggs
        const roundSize = stage.eggs;
        const eggs = [];
        for (let i = 0; i < roundSize; i++) {
          const type = spawnEggType();
          eggs.push({ type, hp: C.eggHP[type] });
        }

        // Check starfall
        if (starPieces >= C.starPiecesForStarfall) {
          starPieces -= C.starPiecesForStarfall;
          // Starfall: break all eggs for free
          for (const egg of eggs) {
            const prizeType = rollPrizeType(egg.type);
            if (prizeType === 'item') {
              const idx = rollItemIsNew(items, collected);
              if (idx >= 0) { collected[idx] = true; collectedCount++; }
            } else if (prizeType === 'star') {
              const silverMult = egg.type === 'silver' ? 2 : 1;
              starPieces += silverMult > 1 ? C.starPiecesPerDrop.silver : C.starPiecesPerDrop.normal;
            } else if (prizeType === 'mult') {
              multQueue.push(pickFrom(C.multiplierValues));
            } else if (prizeType === 'hammers') {
              hammers = Math.min(maxH, hammers + pickFrom(C.hammerPrizeAmounts));
            }
            // gold/feather/empty don't affect completion speed
          }
          totalTaps += 1; // starfall takes ~1 second
          continue;
        }

        // Smash each egg
        for (const egg of eggs) {
          // Wait for enough hammers for all hits
          waitForHammers(egg.hp);

          // Each hit = 1 tap = 1 second
          for (let hit = 0; hit < egg.hp; hit++) {
            hammers -= 1;
            totalTaps += 1;

            // Regen during play
            hammers += regenRate;
            hammers = Math.min(maxH, hammers);

            // Daily claim check
            if (totalTaps >= nextDailyClaim) {
              consecutiveDays++;
              const bonus = Math.min(consecutiveDays * C.dailyBonusPerDay, C.dailyBonusCap);
              hammers = Math.min(maxH, hammers + C.dailyBaseHammers + bonus);
              nextDailyClaim += SECONDS_PER_DAY;
            }
          }

          // Egg broken — roll prize
          const prizeType = rollPrizeType(egg.type);

          if (prizeType === 'item') {
            const idx = rollItemIsNew(items, collected);
            if (idx >= 0) { collected[idx] = true; collectedCount++; }
          } else if (prizeType === 'star') {
            const silverMult = egg.type === 'silver' ? 2 : 1;
            starPieces += silverMult > 1 ? C.starPiecesPerDrop.silver : C.starPiecesPerDrop.normal;
          } else if (prizeType === 'mult') {
            multQueue.push(pickFrom(C.multiplierValues));
          } else if (prizeType === 'hammers') {
            hammers = Math.min(maxH, hammers + pickFrom(C.hammerPrizeAmounts));
          }
          // gold/feathers/empty: track gold for potential shop use but
          // we're doing a no-shop-purchase baseline sim

          if (collectedCount >= totalItems) break;
        }
      }

      // Stage complete — earn crystal banana, increase max hammers
      crystalBananas += C.crystalBananasPerStage;
      maxH += C.tierRewards.silver.maxHammers + C.tierRewards.gold.maxHammers; // both tier-ups
      hammers = Math.min(maxH, hammers + C.tierRewards.silver.hammerRefill + C.tierRewards.gold.hammerRefill);
    }
  }

  // Play monkey 0 first
  playMonkey(0);

  // Unlock and play remaining monkeys
  for (const mi of monkeysToUnlock) {
    // Wait until we have enough crystal bananas
    // (we may already have enough from previous monkeys)
    // If not, we'd need to replay stages — but the game doesn't support that,
    // so we just check. Each monkey's 9 stages give 9 bananas = exactly 1 unlock.
    if (crystalBananas >= MONKEY_DATA[mi].cost) {
      crystalBananas -= MONKEY_DATA[mi].cost;
      playMonkey(mi);
    }
    // If somehow not enough, skip (shouldn't happen with 9 stages per monkey)
  }

  return totalTaps;
}

// -------------------- Run simulations --------------------
console.log('');
console.log('========================================');
console.log(' EGG BREAKER ADVENTURES - TIME ESTIMATE');
console.log('========================================');
console.log('');
console.log('Assumptions:');
console.log('  - 1 tap per second (dedicated nonstop play)');
console.log('  - No shop purchases (baseline)');
console.log('  - No equipment bonuses');
console.log('  - Starfall used immediately when available');
console.log('  - Hammer regen: 1 per ' + CONFIG.regenInterval + 's');
console.log('  - Daily bonus claimed once per 24h');
console.log('');

// Count total items
let totalItemsAll = 0;
let totalStagesAll = 0;
for (const m of MONKEY_DATA) {
  for (const s of m.stages) {
    totalItemsAll += s.collection.items.length;
    totalStagesAll++;
  }
}
console.log('Game content:');
console.log('  Monkeys:      ' + MONKEY_DATA.length);
console.log('  Total stages: ' + totalStagesAll);
console.log('  Total items:  ' + totalItemsAll);
console.log('');

// Egg spawn probabilities
const spawnTotal = CONFIG.eggSpawnWeights.normal + CONFIG.eggSpawnWeights.silver + CONFIG.eggSpawnWeights.gold;
console.log('Egg spawn rates:');
console.log('  Normal: ' + (CONFIG.eggSpawnWeights.normal / spawnTotal * 100).toFixed(1) + '%  (1 HP)');
console.log('  Silver: ' + (CONFIG.eggSpawnWeights.silver / spawnTotal * 100).toFixed(1) + '%  (2 HP)');
console.log('  Gold:   ' + (CONFIG.eggSpawnWeights.gold / spawnTotal * 100).toFixed(1) + '%  (3 HP)');
console.log('');

// Item drop chance per egg type
console.log('Item drop chance per egg break:');
for (const type of ['normal', 'silver', 'gold']) {
  const w = CONFIG.prizeWeights[type];
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  console.log('  ' + type + ': ' + (w.item / total * 100).toFixed(1) + '%');
}
console.log('');

console.log('Running ' + RUNS + ' simulations...');
console.log('');

const results = [];
for (let i = 0; i < RUNS; i++) {
  results.push(simulateGame());
}

results.sort((a, b) => a - b);

const avg = results.reduce((a, b) => a + b, 0) / results.length;
const median = results[Math.floor(results.length / 2)];
const p10 = results[Math.floor(results.length * 0.1)];
const p90 = results[Math.floor(results.length * 0.9)];
const min = results[0];
const max = results[results.length - 1];

function fmt(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const d = (seconds / 86400).toFixed(1);
  if (h < 1) return m + ' min';
  if (h < 24) return h + 'h ' + m + 'm';
  return d + ' days (' + h + 'h ' + m + 'm)';
}

console.log('────────────────────────────────────────');
console.log(' RESULTS (nonstop play, 1 tap/sec)');
console.log('────────────────────────────────────────');
console.log('');
console.log('  Average:    ' + fmt(avg).padStart(22) + '   (' + Math.round(avg) + ' taps)');
console.log('  Median:     ' + fmt(median).padStart(22) + '   (' + median + ' taps)');
console.log('  Fastest:    ' + fmt(min).padStart(22) + '   (' + min + ' taps)');
console.log('  Slowest:    ' + fmt(max).padStart(22) + '   (' + max + ' taps)');
console.log('  10th %ile:  ' + fmt(p10).padStart(22) + '   (' + p10 + ' taps)');
console.log('  90th %ile:  ' + fmt(p90).padStart(22) + '   (' + p90 + ' taps)');
console.log('');
console.log('────────────────────────────────────────');
console.log(' PLAY SESSION ESTIMATES');
console.log('────────────────────────────────────────');
console.log('');

const sessions = [
  ['Nonstop (24/7)',            86400],
  ['Hardcore (8h/day)',         8 * 3600],
  ['Dedicated (4h/day)',        4 * 3600],
  ['Casual (1h/day)',           3600],
  ['Light (30min/day)',         1800],
  ['Mobile (15min/day)',        900],
];

for (const [label, secsPerDay] of sessions) {
  const days = Math.ceil(avg / secsPerDay);
  console.log('  ' + (label + ':').padEnd(24) + (days + ' days').padStart(10));
}

console.log('');
console.log('────────────────────────────────────────');
console.log(' PER-MONKEY BREAKDOWN (avg of ' + RUNS + ' runs)');
console.log('────────────────────────────────────────');
console.log('');

// Run per-monkey sims
const perMonkey = MONKEY_DATA.map(() => []);
for (let run = 0; run < Math.min(RUNS, 1000); run++) {
  let tapsUsed = 0;
  let hammers = CONFIG.startingHammers;
  let maxH = CONFIG.startingMaxHammers;
  let starPieces = 0;
  const regenRate = 1 / CONFIG.regenInterval;

  for (let mi = 0; mi < MONKEY_DATA.length; mi++) {
    const startTaps = tapsUsed;
    const monkey = MONKEY_DATA[mi];

    for (const stage of monkey.stages) {
      const items = stage.collection.items;
      const collected = items.map(() => false);
      let count = 0;

      while (count < items.length) {
        const roundSize = stage.eggs;
        for (let e = 0; e < roundSize && count < items.length; e++) {
          const type = spawnEggType();
          const hp = CONFIG.eggHP[type];

          // Wait + hit
          for (let h = 0; h < hp; h++) {
            if (hammers < 1) {
              const wait = Math.ceil((1 - hammers) / regenRate);
              tapsUsed += wait;
              hammers += wait * regenRate;
            }
            hammers -= 1;
            tapsUsed += 1;
            hammers += regenRate;
            hammers = Math.min(maxH, hammers);
          }

          const prizeType = weightedRoll(CONFIG.prizeWeights[type]);
          if (prizeType === 'item') {
            const rw = CONFIG.itemRarityWeights;
            const weights = items.map((item, i) => {
              const bw = item[2] === 1 ? rw.common : item[2] === 2 ? rw.uncommon : rw.rare;
              return collected[i] ? bw * CONFIG.itemDuplicateMultiplier : bw * CONFIG.itemPityMultiplier;
            });
            const total = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * total;
            for (let i = 0; i < items.length; i++) {
              r -= weights[i];
              if (r <= 0) { if (!collected[i]) { collected[i] = true; count++; } break; }
            }
          } else if (prizeType === 'star') {
            starPieces += type === 'silver' ? CONFIG.starPiecesPerDrop.silver : CONFIG.starPiecesPerDrop.normal;
          } else if (prizeType === 'hammers') {
            hammers = Math.min(maxH, hammers + pickFrom(CONFIG.hammerPrizeAmounts));
          }
        }
      }
      maxH += CONFIG.tierRewards.silver.maxHammers + CONFIG.tierRewards.gold.maxHammers;
      hammers = Math.min(maxH, hammers + 10);
    }

    perMonkey[mi].push(tapsUsed - startTaps);
  }

  function spawnEggType() {
    const r = Math.random() * spawnTotal;
    if (r < CONFIG.eggSpawnWeights.gold) return 'gold';
    if (r < CONFIG.eggSpawnWeights.gold + CONFIG.eggSpawnWeights.silver) return 'silver';
    return 'normal';
  }
}

for (let mi = 0; mi < MONKEY_DATA.length; mi++) {
  const m = MONKEY_DATA[mi];
  const arr = perMonkey[mi];
  const a = arr.reduce((x, y) => x + y, 0) / arr.length;
  const items = m.stages.reduce((s, st) => s + st.collection.items.length, 0);
  console.log('  ' + m.emoji + ' ' + m.name.padEnd(20) + fmt(a).padStart(12) + '   (' + items + ' items, ' + m.stages.length + ' stages)');
}

console.log('');
