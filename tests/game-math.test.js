// ============================================================
//  Egg Smash Adventures — Game Math Unit Tests
//  Run: node --test tests/
//  Uses Node's built-in test runner (no extra dependencies).
// ============================================================

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Load CONFIG from source — tests break if config changes break invariants.
// Wrap in a function so `const` declarations are accessible and returnable.
const _configSrc = fs.readFileSync(path.join(__dirname, '../config.js'), 'utf8');
const { CONFIG } = new Function(_configSrc + '\nreturn { CONFIG, VERSION };')();

// ── Pure functions inlined from source (copy must stay in sync) ──────────────

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function multEquation(base, multVals, result, unit, balloonMult, customPrefix) {
  const chipTotal = multVals ? multVals.reduce((a, b) => a + b, 0) : 1;
  const totalMult = chipTotal * (balloonMult || 1);
  const prefix = customPrefix !== undefined ? customPrefix : (balloonMult ? '🎈 POP! ' : '');
  return prefix + '+' + result + ' ' + unit + ' (' + totalMult + 'x' + base + ' ' + unit + ')';
}

function offlineHammersEarned(hammers, maxH, savedAt, now, regenCD, fastRegen) {
  if (savedAt <= 0 || hammers >= maxH) return { hammers, regenCD };
  const elapsed = Math.floor((now - savedAt) / 1000);
  if (elapsed <= 0) return { hammers, regenCD };
  const interval = fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
  if (elapsed < regenCD) return { hammers, regenCD };
  const earned = 1 + Math.floor((elapsed - regenCD) / interval);
  return { hammers: Math.min(maxH, hammers + earned), regenCD };
}

function featherCost(rarity, stageIdx, stagesCompleted) {
  const rarityKey = rarity === 1 ? 'common' : rarity === 2 ? 'uncommon' : 'rare';
  const base = CONFIG.featherItemCost[rarityKey];
  const overallProgress = (stagesCompleted || 0) + stageIdx;
  return Math.round(base * Math.pow(CONFIG.featherStageMultiplier, overallProgress));
}

// ── formatNum ────────────────────────────────────────────────────────────────

describe('formatNum', () => {
  test('small numbers pass through as-is', () => {
    assert.equal(formatNum(0), '0');
    assert.equal(formatNum(999), '999');
    assert.equal(formatNum(9999), '9999');
  });

  test('10K threshold', () => {
    assert.equal(formatNum(10000), '10.0K');
    assert.equal(formatNum(12500), '12.5K');
    assert.equal(formatNum(999999), '1000.0K');
  });

  test('1M threshold', () => {
    assert.equal(formatNum(1000000), '1.0M');
    assert.equal(formatNum(2500000), '2.5M');
  });
});

// ── multEquation ─────────────────────────────────────────────────────────────

describe('multEquation', () => {
  test('chip-only mult (no balloon)', () => {
    const result = multEquation(10, [5], 50, 'gold', undefined, undefined);
    assert.equal(result, '+50 gold (5x10 gold)');
  });

  test('chip-only with custom prefix', () => {
    const result = multEquation(10, [5], 50, 'gold', undefined, '');
    assert.equal(result, '+50 gold (5x10 gold)');
  });

  test('balloon only (no chips)', () => {
    const result = multEquation(10, null, 100, 'gold', 10, undefined);
    assert.equal(result, '🎈 POP! +100 gold (10x10 gold)');
  });

  test('balloon + chips additive', () => {
    // chipTotal=5, balloonMult=10 → totalMult=50, prefix from balloon
    const result = multEquation(10, [5], 150, 'gold', 10, '🎈 POP! ');
    assert.equal(result, '🎈 POP! +150 gold (50x10 gold)');
  });

  test('century egg prefix', () => {
    const result = multEquation(5, null, 500, 'gold', 100, '🌀 Century Egg! ');
    assert.equal(result, '🌀 Century Egg! +500 gold (100x5 gold)');
  });

  test('multiple chip values sum correctly', () => {
    // chips [2, 3] → chipTotal=5
    const result = multEquation(20, [2, 3], 100, 'stars', undefined, undefined);
    assert.equal(result, '+100 stars (5x20 stars)');
  });
});

