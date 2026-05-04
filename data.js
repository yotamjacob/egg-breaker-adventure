// ============================================================
//  Egg Smash Adventures – Game Data
//  data.js  (load before game.js)
//
//  Item quotes are in quotes.js — edit them there.
// ============================================================

const MONKEY_DATA = [
  {
    id: 'mr_monkey', name: 'Mr. Monkey', emoji: '🐵', img: 'img/mrmonkey_nohat.jpeg',
    hatImgs: { chef:'img/mrmonkey_chef.jpeg', crown:'img/mrmonkey_crown.jpeg', wizard:'img/mrmonkey_wizard.jpeg', tophat:'img/mrmonkey_tophat.jpeg', pirate:'img/mrmonkey_pirate.jpeg' },
    cost: 0,
    tierHammerMult: 2,
    perk: 'none', perkDesc: 'The original egg breaker!',
    stages: [
      { name: 'Tropical Paradise', eggs: 3, collection: { name: 'Tropical Fruits', items: [
        ['🥭','Mango',1,ITEM_QUOTES.mr_monkey['Mango']],
        ['🥥','Coconut',1,ITEM_QUOTES.mr_monkey['Coconut']],
        ['🍍','Pineapple',1,ITEM_QUOTES.mr_monkey['Pineapple']],
        ['🍌','Golden Banana',2,ITEM_QUOTES.mr_monkey['Golden Banana']],
        ['🍊','Blood Orange',2,ITEM_QUOTES.mr_monkey['Blood Orange']],
      ]}},
      { name: 'Jungle Trek', eggs: 3, collection: { name: 'Jungle Friends', items: [
        ['🦜','Parrot',1,ITEM_QUOTES.mr_monkey['Parrot']],
        ['🐍','Tree Snake',1,ITEM_QUOTES.mr_monkey['Tree Snake']],
        ['🦎','Gecko',1,ITEM_QUOTES.mr_monkey['Gecko']],
        ['🐆','Leopard',2,ITEM_QUOTES.mr_monkey['Leopard']],
        ['🐸','Poison Frog',2,ITEM_QUOTES.mr_monkey['Poison Frog']],
        ['🦋','Morpho Butterfly',3,ITEM_QUOTES.mr_monkey['Morpho Butterfly']],
      ]}},
      { name: 'Ocean Depths', eggs: 4, collection: { name: 'Sea Creatures', items: [
        ['🐙','Octopus',1,ITEM_QUOTES.mr_monkey['Octopus']],
        ['🐠','Clownfish',1,ITEM_QUOTES.mr_monkey['Clownfish']],
        ['🦀','Crab',1,ITEM_QUOTES.mr_monkey['Crab']],
        ['🦑','Giant Squid',2,ITEM_QUOTES.mr_monkey['Giant Squid']],
        ['🦈','Shark',2,ITEM_QUOTES.mr_monkey['Shark']],
        ['🐳','Blue Whale',3,ITEM_QUOTES.mr_monkey['Blue Whale']],
      ]}},
      { name: 'Mountain Peak', eggs: 4, collection: { name: 'Mountain Treasures', items: [
        ['🦅','Eagle',1,ITEM_QUOTES.mr_monkey['Eagle']],
        ['🐐','Mountain Goat',1,ITEM_QUOTES.mr_monkey['Mountain Goat']],
        ['🐻','Bear',1,ITEM_QUOTES.mr_monkey['Bear']],
        ['⛏️','Ancient Pickaxe',2,ITEM_QUOTES.mr_monkey['Ancient Pickaxe']],
        ['🦉','Snowy Owl',2,ITEM_QUOTES.mr_monkey['Snowy Owl']],
        ['💎','Peak Diamond',3,ITEM_QUOTES.mr_monkey['Peak Diamond']],
        ['🏔️','Crystal Summit',3,ITEM_QUOTES.mr_monkey['Crystal Summit']],
      ]}},
      { name: 'Desert Oasis', eggs: 5, collection: { name: 'Desert Wonders', items: [
        ['🐪','Camel',1,ITEM_QUOTES.mr_monkey['Camel']],
        ['🌵','Cactus Bloom',1,ITEM_QUOTES.mr_monkey['Cactus Bloom']],
        ['🦂','Scorpion',1,ITEM_QUOTES.mr_monkey['Scorpion']],
        ['🏺','Ancient Vase',2,ITEM_QUOTES.mr_monkey['Ancient Vase']],
        ['🧿','Evil Eye Charm',2,ITEM_QUOTES.mr_monkey['Evil Eye Charm']],
        ['⚱️','Golden Urn',3,ITEM_QUOTES.mr_monkey['Golden Urn']],
        ['🔱','Trident of Sands',3,ITEM_QUOTES.mr_monkey['Trident of Sands']],
      ]}},
      { name: 'Frozen Tundra', eggs: 5, collection: { name: 'Arctic Expedition', items: [
        ['🐧','Penguin',1,ITEM_QUOTES.mr_monkey['Penguin']],
        ['🦭','Seal',1,ITEM_QUOTES.mr_monkey['Seal']],
        ['🐻‍❄️','Polar Bear',2,ITEM_QUOTES.mr_monkey['Polar Bear']],
        ['🦊','Arctic Fox',2,ITEM_QUOTES.mr_monkey['Arctic Fox']],
        ['❄️','Ice Crystal',2,ITEM_QUOTES.mr_monkey['Ice Crystal']],
        ['💠','Diamond Dust',3,ITEM_QUOTES.mr_monkey['Diamond Dust']],
        ['🌟','Northern Star',3,ITEM_QUOTES.mr_monkey['Northern Star']],
      ]}},
      { name: 'Volcano Island', eggs: 5, collection: { name: 'Volcanic Treasures', items: [
        ['🌋','Lava Rock',1,ITEM_QUOTES.mr_monkey['Lava Rock']],
        ['🔥','Fire Opal',1,ITEM_QUOTES.mr_monkey['Fire Opal']],
        ['♨️','Secret Hot Springs',1,ITEM_QUOTES.mr_monkey['Secret Hot Springs']],
        ['🪨','Obsidian',2,ITEM_QUOTES.mr_monkey['Obsidian']],
        ['⚗️','Alchemist Stone',2,ITEM_QUOTES.mr_monkey['Alchemist Stone']],
        ['🫧','Lava Bubble',3,ITEM_QUOTES.mr_monkey['Lava Bubble']],
        ['🔶','Fire Diamond',3,ITEM_QUOTES.mr_monkey['Fire Diamond']],
      ]}},
      { name: 'Enchanted Forest', eggs: 6, collection: { name: 'Magical Beings', items: [
        ['🧚','Fairy',1,ITEM_QUOTES.mr_monkey['Fairy']],
        ['🍄','Magic Mushroom',1,ITEM_QUOTES.mr_monkey['Magic Mushroom']],
        ['🦄','Unicorn',2,ITEM_QUOTES.mr_monkey['Unicorn']],
        ['🐉','Dragon',2,ITEM_QUOTES.mr_monkey['Dragon']],
        ['🧙','Wizard',2,ITEM_QUOTES.mr_monkey['Wizard']],
        ['🪄','Elder Wand',3,ITEM_QUOTES.mr_monkey['Elder Wand']],
        ['🌙','Moonstone',3,ITEM_QUOTES.mr_monkey['Moonstone']],
        ['✨','Stardust',3,ITEM_QUOTES.mr_monkey['Stardust']],
      ]}},
      { name: 'Cloud Kingdom', eggs: 7, collection: { name: 'Legendary Treasures', items: [
        ['👑','Crown',1,ITEM_QUOTES.mr_monkey['Crown']],
        ['💍','Ring of Power',2,ITEM_QUOTES.mr_monkey['Ring of Power']],
        ['💎','Eternity Diamond',2,ITEM_QUOTES.mr_monkey['Eternity Diamond']],
        ['🔮','Crystal Ball',2,ITEM_QUOTES.mr_monkey['Crystal Ball']],
        ['🏆','Champion Goblet',3,ITEM_QUOTES.mr_monkey['Champion Goblet']],
        ['⚜️','Royal Seal',3,ITEM_QUOTES.mr_monkey['Royal Seal']],
        ['🌈','Rainbow Prism',3,ITEM_QUOTES.mr_monkey['Rainbow Prism']],
        ['⭐','Wishing Star',3,ITEM_QUOTES.mr_monkey['Wishing Star']],
      ]}},
    ]
  },
  {
    id: 'steampunk', name: 'Steampunk Monkey', emoji: '🔧', img: 'img/steampunk_nohat.jpeg',
    hatImgs: { chef:'img/steampunk_chef.jpeg', crown:'img/steam_crown.jpeg', wizard:'img/steampunk_wizard.jpeg', tophat:'img/steampunk_tophat.jpeg', pirate:'img/steampunk_pirate.jpeg' },
    cost: 9, goldScale: 0.90,
    perk: 'moreStars', perkDesc: '+15% star piece chance',
    stages: [
      { name: 'Gear Workshop', eggs: 3, collection: { name: 'Basic Gears', items: [
        ['⚙️','Bronze Gear',1,ITEM_QUOTES.steampunk['Bronze Gear']],
        ['🔩','Steel Bolt',1,ITEM_QUOTES.steampunk['Steel Bolt']],
        ['🔧','Wrench',1,ITEM_QUOTES.steampunk['Wrench']],
        ['⛓️','Chain Link',2,ITEM_QUOTES.steampunk['Chain Link']],
        ['🛠️','Master Toolkit',2,ITEM_QUOTES.steampunk['Master Toolkit']],
      ]}},
      { name: 'Steam Engine Room', eggs: 3, collection: { name: 'Engine Parts', items: [
        ['💨','Steam Valve',1,ITEM_QUOTES.steampunk['Steam Valve']],
        ['🔔','Brass Bell',1,ITEM_QUOTES.steampunk['Brass Bell']],
        ['⏰','Clockwork',2,ITEM_QUOTES.steampunk['Clockwork']],
        ['🧲','Magnet Core',2,ITEM_QUOTES.steampunk['Magnet Core']],
        ['🪫','Power Cell',2,ITEM_QUOTES.steampunk['Power Cell']],
        ['🔋','Tesla Battery',3,ITEM_QUOTES.steampunk['Tesla Battery']],
      ]}},
      { name: 'Airship Dock', eggs: 4, collection: { name: 'Airship Parts', items: [
        ['🎈','Gas Cell',1,ITEM_QUOTES.steampunk['Gas Cell']],
        ['🧭','Compass',1,ITEM_QUOTES.steampunk['Compass']],
        ['🔭','Telescope',2,ITEM_QUOTES.steampunk['Telescope']],
        ['⚓','Sky Anchor',2,ITEM_QUOTES.steampunk['Sky Anchor']],
        ['📡','Antenna',2,ITEM_QUOTES.steampunk['Antenna']],
        ['🪂','Golden Chute',3,ITEM_QUOTES.steampunk['Golden Chute']],
      ]}},
      { name: 'Clocktower', eggs: 4, collection: { name: 'Timepieces', items: [
        ['⏱️','Stopwatch',1,ITEM_QUOTES.steampunk['Stopwatch']],
        ['⌚','Pocket Watch',1,ITEM_QUOTES.steampunk['Pocket Watch']],
        ['🕰️','Grandfather Clock',2,ITEM_QUOTES.steampunk['Grandfather Clock']],
        ['⏳','Hourglass',2,ITEM_QUOTES.steampunk['Hourglass']],
        ['🔮','Time Crystal',3,ITEM_QUOTES.steampunk['Time Crystal']],
        ['📅','Infinity Dial',3,ITEM_QUOTES.steampunk['Infinity Dial']],
        ['🎯','Precision Spring',3,ITEM_QUOTES.steampunk['Precision Spring']],
      ]}},
      { name: 'Laboratory', eggs: 5, collection: { name: 'Inventions', items: [
        ['💡','Light Bulb',1,ITEM_QUOTES.steampunk['Light Bulb']],
        ['🔬','Microscope',1,ITEM_QUOTES.steampunk['Microscope']],
        ['📻','Radio',2,ITEM_QUOTES.steampunk['Radio']],
        ['🧪','Tesla Coil',2,ITEM_QUOTES.steampunk['Tesla Coil']],
        ['⚡','Spark Gap',2,ITEM_QUOTES.steampunk['Spark Gap']],
        ['📐','Master Blueprint',3,ITEM_QUOTES.steampunk['Master Blueprint']],
        ['🧬','DNA Helix',3,ITEM_QUOTES.steampunk['DNA Helix']],
      ]}},
      { name: 'Underground Railway', eggs: 5, collection: { name: 'Railway Finds', items: [
        ['🚃','Train Car',1,ITEM_QUOTES.steampunk['Train Car']],
        ['🛤️','Golden Track',1,ITEM_QUOTES.steampunk['Golden Track']],
        ['📋','Travel Log',2,ITEM_QUOTES.steampunk['Travel Log']],
        ['🗝️','Master Key',2,ITEM_QUOTES.steampunk['Master Key']],
        ['🧳','Secret Luggage',2,ITEM_QUOTES.steampunk['Secret Luggage']],
        ['🗺️','Lost Route Map',3,ITEM_QUOTES.steampunk['Lost Route Map']],
        ['🏗️','Signal Box',3,ITEM_QUOTES.steampunk['Signal Box']],
      ]}},
      { name: 'Copper Canyon', eggs: 5, collection: { name: 'Rare Metals', items: [
        ['🧱','Copper Brick',1,ITEM_QUOTES.steampunk['Copper Brick']],
        ['🩶','Silver Shard',1,ITEM_QUOTES.steampunk['Silver Shard']],
        ['🔶','Gold Cube',2,ITEM_QUOTES.steampunk['Gold Cube']],
        ['💎','Raw Sapphire',2,ITEM_QUOTES.steampunk['Raw Sapphire']],
        ['🟤','Bronze Medal',2,ITEM_QUOTES.steampunk['Bronze Medal']],
        ['⬛','Tungsten Core',2,ITEM_QUOTES.steampunk['Tungsten Core']],
        ['🟡','Mythril Disc',3,ITEM_QUOTES.steampunk['Mythril Disc']],
      ]}},
      { name: 'Sky Fortress', eggs: 6, collection: { name: 'Fortress Arsenal', items: [
        ['🗡️','Rapier',1,ITEM_QUOTES.steampunk['Rapier']],
        ['🛡️','Shield',1,ITEM_QUOTES.steampunk['Shield']],
        ['🏹','Crossbow',2,ITEM_QUOTES.steampunk['Crossbow']],
        ['💣','Bomb',2,ITEM_QUOTES.steampunk['Bomb']],
        ['⚔️','Dual Blades',2,ITEM_QUOTES.steampunk['Dual Blades']],
        ['🪃','Boomerang',3,ITEM_QUOTES.steampunk['Boomerang']],
        ['🧨','Mega Dynamite',3,ITEM_QUOTES.steampunk['Mega Dynamite']],
        ['🎪','Smoke Bomb',3,ITEM_QUOTES.steampunk['Smoke Bomb']],
      ]}},
      { name: 'Time Nexus', eggs: 7, collection: { name: 'Temporal Artifacts', items: [
        ['🌀','Time Vortex',1,ITEM_QUOTES.steampunk['Time Vortex']],
        ['💫','Paradox Gem',2,ITEM_QUOTES.steampunk['Paradox Gem']],
        ['♾️','Infinity Cog',2,ITEM_QUOTES.steampunk['Infinity Cog']],
        ['🌐','World Globe',2,ITEM_QUOTES.steampunk['World Globe']],
        ['🏛️','Ancient Relic',3,ITEM_QUOTES.steampunk['Ancient Relic']],
        ['🎭','Mask of Ages',3,ITEM_QUOTES.steampunk['Mask of Ages']],
        ['✨','Chrono Crystal',3,ITEM_QUOTES.steampunk['Chrono Crystal']],
        ['🧿','Eye of Time',3,ITEM_QUOTES.steampunk['Eye of Time']],
      ]}},
    ]
  },
  {
    id: 'princess', name: 'Princess Monkey', emoji: '👸', img: 'img/princess_nohat.jpeg',
    hatImgs: { chef:'img/princess_chef.jpeg', crown:'img/princess_crown.jpeg', wizard:'img/princess_wizard.jpeg', tophat:'img/princess_tophat.jpeg', pirate:'img/princess_pirate.jpeg' },
    cost: 9, goldScale: 0.85,
    perk: 'moreGold', perkDesc: '+20% gold from eggs',
    stages: [
      { name: 'Royal Garden', eggs: 3, collection: { name: 'Garden Flowers', items: [
        ['🌹','Rose',1,ITEM_QUOTES.princess['Rose']],
        ['🌷','Tulip',1,ITEM_QUOTES.princess['Tulip']],
        ['🌸','Cherry Blossom',1,ITEM_QUOTES.princess['Cherry Blossom']],
        ['🌻','Sunflower',2,ITEM_QUOTES.princess['Sunflower']],
        ['💐','Royal Bouquet',2,ITEM_QUOTES.princess['Royal Bouquet']],
      ]}},
      { name: 'Grand Ballroom', eggs: 3, collection: { name: 'Dance Treasures', items: [
        ['💃','Dance Shoes',1,ITEM_QUOTES.princess['Dance Shoes']],
        ['🎵','Music Box',1,ITEM_QUOTES.princess['Music Box']],
        ['🪭','Royal Fan',2,ITEM_QUOTES.princess['Royal Fan']],
        ['🎭','Masquerade Mask',2,ITEM_QUOTES.princess['Masquerade Mask']],
        ['🪩','Crystal Ball',2,ITEM_QUOTES.princess['Crystal Ball']],
        ['🎪','Grand Chandelier',3,ITEM_QUOTES.princess['Grand Chandelier']],
      ]}},
      { name: 'Castle Tower', eggs: 4, collection: { name: 'Tower Relics', items: [
        ['🗝️','Tower Key',1,ITEM_QUOTES.princess['Tower Key']],
        ['📜','Ancient Scroll',1,ITEM_QUOTES.princess['Ancient Scroll']],
        ['🕯️','Magic Candle',2,ITEM_QUOTES.princess['Magic Candle']],
        ['🪞','Mirror Mirror',2,ITEM_QUOTES.princess['Mirror Mirror']],
        ['🧶','Rapunzel Thread',2,ITEM_QUOTES.princess['Rapunzel Thread']],
        ['⚔️','Knight Sword',3,ITEM_QUOTES.princess['Knight Sword']],
      ]}},
      { name: 'Royal Kitchen', eggs: 4, collection: { name: 'Royal Feast', items: [
        ['🍰','Royal Cake',1,ITEM_QUOTES.princess['Royal Cake']],
        ['🧁','Cupcake',1,ITEM_QUOTES.princess['Cupcake']],
        ['🍪','Golden Cookie',1,ITEM_QUOTES.princess['Golden Cookie']],
        ['🫖','Tea Set',2,ITEM_QUOTES.princess['Tea Set']],
        ['🍫','Chocolate Box',2,ITEM_QUOTES.princess['Chocolate Box']],
        ['🎂','Grand Gateau',3,ITEM_QUOTES.princess['Grand Gateau']],
        ['🍬','Enchanted Candy',3,ITEM_QUOTES.princess['Enchanted Candy']],
      ]}},
      { name: 'Royal Treasury', eggs: 5, collection: { name: 'Crown Jewels', items: [
        ['💍','Diamond Ring',1,ITEM_QUOTES.princess['Diamond Ring']],
        ['📿','Pearl Necklace',1,ITEM_QUOTES.princess['Pearl Necklace']],
        ['👑','Tiara',2,ITEM_QUOTES.princess['Tiara']],
        ['💎','Royal Diamond',2,ITEM_QUOTES.princess['Royal Diamond']],
        ['🔰','Royal Brooch',2,ITEM_QUOTES.princess['Royal Brooch']],
        ['⚜️','Fleur-de-lis',3,ITEM_QUOTES.princess['Fleur-de-lis']],
        ['🔮','Scepter Orb',3,ITEM_QUOTES.princess['Scepter Orb']],
      ]}},
      { name: 'Dragon\'s Lair', eggs: 5, collection: { name: 'Dragon Hoard', items: [
        ['🐉','Baby Dragon',1,ITEM_QUOTES.princess['Baby Dragon']],
        ['🔥','Dragon Scale',1,ITEM_QUOTES.princess['Dragon Scale']],
        ['🥚','Dragon Egg',2,ITEM_QUOTES.princess['Dragon Egg']],
        ['🪺','Dragon Nest',2,ITEM_QUOTES.princess['Dragon Nest']],
        ['🗡️','Dragonslayer',2,ITEM_QUOTES.princess['Dragonslayer']],
        ['👁️','Dragon Eye',3,ITEM_QUOTES.princess['Dragon Eye']],
        ['🌟','Dragon Heart',3,ITEM_QUOTES.princess['Dragon Heart']],
      ]}},
      { name: 'Enchanted Lake', eggs: 5, collection: { name: 'Lake Mysteries', items: [
        ['🐸','Frog Prince',1,ITEM_QUOTES.princess['Frog Prince']],
        ['🪷','Lotus Flower',1,ITEM_QUOTES.princess['Lotus Flower']],
        ['🧜','Mermaid',2,ITEM_QUOTES.princess['Mermaid']],
        ['🦢','Swan',2,ITEM_QUOTES.princess['Swan']],
        ['🌊','Water Spirit',2,ITEM_QUOTES.princess['Water Spirit']],
        ['🔱','Lake Trident',3,ITEM_QUOTES.princess['Lake Trident']],
        ['💧','Tear of the Lake',3,ITEM_QUOTES.princess['Tear of the Lake']],
      ]}},
      { name: 'Fairy Court', eggs: 6, collection: { name: 'Fairy Gifts', items: [
        ['🧚','Fairy Queen',1,ITEM_QUOTES.princess['Fairy Queen']],
        ['🌸','Fairy Dust',1,ITEM_QUOTES.princess['Fairy Dust']],
        ['🪻','Magic Iris',2,ITEM_QUOTES.princess['Magic Iris']],
        ['🦋','Rainbow Butterfly',2,ITEM_QUOTES.princess['Rainbow Butterfly']],
        ['🍃','Leaf Crown',2,ITEM_QUOTES.princess['Leaf Crown']],
        ['🌙','Moon Tiara',3,ITEM_QUOTES.princess['Moon Tiara']],
        ['✨','Pixie Wand',3,ITEM_QUOTES.princess['Pixie Wand']],
        ['🫧','Dream Bubble',3,ITEM_QUOTES.princess['Dream Bubble']],
      ]}},
      { name: 'Throne Room', eggs: 7, collection: { name: 'Royal Regalia', items: [
        ['👑','Emperor Crown',1,ITEM_QUOTES.princess['Emperor Crown']],
        ['🗡️','Excalibur',2,ITEM_QUOTES.princess['Excalibur']],
        ['🛡️','Royal Shield',2,ITEM_QUOTES.princess['Royal Shield']],
        ['📜','Royal Decree',2,ITEM_QUOTES.princess['Royal Decree']],
        ['🦁','Lion Crest',3,ITEM_QUOTES.princess['Lion Crest']],
        ['🏰','Castle Model',3,ITEM_QUOTES.princess['Castle Model']],
        ['🌟','Star of Royalty',3,ITEM_QUOTES.princess['Star of Royalty']],
        ['💎','Kohinoor Diamond',3,ITEM_QUOTES.princess['Kohinoor Diamond']],
      ]}},
    ]
  },
  {
    id: 'space', name: 'Space Cadette', emoji: '🚀', img: 'img/space_nohat.jpeg',
    hatImgs: { chef:'img/space_chef.jpeg', crown:'img/space_crown.jpeg', wizard:'img/space_wizard.jpeg', tophat:'img/space_tophat.jpeg', pirate:'img/space_pirate.jpeg' },
    cost: 9, goldScale: 0.66,
    perk: 'moreItems', perkDesc: '+10% item chance',
    stages: [
      { name: 'Launch Pad', eggs: 3, collection: { name: 'Launch Gear', items: [
        ['🚀','Rocket',1,ITEM_QUOTES.space['Rocket']],
        ['🧑‍🚀','Space Suit',1,ITEM_QUOTES.space['Space Suit']],
        ['🛰️','Satellite',1,ITEM_QUOTES.space['Satellite']],
        ['📡','Ground Dish',2,ITEM_QUOTES.space['Ground Dish']],
        ['🔭','Star Scope',2,ITEM_QUOTES.space['Star Scope']],
      ]}},
      { name: 'Space Station', eggs: 3, collection: { name: 'Station Modules', items: [
        ['🔬','Lab Module',1,ITEM_QUOTES.space['Lab Module']],
        ['🛸','Docking Pod',1,ITEM_QUOTES.space['Docking Pod']],
        ['🧪','Zero-G Tube',2,ITEM_QUOTES.space['Zero-G Tube']],
        ['📻','Comms Array',2,ITEM_QUOTES.space['Comms Array']],
        ['🔋','Solar Panel',2,ITEM_QUOTES.space['Solar Panel']],
        ['🤖','Service Bot',3,ITEM_QUOTES.space['Service Bot']],
      ]}},
      { name: 'Moon Base', eggs: 4, collection: { name: 'Lunar Samples', items: [
        ['🌙','Moon Rock',1,ITEM_QUOTES.space['Moon Rock']],
        ['🪨','Regolith',1,ITEM_QUOTES.space['Regolith']],
        ['🔮','Moon Crystal',2,ITEM_QUOTES.space['Moon Crystal']],
        ['🏳️','Flag',2,ITEM_QUOTES.space['Flag']],
        ['👣','First Footprint',2,ITEM_QUOTES.space['First Footprint']],
        ['💎','Lunar Diamond',3,ITEM_QUOTES.space['Lunar Diamond']],
      ]}},
      { name: 'Asteroid Belt', eggs: 4, collection: { name: 'Space Rocks', items: [
        ['☄️','Comet Shard',1,ITEM_QUOTES.space['Comet Shard']],
        ['🪨','Iron Meteorite',1,ITEM_QUOTES.space['Iron Meteorite']],
        ['💫','Stony Iron',2,ITEM_QUOTES.space['Stony Iron']],
        ['🌑','Dark Asteroid',2,ITEM_QUOTES.space['Dark Asteroid']],
        ['💎','Space Diamond',3,ITEM_QUOTES.space['Space Diamond']],
        ['⚡','Charged Fragment',3,ITEM_QUOTES.space['Charged Fragment']],
        ['🌟','Pallasite',3,ITEM_QUOTES.space['Pallasite']],
      ]}},
      { name: 'Mars Colony', eggs: 5, collection: { name: 'Martian Artifacts', items: [
        ['🔴','Red Sand',1,ITEM_QUOTES.space['Red Sand']],
        ['🏔️','Olympus Stone',1,ITEM_QUOTES.space['Olympus Stone']],
        ['🧊','Ice Cap',2,ITEM_QUOTES.space['Ice Cap']],
        ['🔮','Mars Crystal',2,ITEM_QUOTES.space['Mars Crystal']],
        ['🗿','Ancient Marker',2,ITEM_QUOTES.space['Ancient Marker']],
        ['👽','Alien Fossil',3,ITEM_QUOTES.space['Alien Fossil']],
        ['🌋','Valles Find',3,ITEM_QUOTES.space['Valles Find']],
      ]}},
      { name: 'Jupiter Station', eggs: 5, collection: { name: 'Gas Giant Wonders', items: [
        ['🌀','Storm Eye',1,ITEM_QUOTES.space['Storm Eye']],
        ['🪐','Ring Fragment',1,ITEM_QUOTES.space['Ring Fragment']],
        ['🧊','Europa Ice',2,ITEM_QUOTES.space['Europa Ice']],
        ['🌋','Io Lava',2,ITEM_QUOTES.space['Io Lava']],
        ['💨','Atmo Sample',2,ITEM_QUOTES.space['Atmo Sample']],
        ['⚡','Lightning Bolt',3,ITEM_QUOTES.space['Lightning Bolt']],
        ['💎','Pressure Diamond',3,ITEM_QUOTES.space['Pressure Diamond']],
      ]}},
      { name: 'Nebula', eggs: 5, collection: { name: 'Cosmic Dust', items: [
        ['🌫️','Star Dust',1,ITEM_QUOTES.space['Star Dust']],
        ['💜','Nebula Gas',1,ITEM_QUOTES.space['Nebula Gas']],
        ['⭐','Baby Star',2,ITEM_QUOTES.space['Baby Star']],
        ['🔴','Red Giant Core',2,ITEM_QUOTES.space['Red Giant Core']],
        ['⚪','White Dwarf',2,ITEM_QUOTES.space['White Dwarf']],
        ['🌟','Neutron Star',3,ITEM_QUOTES.space['Neutron Star']],
        ['💫','Pulsar Beacon',3,ITEM_QUOTES.space['Pulsar Beacon']],
      ]}},
      { name: 'Black Hole Edge', eggs: 6, collection: { name: 'Dark Matter', items: [
        ['⚫','Dark Particle',1,ITEM_QUOTES.space['Dark Particle']],
        ['🌑','Shadow Orb',1,ITEM_QUOTES.space['Shadow Orb']],
        ['🕳️','Singularity',2,ITEM_QUOTES.space['Singularity']],
        ['⏰','Time Dilation',2,ITEM_QUOTES.space['Time Dilation']],
        ['🌀','Gravity Lens',2,ITEM_QUOTES.space['Gravity Lens']],
        ['💎','Hawking Crystal',3,ITEM_QUOTES.space['Hawking Crystal']],
        ['✨','Event Horizon',3,ITEM_QUOTES.space['Event Horizon']],
        ['♾️','Infinity Shard',3,ITEM_QUOTES.space['Infinity Shard']],
      ]}},
      { name: 'Galaxy Core', eggs: 7, collection: { name: 'Universal Treasures', items: [
        ['🌌','Galaxy Map',1,ITEM_QUOTES.space['Galaxy Map']],
        ['💫','Quasar',2,ITEM_QUOTES.space['Quasar']],
        ['🌟','Supernova',2,ITEM_QUOTES.space['Supernova']],
        ['🧬','Life Seed',2,ITEM_QUOTES.space['Life Seed']],
        ['🔮','Cosmic Orb',3,ITEM_QUOTES.space['Cosmic Orb']],
        ['♾️','Infinity Stone',3,ITEM_QUOTES.space['Infinity Stone']],
        ['🌈','Spectrum Key',3,ITEM_QUOTES.space['Spectrum Key']],
        ['✨','Big Bang Shard',3,ITEM_QUOTES.space['Big Bang Shard']],
      ]}},
    ]
  },
  {
    id: 'odin', name: 'Odin Grímnir, the All-Father', emoji: '🧙', img: 'img/odin_nohat.jpeg',
    hatImgs: { chef:'img/odin_chef.jpeg', crown:'img/odin_crown.jpeg', wizard:'img/odin_wizard.jpeg', tophat:'img/odin_tophat.jpeg', pirate:'img/odin_pirate.jpeg' },
    cost: 9, goldScale: 1.0,
    unlockRequires: { monkeys: ['steampunk', 'princess', 'space'], hint: 'Complete any 3 monkeys to reveal the All-Father' },
    perk: 'allfather', perkDesc: "+10% gold, stars & feathers",
    stages: [
      { name: 'Asgard, the Golden Realm', eggs: 3, collection: { name: 'Aesir Treasures', items: [
        ['⚡', "Thor's Blessing",     1, ITEM_QUOTES.odin["Thor's Blessing"]],
        ['👁️', "All-Seeing Eye",      1, ITEM_QUOTES.odin['All-Seeing Eye']],
        ['🌈', "Bifröst Fragment",    1, ITEM_QUOTES.odin['Bifröst Fragment']],
        ['🐴', "Sleipnir\'s Shoe",    2, ITEM_QUOTES.odin["Sleipnir's Shoe"]],
        ['🪄', "Gungnir Shard",       2, ITEM_QUOTES.odin['Gungnir Shard']],
        ['✨', "Seiðr Rune",          3, ITEM_QUOTES.odin['Seiðr Rune']],
      ]}},
      { name: 'Valhalla, Hall of Heroes', eggs: 3, collection: { name: 'Einherjar\'s Relics', items: [
        ['🍺', "Horn of Mead",          1, ITEM_QUOTES.odin['Horn of Mead']],
        ['🛡️', "Einherjar Shield",      1, ITEM_QUOTES.odin['Einherjar Shield']],
        ['🥩', "Sæhrímnir\'s Rib",      1, ITEM_QUOTES.odin["Sæhrímnir's Rib"]],
        ['💀', "Fallen Warrior\'s Helm", 2, ITEM_QUOTES.odin["Fallen Warrior's Helm"]],
        ['🎺', "Valkyrie\'s Horn",       2, ITEM_QUOTES.odin["Valkyrie's Horn"]],
        ['🏆', "Eternal Glory",          3, ITEM_QUOTES.odin['Eternal Glory']],
      ]}},
      { name: 'Midgard, the Mortal Realm', eggs: 4, collection: { name: 'Viking Essentials', items: [
        ['⛵', "Longship Prow",       1, ITEM_QUOTES.odin['Longship Prow']],
        ['🪓', "Dane Axe",           1, ITEM_QUOTES.odin['Dane Axe']],
        ['🗺️', "Runic Sea Chart",    1, ITEM_QUOTES.odin['Runic Sea Chart']],
        ['🪬', "Runic Amulet",       2, ITEM_QUOTES.odin['Runic Amulet']],
        ['🦌', "Antler Crown",       2, ITEM_QUOTES.odin['Antler Crown']],
        ['🧜', "Jormungandr Charm",  3, ITEM_QUOTES.odin['Jormungandr Charm']],
      ]}},
      { name: 'Jotunheim, Frost Giant Lands', eggs: 4, collection: { name: 'Giant Relics', items: [
        ['❄️', "Frost Rune",         1, ITEM_QUOTES.odin['Frost Rune']],
        ['🏔️', "Mountain Shard",    1, ITEM_QUOTES.odin['Mountain Shard']],
        ['🐺', "Fenrir\'s Milk Tooth", 1, ITEM_QUOTES.odin["Fenrir's Milk Tooth"]],
        ['🌨️', "Blizzard Vial",     2, ITEM_QUOTES.odin['Blizzard Vial']],
        ['⛓️', "Gleipnir Link",      2, ITEM_QUOTES.odin['Gleipnir Link']],
        ['🧊', "Thrym\'s Ice Crown", 3, ITEM_QUOTES.odin["Thrym's Ice Crown"]],
      ]}},
      { name: 'Niflheim, Realm of Mist', eggs: 5, collection: { name: 'Hel\'s Dominion', items: [
        ['💀', "Skull Rune",     1, ITEM_QUOTES.odin['Skull Rune']],
        ['🌫️', "Mist Essence",  1, ITEM_QUOTES.odin['Mist Essence']],
        ['🕯️', "Eternal Candle", 1, ITEM_QUOTES.odin['Eternal Candle']],
        ['🐕', "Garm\'s Collar", 2, ITEM_QUOTES.odin["Garm's Collar"]],
        ['👑', "Hel\'s Crown",   2, ITEM_QUOTES.odin["Hel's Crown"]],
        ['⚫', "Void Shard",     3, ITEM_QUOTES.odin['Void Shard']],
      ]}},
      { name: 'Muspelheim, Realm of Fire', eggs: 5, collection: { name: 'Surtr\'s Forge', items: [
        ['🔥', "Ember Rune",       1, ITEM_QUOTES.odin['Ember Rune']],
        ['🌋', "Magma Stone",      1, ITEM_QUOTES.odin['Magma Stone']],
        ['🌞', "Fire Opal",        2, ITEM_QUOTES.odin['Fire Opal']],
        ['🗡️', "Surtr\'s Sliver",  2, ITEM_QUOTES.odin["Surtr's Sliver"]],
        ['🐉', "Nidhogg\'s Scale", 3, ITEM_QUOTES.odin["Nidhogg's Scale"]],
      ]}},
      { name: 'Yggdrasil, the World Tree', eggs: 6, collection: { name: 'World Tree Wonders', items: [
        ['🌳', "Heartwood Chip",      1, ITEM_QUOTES.odin['Heartwood Chip']],
        ['🐿️', "Ratatoskr\'s Acorn", 1, ITEM_QUOTES.odin["Ratatoskr's Acorn"]],
        ['🦅', "Eagle\'s Feather",   1, ITEM_QUOTES.odin["Eagle's Feather"]],
        ['🍃', "Nine Realms Leaf",   2, ITEM_QUOTES.odin['Nine Realms Leaf']],
        ['🕷️', "Norns\' Thread",     2, ITEM_QUOTES.odin["Norns' Thread"]],
        ['🍎', "Iðunn\'s Apple",     3, ITEM_QUOTES.odin["Iðunn's Apple"]],
      ]}},
      { name: 'Ragnarök, the Final Battle', eggs: 7, collection: { name: 'End of Days', items: [
        ['🌊', "Flood Tide Stone",  1, ITEM_QUOTES.odin['Flood Tide Stone']],
        ['🐍', "Fáfnir\'s Fang",   1, ITEM_QUOTES.odin["Fáfnir's Fang"]],
        ['🌑', "Darkened Sun",      2, ITEM_QUOTES.odin['Darkened Sun']],
        ['💥', "Thunder Crack",     2, ITEM_QUOTES.odin['Thunder Crack']],
        ['⚔️', "Odin\'s Last Rune", 2, ITEM_QUOTES.odin["Odin's Last Rune"]],
        ['🌿', "First New Leaf",    3, ITEM_QUOTES.odin['First New Leaf']],
        ['🌟', "Rebirth Spark",     3, ITEM_QUOTES.odin['Rebirth Spark']],
      ]}},
    ]
  },
  {
    id: 'sun_wukong', name: 'Sun Wukong, the Monkey King', emoji: '🐒', img: 'img/wukong_nohat.png',
    hatImgs: { chef:'img/wukong_chef.png', crown:'img/wukong_crown.png', wizard:'img/wukong_wizard.png', tophat:'img/wukong_tophat.png', pirate:'img/wukong_pirate.png' },
    cost: 9, goldScale: 0.90,
    unlockRequires: { monkeys: ['steampunk', 'princess', 'space', 'odin'], totalEggs: 25000, hint: 'Complete all 5 monkeys to reveal the Monkey King' },
    perk: 'wukong', perkDesc: '72 Transformations: 15% chance to get next-tier egg prizes',
    stages: [
      { name: 'Flower Fruit Mountain', eggs: 3, collection: { name: 'Mountain Treasures', items: [
        ['🐒', 'Stone Monkey',    1, ITEM_QUOTES.sun_wukong['Stone Monkey']],
        ['🍑', 'Wild Peach',      1, ITEM_QUOTES.sun_wukong['Wild Peach']],
        ['💧', 'Waterfall Veil',  1, ITEM_QUOTES.sun_wukong['Waterfall Veil']],
        ['🌿', 'Immortal Herb',   2, ITEM_QUOTES.sun_wukong['Immortal Herb']],
        ['🏔️', 'Stone Throne',    2, ITEM_QUOTES.sun_wukong['Stone Throne']],
      ]}},
      { name: 'East Sea Dragon Palace', eggs: 3, collection: { name: "Dragon's Vault", items: [
        ['🌊', 'Sea Pearl',          1, ITEM_QUOTES.sun_wukong['Sea Pearl']],
        ['🐚', 'Conch Shell',        1, ITEM_QUOTES.sun_wukong['Conch Shell']],
        ['🦀', 'Dragon Crab',        1, ITEM_QUOTES.sun_wukong['Dragon Crab']],
        ['🔱', 'Ruyi Jingu Bang',    2, ITEM_QUOTES.sun_wukong['Ruyi Jingu Bang']],
        ['👘', 'Dragon Robe',        2, ITEM_QUOTES.sun_wukong['Dragon Robe']],
        ['💎', 'Dragon Crystal',     3, ITEM_QUOTES.sun_wukong['Dragon Crystal']],
      ]}},
      { name: "Hall of Hell", eggs: 4, collection: { name: 'Underworld Records', items: [
        ['📜', 'Ledger of Life',    1, ITEM_QUOTES.sun_wukong['Ledger of Life']],
        ['⛓️', 'Soul Chain',        1, ITEM_QUOTES.sun_wukong['Soul Chain']],
        ['🕯️', 'Ghost Lantern',     1, ITEM_QUOTES.sun_wukong['Ghost Lantern']],
        ['💀', "Yama's Seal",       2, ITEM_QUOTES.sun_wukong["Yama's Seal"]],
        ['🖊️', 'Erasing Brush',     2, ITEM_QUOTES.sun_wukong['Erasing Brush']],
        ['📖', 'Empty Death Record',3, ITEM_QUOTES.sun_wukong['Empty Death Record']],
      ]}},
      { name: 'Heavenly Palace', eggs: 4, collection: { name: 'Celestial Spoils', items: [
        ['☁️', 'Cloud Brick',          1, ITEM_QUOTES.sun_wukong['Cloud Brick']],
        ['⭐', 'Jade Star',            1, ITEM_QUOTES.sun_wukong['Jade Star']],
        ['🪭', 'Celestial Fan',        1, ITEM_QUOTES.sun_wukong['Celestial Fan']],
        ['🏮', 'Heavenly Lantern',     2, ITEM_QUOTES.sun_wukong['Heavenly Lantern']],
        ['🎋', 'Jade Tablet',          2, ITEM_QUOTES.sun_wukong['Jade Tablet']],
        ['🌟', 'Immortal Flame',       2, ITEM_QUOTES.sun_wukong['Immortal Flame']],
        ['👑', "Jade Emperor's Seal",  3, ITEM_QUOTES.sun_wukong["Jade Emperor's Seal"]],
      ]}},
      { name: 'Peach Garden', eggs: 5, collection: { name: 'Peaches of Immortality', items: [
        ['🌸', 'Blossom',           1, ITEM_QUOTES.sun_wukong['Blossom']],
        ['🍃', 'Jade Leaf',         1, ITEM_QUOTES.sun_wukong['Jade Leaf']],
        ['🌱', 'Garden Seedling',   1, ITEM_QUOTES.sun_wukong['Garden Seedling']],
        ['🍑', 'Golden Peach',      2, ITEM_QUOTES.sun_wukong['Golden Peach']],
        ['🌙', 'Moon Nectar',       2, ITEM_QUOTES.sun_wukong['Moon Nectar']],
        ['💊', "Laozi's Pill",      2, ITEM_QUOTES.sun_wukong["Laozi's Pill"]],
        ['✨', 'Immortality Elixir',3, ITEM_QUOTES.sun_wukong['Immortality Elixir']],
      ]}},
      { name: 'Flaming Mountain', eggs: 5, collection: { name: 'Iron Fan Realm', items: [
        ['🔥', 'Lava Pebble',      1, ITEM_QUOTES.sun_wukong['Lava Pebble']],
        ['💨', 'Fan Gust',         1, ITEM_QUOTES.sun_wukong['Fan Gust']],
        ['🌋', 'Magma Drop',       1, ITEM_QUOTES.sun_wukong['Magma Drop']],
        ['🌀', 'Cyclone Quill',    2, ITEM_QUOTES.sun_wukong['Cyclone Quill']],
        ['🐂', "Bull King's Helm", 2, ITEM_QUOTES.sun_wukong["Bull King's Helm"]],
        ['🌬️', 'Iron Fan',         3, ITEM_QUOTES.sun_wukong['Iron Fan']],
        ['☄️', 'Extinguish Bead',  3, ITEM_QUOTES.sun_wukong['Extinguish Bead']],
      ]}},
      { name: 'Spider Cave', eggs: 5, collection: { name: 'Silken Snares', items: [
        ['🕸️', 'Silk Thread',       1, ITEM_QUOTES.sun_wukong['Silk Thread']],
        ['🦟', 'Caught Fly',        1, ITEM_QUOTES.sun_wukong['Caught Fly']],
        ['🕷️', 'Venom Fang',        2, ITEM_QUOTES.sun_wukong['Venom Fang']],
        ['💍', 'Jade Web Pin',      2, ITEM_QUOTES.sun_wukong['Jade Web Pin']],
        ['👁️', 'Seven-Eye Gem',     2, ITEM_QUOTES.sun_wukong['Seven-Eye Gem']],
        ['🌑', 'Shadow Cocoon',     3, ITEM_QUOTES.sun_wukong['Shadow Cocoon']],
        ['🔮', "Spider Queen's Eye",3, ITEM_QUOTES.sun_wukong["Spider Queen's Eye"]],
      ]}},
      { name: 'Thunder Monastery', eggs: 6, collection: { name: 'Divine Arsenal', items: [
        ['⚡', 'Thunder Bead',    1, ITEM_QUOTES.sun_wukong['Thunder Bead']],
        ['🪘', 'War Drum',        1, ITEM_QUOTES.sun_wukong['War Drum']],
        ['🌩️', 'Storm Scroll',    1, ITEM_QUOTES.sun_wukong['Storm Scroll']],
        ['🗡️', 'Celestial Blade', 2, ITEM_QUOTES.sun_wukong['Celestial Blade']],
        ['🛡️', 'Thunder Shield',  2, ITEM_QUOTES.sun_wukong['Thunder Shield']],
        ['🌀', 'Storm Pearl',     2, ITEM_QUOTES.sun_wukong['Storm Pearl']],
        ['🔱', 'Vajra Pestle',    3, ITEM_QUOTES.sun_wukong['Vajra Pestle']],
        ['✨', 'Bodhi Light',     3, ITEM_QUOTES.sun_wukong['Bodhi Light']],
      ]}},
      { name: 'Western Paradise, Lingshan', eggs: 7, collection: { name: 'Scriptures of Truth', items: [
        ['📿', 'Prayer Beads',      1, ITEM_QUOTES.sun_wukong['Prayer Beads']],
        ['🕊️', 'Peace Dove',        1, ITEM_QUOTES.sun_wukong['Peace Dove']],
        ['🙏', 'Lotus Step',        1, ITEM_QUOTES.sun_wukong['Lotus Step']],
        ['📜', 'Sacred Sutra',      2, ITEM_QUOTES.sun_wukong['Sacred Sutra']],
        ['🌺', 'Bodhi Flower',      2, ITEM_QUOTES.sun_wukong['Bodhi Flower']],
        ['🌟', 'Enlightenment Gem', 2, ITEM_QUOTES.sun_wukong['Enlightenment Gem']],
        ['👑', 'Buddha Crown',      3, ITEM_QUOTES.sun_wukong['Buddha Crown']],
        ['☸️', 'Dharma Wheel',      3, ITEM_QUOTES.sun_wukong['Dharma Wheel']],
      ]}},
    ]
  },
];

