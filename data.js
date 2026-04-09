// ============================================================
//  Egg Breaker Adventures – Game Data
//  data.js  (load before game.js)
// ============================================================

const MONKEY_DATA = [
  {
    id: 'mr_monkey', name: 'Mr. Monkey', emoji: '🐵', cost: 0,
    perk: 'none', perkDesc: 'The original egg breaker!',
    stages: [
      { name: 'Tropical Paradise', eggs: 3, collection: { name: 'Tropical Fruits', items: [
        ['🥭','Mango',1],['🥥','Coconut',1],['🍍','Pineapple',1],['🍌','Golden Banana',2],['🍊','Blood Orange',2]
      ]}},
      { name: 'Jungle Trek', eggs: 3, collection: { name: 'Jungle Friends', items: [
        ['🦜','Parrot',1],['🐍','Tree Snake',1],['🦎','Gecko',1],['🐆','Leopard',2],['🐸','Poison Frog',2],['🦋','Morpho Butterfly',3]
      ]}},
      { name: 'Ocean Depths', eggs: 4, collection: { name: 'Sea Creatures', items: [
        ['🐙','Octopus',1],['🐠','Clownfish',1],['🦀','Crab',1],['🦑','Giant Squid',2],['🦈','Shark',2],['🐳','Blue Whale',3]
      ]}},
      { name: 'Mountain Peak', eggs: 4, collection: { name: 'Mountain Treasures', items: [
        ['🦅','Eagle',1],['🐐','Mountain Goat',1],['🐻','Bear',1],['⛏️','Ancient Pickaxe',2],['🦉','Snowy Owl',2],['💎','Peak Diamond',3],['🏔️','Crystal Summit',3]
      ]}},
      { name: 'Desert Oasis', eggs: 5, collection: { name: 'Desert Wonders', items: [
        ['🐪','Camel',1],['🌵','Cactus Bloom',1],['🦂','Scorpion',1],['🏺','Ancient Vase',2],['🧿','Evil Eye Charm',2],['⚱️','Golden Urn',3],['🔱','Trident of Sands',3]
      ]}},
      { name: 'Frozen Tundra', eggs: 5, collection: { name: 'Arctic Expedition', items: [
        ['🐧','Penguin',1],['🦭','Seal',1],['🐻‍❄️','Polar Bear',2],['🦊','Arctic Fox',2],['❄️','Ice Crystal',2],['💠','Diamond Dust',3],['🌟','Northern Star',3]
      ]}},
      { name: 'Volcano Island', eggs: 5, collection: { name: 'Volcanic Treasures', items: [
        ['🌋','Lava Rock',1],['🔥','Fire Opal',1],['♨️','Hot Spring Pearl',1],['🪨','Obsidian',2],['⚗️','Alchemist Stone',2],['🥇','Molten Gold',3],['🔶','Fire Diamond',3]
      ]}},
      { name: 'Enchanted Forest', eggs: 6, collection: { name: 'Magical Beings', items: [
        ['🧚','Fairy',1],['🍄','Magic Mushroom',1],['🦄','Unicorn',2],['🐉','Dragon',2],['🧙','Wizard',2],['🪄','Elder Wand',3],['🌙','Moonstone',3],['✨','Stardust',3]
      ]}},
      { name: 'Cloud Kingdom', eggs: 7, collection: { name: 'Legendary Treasures', items: [
        ['👑','Crown',1],['💍','Ring of Power',2],['💎','Eternity Diamond',2],['🔮','Crystal Ball',2],['🏆','Champion Trophy',3],['⚜️','Royal Seal',3],['🌈','Rainbow Prism',3],['⭐','Wishing Star',3]
      ]}},
    ]
  },
  {
    id: 'steampunk', name: 'Steampunk Monkey', emoji: '🔧', cost: 9,
    perk: 'moreStars', perkDesc: '+15% star piece chance',
    stages: [
      { name: 'Gear Workshop', eggs: 3, collection: { name: 'Basic Gears', items: [
        ['⚙️','Bronze Gear',1],['🔩','Steel Bolt',1],['🔧','Wrench',1],['⛓️','Chain Link',2],['🛠️','Master Toolkit',2]
      ]}},
      { name: 'Steam Engine Room', eggs: 3, collection: { name: 'Engine Parts', items: [
        ['💨','Steam Valve',1],['🔔','Brass Bell',1],['⏰','Clockwork',2],['🧲','Magnet Core',2],['🪫','Power Cell',2],['🔋','Tesla Battery',3]
      ]}},
      { name: 'Airship Dock', eggs: 4, collection: { name: 'Airship Parts', items: [
        ['🎈','Gas Cell',1],['🧭','Compass',1],['🔭','Telescope',2],['⚓','Sky Anchor',2],['📡','Antenna',2],['🪂','Golden Chute',3]
      ]}},
      { name: 'Clocktower', eggs: 4, collection: { name: 'Timepieces', items: [
        ['⏱️','Stopwatch',1],['⌚','Pocket Watch',1],['🕰️','Grandfather Clock',2],['⏳','Hourglass',2],['🔮','Time Crystal',3],['📅','Infinity Dial',3],['🎯','Precision Spring',3]
      ]}},
      { name: 'Laboratory', eggs: 5, collection: { name: 'Inventions', items: [
        ['💡','Light Bulb',1],['🔬','Microscope',1],['📻','Radio',2],['🧪','Tesla Coil',2],['⚡','Spark Gap',2],['📐','Master Blueprint',3],['🧬','DNA Helix',3]
      ]}},
      { name: 'Underground Railway', eggs: 5, collection: { name: 'Railway Finds', items: [
        ['🚃','Train Car',1],['🛤️','Golden Track',1],['🎟️','VIP Ticket',2],['🗝️','Master Key',2],['🧳','Secret Luggage',2],['🗺️','Lost Route Map',3],['🏗️','Signal Box',3]
      ]}},
      { name: 'Copper Canyon', eggs: 5, collection: { name: 'Rare Metals', items: [
        ['🪙','Copper Nugget',1],['🥈','Silver Ingot',1],['🥇','Gold Bar',2],['💎','Raw Sapphire',2],['🟤','Bronze Medal',2],['⬛','Tungsten Core',3],['🟡','Mythril Disc',3]
      ]}},
      { name: 'Sky Fortress', eggs: 6, collection: { name: 'Fortress Arsenal', items: [
        ['🗡️','Rapier',1],['🛡️','Shield',1],['🏹','Crossbow',2],['💣','Bomb',2],['⚔️','Dual Blades',2],['🪃','Boomerang',3],['🧨','Mega Dynamite',3],['🎪','Smoke Bomb',3]
      ]}},
      { name: 'Time Nexus', eggs: 7, collection: { name: 'Temporal Artifacts', items: [
        ['🌀','Time Vortex',1],['💫','Paradox Gem',2],['♾️','Infinity Cog',2],['🌐','World Globe',2],['🏛️','Ancient Relic',3],['🎭','Mask of Ages',3],['✨','Chrono Crystal',3],['🧿','Eye of Time',3]
      ]}},
    ]
  },
  {
    id: 'princess', name: 'Princess Monkey', emoji: '👸', cost: 9,
    perk: 'moreGold', perkDesc: '+20% gold from eggs',
    stages: [
      { name: 'Royal Garden', eggs: 3, collection: { name: 'Garden Flowers', items: [
        ['🌹','Rose',1],['🌷','Tulip',1],['🌸','Cherry Blossom',1],['🌻','Sunflower',2],['💐','Royal Bouquet',2]
      ]}},
      { name: 'Grand Ballroom', eggs: 3, collection: { name: 'Dance Treasures', items: [
        ['💃','Dance Shoes',1],['🎵','Music Box',1],['🪭','Royal Fan',2],['🎭','Masquerade Mask',2],['🪩','Crystal Ball',2],['🎪','Grand Chandelier',3]
      ]}},
      { name: 'Castle Tower', eggs: 4, collection: { name: 'Tower Relics', items: [
        ['🗝️','Tower Key',1],['📜','Ancient Scroll',1],['🕯️','Magic Candle',2],['🪞','Mirror Mirror',2],['🧶','Rapunzel Thread',2],['⚔️','Knight Sword',3]
      ]}},
      { name: 'Royal Kitchen', eggs: 4, collection: { name: 'Royal Feast', items: [
        ['🍰','Royal Cake',1],['🧁','Cupcake',1],['🍪','Golden Cookie',1],['🫖','Tea Set',2],['🍫','Chocolate Box',2],['🎂','Grand Gateau',3],['🍬','Enchanted Candy',3]
      ]}},
      { name: 'Royal Treasury', eggs: 5, collection: { name: 'Crown Jewels', items: [
        ['💍','Diamond Ring',1],['📿','Pearl Necklace',1],['👑','Tiara',2],['💎','Royal Diamond',2],['🏅','Medallion',2],['⚜️','Fleur-de-lis',3],['🔮','Scepter Orb',3]
      ]}},
      { name: 'Dragon\'s Lair', eggs: 5, collection: { name: 'Dragon Hoard', items: [
        ['🐉','Baby Dragon',1],['🔥','Dragon Scale',1],['🥚','Dragon Egg',2],['💰','Gold Pile',2],['🗡️','Dragonslayer',2],['👁️','Dragon Eye',3],['🌟','Dragon Heart',3]
      ]}},
      { name: 'Enchanted Lake', eggs: 5, collection: { name: 'Lake Mysteries', items: [
        ['🐸','Frog Prince',1],['🪷','Lotus Flower',1],['🧜','Mermaid',2],['🦢','Swan',2],['🌊','Water Spirit',2],['🔱','Lake Trident',3],['💧','Tear of the Lake',3]
      ]}},
      { name: 'Fairy Court', eggs: 6, collection: { name: 'Fairy Gifts', items: [
        ['🧚','Fairy Queen',1],['🌸','Fairy Dust',1],['🪻','Magic Iris',2],['🦋','Rainbow Butterfly',2],['🍃','Leaf Crown',2],['🌙','Moon Tiara',3],['✨','Pixie Wand',3],['🫧','Dream Bubble',3]
      ]}},
      { name: 'Throne Room', eggs: 7, collection: { name: 'Royal Regalia', items: [
        ['👑','Emperor Crown',1],['🗡️','Excalibur',2],['🛡️','Royal Shield',2],['📜','Royal Decree',2],['🦁','Lion Crest',3],['🏰','Castle Model',3],['🌟','Star of Royalty',3],['💎','Kohinoor Diamond',3]
      ]}},
    ]
  },
  {
    id: 'space', name: 'Space Cadette', emoji: '🚀', cost: 9,
    perk: 'moreItems', perkDesc: '+10% collection item chance',
    stages: [
      { name: 'Launch Pad', eggs: 3, collection: { name: 'Launch Gear', items: [
        ['🚀','Rocket',1],['🧑‍🚀','Space Suit',1],['🛰️','Satellite',1],['📡','Ground Dish',2],['🔭','Star Scope',2]
      ]}},
      { name: 'Space Station', eggs: 3, collection: { name: 'Station Modules', items: [
        ['🔬','Lab Module',1],['🛸','Docking Pod',1],['🧪','Zero-G Tube',2],['📻','Comms Array',2],['🔋','Solar Panel',2],['🤖','Service Bot',3]
      ]}},
      { name: 'Moon Base', eggs: 4, collection: { name: 'Lunar Samples', items: [
        ['🌙','Moon Rock',1],['🪨','Regolith',1],['🔮','Moon Crystal',2],['🏳️','Flag',2],['👣','First Footprint',2],['💎','Lunar Diamond',3]
      ]}},
      { name: 'Asteroid Belt', eggs: 4, collection: { name: 'Space Rocks', items: [
        ['☄️','Comet Shard',1],['🪨','Iron Meteorite',1],['💫','Stony Iron',2],['🌑','Dark Asteroid',2],['💎','Space Diamond',3],['⚡','Charged Fragment',3],['🌟','Pallasite',3]
      ]}},
      { name: 'Mars Colony', eggs: 5, collection: { name: 'Martian Artifacts', items: [
        ['🔴','Red Sand',1],['🏔️','Olympus Stone',1],['🧊','Ice Cap',2],['🔮','Mars Crystal',2],['🗿','Ancient Marker',2],['👽','Alien Fossil',3],['🌋','Valles Find',3]
      ]}},
      { name: 'Jupiter Station', eggs: 5, collection: { name: 'Gas Giant Wonders', items: [
        ['🌀','Storm Eye',1],['🪐','Ring Fragment',1],['🧊','Europa Ice',2],['🌋','Io Lava',2],['💨','Atmo Sample',2],['⚡','Lightning Bolt',3],['💎','Pressure Diamond',3]
      ]}},
      { name: 'Nebula', eggs: 5, collection: { name: 'Cosmic Dust', items: [
        ['🌫️','Star Dust',1],['💜','Nebula Gas',1],['⭐','Baby Star',2],['🔴','Red Giant Core',2],['⚪','White Dwarf',2],['🌟','Neutron Star',3],['💫','Pulsar Beacon',3]
      ]}},
      { name: 'Black Hole Edge', eggs: 6, collection: { name: 'Dark Matter', items: [
        ['⚫','Dark Particle',1],['🌑','Shadow Orb',1],['🕳️','Singularity',2],['⏰','Time Dilation',2],['🌀','Gravity Lens',2],['💎','Hawking Crystal',3],['✨','Event Horizon',3],['♾️','Infinity Shard',3]
      ]}},
      { name: 'Galaxy Core', eggs: 7, collection: { name: 'Universal Treasures', items: [
        ['🌌','Galaxy Map',1],['💫','Quasar',2],['🌟','Supernova',2],['🧬','Life Seed',2],['🔮','Cosmic Orb',3],['♾️','Infinity Stone',3],['🌈','Spectrum Key',3],['✨','Big Bang Shard',3]
      ]}},
    ]
  },
];

