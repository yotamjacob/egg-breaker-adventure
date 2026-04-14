// ============================================================
//  Egg Breaker Adventures – Game Data
//  data.js  (load before game.js)
// ============================================================

// Item quotes organized by monkey id → item display name.
// When adding a new monkey, add its ITEM_QUOTES entry here and
// reference them in MONKEY_DATA stages below.
const ITEM_QUOTES = {
  mr_monkey: {
    // Stage 1 – Tropical Paradise
    'Mango':              '"Let that mango."',
    'Coconut':            '"Put the lime in the coconut."',
    'Pineapple':          '"Who lives in a pineapple under the sea?"',
    'Golden Banana':      '"It\'s one banana. How much could it cost, $10?"',
    'Blood Orange':       '"Nobody can agree."',
    // Stage 2 – Jungle Trek
    'Parrot':             '"Norwegian Blue. Beautiful plumage."',
    'Tree Snake':         '"Why did it have to be snakes?"',
    'Gecko':              '"15 minutes could save you 15%."',
    'Leopard':            '"Spots: non-negotiable."',
    'Poison Frog':        '"Touch it. See what happens."',
    'Morpho Butterfly':   '"Float like a butterfly."',
    // Stage 3 – Ocean Depths
    'Octopus':            '"Eight arms. Zero patience."',
    'Clownfish':          '"Just keep swimming."',
    'Crab':               '"Sideways. Always sideways."',
    'Giant Squid':        '"Release the Kraken."',
    'Shark':              '"We\'re gonna need a bigger boat."',
    'Blue Whale':         '"Largest creature on Earth. Unimpressed."',
    // Stage 4 – Mountain Peak
    'Eagle':              '"The eagles are coming!"',
    'Mountain Goat':      '"GOAT. Literally."',
    'Bear':               '"Do not engage."',
    'Ancient Pickaxe':    '"And my axe."',
    'Snowy Owl':          '"Silent. Deadly. Disappointed."',
    'Peak Diamond':       '"Diamonds are forever."',
    'Crystal Summit':     '"Because it was there."',
    // Stage 5 – Desert Oasis
    'Camel':              '"Wednesday."',
    'Cactus Bloom':       '"Don\'t."',
    'Scorpion':           '"GET OVER HERE!"',
    'Ancient Vase':       '"It belongs in a museum!"',
    'Evil Eye Charm':     '"I\'m watching you, Wazowski."',
    'Golden Urn':         '"Contents: classified."',
    'Trident of Sands':   '"Wrong ocean. Right attitude."',
    // Stage 6 – Frozen Tundra
    'Penguin':            '"Smile and wave."',
    'Seal':               '"Sealed."',
    'Polar Bear':         '"Winter is coming."',
    'Arctic Fox':         '"Nothing. It\'s -40."',
    'Ice Crystal':        '"Chill."',
    'Diamond Dust':       '"All that glitters."',
    'Northern Star':      '"Second star to the right and straight on till morning."',
    // Stage 7 – Volcano Island
    'Lava Rock':          '"The floor is lava."',
    'Fire Opal':          '"Extremely hot take."',
    'Hot Spring Pearl':   '"Hot tub time machine? Close enough."',
    'Obsidian':           '"You shall not pass."',
    'Alchemist Stone':    '"Equivalent exchange."',
    'Lava Bubble':        '"I love gold. The look of it. The taste of it."',
    'Fire Diamond':       '"Forged in the fires of Mount Doom."',
    // Stage 8 – Enchanted Forest
    'Fairy':              '"I do believe in fairies."',
    'Magic Mushroom':     '"Not FDA approved."',
    'Unicorn':            '"Technically real."',
    'Dragon':             '"I am fire. I am death."',
    'Wizard':             '"You\'re a wizard."',
    'Elder Wand':         '"The wand chooses the wizard."',
    'Moonstone':          '"That\'s no moon."',
    'Stardust':           '"We are all made of star stuff."',
    // Stage 9 – Cloud Kingdom
    'Crown':              '"Heavy is the head."',
    'Ring of Power':      '"One ring to rule them all."',
    'Eternity Diamond':   '"Coal that did well under pressure."',
    'Crystal Ball':       '"Foggy. Like most futures."',
    'Champion Goblet':    '"To the victor."',
    'Royal Seal':         '"By royal decree."',
    'Rainbow Prism':      '"Somewhere over the rainbow."',
    'Wishing Star':       '"Wish carefully."',
  },
  steampunk: {
    // Stage 1 – Gear Workshop
    'Bronze Gear':        '"Keep turning."',
    'Steel Bolt':         '"Screwed? No. Bolted? Yes."',
    'Wrench':             '"Righty tighty."',
    'Chain Link':         '"Only as strong as its weakest link."',
    'Master Toolkit':     '"With great tools comes great responsibility."',
    // Stage 2 – Steam Engine Room
    'Steam Valve':        '"Let off some steam, Bennett."',
    'Brass Bell':         '"For whom the bell tolls."',
    'Clockwork':          '"Like clockwork."',
    'Magnet Core':        '"Attractive."',
    'Power Cell':         '"Unlimited power! (Terms apply.)"',
    'Tesla Battery':      '"Edison could never."',
    // Stage 3 – Airship Dock
    'Gas Cell':           '"Up, up, and away."',
    'Compass':            '"Why is the rum gone?"',
    'Telescope':          '"I can see my house from here."',
    'Sky Anchor':         '"Anchors aweigh."',
    'Antenna':            '"Can you hear me now?"',
    'Golden Chute':       '"Plan B."',
    // Stage 4 – Clocktower
    'Stopwatch':          '"Time waits for no monkey."',
    'Pocket Watch':       '"I\'m late."',
    'Grandfather Clock':  '"Tick tock. BONG."',
    'Hourglass':          '"Running out."',
    'Time Crystal':       '"Wibbly wobbly, timey wimey."',
    'Infinity Dial':      '"It\'s always egg o\'clock somewhere."',
    'Precision Spring':   '"Sproing. Technical term."',
    // Stage 5 – Laboratory
    'Light Bulb':         '"A bright idea."',
    'Microscope':         '"Yep. Still an egg."',
    'Radio':              '"Live from the workshop."',
    'Tesla Coil':         '"It\'s alive!"',
    'Spark Gap':          '"1.21 gigawatts?!"',
    'Master Blueprint':   '"I love it when a plan comes together."',
    'DNA Helix':          '"Life finds a way."',
    // Stage 6 – Underground Railway
    'Train Car':          '"I think I can."',
    'Golden Track':       '"All aboard."',
    'Travel Log':         '"First class. Obviously."',
    'Master Key':         '"It\'s dangerous to go alone. Take this."',
    'Secret Luggage':     '"WHAT\'S IN THE BOX?!"',
    'Lost Route Map':     '"X marks the spot."',
    'Signal Box':         '"Clear."',
    // Stage 7 – Copper Canyon
    'Copper Brick':       '"A penny for your thoughts."',
    'Silver Shard':       '"First loser."',
    'Gold Cube':          '"Do you expect me to talk? No, I expect you to smash."',
    'Raw Sapphire':       '"A gem."',
    'Bronze Medal':       '"Third."',
    'Tungsten Core':      '"Dense."',
    'Mythril Disc':       '"Unbreakable. Allegedly."',
    // Stage 8 – Sky Fortress
    'Rapier':             '"My name is Inigo Montoya..."',
    'Shield':             '"I can do this all day."',
    'Crossbow':           '"You have my bow. And my crossbow."',
    'Bomb':               '"Not yet."',
    'Dual Blades':        '"Why choose?"',
    'Boomerang':          '"I always come back."',
    'Mega Dynamite':      '"Bigger."',
    'Smoke Bomb':         '"Now you see me."',
    // Stage 9 – Time Nexus
    'Time Vortex':        '"Where we\'re going, we don\'t need roads."',
    'Paradox Gem':        '"This statement is false."',
    'Infinity Cog':       '"To infinity and beyond."',
    'World Globe':        '"It\'s a small world after all."',
    'Ancient Relic':      '"It belongs in a museum."',
    'Mask of Ages':       '"Somebody stop me!"',
    'Chrono Crystal':     '"Time is an illusion. Lunchtime doubly so."',
    'Eye of Time':        '"I\'ve seen things you people wouldn\'t believe."',
  },
  princess: {
    // Stage 1 – Royal Garden
    'Rose':               '"Stop and smell me."',
    'Tulip':              '"Beauty. On a schedule."',
    'Cherry Blossom':     '"Gone in two weeks. Worth it."',
    'Sunflower':          '"Always facing the light."',
    'Royal Bouquet':      '"Say it with flowers."',
    // Stage 2 – Grand Ballroom
    'Dance Shoes':        '"Made for dancing. Used for smashing."',
    'Music Box':          '"Wind it up."',
    'Royal Fan':          '"Not a fan of commoners."',
    'Masquerade Mask':    '"Behind every mask is another mask."',
    'Crystal Ball':       '"Disco never died."',
    'Grand Chandelier':   '"The music of the night."',
    // Stage 3 – Castle Tower
    'Tower Key':          '"The key."',
    'Ancient Scroll':     '"Read the fine print."',
    'Magic Candle':       '"Be our guest."',
    'Mirror Mirror':      '"Who\'s the fairest?"',
    'Rapunzel Thread':    '"Let down your hair."',
    'Knight Sword':       '"For king and country."',
    // Stage 4 – Royal Kitchen
    'Royal Cake':         '"Let them eat cake!"',
    'Cupcake':            '"Life is short."',
    'Golden Cookie':      '"That\'s the way the cookie crumbles."',
    'Tea Set':            '"I\'m a little teapot, short and stout."',
    'Chocolate Box':      '"Life is like a box of chocolates."',
    'Grand Gateau':       '"The cake is not a lie this time."',
    'Enchanted Candy':    '"I want it NOW, daddy!"',
    // Stage 5 – Royal Treasury
    'Diamond Ring':       '"If you liked it."',
    'Pearl Necklace':     '"Pearls of wisdom."',
    'Tiara':              '"Bow down, peasants."',
    'Royal Diamond':      '"A girl\'s best friend."',
    'Royal Brooch':       '"First."',
    'Fleur-de-lis':       '"Oui."',
    'Scepter Orb':        '"Kneel."',
    // Stage 6 – Dragon's Lair
    'Baby Dragon':        '"Step one: break the egg."',
    'Dragon Scale':       '"Dracarys."',
    'Dragon Egg':         '"Meta."',
    'Dragon Nest':        '"Not greedy. A collector."',
    'Dragonslayer':       '"FUS RO DAH!"',
    'Dragon Eye':         '"It noticed you."',
    'Dragon Heart':       '"To the stars that listen."',
    // Stage 7 – Enchanted Lake
    'Frog Prince':        '"Kiss at your own risk."',
    'Lotus Flower':       '"No mud, no lotus."',
    'Mermaid':            '"Part of the collection now."',
    'Swan':               '"Act II begins."',
    'Water Spirit':       '"Watching."',
    'Lake Trident':       '"Poseidon wants this back."',
    'Tear of the Lake':   '"The lake wept. It\'s fine."',
    // Stage 8 – Fairy Court
    'Fairy Queen':        '"Clap if you believe."',
    'Fairy Dust':         '"Faith, trust, and pixie dust."',
    'Magic Iris':         '"All-seeing. Quietly judging."',
    'Rainbow Butterfly':  '"Chaos theory. Look it up."',
    'Leaf Crown':         '"Very high fashion."',
    'Moon Tiara':         '"In the name of the Moon!"',
    'Pixie Wand':         '"Bibbidi-bobbidi-boo."',
    'Dream Bubble':       '"Pop."',
    // Stage 9 – Throne Room
    'Emperor Crown':      '"Uneasy lies the head."',
    'Excalibur':          '"Whoever pulls this sword from the egg..."',
    'Royal Shield':       '"I am no man."',
    'Royal Decree':       '"By royal decree."',
    'Lion Crest':         '"A Lannister always pays their debts."',
    'Castle Model':       '"Built on eggshells."',
    'Star of Royalty':    '"Born to rule."',
    'Kohinoor Diamond':   '"The Mountain of Light."',
  },
  space: {
    // Stage 1 – Launch Pad
    'Rocket':             '"Houston, we have an egg."',
    'Space Suit':         '"One small step."',
    'Satellite':          '"Orbiting. No big deal."',
    'Ground Dish':        '"Copy that."',
    'Star Scope':         '"To infinity and beyond."',
    // Stage 2 – Space Station
    'Lab Module':         '"For science!"',
    'Docking Pod':        '"Take me to your leader."',
    'Zero-G Tube':        '"In space, no one can hear you smash."',
    'Comms Array':        '"ET, phone home."',
    'Solar Panel':        '"Powered by the sun."',
    'Service Bot':        '"I\'m sorry, Dave."',
    // Stage 3 – Moon Base
    'Moon Rock':          '"One small rock."',
    'Regolith':           '"Fancy space dirt."',
    'Moon Crystal':       '"By the power of the moon!"',
    'Flag':               '"We come in peace."',
    'First Footprint':    '"One giant leap."',
    'Lunar Diamond':      '"Moon DIAMONDS."',
    // Stage 4 – Asteroid Belt
    'Comet Shard':        '"Technically a rock."',
    'Iron Meteorite':     '"Heavy metal."',
    'Stony Iron':         '"In space."',
    'Dark Asteroid':      '"Incoming."',
    'Space Diamond':      '"Dying star. Casual."',
    'Charged Fragment':   '"Electrifying."',
    'Pallasite':          '"Nature\'s gift wrap."',
    // Stage 5 – Mars Colony
    'Red Sand':           '"Mars ain\'t the kind of place to raise your kids."',
    'Olympus Stone':      '"Tallest volcano. Shortest patience."',
    'Ice Cap':            '"Ice, ice, baby."',
    'Mars Crystal':       '"Ancient Martian tech. Probably."',
    'Ancient Marker':     '"They were here."',
    'Alien Fossil':       '"The truth is out there."',
    'Valles Find':        '"The Grand Canyon called. It\'s jealous."',
    // Stage 6 – Jupiter Station
    'Storm Eye':          '"I am the storm."',
    'Ring Fragment':      '"Put a ring on it."',
    'Europa Ice':         '"Attempt no landing there."',
    'Io Lava':            '"Most volcanic body in the solar system. Mood."',
    'Atmo Sample':        '"Gas giant? I\'ve been called worse."',
    'Lightning Bolt':     '"Zeus wants this back."',
    'Pressure Diamond':   '"Worth it."',
    // Stage 7 – Nebula
    'Star Dust':          '"We are star stuff."',
    'Nebula Gas':         '"A cloud with an attitude."',
    'Baby Star':          '"Twinkle, twinkle."',
    'Red Giant Core':     '"Big, red, and about to blow."',
    'White Dwarf':        '"Small but mighty."',
    'Neutron Star':       '"Concentrated awesome."',
    'Pulsar Beacon':      '"716 times per second. I relate."',
    // Stage 8 – Black Hole Edge
    'Dark Particle':      '"Come to the dark side."',
    'Shadow Orb':         '"Shadow of a former self."',
    'Singularity':        '"Everything, eventually."',
    'Time Dilation':      '"Plan accordingly."',
    'Gravity Lens':       '"Bending light, breaking eggs."',
    'Hawking Crystal':    '"Not even light escapes."',
    'Event Horizon':      '"Point of no return."',
    'Infinity Shard':     '"I am inevitable."',
    // Stage 9 – Galaxy Core
    'Galaxy Map':         '"Don\'t panic."',
    'Quasar':             '"Brightest thing in the room."',
    'Supernova':          '"Going out with a bang."',
    'Life Seed':          '"The answer is 42."',
    'Cosmic Orb':         '"Probably."',
    'Infinity Stone':     '"Perfectly balanced."',
    'Spectrum Key':       '"Every color."',
    'Big Bang Shard':     '"In the beginning."',
  },
  odin: {
    // Stage 1 – Asgard
    'Thor\'s Blessing':       '"God of Thunder. Still not the sharpest."',
    'All-Seeing Eye':         '"Traded for wisdom. Debatable call."',
    'Bifröst Fragment':       '"No toll booth."',
    'Sleipnir\'s Shoe':       '"Eight legs. Eight bills."',
    'Gungnir Shard':          '"Never misses. Currently missing."',
    'Seiðr Rune':             '"Forbidden. The manual too."',
    // Stage 2 – Valhalla
    'Horn of Mead':           '"Drink deeply. Tomorrow you die again anyway."',
    'Einherjar Shield':       '"Survive until dinner."',
    'Sæhrímnir\'s Rib':       '"The boar reborn nightly. He\'s fine. Probably."',
    'Fallen Warrior\'s Helm': '"Died heroically. Seven times."',
    'Valkyrie\'s Horn':       '"Already too late. Or perfect timing."',
    'Eternal Glory':          '"Worth every axe wound."',
    // Stage 3 – Midgard
    'Longship Prow':          '"Surprisingly seaworthy."',
    'Dane Axe':               '"Not just for firewood. But also for firewood."',
    'Runic Sea Chart':        '"Here be everything terrible."',
    'Runic Amulet':           '"Wards off evil, attracts confused tourists."',
    'Antler Crown':           '"Don\'t ask about the antlers."',
    'Jormungandr Charm':      '"Still bites."',
    // Stage 4 – Jotunheim
    'Frost Rune':             '"Cold enough to freeze your Wi-Fi."',
    'Mountain Shard':         '"You\'ll never summit this."',
    'Fenrir\'s Milk Tooth':   '"He outgrew this. That\'s the scary part."',
    'Blizzard Vial':          '"Don\'t open indoors."',
    'Gleipnir Link':          '"Real materials. Allegedly."',
    'Thrym\'s Ice Crown':     '"He lost it to Thor in a dress. Long story."',
    // Stage 5 – Niflheim
    'Skull Rune':             '"Existential dread, postmarked."',
    'Mist Essence':           '"Bottled fog. Smells like cold inevitability."',
    'Eternal Candle':         '"Great ambiance. Terrible heating."',
    'Garm\'s Collar':         '"Very good boy. Do not approach."',
    'Hel\'s Crown':           '"Half gold, half bone. She was born this way. Literally."',
    'Void Shard':             '"Smells like nothing. Still ominous."',
    // Stage 6 – Muspelheim
    'Ember Rune':             '"Still hot. Always will be. Do not lick."',
    'Magma Stone':            '"Handle with optimism."',
    'Fire Opal':              '"Definitely not a piece of the sun. Probably."',
    'Surtr\'s Sliver':        '"Very long warranty."',
    'Nidhogg\'s Scale':       '"The roots aren\'t fine."',
    // Stage 7 – Yggdrasil
    'Heartwood Chip':         '"Centre of all nine realms. Still has sap."',
    'Ratatoskr\'s Acorn':     '"Knows everything. Tells everyone. Drama."',
    'Eagle\'s Feather':       '"Undefeated in staring contests."',
    'Nine Realms Leaf':       '"Heavier than it looks."',
    'Norns\' Thread':         '"Fate\'s loose end."',
    'Iðunn\'s Apple':         '"This one fell."',
    // Stage 8 – Ragnarök
    'Flood Tide Stone':       '"Collected just before."',
    'Fáfnir\'s Fang':         '"Lost arguing with Sigurd."',
    'Darkened Sun':           '"Brief period of solar inconvenience."',
    'Thunder Crack':          '"Thor\'s last lightning bolt. Bottled mid-chaos."',
    'Odin\'s Last Rune':      '"Half-finished. Very relatable."',
    'First New Leaf':         '"Hope, pressed and dried."',
    'Rebirth Spark':          '"The world ends. Also begins. Norse accounting."',
  },
};

