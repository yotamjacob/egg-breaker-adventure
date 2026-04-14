// ============================================================
//  Egg Breaker Adventures – Tuning Config
//  config.js  (load before data.js and game.js)
//
//  All drop rates, spawn chances, and reward values in one place.
//  Tweak these numbers to balance the game.
// ============================================================

const VERSION = '1.2.5';

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
      prizes: { empty:5, gold_s:24, gold_m:18, gold_l:8, star:6, mult:2, feather:7, item:21, hammers:0 },
      desc: 'Can be empty',
    },
    {
      id: 'silver', name: 'Silver', emoji: '🪨',
      hp: 2, spawnWeight: 15, unlockStage: 0,
      goldMult: 2, featherMult: 2, starPieces: 2,
      colors: { f:'#d8dde3', s:'#8899aa', h:'#eceff2', sh:'#667788' },
      particles: ['#c8d8e8','#a0b8c8','#88a0b0','#6888a0'],
      prizes: { empty:1, gold_s:11, gold_m:20, gold_l:16, star:10, mult:3, feather:7, item:26, hammers:10 },
      desc: 'Rarely empty, 2x prizes, can drop bonus hammers',
    },
    {
      id: 'gold', name: 'Gold', emoji: '🌟',
      hp: 3, spawnWeight: 5, unlockStage: 0,
      goldMult: 1.5, featherMult: 1, starPieces: 1,
      colors: { f:'#FFD700', s:'#B8860B', h:'#ffe44d', sh:'#8B6508' },
      particles: ['#FFD700','#FFA500','#FF8C00','#DAA520'],
      prizes: { empty:0, gold_s:0, gold_m:18, gold_l:26, star:10, mult:2, feather:6, item:28, hammers:8 },
      desc: 'Never empty, 1.5x gold, best item drop rate',
    },
    {
      id: 'crystal', name: 'Crystal', emoji: '🔮',
      hp: 4, spawnWeight: 2, unlockStage: 2,
      goldMult: 2, featherMult: 1, starPieces: 3,
      colors: { f:'#E0D0FF', s:'#8B5CF6', h:'#F0E8FF', sh:'#6D28D9' },
      particles: ['#E0D0FF','#C4B5FD','#A78BFA','#8B5CF6'],
      prizes: { empty:0, gold_s:0, gold_m:5, gold_l:30, star:12, mult:4, feather:8, item:38, hammers:11 },
      desc: 'Stage 3+. Never empty, 2x gold, 3 star pieces, rarest drops',
    },
    {
      id: 'ruby', name: 'Ruby', emoji: '💎',
      hp: 9, spawnWeight: 1, unlockStage: 4,
      goldMult: 3, featherMult: 2, starPieces: 4,
      colors: { f:'#E8143C', s:'#8B0020', h:'#FF6B7A', sh:'#5C0015' },
      particles: ['#FF2D55','#E8143C','#C70039','#8B0020'],
      prizes: { empty:0, gold_s:0, gold_m:0, gold_l:25, star:10, mult:4, feather:7, item:32, hammers:9, banana:3 },
      desc: 'Stage 5+. 9 hits, 3x gold, tiny crystal banana chance',
    },
    {
      id: 'black', name: 'Black', emoji: '🖤',
      hp: 20, spawnWeight: 0.5, unlockStage: 8,
      goldMult: 4, featherMult: 3, starPieces: 5,
      colors: { f:'#1a1a1a', s:'#000000', h:'#3a3a3a', sh:'#0a0a0a' },
      particles: ['#333333','#1a1a1a','#0d0d0d','#000000'],
      prizes: { empty:0, gold_s:0, gold_m:0, gold_l:30, star:10, mult:5, feather:5, item:25, hammers:10, maxHammers:3 },
      desc: 'Stage 9. 20 hits, 4x gold, can boost max hammers',
    },
    {
      id: 'millenium', name: 'Millenium', emoji: '🌀',
      hp: 1000, spawnWeight: 0.3, unlockStage: 99, unlockMonkey0: true,
      goldMult: 1000, featherMult: 1000, starPieces: 1000,
      colors: { f:'#FFD700', s:'#B8860B', h:'#FFF8DC', sh:'#8B6508' },
      particles: ['#FFD700','#FFA500','#FF6347','#FF00FF','#00FFFF','#7CFC00'],
      prizes: { empty:0, gold_s:0, gold_m:0, gold_l:100, star:20, mult:0, feather:10, item:0, hammers:20, banana:0 },
      desc: 'Complete Mr. Monkey. 1000 hits. 1000x rewards. Legendary.',
      big: true,
    },
  ],

  // ----------------------------------------------------------
  // 2. GOLD DROP RANGES
  // ----------------------------------------------------------
  goldValues: {
    gold_s: [1,   5],
    gold_m: [8,  22],
    gold_l: [30, 90],
  },

  starPiecesForStarfall: 5,

  // ----------------------------------------------------------
  // 5. FEATHERS
  //    Drop chance is controlled by prizeWeights above.
  //    Base amount is random in [min, max], then multiplied
  //    by 2 for silver eggs.
  // ----------------------------------------------------------
  featherDropRange: [1, 3],   // base range (before silver 2x)

  // ----------------------------------------------------------
  // 6. MULTIPLIER VALUES
  //    Pool of possible multiplier drops. Duplicates in the
  //    array make that value more common.
  //    e.g. two 2's and two 3's = 25% each, one 50 = 12.5%
  // ----------------------------------------------------------
  // x2: ~35%, x3: ~25%, x5: ~17%, x10: ~10%, x50: ~8%, x123: ~4%
  multiplierValues: [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 5, 5, 5, 10, 10, 50, 50, 123],

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
    common:   5,    // rarity 1 (was 12 — rarer to build anticipation)
    uncommon: 2,    // rarity 2 (was 5)
    rare:     3,    // rarity 3
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

  // Gold given when you roll a duplicate item (keyed by rarity: 1=common, 2=uncommon, 3=rare)
  duplicateGoldByRarity: { 1: [20, 60], 2: [80, 200], 3: [250, 600] },

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
  multBonusGoldBase: 20,  // bonus gold = this x activeMult

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
  startingHammers:     60,
  startingMaxHammers:  60,

  // ----------------------------------------------------------
  // 15. REWARD LOG — which message types show in the log
  //     Set to false to hide that category from the log.
  // ----------------------------------------------------------
  logShow: {
    prizes:     true,   // gold, stars, feathers, hammers, mults, empties
    items:      true,   // new collection items found
    duplicates: false,  // duplicate item messages
    trophies:   true,   // trophy unlocked
    tiers:      false,   // silver/gold/complete tier-ups
    starfall:   false,  // "STARFALL! All eggs smashed!"
    discovery:  true,   // new egg type discovered
    daily:      false,   // daily reward claimed
    shop:       false,   // shop purchases
    noHammers:  true,   // snarky no-hammer messages
    freeHit:    true,  // "Free hit! (Chef's Hat)"
  },

  // ----------------------------------------------------------
  // 16. SECRET EASTER EGG CHANCES
  //     Probability per egg smash for random-trigger secrets.
  // ----------------------------------------------------------
  secretOuchChance:    0.0002,  // 1/5000 — egg says "ouch!"
  secretChickenChance: 0.0005,  // 1/2000 — runaway chicken appears
};