const SHOP_HAMMERS = [
  { id: 'default',    name: 'Basic Hammer',     emoji: '🔨', desc: 'Standard issue',              cost: 0, bonus: null },
  { id: 'drumstick',  name: 'Drumstick Hammer', emoji: '🍗', desc: '+15% star pieces',            cost: 5000, currency: 'gold', bonus: 'moreStars' },
  { id: 'bat',        name: 'Bat Hammer',       emoji: '🦇', desc: 'Fewer empty eggs',            cost: 8000, currency: 'gold', bonus: 'lessEmpty' },
  { id: 'crystal',    name: 'Crystal Hammer',    emoji: '🔮', desc: '+20% feathers',               cost: 15000, currency: 'gold', bonus: 'moreFeathers' },
  { id: 'golden',     name: 'Golden Hammer',     emoji: '⭐', desc: '2x gold from eggs',           cost: 50000, currency: 'gold', bonus: 'moreGold' },
  { id: 'rainbow',    name: 'Rainbow Hammer',    emoji: '🌈', desc: '+10% collection items',       cost: 100000, currency: 'gold', bonus: 'moreItems' },
];

const SHOP_HATS = [
  { id: 'none',    name: 'No Hat',        emoji: '🐒', desc: '',                         cost: 0, bonus: null },
  { id: 'chef',    name: 'Chef\'s Hat',   emoji: '👨‍🍳', desc: '10% chance egg was free',  cost: 10000, currency: 'gold', bonus: 'freeEgg' },
  { id: 'crown',   name: 'Crown',         emoji: '👑', desc: '+10% gold',                 cost: 20000, currency: 'gold', bonus: 'goldBoost' },
  { id: 'wizard',  name: 'Wizard Hat',    emoji: '🧙', desc: '+10% stars',                cost: 30000, currency: 'gold', bonus: 'starBoost' },
  { id: 'tophat',  name: 'Top Hat',       emoji: '🎩', desc: 'Multipliers last longer',   cost: 50000, currency: 'gold', bonus: 'multBoost' },
  { id: 'pirate',  name: 'Pirate Hat',    emoji: '🏴‍☠️', desc: '+15% collection items',    cost: 80000, currency: 'gold', bonus: 'itemBoost' },
];