const SHOP_HAMMERS = [
  { id: 'default',    name: 'Basic Hammer',     emoji: '🔨', desc: 'Standard issue',              cost: 0, bonus: null },
  { id: 'drumstick',  name: 'Drumstick Hammer', emoji: '🍗', desc: '+15% star pieces',            cost: 8000, currency: 'gold', bonus: 'moreStars' },
  { id: 'bat',        name: 'Bat Hammer',       emoji: '🦇', desc: 'Fewer empty eggs',            cost: 12000, currency: 'gold', bonus: 'lessEmpty' },
  { id: 'crystal',    name: 'Crystal Hammer',    emoji: '🔮', desc: '+20% feathers',               cost: 25000, currency: 'gold', bonus: 'moreFeathers' },
  { id: 'golden',     name: 'Golden Hammer',     emoji: '⭐', desc: '2x gold from eggs',           cost: 120000, currency: 'gold', bonus: 'moreGold' },
  { id: 'rainbow',    name: 'Rainbow Hammer',    emoji: '🌈', desc: '+10% items, +15% gold',       cost: 220000, currency: 'gold', bonus: ['moreItems', 'goldBoost15'] },
  { id: 'cucumber',   name: 'Cucumber Hammer',   emoji: '🥒', desc: '5% double hit, +25% gold',   cost: 300000, currency: 'gold', bonus: ['doubleHit', 'goldBoost25'] },
  { id: 'mjolnir',   name: 'Mjǫllnir',          emoji: '⚡', desc: '3% chance: full Starfall + 7 star pieces, +40% gold', cost: 420000, currency: 'gold', bonus: ['mjolnirStarfall', 'goldBoost40'] },
  { id: 'gavel',     name: 'Judge Gavel',        emoji: '⚖️', desc: 'Order! 4% chance: instant verdict — breaks any egg immediately regardless of HP. +50% gold.', cost: 700000, currency: 'gold', bonus: ['gavelVerdict', 'goldBoost50'] },
];

