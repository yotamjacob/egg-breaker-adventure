// ============================================================
//  Egg Breaker Adventures – Tuning Config
//  config.js  (load before data.js and game.js)
//
//  All drop rates, spawn chances, and reward values in one place.
//  Tweak these numbers to balance the game.
// ============================================================

const VERSION = '4.3.4';

const CONFIG = {

  // ----------------------------------------------------------
  // 1. EGG TYPES — single source of truth for all egg properties.
  //    To add a new egg: just append an entry here. Everything
  //    else (SVG, particles, prizes, spawning) reads from this.
  // ----------------------------------------------------------
  eggTypes: [
    {
      id: 'normal', name: 'Normal', emoji: '🥚',
      hp: 1, spawnWeight: 80, unlockStage: 0,
      goldMult: 1, featherMult: 1, starPieces: 1,
      colors: { f:'#FEF9F0', s:'#D4A853', h:'#fff8e0', sh:'#b8922e' },
      particles: ['#ffe8b0','#e8c878','#d4a840','#c09028'],
      prizes: { empty:12, gold_s:22, gold_m:13, gold_l:5, star:8, mult:7, feather:5, item:15, hammers:0 },
      desc: 'Can be empty',
    },
    {
      id: 'silver', name: 'Silver', emoji: '🪨',
      hp: 2, spawnWeight: 15, unlockStage: 0,
      goldMult: 2, featherMult: 2, starPieces: 2,
      colors: { f:'#d8dde3', s:'#8899aa', h:'#eceff2', sh:'#667788' },
      particles: ['#c8d8e8','#a0b8c8','#88a0b0','#6888a0'],
      prizes: { empty:0, gold_s:10, gold_m:18, gold_l:12, star:10, mult:10, feather:5, item:20, hammers:8 },
      desc: 'Never empty, 2x prizes, can drop bonus hammers',
    },
    {
      id: 'gold', name: 'Gold', emoji: '🌟',
      hp: 3, spawnWeight: 5, unlockStage: 0,
      goldMult: 1.5, featherMult: 1, starPieces: 1,
      colors: { f:'#FFD700', s:'#B8860B', h:'#ffe44d', sh:'#8B6508' },
      particles: ['#FFD700','#FFA500','#FF8C00','#DAA520'],
      prizes: { empty:0, gold_s:0, gold_m:15, gold_l:20, star:12, mult:10, feather:4, item:25, hammers:7 },
      desc: 'Never empty, 1.5x gold, best item drop rate',
    },
    {
      id: 'crystal', name: 'Crystal', emoji: '🔮',
      hp: 4, spawnWeight: 2, unlockStage: 2,
      goldMult: 2, featherMult: 1, starPieces: 3,
      colors: { f:'#E0D0FF', s:'#8B5CF6', h:'#F0E8FF', sh:'#6D28D9' },
      particles: ['#E0D0FF','#C4B5FD','#A78BFA','#8B5CF6'],
      prizes: { empty:0, gold_s:0, gold_m:5, gold_l:30, star:15, mult:12, feather:6, item:30, hammers:10 },
      desc: 'Stage 3+. Never empty, 2x gold, 3 star pieces, rarest drops',
    },
  ],

  // ----------------------------------------------------------
  // 2. GOLD DROP RANGES
  // ----------------------------------------------------------
  goldValues: {
    gold_s: [2,   8],
    gold_m: [10,  30],
    gold_l: [40, 120],
  },

  starPiecesForStarfall: 5,

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
