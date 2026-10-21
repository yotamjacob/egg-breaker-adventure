// ============================================================
//  Egg Smash Adventures – Tuning Config
//  config.js  (load before data.js and game.js)
//
//  All drop rates, spawn chances, and reward values in one place.
//  Tweak these numbers to balance the game.
// ============================================================

const VERSION = '3.12.5';

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
      hp: 20, spawnWeight: 0.85, unlockStage: 8,
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
      desc: 'Clear Mr. Monkey stage 9. 100 hits. 100x rewards. Legendary.',
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
  // 10b. LEGEND STAGES (v3.12.0) — each monkey's last stage (`legend: true`
  //      in data.js). Deliberately hard: items drop less often, rares are
  //      scarcer within an item roll, and feathers buy them at a premium.
  //      Legend stages never gate monkey completion (see coreStagesDone).
  // ----------------------------------------------------------
  legendStage: {
    itemWeightMult:  0.5,   // item prize weight on a legend stage (×)
    rareWeightMult:  0.4,   // rarity-3 weight inside the item roll (×)
    featherCostMult: 3,     // feather price of a legend-stage album item (×)
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

  // Log lines hold fully visible for holdMs, then fade out over fadeMs.
  // Driven by per-line timestamps + negative animation-delay, so the
  // innerHTML re-render on every new message resumes each line's fade
  // mid-way instead of restarting it.
  logFade: { holdMs: 4000, fadeMs: 3000 },

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
  //     'starfall' | 'skills' | 'autotap' | 'monkey2' | 'theegg'. Gold rewards scale
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
      { id: 'egg_catch_5',  icon: '🥚', name: 'Egg Hunter',      desc: 'Catch 5 events in The Egg',         metric: 'eggCatches',       target: 5,     reward: { gold: 1200, feathers: 4 }, need: 'theegg' },
      { id: 'egg_taps_250', icon: '🔨', name: 'Egg Tapper',      desc: 'Tap The Egg 250 times',             metric: 'eggTaps',          target: 250,   reward: { gold: 1000, feathers: 3 }, need: 'theegg' },
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
      { id: 'w_egg_catch_30', icon: '🪿', name: 'Golden Hunter', desc: 'Catch 30 events in The Egg',        metric: 'eggCatches',       target: 30,    reward: { gold: 7000, starPieces: 8 }, need: 'theegg' },
      { id: 'w_egg_taps_2500', icon: '🔨', name: 'Shell Drummer', desc: 'Tap The Egg 2,500 times this week', metric: 'eggTaps',          target: 2500,  reward: { gold: 6000, starPieces: 6 }, need: 'theegg' },
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

  // ----------------------------------------------------------
  // 21. THE EGG (theegg.js, v3.12.0) — side mode: a swarm of flying monkeys
  //     hits a giant golden egg that never breaks. Its shell comes off in
  //     layers (each tougher); shards buy swarm upgrades; every few layers a
  //     permanent, capped Blessing applies to the main game.
  //     Pacing (greedy buyer, ~1.5 taps/s, active play only): layer 1 ≈ 5 min,
  //     5 ≈ 21 min, 10 ≈ 49 min, 20 ≈ 3 h, 30 ≈ 12 h, 40 ≈ 47 h, 50 ≈ 220 h
  //     (v3.12.2: one monkey to start, scarce shards; v3.12.3: layers 3× the
  //     HP, bigger blessings; away mode adds a slow background pace on top).
  //     Tuned by simulation; re-run one before changing several numbers.
  //     Shards come per HIT, not per damage: if they scaled with damage the
  //     upgrades snowball and layer 50 falls in minutes.
  // ----------------------------------------------------------
  theEgg: {
    unlockStage:   7,                 // Mr. Monkey stage index reached (0-based → stage 8)
    startSwarm:    1,                 // flyers before any Swarm upgrade (3 before v3.12.2)
    layerHp:       { base: 3600, growth: 1.30 },  // shell layer n = base × growth^(n-1) (600 at launch, 1200 in v3.12.2)
    swingSeconds:  1.6,               // seconds between one flyer's swings at Wings L0
    tapMult:       5,                 // a tap hits this many times harder than a flyer…
    shardsPerHit:  0.15,              // …and pays twice a flyer's shards (1 / 2 before v3.12.2)
    shardsPerTap:  0.3,
    damageShare:   0.0025,            // + this share of all damage as shards (0.02 before v3.12.2)
    layerShards:   6,                 // × layer number, when a layer comes off (10 at launch, 2 in v3.12.2)
    layerGold:     { base: 120, growth: 1.12 },   // main-game gold per layer, × quest gold scale (base 40 before v3.12.3)
    // Upgrade price = base × growth^level. `max` = highest level.
    upgrades: {
      swarm:  { base: 25,  growth: 1.70, max: 23 },                               // +1 flyer (1 → 24)
      power:  { base: 10,  growth: 1.46, mult: 1.10 },                            // ×1.10 damage per level
      wings:  { base: 20,  growth: 1.38, max: 25, factor: 0.93, floor: 0.25 },    // swing interval ×0.93
      luck:   { base: 40,  growth: 1.42, max: 25, perLevel: 0.02, critMult: 5 },  // +2% crit chance
      tap:    { base: 25,  growth: 1.36, perLevel: 1 },                           // +1× tap strength
      magnet: { base: 150, growth: 1.60, max: 10, perLevel: 0.05 },               // events 5% sooner
    },
    // Random events: one every `every` seconds (range), shortened by Magnet.
    events: {
      every:        [30, 50],
      weakSpot:     { seconds: 6, mult: 25 },      // taps on the glow hit ×25 harder
      goose:        { seconds: 5, incomeSeconds: 30 },   // tap it: 30 s worth of shards
      bananaStorm:  { seconds: 8, speed: 3 },      // swarm swings ×3 as fast
      goldenHour:   { seconds: 15, shards: 2, weight: 0.5 },  // double shards (rarer)
      thief:        { seconds: 4, incomeSeconds: 15 },   // catch the crow: 15 s worth of shards
      quake:        { dpsSeconds: 45 },            // instant 45 s worth of swarm damage
      thunder:      { hits: 15 },                  // next 15 hits all crit (needs Odin)
      clones:       { seconds: 10 },               // swarm ×2 (needs Sun Wukong)
    },
    // Unlocked monkeys join the swarm as captains (by MONKEY_DATA id).
    captains: {
      steampunk: { critAdd: 0.10 },
      princess:  { shardMult: 1.20 },
      space:     { speedMult: 0.85 },
    },
    // Permanent main-game Blessings (one each, granted when `layer` comes off).
    // Totals (v3.12.3, raised with the longer layers): +25 max hammers, +30% gold,
    // +10% items, -4s regen, -1 starfall, Golden Swarm. Max-hammer values are
    // paid into G.maxH once; st.mh tracks it so a retune tops players up.
    blessings: [
      { layer: 5,  type: 'maxH',     val: 10, label: '+10 max hammers',                  short: '+10 max hammers' },
      { layer: 10, type: 'goldPct',  val: 8,  label: '+8% gold from eggs',               short: '+8% gold' },
      { layer: 15, type: 'itemPct',  val: 5,  label: '+5% item chance',                  short: '+5% items' },
      { layer: 20, type: 'regenSec', val: 4,  label: 'Hammer regen 4s faster',           short: 'faster regen' },
      { layer: 25, type: 'maxH',     val: 15, label: '+15 max hammers',                  short: '+15 max hammers' },
      { layer: 30, type: 'goldPct',  val: 10, label: '+10% gold from eggs',              short: '+10% gold' },
      { layer: 35, type: 'itemPct',  val: 5,  label: '+5% item chance',                  short: '+5% items' },
      { layer: 40, type: 'starfall', val: 1,  label: 'Starfall needs 1 less star',       short: 'cheaper Starfall' },
      { layer: 45, type: 'goldPct',  val: 12, label: '+12% gold from eggs',              short: '+12% gold' },
      { layer: 50, type: 'swarmVisit', val: 1, label: 'Golden Swarm: free tray smashes', short: 'Golden Swarm' },
    ],
    swarmVisitEvery: [40, 70],        // seconds between Golden Swarm visits (L50 blessing; 75–120 before v3.12.3)
    // Away mode (v3.12.2): whenever The Egg is not on screen — the player is in
    // the main game, or the app is closed — the swarm keeps working at `speed`
    // of its passive pace (no taps, no events), at most `capHours` per gap.
    // Layers still come off (gold, blessings). Replaced a shards-only trickle.
    away: { speed: 0.1, capHours: 8, minSeconds: 60 },
  },
};