const SHOP_HATS = [
  { id: 'none',    name: 'No Hat',        emoji: '🐒', desc: '',                         cost: 0, bonus: null },
  { id: 'chef',    name: 'Chef\'s Hat',   emoji: '👨‍🍳', desc: '3% chance hit was free',   cost: 15000, currency: 'gold', bonus: 'freeEgg' },
  { id: 'crown',   name: 'Crown',         emoji: '👑', desc: '+10% gold',                 cost: 30000, currency: 'gold', bonus: 'goldBoost' },
  { id: 'wizard',  name: 'Wizard Hat',    emoji: '🧙', desc: '+10% stars',                cost: 45000, currency: 'gold', bonus: 'starBoost' },
  { id: 'tophat',  name: 'Top Hat',       emoji: '🎩', desc: 'Unlocks x123 multiplier',   cost: 110000, currency: 'gold', bonus: 'unlock123' },
  { id: 'pirate',  name: 'Pirate Hat',    emoji: '🏴‍☠️', desc: '+15% collection items',    cost: 180000, currency: 'gold', bonus: 'itemBoost' },
];

const SHOP_SUPPLIES = [
  { id: 'hammers5',   name: '+5 Hammers',      emoji: '🔨', cost: 1050,   currency: 'gold', type: 'consumable' },
  { id: 'hammers20',  name: '+20 Hammers',      emoji: '🔨', cost: 3500,   currency: 'gold', type: 'consumable' },
  { id: 'star1',      name: 'Star Piece',       emoji: '⭐', cost: 3000,   currency: 'gold', type: 'consumable' },
  { id: 'mult5',      name: 'x5 Multiplier',    emoji: '✖️', cost: 5000,   currency: 'gold', type: 'consumable' },
  { id: 'spyglass',   name: 'Spyglass',         emoji: '🔍', desc: 'Reveal egg names & HP', cost: 5000, currency: 'gold', type: 'upgrade', unique: true },
  { id: 'fastregen',  name: 'Fast Regen',       emoji: '⚡', desc: 'Hammers regen 1.5x faster', cost: 25000, currency: 'gold', type: 'upgrade', unique: true },
  { id: 'cleanse',    name: 'Cleanse',          emoji: '🌿', desc: 'Hex immunity',               cost: 150000, currency: 'gold', type: 'upgrade', unique: true },
];

