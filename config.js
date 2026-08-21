// ============================================================
//  Egg Smash Adventures – Tuning Config
//  config.js  (load before data.js and game.js)
//
//  All drop rates, spawn chances, and reward values in one place.
//  Tweak these numbers to balance the game.
// ============================================================

const VERSION = '3.11.7';

// Meta (Facebook/Instagram) Pixel ID for the paid-ads funnel. EMPTY = pixel
// never loads (no script, no beacon). Set it before the campaign goes live.
// Only loads on our own hostnames (never itch / localhost / the Android app),
// see analytics.js initMetaPixel(). Enabling it sets the `_fbp` cookie → EU/UK
// traffic then needs consent or must be geo-excluded in the campaign.
const META_PIXEL_ID = '';

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
      prizes: { empty:4, gold_s:20, gold_m:22, gold_l:14, star:4, mult:2, feather:5, item:3, hammers:0 },
      desc: 'Can be empty',
    },
    {
      id: 'silver', name: 'Silver', emoji: '🪨',
      hp: 2, spawnWeight: 15, unlockStage: 0,
      goldMult: 2, featherMult: 2, starPieces: 2,
      colors: { f:'#d8dde3', s:'#8899aa', h:'#eceff2', sh:'#667788' },
      particles: ['#c8d8e8','#a0b8c8','#88a0b0','#6888a0'],
      prizes: { empty:1, gold_s:8, gold_m:20, gold_l:24, star:7, mult:3, feather:5, item:5, hammers:10 },
      desc: 'Rarely empty, 2x prizes, can drop bonus hammers',
    },
    {
      id: 'gold', name: 'Gold', emoji: '🌟',
      hp: 3, spawnWeight: 5, unlockStage: 0,
      goldMult: 1.5, featherMult: 1, starPieces: 1,
      colors: { f:'#FFD700', s:'#B8860B', h:'#ffe44d', sh:'#8B6508' },
      particles: ['#FFD700','#FFA500','#FF8C00','#DAA520'],
      prizes: { empty:0, gold_s:0, gold_m:18, gold_l:26, star:7, mult:2, feather:4, item:6, hammers:8 },
      desc: 'Never empty, 1.5x gold, best item drop rate',
    },
    {
      id: 'crystal', name: 'Crystal', emoji: '🔮',
      hp: 4, spawnWeight: 2, unlockStage: 2,
      goldMult: 3, featherMult: 2, starPieces: 4,
      colors: { f:'#E0D0FF', s:'#8B5CF6', h:'#F0E8FF', sh:'#6D28D9' },
      particles: ['#E0D0FF','#C4B5FD','#A78BFA','#8B5CF6'],
      prizes: { empty:0, gold_s:0, gold_m:0, gold_l:42, star:11, mult:6, feather:6, item:8, hammers:8 },
      desc: 'Stage 3+. Never empty, 2x gold, 3 star pieces, rarest drops',
    },
    {
      id: 'ruby', name: 'Ruby', emoji: '💎',
      hp: 9, spawnWeight: 1, unlockStage: 4,
      goldMult: 6, featherMult: 3, starPieces: 5,
      colors: { f:'#E8143C', s:'#8B0020', h:'#FF6B7A', sh:'#5C0015' },
      particles: ['#FF2D55','#E8143C','#C70039','#8B0020'],
      prizes: { empty:0, gold_s:0, gold_m:0, gold_l:54, star:14, mult:9, feather:8, item:9, hammers:12, banana:0 },
      desc: 'Stage 5+. 9 hits, 6x gold, premium rewards',
    },
    {
      id: 'black', name: 'Black', emoji: '🖤',
      hp: 20, spawnWeight: 0.7, unlockStage: 8,
      goldMult: 10, featherMult: 5, starPieces: 7,
      colors: { f:'#1a1a1a', s:'#000000', h:'#3a3a3a', sh:'#0a0a0a' },
      particles: ['#333333','#1a1a1a','#0d0d0d','#000000'],
      prizes: { empty:0, gold_s:0, gold_m:0, gold_l:72, star:22, mult:16, feather:11, item:10, hammers:15, maxHammers:3, banana:0 },
      desc: 'Stage 9. 20 hits, 10x gold, best rewards in the game',
    },
    {
      id: 'century', name: 'Century', emoji: '🌀',
      hp: 100, spawnWeight: 0.05, unlockStage: 99, unlockMonkey0: true,
      goldMult: 100, featherMult: 100, starPieces: 100,
      colors: { f:'#FFD700', s:'#B8860B', h:'#FFF8DC', sh:'#8B6508' },
      particles: ['#FFD700','#FFA500','#FF6347','#FF00FF','#00FFFF','#7CFC00'],
      prizes: { empty:0, gold_s:0, gold_m:0, gold_l:100, star:20, mult:0, feather:8, item:0, hammers:20, banana:0 },
      desc: 'Complete Mr. Monkey. 100 hits. 100x rewards. Legendary.',
      big: true,
    },
  ],

  // ----------------------------------------------------------
  // 2. GOLD DROP RANGES
  // ----------------------------------------------------------
  goldValues: {
    gold_s: [2,   8],
    gold_m: [8,  22],
    gold_l: [25, 80],
  },

  starPiecesForStarfall: 7,

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
  // x2: ~45%, x3: ~36%, x5: ~9%, x10: ~4.5%, x50: ~4.5%  (x123 rolled separately via mult123Chance)
  multiplierValues: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 10, 50],
  mult123Chance: 0.01,   // 1% of mult drops are x123 (requires unlock123 bonus)

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
    common:   5,    // rarity 1 base cost
    uncommon: 12,   // rarity 2 base cost
    rare:     30,   // rarity 3 base cost
  },
  featherStageMultiplier: 1.08,  // cost multiplied by this^(stageIndex) — stage1=1x, stage2=1.08x, stage3=1.17x...

  // Gold given when you roll a duplicate item (keyed by rarity: 1=common, 2=uncommon, 3=rare)
  duplicateGoldByRarity: { 1: [35, 90], 2: [120, 280], 3: [350, 800] },

  // ----------------------------------------------------------
  // 9. CRYSTAL BANANAS
  //    Earned by completing stages. Controls how many per completion
  //    and how many needed to unlock a monkey.
  // ----------------------------------------------------------
  crystalBananasPerStage: 1,    // earned when finishing a stage at gold tier
  crystalBananasToUnlock: 9,    // cost to unlock a new monkey (matches data.js monkey cost fields)

  // ----------------------------------------------------------
  // 10. STAGE TIER THRESHOLDS
  //     Fraction of collection items needed to advance tiers.
  // ----------------------------------------------------------
  tierThresholds: {
    bronze: 0.40,   // 40% of items → silver tier
    silver: 0.70,   // 70% of items → gold tier (unlocks next stage)
    gold:   1.00,   // 100% of items → complete (banana reward)
  },

  // Rewards for tier-ups (hammer increases; refills only awarded for egg-broken tier-ups, not feather purchases)
  tierRewards: {
    silver:   { maxHammers: 2, hammerRefill: 5  },  // Bronze→Silver: +5 hammers
    gold:     { maxHammers: 3, hammerRefill: 7  },  // Silver→Gold:   +7 hammers + unlock next stage
    complete: {                hammerRefill: 10 },  // Gold→Complete: +10 hammers + banana
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
  dailyBaseHammers:    45,    // hammers on day 1 (odd days)
  dailyBonusPerDay:    5,     // extra hammers per ~7 consecutive days
  dailyBonusCap:       100,   // max streak bonus

  // ----------------------------------------------------------
  // 13. HAMMER REGENERATION
  // ----------------------------------------------------------
  regenInterval:       30,    // seconds per hammer (standard)
  fastRegenInterval:   20,    // seconds per hammer (with upgrade)

  // ----------------------------------------------------------
  // 14. STARTING RESOURCES
  // ----------------------------------------------------------
  startingHammers:     75,
  startingMaxHammers:  75,
  startingGold:        2000,

  // ----------------------------------------------------------
  // 15. REWARD LOG — which message types show in the log
  //     Set to false to hide that category from the log.
  // ----------------------------------------------------------
  logShow: {
    prizes:     true,   // gold, stars, feathers, hammers, mults (empties use 'empty' cat)
    items:      true,   // new collection items found
    duplicates: true,  // duplicate item messages
    trophies:   true,   // trophy unlocked
    tiers:      true,    // silver/gold/complete tier-ups
    starfall:   false,  // "STARFALL! All eggs smashed!"
    discovery:  true,   // new egg type discovered
    daily:      false,   // daily reward claimed
    shop:       false,   // shop purchases
    noHammers:  true,   // snarky no-hammer messages
    freeHit:    true,   // "Free hit! (Chef's Hat)" — kept for backwards compat
    specials:   true,   // Chef free hit, Mjolnir starfall, special abilities
    gavel:      true,   // Judge Gavel: Order! verdict activations
  },

  // ----------------------------------------------------------
  // 16. SECRET EASTER EGG CHANCES
  //     Probability per egg smash for random-trigger secrets.
  // ----------------------------------------------------------
  secretOuchChance:    0.0002,  // 1/5000 — egg says "ouch!"
  secretChickenChance: 0.0005,  // 1/2000 — runaway chicken appears

  // ----------------------------------------------------------
  // 17. AUTO-SMASHER (idle) — taps eggs for the player using hammers.
  //     Online: a timer taps a random egg every `speed` seconds.
  //     Offline: on return, the same rate is simulated for the away time
  //     (capped by `offlineCap`), and gold/items are credited at
  //     `efficiency`.
  //     Offline taps do NOT spend hammers (v3.6.1): the bar regenerates to
  //     full while away and the report comes on top. Bounded by time × speed,
  //     efficiency and the item cap instead.
  //     Level arrays are indexed by the player's level; costs[i] is the price
  //     to go from level i to i+1. All gold-shop, no premium.
  // ----------------------------------------------------------
  // ----------------------------------------------------------
  // 18. QUESTS — 3 daily + 1 weekly goal, drawn deterministically from the
  //     pools below (same set for everyone on a given day/week). Progress is
  //     the delta of an existing counter since the quest was assigned, so
  //     nothing new is tracked. Rewards are claimed by hand in the Quests
  //     tab; completed-but-unclaimed quests are auto-claimed at reset so
  //     nothing earned is ever lost. `metric` names a key of G (or a special
  //     'skillUses' = rage+goose+shake). `need` optionally gates a template:
  //     'starfall' | 'skills' | 'autotap' | 'monkey2'. Gold rewards scale
  //     with stages completed (goldScale per stage), capped by goldScaleMax.
  // ----------------------------------------------------------
  quests: {
    dailyCount: 5,
    weeklyCount: 3,
    goldScale: 0.12,        // +12% gold reward per completed stage…
    goldScaleMax: 6,        // …up to 7× (53 stages would be silly)
    daily: [
      { id: 'eggs_60',      icon: '🥚', name: 'Egg Breaker',     desc: 'Break 200 eggs',                    metric: 'totalEggs',        target: 200,   reward: { gold: 900 } },
      { id: 'eggs_150',     icon: '💥', name: 'Demolition',      desc: 'Break 550 eggs',                    metric: 'totalEggs',        target: 550,   reward: { gold: 2200 } },
      { id: 'silver_15',    icon: '🪨', name: 'Silver Lining',   desc: 'Break 55 silver eggs',              metric: 'silverSmashed',    target: 55,    reward: { gold: 1300, feathers: 4 } },
      { id: 'gold_egg_6',   icon: '🌟', name: 'Gold Digger',     desc: 'Break 20 gold eggs',                metric: 'goldSmashed',      target: 20,    reward: { gold: 1800 } },
      { id: 'items_2',      icon: '📦', name: 'Collector',       desc: 'Find 6 new items',                  metric: 'totalItems',       target: 6,     reward: { gold: 1100, feathers: 5 } },
      { id: 'items_5',      icon: '🗂️', name: 'Curator',         desc: 'Find 15 new items',                 metric: 'totalItems',       target: 15,     reward: { gold: 2400, feathers: 10 } },
      { id: 'gold_5000',    icon: '🪙', name: 'Coin Run',        desc: 'Earn 16,000 gold from eggs',        metric: 'totalGold',        target: 16000,  reward: { starPieces: 4 } },
      { id: 'rounds_12',    icon: '🧹', name: 'Clean Sweeps',    desc: 'Clear 40 rounds',                   metric: 'roundClears',      target: 40,    reward: { gold: 1400 } },
      { id: 'stars_10',     icon: '⭐', name: 'Stargazer',       desc: 'Collect 35 star pieces',            metric: 'totalStarPieces',  target: 35,    reward: { gold: 1000, hammers: 12 } },
      { id: 'starfall_2',   icon: '🌠', name: 'Make a Wish',     desc: 'Use Starfall 5 times',              metric: 'starfallsUsed',    target: 5,     reward: { gold: 1500, starPieces: 3 }, need: 'starfall' },
      { id: 'mults_5',      icon: '✖️', name: 'Multiplied',      desc: 'Fire 16 multipliers',               metric: 'multUsed',         target: 16,     reward: { gold: 1300 } },
      { id: 'feathers_20',  icon: '🪶', name: 'Feather Fall',    desc: 'Collect 60 feathers',               metric: 'totalFeathers',    target: 60,    reward: { gold: 1000 } },
      { id: 'skills_3',     icon: '⚡', name: 'Skilled',         desc: 'Use skills 9 times',                metric: 'skillUses',        target: 9,     reward: { gold: 1800, feathers: 6 }, need: 'skills' },
      { id: 'crystal_2',    icon: '🔮', name: 'Crystal Clear',   desc: 'Break 7 crystal eggs',              metric: 'crystalSmashed',   target: 7,     reward: { gold: 2000 } },
      { id: 'away_1',       icon: '🤖', name: 'Sleeping In',     desc: 'Come back to an away report',       metric: 'offlineReports',   target: 1,     reward: { gold: 800 }, need: 'autotap' },
      { id: 'hex_3',        icon: '💜', name: 'Hex Breaker',     desc: 'Break 10 hexed eggs',               metric: 'hexesHit',         target: 10,    reward: { gold: 1500 } },
      { id: 'shop_2',       icon: '🛒', name: 'Big Spender',     desc: 'Buy 5 things in the Shop',          metric: 'purchases',        target: 5,     reward: { gold: 700, hammers: 20 } },
      { id: 'collect_1',    icon: '✅', name: 'Set Complete',    desc: 'Complete 2 collections',            metric: 'collectionsCompleted', target: 2, reward: { gold: 2000, feathers: 6 } },
    ],
    weekly: [
      { id: 'w_stages_2',   icon: '🏔️', name: 'Summit Push',     desc: 'Complete 4 stages this week',       metric: 'stagesCompleted',  target: 4,     reward: { gold: 8000, maxHammers: 5 } },
      { id: 'w_items_15',   icon: '🏺', name: 'Grand Tour',      desc: 'Find 30 new items this week',       metric: 'totalItems',       target: 30,    reward: { gold: 6000, feathers: 20 } },
      { id: 'w_eggs_1000',  icon: '🌋', name: 'Thousand Cracks', desc: 'Break 2,400 eggs this week',        metric: 'totalEggs',        target: 2400,  reward: { gold: 7000, maxHammers: 5 } },
      { id: 'w_gold_50k',   icon: '💰', name: 'Treasury',        desc: 'Earn 110,000 gold this week',       metric: 'totalGold',        target: 110000, reward: { starPieces: 14, feathers: 10 } },
      { id: 'w_starfall_8', icon: '🌌', name: 'Meteor Season',   desc: 'Use Starfall 16 times this week',   metric: 'starfallsUsed',    target: 16,     reward: { gold: 9000, maxHammers: 3 }, need: 'starfall' },
      { id: 'w_silver_120', icon: '🪨', name: 'Silver Rush',     desc: 'Break 260 silver eggs this week',   metric: 'silverSmashed',    target: 260,   reward: { gold: 6500, feathers: 15 } },
      { id: 'w_rounds_150', icon: '🧹', name: 'Spotless',        desc: 'Clear 325 rounds this week',        metric: 'roundClears',      target: 325,   reward: { gold: 7500, hammers: 40 } },
      { id: 'w_quests_12',  icon: '📜', name: 'Errand Week',     desc: 'Complete 25 daily quests this week',metric: 'dailyQuestsCompleted', target: 25,    reward: { gold: 8000, starPieces: 10 } },
    ],
  },

  // ----------------------------------------------------------
  // 20. TELEPORT EGG — silver & gold eggs that warp across the tray on every
  //     hit and pay `rewardMult`× when finally broken. Never rolled together
  //     with a timer effect (chasing a clock is not fun). See smash.js
  //     teleportEgg() and `.tele-*` in play.css.
  // ----------------------------------------------------------
  teleportEgg: {
    unlockStage: 4,                 // Mr. Monkey stage index (0-based → stage 5)
    chance:      0.07,              // per eligible egg at spawn
    types:       ['silver', 'gold'],
    hp:          4,                 // taps to break (overrides the type's HP) — enough warps to enjoy the chase
    rewardMult:  4,                 // prize still rolls from the egg's own type (silver/gold)
    // WARP SURGE (v3.11.1): rare per-round event — EVERY spawned egg (century
    // excepted) becomes a teleporter, whatever its type. Rolled once per
    // newRound() after teleporters are unlocked; never offline (the sim spawns
    // plain eggs). Counted in G.warpSurges → 'warp_surge' achievement.
    surgeChance: 0.004,             // ~1 round in 250
  },

  // ----------------------------------------------------------
  // 19. HAMMER MASTERY — "train your hammer" (mastery.js).
  //     The EQUIPPED special hammer earns XP per hit / break / rare item and
  //     levels 1→10. Each owned hammer's own bonus scales with ITS level
  //     (bonuses stay always-active, as before). L5: universal 3% hammer
  //     refund on hit; L10: a unique perk per hammer (see mastery.js).
  //     `xpTable[i]` = cumulative XP needed to reach level i+1 (L1 = 0).
  // ----------------------------------------------------------
  hammerMastery: {
    maxLevel: 10,
    xpHit: 1, xpBreak: 2, xpRare: 10,
    xpTable: [0, 100, 280, 560, 1000, 1550, 2300, 3400, 4600, 6300],  // ~30% shorter than pre-3.11.5
    refundChanceL5: 0.03,     // any hammer at L5+: chance a hit costs nothing
    // How far each hammer's identity grows from L1 → L10 (linear per level).
    // Multipliers are ON TOP of the base bonus the hammer already gives.
    scale: {
      drumstick: { starWeight: 0.25 },      // +15% → ~+40% star pieces
      bat:       { emptyCut: 0.875 },       // 0.4× empties → 0.05×
      crystal:   { featherWeight: 0.25 },   // +20% → ~+50% feathers
      golden:    { goldMult: 0.60 },        // +60% gold at L10 on top
      rainbow:   { itemWeight: 0.15, goldMult: 0.15 },
      cucumber:  { doubleHit: 0.10 },       // 5% → 15%
      mjolnir:   { starfall: 0.05 },        // 3% → 8%
      gavel:     { verdict: 0.06 },         // 4% → 10%
    },
  },

  autoTap: {
    unlockCost:   15000,           // gold
    unlockStage:  2,               // Mr. Monkey stage index that must be reached (0-based → stage 3)
    speed:      { levels: [20, 12, 8, 5, 3],       costs: [25000, 60000, 150000, 400000] },  // seconds per tap
    offlineCap: { levels: [2, 4, 8, 12, 24],       costs: [20000, 50000, 120000, 300000] },  // hours simulated
    efficiency: { levels: [0.25, 0.35, 0.45, 0.55], costs: [30000, 90000, 250000] },         // offline gold share (0.3→0.65 before v3.11.0; 0.5→1.0 before v3.10.13)
    // Diminishing returns on away time (v3.10.13): the first `offlineFullRateSeconds`
    // are simulated at the full tap rate; beyond that the effective time grows
    // logarithmically — 4h away ≈ 2.4h of taps, 8h ≈ 3.1h, 24h ≈ 4.2h. Four
    // hours used to pay a whole session's worth of gold for free.
    offlineFullRateSeconds: 3600,
    offlineMinSeconds: 60,         // shorter absences are not simulated / reported
    offlineMaxItems:   2,          // new collection items per offline report (3 before v3.11.0)
    offlineAllowRare:  false,      // rare items are found by hand only
    offlineMaxSeconds: 30 * 86400, // clock-jump guard: ignore absurd gaps entirely
  },
};