// ── Offline regen ─────────────────────────────────────────────────────────────

describe('offline regen', () => {
  const interval = CONFIG.regenInterval;   // 30s
  const fastInt  = CONFIG.fastRegenInterval; // 15s
  const now = Date.now();
  const maxH = 60;

  test('no regen when already at max', () => {
    const { hammers } = offlineHammersEarned(60, 60, now - 120000, now, 30, false);
    assert.equal(hammers, 60);
  });

  test('no regen when not enough time has passed', () => {
    // regenCD=30, elapsed=15 → not enough
    const { hammers } = offlineHammersEarned(50, maxH, now - 15000, now, 30, false);
    assert.equal(hammers, 50);
  });

  test('exactly 1 regen interval earns 1 hammer', () => {
    // regenCD=30, elapsed=30 → 1 hammer
    const { hammers } = offlineHammersEarned(50, maxH, now - 30000, now, 30, false);
    assert.equal(hammers, 51);
  });

  test('multiple intervals earn correct count', () => {
    // regenCD=10, elapsed=100 → first hammer at 10s, then (100-10)/30=3 more → 4 total
    const { hammers } = offlineHammersEarned(50, maxH, now - 100000, now, 10, false);
    assert.equal(hammers, 54);
  });

  test('caps at maxH', () => {
    // Huge elapsed time — should not exceed maxH
    const { hammers } = offlineHammersEarned(10, maxH, now - 999999000, now, 5, false);
    assert.equal(hammers, maxH);
  });

  test('fast regen uses shorter interval', () => {
    // regenCD=15, elapsed=60s, fastInterval=15 → first at 15s, then (60-15)/15=3 more → 4 total
    const { hammers } = offlineHammersEarned(50, maxH, now - 60000, now, 15, true);
    assert.equal(hammers, 54);
  });

  test('no regen when savedAt is 0 (new game)', () => {
    const { hammers } = offlineHammersEarned(50, maxH, 0, now, 30, false);
    assert.equal(hammers, 50);
  });
});

// ── CONFIG sanity ─────────────────────────────────────────────────────────────

describe('CONFIG.eggTypes sanity', () => {
  test('all egg types have required fields', () => {
    for (const egg of CONFIG.eggTypes) {
      assert.ok(egg.id,          `${egg.id}: missing id`);
      assert.ok(egg.hp >= 1,     `${egg.id}: hp must be >= 1`);
      assert.ok(egg.spawnWeight >= 0, `${egg.id}: spawnWeight must be >= 0`);
      assert.ok(egg.goldMult > 0,     `${egg.id}: goldMult must be > 0`);
      assert.ok(egg.prizes,           `${egg.id}: missing prizes`);
    }
  });

  test('prize weights are all non-negative', () => {
    for (const egg of CONFIG.eggTypes) {
      for (const [key, val] of Object.entries(egg.prizes)) {
        assert.ok(val >= 0, `${egg.id}.prizes.${key} must be >= 0, got ${val}`);
      }
    }
  });

  test('each egg has at least one non-zero prize weight', () => {
    for (const egg of CONFIG.eggTypes) {
      const total = Object.values(egg.prizes).reduce((a, b) => a + b, 0);
      assert.ok(total > 0, `${egg.id}: all prize weights are 0`);
    }
  });

  test('normal egg can be empty, gold egg cannot', () => {
    const normal = CONFIG.eggTypes.find(e => e.id === 'normal');
    const gold   = CONFIG.eggTypes.find(e => e.id === 'gold');
    assert.ok(normal.prizes.empty > 0, 'normal egg should have empty chance');
    assert.equal(gold.prizes.empty, 0, 'gold egg should never be empty');
  });

  test('harder eggs have higher hp', () => {
    const byId = Object.fromEntries(CONFIG.eggTypes.map(e => [e.id, e]));
    assert.ok(byId.silver.hp > byId.normal.hp, 'silver > normal hp');
    assert.ok(byId.gold.hp > byId.silver.hp,   'gold > silver hp');
    assert.ok(byId.crystal.hp > byId.gold.hp,  'crystal > gold hp');
    assert.ok(byId.ruby.hp > byId.crystal.hp,  'ruby > crystal hp');
    assert.ok(byId.black.hp > byId.ruby.hp,    'black > ruby hp');
    assert.ok(byId.century.hp > byId.black.hp, 'century > black hp');
  });

  test('spawn weights sum to 100 (approximate)', () => {
    // Century has unlockMonkey0 requirement so may not count in normal pool;
    // just verify standard eggs sum close to 100
    const standard = CONFIG.eggTypes.filter(e => !e.unlockMonkey0);
    const total = standard.reduce((a, e) => a + e.spawnWeight, 0);
    assert.ok(total > 90 && total <= 110,
      `Standard egg spawn weights sum to ${total}, expected ~100`);
  });
});