// All tuning values are read from CONFIG (config.js)
// Egg type registry — keyed by id for O(1) lookup
const EGG_REGISTRY = {};
const EGG_HP = {};
const EGG_SPAWN_WEIGHTS = {};
const PRIZE_WEIGHTS = {};
CONFIG.eggTypes.forEach(function(def) {
  EGG_REGISTRY[def.id] = def;
  EGG_HP[def.id] = def.hp;
  EGG_SPAWN_WEIGHTS[def.id] = def.spawnWeight;
  PRIZE_WEIGHTS[def.id] = def.prizes;
});
const GOLD_VALUES    = CONFIG.goldValues;
const MULT_VALUES    = CONFIG.multiplierValues;
const HAMMER_PRIZES  = CONFIG.hammerPrizeAmounts;

// reward: { type, value } — applied permanently when unlocked
// types: maxH (max hammers), gold (flat gold), feathers, starPieces, goldPct (% gold bonus), itemPct (% item bonus), hammerRegen (seconds off regen)
const ACHIEVEMENT_DATA = [
  // -- Eggs smashed --
  { id:'first_smash',  name:'First Crack',       desc:'Break your first egg',          icon:'🥚', reward:{type:'maxH',val:2,        label:'+2 max hammers'} },
  { id:'smash_50',     name:'Egg Smasher',        desc:'Break 50 eggs',                 icon:'💪', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  { id:'smash_200',    name:'Egg Destroyer',       desc:'Break 200 eggs',                icon:'🔥', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'smash_1000',   name:'Egg Annihilator',     desc:'Break 1,000 eggs',              icon:'💥', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'smash_5000',   name:'Egg Apocalypse',      desc:'Break 5,000 eggs',              icon:'☄️', reward:{type:'gold',val:5000,     label:'+5,000 gold'} },
  { id:'smash_10000',  name:'Egg Extinction',      desc:'Break 10,000 eggs',             icon:'🌋', reward:{type:'maxH',val:10,       label:'+10 max hammers'} },
  { id:'smash_50000',  name:'You Did It!',         desc:'Break 25,000 eggs',             icon:'🐒', reward:{type:'goldPct',val:20,    label:'+20% gold from eggs'} },
  // -- Gold earned --
  { id:'gold_1000',    name:'Coin Collector',      desc:'Earn 1,000 total gold',         icon:'🪙', reward:{type:'gold',val:100,      label:'+100 gold'} },
  { id:'gold_50000',   name:'Rich Monkey',         desc:'Earn 50,000 total gold',        icon:'💰', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'gold_500000',  name:'Gold Tycoon',         desc:'Earn 500,000 total gold',       icon:'🤑', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  { id:'gold_2000000', name:'Gold Hoarder',        desc:'Earn 2,000,000 total gold',     icon:'🏦', reward:{type:'goldPct',val:10,    label:'+10% gold from eggs'} },
  // -- Star pieces --
  { id:'stars_10',     name:'Stargazer',           desc:'Collect 10 star pieces',        icon:'⭐', reward:{type:'starPieces',val:2,  label:'+2 star pieces'} },
  { id:'stars_50',     name:'Star Catcher',        desc:'Collect 50 star pieces',        icon:'🌠', reward:{type:'starPieces',val:3,  label:'+3 star pieces'} },
  { id:'stars_200',    name:'Constellation',       desc:'Collect 200 star pieces',       icon:'🌌', reward:{type:'starPct',val:10,    label:'+10% star drop rate'} },
  // -- Starfall --
  { id:'starfall_1',   name:'Starfall!',           desc:'Use your first starfall',       icon:'🌟', reward:{type:'starPieces',val:1,  label:'+1 star piece'} },
  { id:'starfall_10',  name:'Star Storm',          desc:'Use 10 starfalls',              icon:'💫', reward:{type:'starPieces',val:3,  label:'+3 star pieces'} },
  { id:'starfall_50',  name:'Meteor Shower',       desc:'Use 50 starfalls',              icon:'🌠', reward:{type:'gold',val:3000,     label:'+3,000 gold'} },
  // -- Collections --
  { id:'coll_1',       name:'Collector',           desc:'Complete 1 collection',         icon:'📖', reward:{type:'feathers',val:5,    label:'+5 feathers'} },
  { id:'coll_5',       name:'Curator',             desc:'Complete 5 collections',        icon:'🏛️', reward:{type:'feathers',val:10,   label:'+10 feathers'} },
  { id:'coll_15',      name:'Archivist',           desc:'Complete 15 collections',       icon:'📚', reward:{type:'itemPct',val:5,     label:'+5% item drop rate'} },
  { id:'coll_30',      name:'Completionist',       desc:'Complete 30 collections',       icon:'🗂️', reward:{type:'itemPct',val:10,    label:'+10% item drop rate'} },
  // -- Items found --
  { id:'items_10',     name:'Treasure Hunter',     desc:'Find 10 collection items',      icon:'🔍', reward:{type:'feathers',val:3,    label:'+3 feathers'} },
  { id:'items_50',     name:'Relic Seeker',        desc:'Find 50 collection items',      icon:'🗿', reward:{type:'feathers',val:8,    label:'+8 feathers'} },
  { id:'items_100',    name:'Artifact Master',     desc:'Find 100 collection items',     icon:'🏺', reward:{type:'feathers',val:15,   label:'+15 feathers'} },
  { id:'items_200',    name:'Museum Curator',      desc:'Find 200 collection items',     icon:'🖼️', reward:{type:'gold',val:10000,    label:'+10,000 gold'} },
  // -- Stages --
  { id:'stage_1',      name:'Stage Clear',         desc:'Complete a stage (gold tier)',   icon:'🎯', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'stage_9',      name:'World Champion',      desc:'Complete 9 stages',             icon:'🏆', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'stage_18',     name:'Double Trouble',      desc:'Complete 18 stages',            icon:'⚡', reward:{type:'gold',val:8000,     label:'+8,000 gold'} },
  { id:'stage_36',     name:'Grand Master',        desc:'Complete all 36 stages',        icon:'👑', reward:{type:'goldPct',val:15,    label:'+15% gold from eggs'} },
  { id:'stage_all',    name:'True Grand Master',   desc:'Complete all 53 stages',        icon:'🐒', reward:{type:'goldPct',val:20,    label:'+20% gold from eggs'} },
  // -- Monkeys --
  { id:'monkey_2',     name:'New Friend',          desc:'Unlock a second monkey',        icon:'🐒', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'monkey_all',   name:'Monkey Business',     desc:'Unlock all monkeys',            icon:'🐵', reward:{type:'goldPct',val:10,    label:'+10% gold from eggs'} },
  // -- Feathers --
  { id:'feathers_50',  name:'Plucked',             desc:'Collect 50 feathers',           icon:'🪶', reward:{type:'feathers',val:5,    label:'+5 feathers'} },
  { id:'feathers_500', name:'Feather Duster',      desc:'Collect 500 feathers',          icon:'🦚', reward:{type:'feathers',val:15,   label:'+15 feathers'} },
  { id:'feather_buy',  name:'Shortcut',            desc:'Buy an item with feathers',     icon:'🛍️', reward:{type:'feathers',val:3,    label:'+3 feathers'} },
  { id:'feather_buy10',name:'Big Spender',         desc:'Buy 10 items with feathers',    icon:'💸', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  // -- Multipliers --
  { id:'mult_found',   name:'Lucky Find',          desc:'Find your first multiplier',    icon:'🔢', reward:{type:'gold',val:50,       label:'+50 gold'} },
  { id:'mult_50',      name:'Multiplied!',         desc:'Use a x50 multiplier',          icon:'✖️', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'mult_123',     name:'Jackpot!',            desc:'Find the legendary x123',       icon:'🎰', reward:{type:'gold',val:5000,     label:'+5,000 gold'} },
  { id:'mult_stack',   name:'Stacked!',            desc:'Use 3+ multipliers at once',    icon:'📚', reward:{type:'gold',val:500,      label:'+500 gold'} },
  { id:'mult_big',     name:'Mega Combo',          desc:'Get a x20+ combined multiplier',icon:'🔥', reward:{type:'gold',val:2000,     label:'+2,000 gold'} },
  // -- Silver & Gold eggs --
  { id:'silver_10',    name:'Silver Streak',       desc:'Break 10 silver eggs',          icon:'🥈', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  { id:'silver_100',   name:'Silver Mine',         desc:'Break 100 silver eggs',         icon:'⛏️', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'gold_egg_10',  name:'Golden Touch',        desc:'Break 10 gold eggs',            icon:'🥇', reward:{type:'goldPct',val:3,     label:'+3% gold from eggs'} },
  { id:'gold_egg_50',  name:'Gold Rush',           desc:'Break 50 gold eggs',            icon:'🏅', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  { id:'crystal_1',    name:'Crystal Clear',      desc:'Break your first crystal egg',  icon:'🔮', reward:{type:'gold',val:500,      label:'+500 gold'} },
  { id:'crystal_25',   name:'Crystal Collector',  desc:'Break 25 crystal eggs',         icon:'💜', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  // -- Ruby & Black eggs --
  { id:'ruby_1',       name:'Ruby Glow',          desc:'Break your first ruby egg',     icon:'💎', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'ruby_25',      name:'Gem Crusher',        desc:'Break 25 ruby eggs',            icon:'❤️', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  { id:'black_1',      name:'Into the Void',      desc:'Break your first black egg',    icon:'🖤', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'black_10',     name:'Dark Matter',         desc:'Break 10 black eggs',           icon:'⚫', reward:{type:'goldPct',val:10,    label:'+10% gold from eggs'} },
  // -- Daily login --
  { id:'streak_5',     name:'On a Roll',           desc:'5-day login streak',            icon:'📅', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  { id:'daily_10',     name:'Regular',             desc:'Log in 7 days in a row',        icon:'📆', reward:{type:'gold',val:500,      label:'+500 gold'} },
  // -- Shopping --
  { id:'buy_hammer',   name:'Tool Upgrade',        desc:'Buy a special hammer',          icon:'🔨', reward:{type:'gold',val:200,      label:'+200 gold'} },
  { id:'buy_hat',      name:'Hat Collector',       desc:'Buy a hat',                     icon:'🎩', reward:{type:'gold',val:200,      label:'+200 gold'} },
  { id:'buy_all_h',    name:'Arsenal',             desc:'Buy all special hammers',       icon:'🗡️', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  { id:'buy_all_hat',  name:'Millinery',           desc:'Buy all hats',                  icon:'🎪', reward:{type:'itemPct',val:5,     label:'+5% item drop rate'} },
  { id:'shop_10',      name:'Shopaholic',          desc:'Make 10 shop purchases',        icon:'🛒', reward:{type:'gold',val:500,      label:'+500 gold'} },
  // -- Rounds --
  { id:'round_clear',  name:'Clean Sweep',         desc:'Break all eggs in one round',   icon:'🧹', reward:{type:'maxH',val:2,        label:'+2 max hammers'} },
  { id:'round_50',     name:'Marathon',            desc:'Clear 50 rounds',               icon:'🏃', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  { id:'round_500',    name:'Unstoppable',         desc:'Clear 500 rounds',              icon:'🚂', reward:{type:'maxH',val:8,        label:'+8 max hammers'} },
  // -- Biggest win --
  { id:'bigwin_500',   name:'Payday',              desc:'Win 500+ gold in one smash',    icon:'💵', reward:{type:'gold',val:200,      label:'+200 gold'} },
  { id:'bigwin_5000',  name:'Windfall',            desc:'Win 5,000+ gold in one smash',  icon:'💎', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'bigwin_50000', name:'Legendary Loot',      desc:'Win 50,000+ gold in one smash', icon:'🌟', reward:{type:'goldPct',val:10,    label:'+10% gold from eggs'} },
  // -- Hammer overflow --
  { id:'overflow',     name:'Overloaded',          desc:'Have more hammers than your max',icon:'📦', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  // -- Empties --
  { id:'empty_10',     name:'Bad Luck',            desc:'Get 10 empties',                 icon:'💨', reward:{type:'gold',val:50,       label:'+50 gold'} },
  { id:'empty_50',     name:'Consistently Unlucky',desc:'Get 50 empties',                 icon:'🕳️', reward:{type:'gold',val:150,      label:'+150 gold'} },
  { id:'empty_200',    name:'Professional Loser',  desc:'Get 200 empties',                icon:'🤡', reward:{type:'gold',val:500,      label:'+500 gold'} },
  { id:'empty_500',    name:'Empty Inside',        desc:'Get 500 empties',                icon:'👻', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  // -- Egg effects --
  { id:'runny_1',      name:'Catch Me!',           desc:'Smash a runny egg',              icon:'🏃', reward:{type:'gold',val:100,      label:'+100 gold'} },
  { id:'runny_25',     name:'Egg Chaser',          desc:'Smash 25 runny eggs',            icon:'💨', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'runny_100',    name:'Can\'t Run From Me',  desc:'Smash 100 runny eggs',           icon:'🏆', reward:{type:'goldPct',val:3,     label:'+3% gold from eggs'} },
  { id:'timer_1',      name:'Just In Time',        desc:'Smash a timed egg',              icon:'⏱️', reward:{type:'gold',val:100,      label:'+100 gold'} },
  { id:'timer_25',     name:'Beat The Clock',      desc:'Smash 25 timed eggs',            icon:'⏰', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'timer_100',    name:'Time Lord',           desc:'Smash 100 timed eggs',           icon:'🕐', reward:{type:'goldPct',val:3,     label:'+3% gold from eggs'} },
  { id:'timer_close',  name:'Living Dangerously',  desc:'Smash a timed egg with under 0.1s left', icon:'💀', reward:{type:'gold',val:777,      label:'+777 gold'} },
  { id:'missed_1',     name:'Too Slow',            desc:'Let a timed egg expire',         icon:'🐌', reward:{type:'gold',val:50,       label:'+50 gold'} },
  { id:'missed_10',    name:'Butterfingers',       desc:'Let 10 timed eggs expire',       icon:'🧈', reward:{type:'gold',val:200,      label:'+200 gold'} },
  { id:'combo_effect', name:'Double Trouble',      desc:'Smash a runny timed egg',        icon:'🤯', reward:{type:'gold',val:500,      label:'+500 gold'} },
  // -- Century egg --
  { id:'century_1',   name:'The Chosen One',      desc:'Break a Century Egg',            icon:'🌀', reward:{type:'goldPct',val:15,    label:'+15% gold from eggs'} },
  // -- Hex --
  { id:'hex_1',        name:'Cursed!',             desc:'Get hexed for the first time',   icon:'😈', reward:{type:'gold',val:100,      label:'+100 gold'} },
  { id:'hex_10',       name:'Bad Karma',           desc:'Get hexed 10 times',             icon:'👹', reward:{type:'gold',val:500,      label:'+500 gold'} },
  { id:'hex_50',       name:'Hex Magnet',          desc:'Get hexed 50 times',             icon:'🧿', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  // -- Balloon --
  { id:'balloon_1',    name:'Pop!',                desc:'Pop your first balloon egg',     icon:'🎈', reward:{type:'gold',val:200,      label:'+200 gold'} },
  { id:'balloon_10',   name:'Party Animal',        desc:'Pop 10 balloon eggs',            icon:'🎉', reward:{type:'gold',val:2000,     label:'+2,000 gold'} },
  { id:'balloon_50',   name:'Balloon Master',      desc:'Pop 50 balloon eggs',            icon:'🎊', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  // -- Premium --
  { id:'premium_first',     name:'High Roller',       desc:'Make your first premium purchase',  icon:'💎', reward:{type:'feathers',val:20,   label:'+20 feathers'} },
  { id:'premium_starter',   name:'Ready to Roll',     desc:'Purchase the Starter Pack',          icon:'🎁', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'premium_supporter', name:'True Supporter',    desc:'Make 3 premium purchases',           icon:'👑', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  // -- Skills --
  { id:'skill_first',   name:'Power Awakened',        desc:'Unlock your first skill',            icon:'⚡', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'skill_all',     name:'Triple Threat',         desc:'Unlock all 3 skills',                icon:'🌟', reward:{type:'feathers',val:20,   label:'+20 feathers'} },
  { id:'rage_first',    name:'Banana Goes Crazy',     desc:'Unleash Monkey Rage for the first time', icon:'🐒', reward:{type:'gold',val:500,  label:'+500 gold'} },
  { id:'rage_10',       name:'On A Rampage',          desc:'Use Monkey Rage 10 times',           icon:'🔥', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  { id:'rage_upgrade1', name:'Focused Fury',          desc:'Upgrade Monkey Rage',                icon:'⚙️', reward:{type:'feathers',val:8,    label:'+8 feathers'} },
  { id:'rage_maxed',    name:'Maximum Rage',          desc:'Fully upgrade Monkey Rage',          icon:'🦍', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'goose_first',   name:'Golden Hour',           desc:'Activate Golden Goose for the first time', icon:'🥚', reward:{type:'gold',val:500, label:'+500 gold'} },
  { id:'goose_10',      name:'Goose on the Loose',    desc:'Activate Golden Goose 10 times',     icon:'✨', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  { id:'goose_upgrade', name:'Gilded Upgrade',        desc:'Upgrade Golden Goose',               icon:'⚙️', reward:{type:'feathers',val:8,    label:'+8 feathers'} },
  { id:'shake_first',   name:'Shake It Up',           desc:'Use Banana Shake for the first time',icon:'🍌', reward:{type:'gold',val:300,      label:'+300 gold'} },
  { id:'shake_10',      name:'Blended Master',        desc:'Use Banana Shake 10 times',          icon:'🔨', reward:{type:'maxH',val:2,        label:'+2 max hammers'} },
  { id:'shake_upgrade', name:'Supercharged Shake',    desc:'Upgrade Banana Shake',               icon:'⚙️', reward:{type:'feathers',val:8,    label:'+8 feathers'} },
  { id:'skills_maxed',  name:'Fully Loaded',          desc:'Max out all 3 skills',               icon:'👑', reward:{type:'goldPct',val:10,    label:'+10% gold from eggs'} },
];

// Secret achievements — hidden until discovered
const SECRET_ACHIEVEMENTS = [
  { id:'secret_speed', name:'Speed Demon',       desc:'Smash 5 eggs in under 5 seconds',    icon:'⚡', reward:{type:'gold',    val:300,  label:'+300 gold'} },
  { id:'secret_sweep', name:'Clean Sweep',       desc:'Break every egg in a round',         icon:'🧹', reward:{type:'feathers',val:10,   label:'+10 feathers'} },
  { id:'secret_ouch',     name:'Sorry Little Egg',      desc:'An egg said ouch',                 icon:'🥺', reward:{type:'gold',val:100,  label:'+100 gold'} },
  { id:'secret_chicken',  name:'Why Did It Cross?',     desc:'Spot the runaway chicken',         icon:'🐔', reward:{type:'gold',val:200,  label:'+200 gold'} },
  { id:'secret_midnight', name:'Night Owl',             desc:'Break eggs at midnight',           icon:'🌙', reward:{type:'starPieces',val:3, label:'+3 star pieces'} },
  { id:'secret_leet',     name:'l33t',                  desc:'Have exactly 1337 gold',           icon:'💻', reward:{type:'gold',val:1337, label:'+1,337 gold'} },
  { id:'secret_strikes',  name:'Three Strikes',         desc:'Get 3 empties in a row',           icon:'⚾', reward:{type:'gold',val:100,  label:'+100 gold'} },
  { id:'secret_chef',     name:'Could\'ve Been a Chef', desc:'Break 10,000 normal eggs',         icon:'👨‍🍳', reward:{type:'maxH',val:5,    label:'+5 max hammers'} },
];

// Daily rewards for 30 days. type: gold, hammers, maxH, feathers
function generateDailyRewards() {
  const rewards = [];
  for (let d = 1; d <= 30; d++) {
    // Max hammers on bi-weekly milestones (day 14, 28)
    if (d % 14 === 0) {
      const mv = 3 + Math.floor(d / 20);
      rewards.push({ day: d, type: 'maxH', val: mv, icon: '📦', label: '+' + mv + ' max hammers' });
    }
    // Day 30 finale: big feather haul
    else if (d === 30) {
      rewards.push({ day: d, type: 'feathers', val: 50, icon: '🪶', label: '+50 feathers' });
    }
    // Feathers every 5 days — starts at 10, +5 every 10 days
    else if (d % 5 === 0) {
      const fv = 10 + Math.floor(d / 10) * 5;
      rewards.push({ day: d, type: 'feathers', val: fv, icon: '🪶', label: '+' + fv + ' feathers' });
    }
    // Gold on even days — starts at ~1 000, scales to ~2 200 by day 30
    else if (d % 2 === 0) {
      const gv = Math.round((1000 + d * 40) / 100) * 100;
      rewards.push({ day: d, type: 'gold', val: gv, icon: '🪙', label: '+' + gv.toLocaleString() + ' gold' });
    }
    // Day 7 milestone: Gold Magnet (free premium upgrade)
    else if (d === 7) {
      rewards.push({ day: d, type: 'goldmagnet', val: 1, icon: '🧲', label: 'Gold Magnet!' });
    }
    // Hammers on odd days — starts at 45, +5 every ~7 days
    else {
      const hv = 45 + Math.floor(d / 7) * 5;
      rewards.push({ day: d, type: 'hammers', val: hv, icon: '🔨', label: '+' + hv + ' hammers' });
    }
  }
  return rewards;
}
const DAILY_REWARDS = generateDailyRewards();