const SHOP_SUPPLIES = [
  { id: 'hammers5',   name: '+5 Hammers',      emoji: '🔨', cost: 200,   currency: 'gold', type: 'consumable' },
  { id: 'hammers20',  name: '+20 Hammers',      emoji: '🔨', cost: 700,   currency: 'gold', type: 'consumable' },
  { id: 'star1',      name: 'Star Piece',       emoji: '⭐', cost: 2000,  currency: 'gold', type: 'consumable' },
  { id: 'mult5',      name: 'x5 Multiplier',    emoji: '✖️', cost: 3000,  currency: 'gold', type: 'consumable' },
  { id: 'maxhammers', name: '+5 Hammer Cap',    emoji: '📦', cost: 5000,  currency: 'gold', type: 'upgrade' },
  { id: 'fastregen',  name: 'Fast Regen',       emoji: '⚡', cost: 10000, currency: 'gold', type: 'upgrade', unique: true },
];

// All tuning values are read from CONFIG (config.js)
const PRIZE_WEIGHTS  = CONFIG.prizeWeights;
const GOLD_VALUES    = CONFIG.goldValues;
const MULT_VALUES    = CONFIG.multiplierValues;
const HAMMER_PRIZES  = CONFIG.hammerPrizeAmounts;
const EGG_HP         = CONFIG.eggHP;
const EGG_SPAWN_WEIGHTS = CONFIG.eggSpawnWeights;

