// ============================================================
//  Egg Breaker Adventures – Tuning Config
//  config.js  (load before data.js and game.js)
//
//  All drop rates, spawn chances, and reward values in one place.
//  Tweak these numbers to balance the game.
// ============================================================

const VERSION = '3.2.1';

const CONFIG = {

  // ----------------------------------------------------------
  // 1. EGG SPAWNING
  //    Relative weights — higher = more common.
  //    A "normal:75, silver:18, gold:7" means ~75% normal, ~18% silver, ~7% gold.
  // ----------------------------------------------------------
  eggSpawnWeights: {
    normal: 80,
    silver: 15,
    gold:   5,
  },

  // HP per egg type (hits to break)
  eggHP: {
    normal: 1,
    silver: 2,
    gold:   3,
  },

  // ----------------------------------------------------------
  // 2. PRIZE TYPE WEIGHTS (per egg type)
  //    What kind of reward drops when an egg breaks.
  //    Relative weights — they don't need to sum to 100.
  //
  //    Types: empty, gold_s, gold_m, gold_l, star, mult,
  //           feather, item, hammers
  // ----------------------------------------------------------
  prizeWeights: {
    normal: { empty:12, gold_s:22, gold_m:13, gold_l:5,  star:8,  mult:7,  feather:10, item:15, hammers:0 },
    silver: { empty:0,  gold_s:10, gold_m:18, gold_l:12, star:10, mult:10, feather:10, item:20, hammers:8 },
    gold:   { empty:0,  gold_s:0,  gold_m:15, gold_l:20, star:12, mult:10, feather:8,  item:25, hammers:7 },
  },

  // ----------------------------------------------------------
  // 3. GOLD DROP RANGES
  //    [min, max] for each gold tier.
  // ----------------------------------------------------------
  goldValues: {
    gold_s: [2,   8],    // small
    gold_m: [10,  30],   // medium
    gold_l: [40, 120],   // large
  },

  // ----------------------------------------------------------
  // 4. STAR PIECES (Starfall Shards)
  //    Drop chance is controlled by prizeWeights above.
  //    These control how many pieces drop per find.
  // ----------------------------------------------------------
  starPiecesPerDrop: {
    normal: 1,    // from normal or gold eggs
    silver: 2,    // silver eggs give double
  },
  starPiecesForStarfall: 5,   // how many needed to trigger starfall

  // ----------------------------------------------------------
  // 5. FEATHERS
  //    Drop chance is controlled by prizeWeights above.
  //    Base amount is random in [min, max], then multiplied
  //    by 2 for silver eggs.
  // ----------------------------------------------------------
  featherDropRange: [1, 2],   // base range (before silver 2x)

  // ----------------------------------------------------------
  // 6. MULTIPLIER VALUES
  //    Pool of possible multiplier drops. Duplicates in the
  //    array make that value more common.
  //    e.g. two 2's and two 3's = 25% each, one 50 = 12.5%
  // ----------------------------------------------------------
  // x2: ~20%, x3: ~15%, x5: ~10%, x10: ~5%, x50: ~5%, x123: ~2.5%
  multiplierValues: [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 10, 10, 50, 50, 123],

  // ----------------------------------------------------------
  // 7. HAMMER PRIZES (from silver eggs only)
  //    Pool of possible amounts. Equal chance each.
  // ----------------------------------------------------------
  hammerPrizeAmounts: [2, 3, 5, 5, 8],

  // ----------------------------------------------------------
  // 8. COLLECTION ITEMS
  //    Drop chance is controlled by prizeWeights "item" weight.
  //    These control rarity weights within the item roll.
  // ----------------------------------------------------------
  itemRarityWeights: {
    common:   15,   // rarity 1
    uncommon: 5,    // rarity 2
    rare:     1,    // rarity 3
  },

  // Feather cost to buy an album item directly.
  // Cost = base cost for rarity x stage multiplier.
  // Stage multiplier = featherStageMult[0] for stage 1, increasing per stage.
  featherItemCost: {
    common:   3,    // rarity 1 base cost
    uncommon: 8,    // rarity 2 base cost
    rare:     20,   // rarity 3 base cost
  },
  featherStageMultiplier: 1.5,  // cost multiplied by this^(stageIndex) — stage1=1x, stage2=1.5x, stage3=2.25x...

  // Gold given when you roll a duplicate item
  duplicateGoldRange: [1, 5],   // [min, max]

  // ----------------------------------------------------------
  // 9. CRYSTAL BANANAS
  //    Earned by completing stages. Controls how many per completion
  //    and how many needed to unlock a monkey.
  // ----------------------------------------------------------
  crystalBananasPerStage: 1,    // earned when finishing a stage at gold tier
  crystalBananasToUnlock: 7,    // cost to unlock a new monkey

  // ----------------------------------------------------------
  // 10. STAGE TIER THRESHOLDS
  //     Fraction of collection items needed to advance tiers.
  // ----------------------------------------------------------
  tierThresholds: {
    bronze: 0.40,   // 40% of items → silver tier
    silver: 0.70,   // 70% of items → gold tier (unlocks next stage)
    gold:   1.00,   // 100% of items → complete (banana reward)
  },

  // Rewards for tier-ups (max hammer increases)
  tierRewards: {
    silver: { maxHammers: 5,  hammerRefill: 5 },
    gold:   { maxHammers: 10, hammerRefill: 5 },
  },

  // ----------------------------------------------------------
  // 11. MULTIPLIER BONUS GOLD
  //     When a multiplier is active and the prize type can't be
  //     multiplied directly (multipliers, items), give bonus gold.
  // ----------------------------------------------------------
  multBonusGoldBase: 5,   // bonus gold = this x activeMult

  // ----------------------------------------------------------
  // 12. DAILY LOGIN
  // ----------------------------------------------------------
  dailyBaseHammers:    40,    // hammers on day 1
  dailyBonusPerDay:    5,     // extra hammers per consecutive day
  dailyBonusCap:       100,   // max streak bonus

  // ----------------------------------------------------------
  // 13. HAMMER REGENERATION
  // ----------------------------------------------------------
  regenInterval:       30,    // seconds per hammer (standard)
  fastRegenInterval:   15,    // seconds per hammer (with upgrade)

  // ----------------------------------------------------------
  // 14. STARTING RESOURCES
  // ----------------------------------------------------------
  startingHammers:     40,
  startingMaxHammers:  40,
};