const MONKEY_DATA = [
  {
    id: 'mr_monkey', name: 'Mr. Monkey', emoji: '🐵', img: 'img/mrmonkey.png', cost: 0,
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
        ['♨️','Hot Spring Pearl',1,ITEM_QUOTES.mr_monkey['Hot Spring Pearl']],
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
    id: 'steampunk', name: 'Steampunk Monkey', emoji: '🔧', img: 'img/steampunk.png', cost: 7,
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
    id: 'princess', name: 'Princess Monkey', emoji: '👸', img: 'img/princess.png', cost: 7,
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
    id: 'space', name: 'Space Cadette', emoji: '🚀', img: 'img/space.png', cost: 7,
    perk: 'moreItems', perkDesc: '+10% collection item chance',
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
    id: 'odin', name: 'Odin Grímnir, the All-Father', emoji: '🧙', img: null, cost: 7,
    unlockRequires: { hammer: 'mjolnir', hint: 'Wield Mjǫllnir to reveal the All-Father' },
    perk: 'allfather', perkDesc: "All-Father's Grace: +10% gold, stars & feathers",
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
];

const SHOP_HAMMERS = [
  { id: 'default',    name: 'Basic Hammer',     emoji: '🔨', desc: 'Standard issue',              cost: 0, bonus: null },
  { id: 'drumstick',  name: 'Drumstick Hammer', emoji: '🍗', desc: '+15% star pieces',            cost: 8000, currency: 'gold', bonus: 'moreStars' },
  { id: 'bat',        name: 'Bat Hammer',       emoji: '🦇', desc: 'Fewer empty eggs',            cost: 12000, currency: 'gold', bonus: 'lessEmpty' },
  { id: 'crystal',    name: 'Crystal Hammer',    emoji: '🔮', desc: '+20% feathers',               cost: 25000, currency: 'gold', bonus: 'moreFeathers' },
  { id: 'golden',     name: 'Golden Hammer',     emoji: '⭐', desc: '2x gold from eggs',           cost: 75000, currency: 'gold', bonus: 'moreGold' },
  { id: 'rainbow',    name: 'Rainbow Hammer',    emoji: '🌈', desc: '+10% collection items',       cost: 150000, currency: 'gold', bonus: 'moreItems' },
  { id: 'cucumber',   name: 'Cucumber Hammer',   emoji: '🥒', desc: '5% double hit chance',        cost: 250000, currency: 'gold', bonus: 'doubleHit' },
  { id: 'mjolnir',   name: 'Mjǫllnir',          emoji: '⚡', desc: '3% chance to summon Starfall', cost: 500000, currency: 'gold', bonus: 'mjolnirStarfall' },
];

const SHOP_HATS = [
  { id: 'none',    name: 'No Hat',        emoji: '🐒', desc: '',                         cost: 0, bonus: null },
  { id: 'chef',    name: 'Chef\'s Hat',   emoji: '👨‍🍳', desc: '3% chance egg was free',   cost: 15000, currency: 'gold', bonus: 'freeEgg' },
  { id: 'crown',   name: 'Crown',         emoji: '👑', desc: '+10% gold',                 cost: 30000, currency: 'gold', bonus: 'goldBoost' },
  { id: 'wizard',  name: 'Wizard Hat',    emoji: '🧙', desc: '+10% stars',                cost: 45000, currency: 'gold', bonus: 'starBoost' },
  { id: 'tophat',  name: 'Top Hat',       emoji: '🎩', desc: 'Unlocks x123 multiplier',   cost: 75000, currency: 'gold', bonus: 'unlock123' },
  { id: 'pirate',  name: 'Pirate Hat',    emoji: '🏴‍☠️', desc: '+15% collection items',    cost: 120000, currency: 'gold', bonus: 'itemBoost' },
];

const SHOP_SUPPLIES = [
  { id: 'hammers5',   name: '+5 Hammers',      emoji: '🔨', cost: 300,    currency: 'gold', type: 'consumable' },
  { id: 'hammers20',  name: '+20 Hammers',      emoji: '🔨', cost: 1000,   currency: 'gold', type: 'consumable' },
  { id: 'star1',      name: 'Star Piece',       emoji: '⭐', cost: 3000,   currency: 'gold', type: 'consumable' },
  { id: 'mult5',      name: 'x5 Multiplier',    emoji: '✖️', cost: 5000,   currency: 'gold', type: 'consumable' },
  { id: 'spyglass',   name: 'Spyglass',         emoji: '🔍', desc: 'Reveal egg names & HP', cost: 5000, currency: 'gold', type: 'upgrade', unique: true },
  { id: 'maxhammers', name: '+5 Hammer Cap',    emoji: '📦', desc: 'Increase max hammers by 5', cost: 8000, currency: 'gold', type: 'upgrade' },
  { id: 'fastregen',  name: 'Fast Regen',       emoji: '⚡', desc: 'Hammers regen 2x faster', cost: 12500, currency: 'gold', type: 'upgrade', unique: true },
  { id: 'luckycharm', name: 'Lucky Charm',      emoji: '🍀', desc: '2x rare item chance',    cost: 200000, currency: 'gold', type: 'upgrade', unique: true },
  { id: 'goldmagnet', name: 'Golden Magnet',    emoji: '🧲', desc: 'Gold rounded up to 10',  cost: 300000, currency: 'gold', type: 'upgrade', unique: true },
  { id: 'eggradar',   name: 'Egg Radar',        emoji: '📡', desc: '+50% rare egg spawns',   cost: 400000, currency: 'gold', type: 'upgrade', unique: true },
  { id: 'doubledaily', name: 'Double Daily',    emoji: '📅', desc: '2x daily rewards',       cost: 500000, currency: 'gold', type: 'upgrade', unique: true },
  { id: 'starsaver',  name: 'Star Saver',       emoji: '✨', desc: 'Starfall costs 4 stars', cost: 600000, currency: 'gold', type: 'upgrade', unique: true },
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
  { id:'streak_20',    name:'Dedicated',            desc:'20-day login streak',           icon:'🔥', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'daily_10',     name:'Regular',             desc:'Claim daily bonus 10 times',    icon:'📆', reward:{type:'gold',val:500,      label:'+500 gold'} },
  { id:'daily_100',    name:'Centurion',           desc:'Claim daily bonus 100 times',   icon:'💯', reward:{type:'gold',val:5000,     label:'+5,000 gold'} },
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
  { id:'empty_1000',   name:'Void Master',         desc:'Get 1,000 empties. Yay?',        icon:'🌀', reward:{type:'gold',val:2000,     label:'+2,000 gold'} },
  // -- Egg effects --
  { id:'runny_1',      name:'Catch Me!',           desc:'Smash a runny egg',              icon:'🏃', reward:{type:'gold',val:100,      label:'+100 gold'} },
  { id:'runny_25',     name:'Egg Chaser',          desc:'Smash 25 runny eggs',            icon:'💨', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'runny_100',    name:'Can\'t Run From Me',  desc:'Smash 100 runny eggs',           icon:'🏆', reward:{type:'goldPct',val:3,     label:'+3% gold from eggs'} },
  { id:'timer_1',      name:'Just In Time',        desc:'Smash a timed egg',              icon:'⏱️', reward:{type:'gold',val:100,      label:'+100 gold'} },
  { id:'timer_25',     name:'Beat The Clock',      desc:'Smash 25 timed eggs',            icon:'⏰', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'timer_100',    name:'Time Lord',           desc:'Smash 100 timed eggs',           icon:'🕐', reward:{type:'goldPct',val:3,     label:'+3% gold from eggs'} },
  { id:'timer_close',  name:'Living Dangerously',  desc:'Smash a timed egg at 0:05',      icon:'💀', reward:{type:'gold',val:777,      label:'+777 gold'} },
  { id:'missed_1',     name:'Too Slow',            desc:'Let a timed egg expire',         icon:'🐌', reward:{type:'gold',val:50,       label:'+50 gold'} },
  { id:'missed_10',    name:'Butterfingers',       desc:'Let 10 timed eggs expire',       icon:'🧈', reward:{type:'gold',val:200,      label:'+200 gold'} },
  { id:'combo_effect', name:'Double Trouble',      desc:'Smash a runny timed egg',        icon:'🤯', reward:{type:'gold',val:500,      label:'+500 gold'} },
  // -- Millenium egg --
  { id:'millenium_1', name:'The Chosen One',      desc:'Break a Millenium Egg',          icon:'🌀', reward:{type:'goldPct',val:15,    label:'+15% gold from eggs'} },
  // -- Hex --
  { id:'hex_1',        name:'Cursed!',             desc:'Get hexed for the first time',   icon:'😈', reward:{type:'gold',val:100,      label:'+100 gold'} },
  { id:'hex_10',       name:'Bad Karma',           desc:'Get hexed 10 times',             icon:'👹', reward:{type:'gold',val:500,      label:'+500 gold'} },
  { id:'hex_50',       name:'Hex Magnet',          desc:'Get hexed 50 times',             icon:'🧿', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  // -- Balloon --
  { id:'balloon_1',    name:'Pop!',                desc:'Pop your first balloon egg',     icon:'🎈', reward:{type:'gold',val:200,      label:'+200 gold'} },
  { id:'balloon_10',   name:'Party Animal',        desc:'Pop 10 balloon eggs',            icon:'🎉', reward:{type:'gold',val:2000,     label:'+2,000 gold'} },
  { id:'balloon_50',   name:'Balloon Master',      desc:'Pop 50 balloon eggs',            icon:'🎊', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
];

// Secret achievements — hidden until discovered
const SECRET_ACHIEVEMENTS = [
  { id:'secret_flip',     name:'Topsy Turvy',           desc:'Flip the eggs upside down',        icon:'🙃', reward:{type:'gold',val:500,  label:'+500 gold'} },
  { id:'secret_omelette', name:'Omelette du Fromage',   desc:'Type the secret word',             icon:'🍳', reward:{type:'gold',val:500,  label:'+500 gold'} },
  { id:'secret_42',       name:'Meaning of Life',       desc:'42 eggs broken without gold',      icon:'🌌', reward:{type:'gold',val:420,  label:'+420 gold'} },
  { id:'secret_ouch',     name:'Sorry Little Egg',      desc:'An egg said ouch',                 icon:'🥺', reward:{type:'gold',val:100,  label:'+100 gold'} },
  { id:'secret_chicken',  name:'Why Did It Cross?',     desc:'Spot the runaway chicken',         icon:'🐔', reward:{type:'gold',val:200,  label:'+200 gold'} },
  { id:'secret_midnight', name:'Night Owl',             desc:'Break eggs at midnight',           icon:'🌙', reward:{type:'starPieces',val:3, label:'+3 star pieces'} },
  { id:'secret_leet',     name:'l33t',                  desc:'Have exactly 1337 gold',           icon:'💻', reward:{type:'gold',val:1337, label:'+1,337 gold'} },
  { id:'secret_strikes',  name:'Three Strikes',         desc:'Get 3 empties in a row',           icon:'⚾', reward:{type:'gold',val:100,  label:'+100 gold'} },
  { id:'secret_chef',     name:'Could\'ve Been a Chef', desc:'Break 10,000 normal eggs',         icon:'👨‍🍳', reward:{type:'maxH',val:5,    label:'+5 max hammers'} },
];

// Daily rewards for 100 days. type: gold, hammers, maxH, feathers, banana
function generateDailyRewards() {
  const rewards = [];
  for (let d = 1; d <= 100; d++) {
    // Banana on milestone days
    if (d === 30 || d === 60 || d === 100) {
      rewards.push({ day: d, type: 'banana', val: 1, icon: '🍌', label: '+1 banana' });
    }
    // Max hammers on weekly milestones
    else if (d % 14 === 0) {
      rewards.push({ day: d, type: 'maxH', val: 3 + Math.floor(d / 20), icon: '📦', label: '+' + (3 + Math.floor(d / 20)) + ' max hammers' });
    }
    // Feathers every 5 days
    else if (d % 5 === 0) {
      const fv = 3 + Math.floor(d / 10) * 2;
      rewards.push({ day: d, type: 'feathers', val: fv, icon: '🪶', label: '+' + fv + ' feathers' });
    }
    // Gold on even days (scales up)
    else if (d % 2 === 0) {
      const gv = 20 + d * 5;
      rewards.push({ day: d, type: 'gold', val: gv, icon: '🪙', label: '+' + gv + ' gold' });
    }
    // Hammers on odd days
    else {
      const hv = 20 + Math.floor(d / 5) * 5;
      rewards.push({ day: d, type: 'hammers', val: hv, icon: '🔨', label: '+' + hv + ' hammers' });
    }
  }
  return rewards;
}
const DAILY_REWARDS = generateDailyRewards();