const ACHIEVEMENT_DATA = [
  { id:'first_smash',  name:'First Crack',      desc:'Break your first egg',         icon:'🥚' },
  { id:'smash_50',     name:'Egg Smasher',       desc:'Break 50 eggs',                icon:'💪' },
  { id:'smash_200',    name:'Egg Destroyer',      desc:'Break 200 eggs',               icon:'🔥' },
  { id:'smash_1000',   name:'Egg Annihilator',    desc:'Break 1,000 eggs',             icon:'💥' },
  { id:'gold_1000',    name:'Coin Collector',     desc:'Earn 1,000 total gold',        icon:'🪙' },
  { id:'gold_50000',   name:'Rich Monkey',        desc:'Earn 50,000 total gold',       icon:'💰' },
  { id:'gold_500000',  name:'Gold Tycoon',        desc:'Earn 500,000 total gold',      icon:'🤑' },
  { id:'stars_10',     name:'Stargazer',          desc:'Collect 10 star pieces',       icon:'⭐' },
  { id:'starfall_1',   name:'Starfall!',          desc:'Use your first starfall',      icon:'🌟' },
  { id:'starfall_10',  name:'Star Storm',         desc:'Use 10 starfalls',             icon:'☄️' },
  { id:'coll_1',       name:'Collector',          desc:'Complete 1 collection',        icon:'📖' },
  { id:'coll_5',       name:'Curator',            desc:'Complete 5 collections',       icon:'🏛️' },
  { id:'coll_15',      name:'Archivist',          desc:'Complete 15 collections',      icon:'📚' },
  { id:'stage_1',      name:'Stage Clear',        desc:'Complete a stage (gold tier)',  icon:'🎯' },
  { id:'stage_9',      name:'World Champion',     desc:'Complete all 9 stages',        icon:'🏆' },
  { id:'monkey_2',     name:'New Friend',         desc:'Unlock a second monkey',       icon:'🐒' },
  { id:'monkey_all',   name:'Monkey Business',    desc:'Unlock all monkeys',           icon:'🐵' },
  { id:'streak_5',     name:'On a Roll',          desc:'5-day login streak',           icon:'📅' },
  { id:'streak_20',    name:'Dedicated',           desc:'20-day login streak',          icon:'🔥' },
  { id:'mult_50',      name:'Multiplied!',        desc:'Use a x50 multiplier',         icon:'✖️' },
  { id:'mult_123',     name:'Jackpot!',           desc:'Find the legendary x123',      icon:'🎰' },
  { id:'buy_hammer',   name:'Tool Upgrade',       desc:'Buy a special hammer',         icon:'🔨' },
  { id:'buy_hat',      name:'Hat Collector',      desc:'Buy a hat',                    icon:'🎩' },
  { id:'daily_100',    name:'Centurion',          desc:'Claim daily bonus 100 times',  icon:'💯' },
  { id:'round_clear',  name:'Clean Sweep',        desc:'Break all eggs in one round',  icon:'🧹' },
];