describe('CONFIG.goldValues sanity', () => {
  test('all gold ranges have min <= max', () => {
    for (const [key, [min, max]] of Object.entries(CONFIG.goldValues)) {
      assert.ok(min <= max, `goldValues.${key}: min ${min} > max ${max}`);
      assert.ok(min >= 1,   `goldValues.${key}: min must be >= 1`);
    }
  });

  test('gold_s < gold_m < gold_l (min values)', () => {
    const { gold_s, gold_m, gold_l } = CONFIG.goldValues;
    assert.ok(gold_s[0] < gold_m[0], 'gold_s min should be < gold_m min');
    assert.ok(gold_m[0] < gold_l[0], 'gold_m min should be < gold_l min');
  });
});

describe('CONFIG.tierThresholds sanity', () => {
  test('thresholds are strictly increasing 0→1', () => {
    const { bronze, silver, gold } = CONFIG.tierThresholds;
    assert.ok(bronze > 0 && bronze < 1, `bronze threshold ${bronze} out of range`);
    assert.ok(silver > bronze,          `silver ${silver} must be > bronze ${bronze}`);
    assert.ok(gold   >= silver,         `gold ${gold} must be >= silver ${silver}`);
    assert.ok(gold   <= 1,              `gold threshold ${gold} must be <= 1`);
  });
});

// ── featherCost ───────────────────────────────────────────────────────────────

describe('featherCost', () => {
  test('stage 0, stagesCompleted 0 returns base cost', () => {
    assert.equal(featherCost(1, 0, 0), CONFIG.featherItemCost.common);
    assert.equal(featherCost(2, 0, 0), CONFIG.featherItemCost.uncommon);
    assert.equal(featherCost(3, 0, 0), CONFIG.featherItemCost.rare);
  });

  test('cost increases with stage progress (across several stages)', () => {
    // Multiplier is 1.10 and base common cost is 3, so 1-2 stages may round back to 3.
    // Use stage 5+ where difference is unambiguous.
    const c0  = featherCost(1, 0, 0);
    const c5  = featherCost(1, 5, 0);
    const c5b = featherCost(1, 0, 5);
    assert.ok(c5  > c0, `cost at stage 5 (${c5}) should be > stage 0 (${c0})`);
    assert.ok(c5b > c0, `cost after 5 completed stages (${c5b}) should be > 0 (${c0})`);
  });

  test('rarer items cost more at same stage', () => {
    const common   = featherCost(1, 0, 0);
    const uncommon = featherCost(2, 0, 0);
    const rare     = featherCost(3, 0, 0);
    assert.ok(uncommon > common, 'uncommon should cost more than common');
    assert.ok(rare > uncommon,   'rare should cost more than uncommon');
  });

  test('multiplier compounds correctly', () => {
    const mult = CONFIG.featherStageMultiplier;
    const expected = Math.round(CONFIG.featherItemCost.common * mult * mult);
    assert.equal(featherCost(1, 1, 1), expected);
  });
});
