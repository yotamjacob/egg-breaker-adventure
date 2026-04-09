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
        ['🥭','Mango',1,'"Let that mango."'],
        ['🥥','Coconut',1,'"Put the lime in the coconut."'],
        ['🍍','Pineapple',1,'"Who lives in a pineapple under the sea?"'],
        ['🍌','Golden Banana',2,'"It\'s one banana. How much could it cost, $10?"'],
        ['🍊','Blood Orange',2,'"Is it Orange? Or is it Red? The world may never know."'],
      ]}},
      { name: 'Jungle Trek', eggs: 3, collection: { name: 'Jungle Friends', items: [
        ['🦜','Parrot',1,'"Polly wants a cracker... and world domination."'],
        ['🐍','Tree Snake',1,'"Why did it have to be snakes?"'],
        ['🦎','Gecko',1,'"15 minutes could save you 15%."'],
        ['🐆','Leopard',2,'"A leopard can\'t change its spots. But it can change its attitude."'],
        ['🐸','Poison Frog',2,'"It\'s not easy being green... or toxic."'],
        ['🦋','Morpho Butterfly',3,'"Float like a butterfly, sting like a... wait."'],
      ]}},
      { name: 'Ocean Depths', eggs: 4, collection: { name: 'Sea Creatures', items: [
        ['🐙','Octopus',1,'"I\'ve got 8 arms and zero patience."'],
        ['🐠','Clownfish',1,'"Just keep swimming, just keep swimming."'],
        ['🦀','Crab',1,'"Feeling a little... crabby today."'],
        ['🦑','Giant Squid',2,'"Release the kraken! ...oh wait, wrong guy."'],
        ['🦈','Shark',2,'"We\'re gonna need a bigger boat."'],
        ['🐳','Blue Whale',3,'"Whale, whale, whale... what do we have here?"'],
      ]}},
      { name: 'Mountain Peak', eggs: 4, collection: { name: 'Mountain Treasures', items: [
        ['🦅','Eagle',1,'"The eagles are coming! The eagles are coming!"'],
        ['🐐','Mountain Goat',1,'"Greatest Of All Time? That\'s literally me."'],
        ['🐻','Bear',1,'"Bear with me on this one."'],
        ['⛏️','Ancient Pickaxe',2,'"And MY axe! ...pickaxe."'],
        ['🦉','Snowy Owl',2,'"Who? Me? I didn\'t see anything."'],
        ['💎','Peak Diamond',3,'"Diamonds are forever. So is my egg addiction."'],
        ['🏔️','Crystal Summit',3,'"The view from the top is worth the climb."'],
      ]}},
      { name: 'Desert Oasis', eggs: 5, collection: { name: 'Desert Wonders', items: [
        ['🐪','Camel',1,'"Guess what day it is? HUMP DAY."'],
        ['🌵','Cactus Bloom',1,'"Don\'t touch me. Seriously."'],
        ['🦂','Scorpion',1,'"GET OVER HERE!"'],
        ['🏺','Ancient Vase',2,'"It belongs in a museum!"'],
        ['🧿','Evil Eye Charm',2,'"I\'m watching you, Wazowski. Always watching."'],
        ['⚱️','Golden Urn',3,'"Contains the ashes of my enemies\' hopes."'],
        ['🔱','Trident of Sands',3,'"I am Aquaman! ...of the desert."'],
      ]}},
      { name: 'Frozen Tundra', eggs: 5, collection: { name: 'Arctic Expedition', items: [
        ['🐧','Penguin',1,'"Smile and wave, boys. Smile and wave."'],
        ['🦭','Seal',1,'"Sealed with a kiss."'],
        ['🐻‍❄️','Polar Bear',2,'"Winter is coming... and I\'m ready."'],
        ['🦊','Arctic Fox',2,'"What does the fox say? ...nothing, it\'s freezing."'],
        ['❄️','Ice Crystal',2,'"Let it go, let it go..."'],
        ['💠','Diamond Dust',3,'"All that glitters is not gold. Sometimes it\'s ice."'],
        ['🌟','Northern Star',3,'"Second star to the right and straight on till morning."'],
      ]}},
      { name: 'Volcano Island', eggs: 5, collection: { name: 'Volcanic Treasures', items: [
        ['🌋','Lava Rock',1,'"The floor is literally lava."'],
        ['🔥','Fire Opal',1,'"This girl is on fire."'],
        ['♨️','Hot Spring Pearl',1,'"Hot tub time machine? Close enough."'],
        ['🪨','Obsidian',2,'"You shall not pass! ...the lava zone."'],
        ['⚗️','Alchemist Stone',2,'"Equivalent exchange. That\'s alchemy, baby."'],
        ['🥇','Molten Gold',3,'"I love gold! The look of it, the taste of it."'],
        ['🔶','Fire Diamond',3,'"Forged in the fires of Mount Doom."'],
      ]}},
      { name: 'Enchanted Forest', eggs: 6, collection: { name: 'Magical Beings', items: [
        ['🧚','Fairy',1,'"I do believe in fairies! I do! I do!"'],
        ['🍄','Magic Mushroom',1,'"Eat me and grow big. Trust me."'],
        ['🦄','Unicorn',2,'"I\'m not mythical, I\'m just rare."'],
        ['🐉','Dragon',2,'"I am fire. I am death. I am adorable."'],
        ['🧙','Wizard',2,'"You\'re a wizard, Harry! ...wait, wrong franchise."'],
        ['🪄','Elder Wand',3,'"The wand chooses the wizard, Mr. Monkey."'],
        ['🌙','Moonstone',3,'"That\'s no moon... actually, yes it is."'],
        ['✨','Stardust',3,'"We are all made of star stuff. Literally."'],
      ]}},
      { name: 'Cloud Kingdom', eggs: 7, collection: { name: 'Legendary Treasures', items: [
        ['👑','Crown',1,'"Heavy is the head that wears the crown."'],
        ['💍','Ring of Power',2,'"One ring to rule them all... and in the egg find them."'],
        ['💎','Eternity Diamond',2,'"A diamond is just a piece of coal that did well under pressure."'],
        ['🔮','Crystal Ball',2,'"I see... more egg smashing in your future."'],
        ['🏆','Champion Trophy',3,'"We are the champions, my friend."'],
        ['⚜️','Royal Seal',3,'"By royal decree: more eggs shall be smashed."'],
        ['🌈','Rainbow Prism',3,'"Somewhere over the rainbow... there are more eggs."'],
        ['⭐','Wishing Star',3,'"When you wish upon a star... wish for more hammers."'],
      ]}},
    ]
  },
  {
    id: 'steampunk', name: 'Steampunk Monkey', emoji: '🔧', cost: 9,
    perk: 'moreStars', perkDesc: '+15% star piece chance',
    stages: [
      { name: 'Gear Workshop', eggs: 3, collection: { name: 'Basic Gears', items: [
        ['⚙️','Bronze Gear',1,'"Keep turning. The machine demands it."'],
        ['🔩','Steel Bolt',1,'"Screwed? No. Bolted? Yes."'],
        ['🔧','Wrench',1,'"Righty tighty, lefty eggy."'],
        ['⛓️','Chain Link',2,'"The weakest link? Not this one."'],
        ['🛠️','Master Toolkit',2,'"With great tools comes great responsibility."'],
      ]}},
      { name: 'Steam Engine Room', eggs: 3, collection: { name: 'Engine Parts', items: [
        ['💨','Steam Valve',1,'"Let off some steam, Bennett."'],
        ['🔔','Brass Bell',1,'"For whom the bell tolls? For thee."'],
        ['⏰','Clockwork',2,'"Like clockwork. Literally."'],
        ['🧲','Magnet Core',2,'"I\'m very attractive."'],
        ['🪫','Power Cell',2,'"Unlimited power! Well, limited, actually."'],
        ['🔋','Tesla Battery',3,'"Edison could never."'],
      ]}},
      { name: 'Airship Dock', eggs: 4, collection: { name: 'Airship Parts', items: [
        ['🎈','Gas Cell',1,'"Up, up, and away!"'],
        ['🧭','Compass',1,'"But why is the rum gone?"'],
        ['🔭','Telescope',2,'"I can see my house from here."'],
        ['⚓','Sky Anchor',2,'"Anchors aweigh! ...up?"'],
        ['📡','Antenna',2,'"Can you hear me now?"'],
        ['🪂','Golden Chute',3,'"Plan B has never looked so fancy."'],
      ]}},
      { name: 'Clocktower', eggs: 4, collection: { name: 'Timepieces', items: [
        ['⏱️','Stopwatch',1,'"Time waits for no monkey."'],
        ['⌚','Pocket Watch',1,'"I\'m late! I\'m late! For a very important date!"'],
        ['🕰️','Grandfather Clock',2,'"Tick tock, tick tock... BONG."'],
        ['⏳','Hourglass',2,'"Time is running out... of sand."'],
        ['🔮','Time Crystal',3,'"Wibbly wobbly, timey wimey stuff."'],
        ['📅','Infinity Dial',3,'"It\'s always egg o\'clock somewhere."'],
        ['🎯','Precision Spring',3,'"Sproing! ...that\'s a technical term."'],
      ]}},
      { name: 'Laboratory', eggs: 5, collection: { name: 'Inventions', items: [
        ['💡','Light Bulb',1,'"I just had a bright idea."'],
        ['🔬','Microscope',1,'"Let me take a closer look... yep, it\'s an egg."'],
        ['📻','Radio',2,'"Video killed the radio star."'],
        ['🧪','Tesla Coil',2,'"It\'s alive! IT\'S ALIVE!"'],
        ['⚡','Spark Gap',2,'"1.21 gigawatts?!"'],
        ['📐','Master Blueprint',3,'"I love it when a plan comes together."'],
        ['🧬','DNA Helix',3,'"Life, uh, finds a way."'],
      ]}},
      { name: 'Underground Railway', eggs: 5, collection: { name: 'Railway Finds', items: [
        ['🚃','Train Car',1,'"I think I can, I think I can."'],
        ['🛤️','Golden Track',1,'"All aboard the gold express!"'],
        ['🎟️','VIP Ticket',2,'"First class? More like ONLY class."'],
        ['🗝️','Master Key',2,'"It\'s dangerous to go alone! Take this."'],
        ['🧳','Secret Luggage',2,'"What\'s in the box?! WHAT\'S IN THE BOX?!"'],
        ['🗺️','Lost Route Map',3,'"X marks the spot... somewhere."'],
        ['🏗️','Signal Box',3,'"All signals point to more egg smashing."'],
      ]}},
      { name: 'Copper Canyon', eggs: 5, collection: { name: 'Rare Metals', items: [
        ['🪙','Copper Nugget',1,'"A penny for your thoughts? Here\'s a nugget."'],
        ['🥈','Silver Ingot',1,'"Silver medal is just first loser. ...kidding."'],
        ['🥇','Gold Bar',2,'"Do you expect me to talk? No, I expect you to smash."'],
        ['💎','Raw Sapphire',2,'"She\'s a gem. Literally."'],
        ['🟤','Bronze Medal',2,'"Third place is just winning with extra steps."'],
        ['⬛','Tungsten Core',2,'"Harder than my resolve to stop playing."'],
        ['🟡','Mythril Disc',3,'"Light as a feather, strong as a dragon."'],
      ]}},
      { name: 'Sky Fortress', eggs: 6, collection: { name: 'Fortress Arsenal', items: [
        ['🗡️','Rapier',1,'"My name is Inigo Montoya..."'],
        ['🛡️','Shield',1,'"I can do this all day."'],
        ['🏹','Crossbow',2,'"You have my bow. And my crossbow."'],
        ['💣','Bomb',2,'"Bombs away! ...wait, not yet!"'],
        ['⚔️','Dual Blades',2,'"Twice the swords, double the fun."'],
        ['🪃','Boomerang',3,'"I always come back."'],
        ['🧨','Mega Dynamite',3,'"Dynamite? Nah. MEGA Dynamite."'],
        ['🎪','Smoke Bomb',3,'"Now you see me... poof... now you don\'t."'],
      ]}},
      { name: 'Time Nexus', eggs: 7, collection: { name: 'Temporal Artifacts', items: [
        ['🌀','Time Vortex',1,'"Where we\'re going, we don\'t need roads."'],
        ['💫','Paradox Gem',2,'"This statement is false. ...wait."'],
        ['♾️','Infinity Cog',2,'"To infinity and beyond! Mechanically."'],
        ['🌐','World Globe',2,'"It\'s a small world after all."'],
        ['🏛️','Ancient Relic',3,'"It belongs in a museum! ...again."'],
        ['🎭','Mask of Ages',3,'"Somebody stop me!"'],
        ['✨','Chrono Crystal',3,'"Time is an illusion. Lunchtime doubly so."'],
        ['🧿','Eye of Time',3,'"I\'ve seen things you people wouldn\'t believe."'],
      ]}},
    ]
  },
  {
    id: 'princess', name: 'Princess Monkey', emoji: '👸', cost: 9,
    perk: 'moreGold', perkDesc: '+20% gold from eggs',
    stages: [
      { name: 'Royal Garden', eggs: 3, collection: { name: 'Garden Flowers', items: [
        ['🌹','Rose',1,'"Every rose has its thorns."'],
        ['🌷','Tulip',1,'"Tulips are better than one."'],
        ['🌸','Cherry Blossom',1,'"Sakura season is always egg season."'],
        ['🌻','Sunflower',2,'"I\'m just a sunflower waiting for my sun."'],
        ['💐','Royal Bouquet',2,'"Say it with flowers. Or hammers."'],
      ]}},
      { name: 'Grand Ballroom', eggs: 3, collection: { name: 'Dance Treasures', items: [
        ['💃','Dance Shoes',1,'"Put on your red shoes and dance the blues."'],
        ['🎵','Music Box',1,'"It\'s a-me, a music box!"'],
        ['🪭','Royal Fan',2,'"I\'m a big fan. A ROYAL fan."'],
        ['🎭','Masquerade Mask',2,'"Behind every mask is another mask."'],
        ['🪩','Crystal Ball',2,'"Everybody dance now!"'],
        ['🎪','Grand Chandelier',3,'"The phantom of the opera is here!"'],
      ]}},
      { name: 'Castle Tower', eggs: 4, collection: { name: 'Tower Relics', items: [
        ['🗝️','Tower Key',1,'"The key to success is right here."'],
        ['📜','Ancient Scroll',1,'"It\'s a-me, a scroll-io!"'],
        ['🕯️','Magic Candle',2,'"Be our guest, be our guest!"'],
        ['🪞','Mirror Mirror',2,'"Mirror, mirror, on the wall... smash more eggs."'],
        ['🧶','Rapunzel Thread',2,'"Let down your hair... and your hammers."'],
        ['⚔️','Knight Sword',3,'"A knight\'s tale starts with a broken egg."'],
      ]}},
      { name: 'Royal Kitchen', eggs: 4, collection: { name: 'Royal Feast', items: [
        ['🍰','Royal Cake',1,'"Let them eat cake!"'],
        ['🧁','Cupcake',1,'"Life is short, eat the cupcake."'],
        ['🍪','Golden Cookie',1,'"That\'s the way the cookie crumbles."'],
        ['🫖','Tea Set',2,'"I\'m a little teapot, short and stout."'],
        ['🍫','Chocolate Box',2,'"Life is like a box of chocolates."'],
        ['🎂','Grand Gateau',3,'"The cake is NOT a lie this time."'],
        ['🍬','Enchanted Candy',3,'"I want it NOW, daddy!"'],
      ]}},
      { name: 'Royal Treasury', eggs: 5, collection: { name: 'Crown Jewels', items: [
        ['💍','Diamond Ring',1,'"If you liked it, then you shoulda put a ring on it."'],
        ['📿','Pearl Necklace',1,'"Pearls of wisdom, pearls of... pearl."'],
        ['👑','Tiara',2,'"Bow down, peasants."'],
        ['💎','Royal Diamond',2,'"Shine bright like a diamond."'],
        ['🏅','Medallion',2,'"First place in egg smashing."'],
        ['⚜️','Fleur-de-lis',3,'"Fancy? Oui oui."'],
        ['🔮','Scepter Orb',3,'"Kneel before the orb."'],
      ]}},
      { name: 'Dragon\'s Lair', eggs: 5, collection: { name: 'Dragon Hoard', items: [
        ['🐉','Baby Dragon',1,'"How to train your dragon: step 1, break its egg."'],
        ['🔥','Dragon Scale',1,'"Dracarys! ...oops, wrong show."'],
        ['🥚','Dragon Egg',2,'"Is this... meta?"'],
        ['💰','Gold Pile',2,'"I\'m not greedy, I\'m a collector."'],
        ['🗡️','Dragonslayer',2,'"FUS RO DAH!"'],
        ['👁️','Dragon Eye',3,'"I see you. Smashing my cousins\' eggs."'],
        ['🌟','Dragon Heart',3,'"To the stars that listen."'],
      ]}},
      { name: 'Enchanted Lake', eggs: 5, collection: { name: 'Lake Mysteries', items: [
        ['🐸','Frog Prince',1,'"Kiss me and find out. I dare you."'],
        ['🪷','Lotus Flower',1,'"No mud, no lotus."'],
        ['🧜','Mermaid',2,'"Part of your world? Part of MY collection."'],
        ['🦢','Swan',2,'"Swan Lake, but make it an egg game."'],
        ['🌊','Water Spirit',2,'"Water you looking at?"'],
        ['🔱','Lake Trident',3,'"Poseidon called. He wants this back."'],
        ['💧','Tear of the Lake',3,'"Crying tears of joy from all this gold."'],
      ]}},
      { name: 'Fairy Court', eggs: 6, collection: { name: 'Fairy Gifts', items: [
        ['🧚','Fairy Queen',1,'"Clap if you believe!"'],
        ['🌸','Fairy Dust',1,'"All you need is faith, trust, and pixie dust."'],
        ['🪻','Magic Iris',2,'"Eye see what you did there."'],
        ['🦋','Rainbow Butterfly',2,'"Butterfly effect: one flutter, infinite eggs."'],
        ['🍃','Leaf Crown',2,'"I am Groot... \'s fashion consultant."'],
        ['🌙','Moon Tiara',3,'"In the name of the Moon!"'],
        ['✨','Pixie Wand',3,'"Bibbidi-bobbidi-boo!"'],
        ['🫧','Dream Bubble',3,'"Row, row, row your boat... pop!"'],
      ]}},
      { name: 'Throne Room', eggs: 7, collection: { name: 'Royal Regalia', items: [
        ['👑','Emperor Crown',1,'"Uneasy lies the head that wears a crown."'],
        ['🗡️','Excalibur',2,'"Whoever pulls this sword from the egg..."'],
        ['🛡️','Royal Shield',2,'"I am no man! ...I\'m a monkey."'],
        ['📜','Royal Decree',2,'"By royal decree: no egg shall go unsmashed."'],
        ['🦁','Lion Crest',3,'"A monkey always pays their debts."'],
        ['🏰','Castle Model',3,'"Built on a foundation of broken eggshells."'],
        ['🌟','Star of Royalty',3,'"Born to rule, destined to smash."'],
        ['💎','Kohinoor Diamond',3,'"The Mountain of Light. The egg of destiny."'],
      ]}},
    ]
  },
  {
    id: 'space', name: 'Space Cadette', emoji: '🚀', cost: 9,
    perk: 'moreItems', perkDesc: '+10% collection item chance',
    stages: [
      { name: 'Launch Pad', eggs: 3, collection: { name: 'Launch Gear', items: [
        ['🚀','Rocket',1,'"Houston, we have an egg."'],
        ['🧑‍🚀','Space Suit',1,'"One small step for monkey, one giant leap for egg-kind."'],
        ['🛰️','Satellite',1,'"Can you hear me, Major Tom?"'],
        ['📡','Ground Dish',2,'"Dish is how we communicate in space."'],
        ['🔭','Star Scope',2,'"To see infinity and beyond!"'],
      ]}},
      { name: 'Space Station', eggs: 3, collection: { name: 'Station Modules', items: [
        ['🔬','Lab Module',1,'"For science!"'],
        ['🛸','Docking Pod',1,'"Take me to your leader... \'s eggs."'],
        ['🧪','Zero-G Tube',2,'"In space, no one can hear you smash."'],
        ['📻','Comms Array',2,'"ET phone home."'],
        ['🔋','Solar Panel',2,'"Powered by the sun. And ambition."'],
        ['🤖','Service Bot',3,'"I\'m sorry, Dave. I can\'t do that. Just kidding."'],
      ]}},
      { name: 'Moon Base', eggs: 4, collection: { name: 'Lunar Samples', items: [
        ['🌙','Moon Rock',1,'"That\'s one small rock for a monkey."'],
        ['🪨','Regolith',1,'"It\'s just fancy space dirt."'],
        ['🔮','Moon Crystal',2,'"By the power of the moon!"'],
        ['🏳️','Flag',2,'"We come in peace. To smash eggs."'],
        ['👣','First Footprint',2,'"One giant leap for egg-kind."'],
        ['💎','Lunar Diamond',3,'"Moon rocks? No. Moon DIAMONDS."'],
      ]}},
      { name: 'Asteroid Belt', eggs: 4, collection: { name: 'Space Rocks', items: [
        ['☄️','Comet Shard',1,'"Shooting star? More like shooting rock."'],
        ['🪨','Iron Meteorite',1,'"Heavy metal. Literally."'],
        ['💫','Stony Iron',2,'"Between a rock and a hard place. In space."'],
        ['🌑','Dark Asteroid',2,'"That\'s no moon... this time for real."'],
        ['💎','Space Diamond',3,'"Lucy in the sky with diamonds."'],
        ['⚡','Charged Fragment',3,'"Electrifying discovery!"'],
        ['🌟','Pallasite',3,'"A gem wrapped in a space rock. Nature\'s egg."'],
      ]}},
      { name: 'Mars Colony', eggs: 5, collection: { name: 'Martian Artifacts', items: [
        ['🔴','Red Sand',1,'"Mars ain\'t the kind of place to raise your kids."'],
        ['🏔️','Olympus Stone',1,'"Tallest volcano. Shortest patience."'],
        ['🧊','Ice Cap',2,'"Ice, ice, baby. Mars remix."'],
        ['🔮','Mars Crystal',2,'"Ancient Martian tech, probably."'],
        ['🗿','Ancient Marker',2,'"Mark my words: aliens played this game too."'],
        ['👽','Alien Fossil',3,'"The truth is out there... in this egg."'],
        ['🌋','Valles Find',3,'"The Grand Canyon called. It\'s jealous."'],
      ]}},
      { name: 'Jupiter Station', eggs: 5, collection: { name: 'Gas Giant Wonders', items: [
        ['🌀','Storm Eye',1,'"I am the storm that is approaching."'],
        ['🪐','Ring Fragment',1,'"Put a ring on it. A planetary ring."'],
        ['🧊','Europa Ice',2,'"Attempt no landing there... oops, too late."'],
        ['🌋','Io Lava',2,'"Most volcanic body in the solar system. Mood."'],
        ['💨','Atmo Sample',2,'"Gas giant? I\'ve been called worse."'],
        ['⚡','Lightning Bolt',3,'"Zeus would like his bolt back."'],
        ['💎','Pressure Diamond',3,'"Under pressure. Pushing down on me."'],
      ]}},
      { name: 'Nebula', eggs: 5, collection: { name: 'Cosmic Dust', items: [
        ['🌫️','Star Dust',1,'"We are star stuff contemplating star stuff."'],
        ['💜','Nebula Gas',1,'"A cloud with an attitude."'],
        ['⭐','Baby Star',2,'"Twinkle, twinkle, little star."'],
        ['🔴','Red Giant Core',2,'"Big, red, and about to blow."'],
        ['⚪','White Dwarf',2,'"Small but mighty."'],
        ['🌟','Neutron Star',3,'"Dense? I prefer \'concentrated awesome.\'"'],
        ['💫','Pulsar Beacon',3,'"Spinning at 716 times per second. I relate."'],
      ]}},
      { name: 'Black Hole Edge', eggs: 6, collection: { name: 'Dark Matter', items: [
        ['⚫','Dark Particle',1,'"Come to the dark side. We have eggs."'],
        ['🌑','Shadow Orb',1,'"A shadow of my former shelf... I mean self."'],
        ['🕳️','Singularity',2,'"Everything leads here eventually."'],
        ['⏰','Time Dilation',2,'"One hour here is seven years on Earth."'],
        ['🌀','Gravity Lens',2,'"Bending light, breaking eggs."'],
        ['💎','Hawking Crystal',3,'"Not even light can escape. But I can."'],
        ['✨','Event Horizon',3,'"Point of no return? Challenge accepted."'],
        ['♾️','Infinity Shard',3,'"I am... inevitable."'],
      ]}},
      { name: 'Galaxy Core', eggs: 7, collection: { name: 'Universal Treasures', items: [
        ['🌌','Galaxy Map',1,'"Don\'t panic. And always know where your towel is."'],
        ['💫','Quasar',2,'"The brightest thing in the universe. Besides me."'],
        ['🌟','Supernova',2,'"Going out with a bang!"'],
        ['🧬','Life Seed',2,'"The answer is 42."'],
        ['🔮','Cosmic Orb',3,'"Contains the meaning of life. Probably."'],
        ['♾️','Infinity Stone',3,'"Perfectly balanced, as all things should be."'],
        ['🌈','Spectrum Key',3,'"Every color of the universe in one key."'],
        ['✨','Big Bang Shard',3,'"In the beginning, there was an egg."'],
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

// reward: { type, value } — applied permanently when unlocked
// types: maxH (max hammers), gold (flat gold), feathers, starPieces, goldPct (% gold bonus), itemPct (% item bonus), hammerRegen (seconds off regen)
const ACHIEVEMENT_DATA = [
  // -- Eggs smashed --
  { id:'first_smash',  name:'First Crack',       desc:'Break your first egg',          icon:'🥚', reward:{type:'maxH',val:2,        label:'+2 max hammers'} },
  { id:'smash_50',     name:'Egg Smasher',        desc:'Break 50 eggs',                 icon:'💪', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  { id:'smash_200',    name:'Egg Destroyer',       desc:'Break 200 eggs',                icon:'🔥', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'smash_1000',   name:'Egg Annihilator',     desc:'Break 1,000 eggs',              icon:'💥', reward:{type:'gold',val:5000,     label:'+5,000 gold'} },
  { id:'smash_5000',   name:'Egg Apocalypse',      desc:'Break 5,000 eggs',              icon:'☄️', reward:{type:'gold',val:20000,    label:'+20,000 gold'} },
  { id:'smash_10000',  name:'Egg Extinction',      desc:'Break 10,000 eggs',             icon:'🌋', reward:{type:'maxH',val:20,       label:'+20 max hammers'} },
  // -- Gold earned --
  { id:'gold_1000',    name:'Coin Collector',      desc:'Earn 1,000 total gold',         icon:'🪙', reward:{type:'gold',val:500,      label:'+500 gold'} },
  { id:'gold_50000',   name:'Rich Monkey',         desc:'Earn 50,000 total gold',        icon:'💰', reward:{type:'gold',val:5000,     label:'+5,000 gold'} },
  { id:'gold_500000',  name:'Gold Tycoon',         desc:'Earn 500,000 total gold',       icon:'🤑', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  { id:'gold_2000000', name:'Gold Hoarder',        desc:'Earn 2,000,000 total gold',     icon:'🏦', reward:{type:'goldPct',val:10,    label:'+10% gold from eggs'} },
  // -- Star pieces --
  { id:'stars_10',     name:'Stargazer',           desc:'Collect 10 star pieces',        icon:'⭐', reward:{type:'starPieces',val:2,  label:'+2 star pieces'} },
  { id:'stars_50',     name:'Star Catcher',        desc:'Collect 50 star pieces',        icon:'🌠', reward:{type:'starPieces',val:5,  label:'+5 star pieces'} },
  { id:'stars_200',    name:'Constellation',       desc:'Collect 200 star pieces',       icon:'🌌', reward:{type:'starPct',val:10,    label:'+10% star drop rate'} },
  // -- Starfall --
  { id:'starfall_1',   name:'Starfall!',           desc:'Use your first starfall',       icon:'🌟', reward:{type:'starPieces',val:1,  label:'+1 star piece'} },
  { id:'starfall_10',  name:'Star Storm',          desc:'Use 10 starfalls',              icon:'💫', reward:{type:'starPieces',val:3,  label:'+3 star pieces'} },
  { id:'starfall_50',  name:'Meteor Shower',       desc:'Use 50 starfalls',              icon:'🌠', reward:{type:'gold',val:10000,    label:'+10,000 gold'} },
  // -- Collections --
  { id:'coll_1',       name:'Collector',           desc:'Complete 1 collection',         icon:'📖', reward:{type:'feathers',val:10,   label:'+10 feathers'} },
  { id:'coll_5',       name:'Curator',             desc:'Complete 5 collections',        icon:'🏛️', reward:{type:'feathers',val:30,   label:'+30 feathers'} },
  { id:'coll_15',      name:'Archivist',           desc:'Complete 15 collections',       icon:'📚', reward:{type:'itemPct',val:5,     label:'+5% item drop rate'} },
  { id:'coll_30',      name:'Completionist',       desc:'Complete 30 collections',       icon:'🗂️', reward:{type:'itemPct',val:10,    label:'+10% item drop rate'} },
  // -- Items found --
  { id:'items_10',     name:'Treasure Hunter',     desc:'Find 10 collection items',      icon:'🔍', reward:{type:'feathers',val:5,    label:'+5 feathers'} },
  { id:'items_50',     name:'Relic Seeker',        desc:'Find 50 collection items',      icon:'🗿', reward:{type:'feathers',val:15,   label:'+15 feathers'} },
  { id:'items_100',    name:'Artifact Master',     desc:'Find 100 collection items',     icon:'🏺', reward:{type:'feathers',val:40,   label:'+40 feathers'} },
  { id:'items_200',    name:'Museum Curator',      desc:'Find 200 collection items',     icon:'🖼️', reward:{type:'gold',val:50000,    label:'+50,000 gold'} },
  // -- Stages --
  { id:'stage_1',      name:'Stage Clear',         desc:'Complete a stage (gold tier)',   icon:'🎯', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'stage_9',      name:'World Champion',      desc:'Complete all 9 stages',         icon:'🏆', reward:{type:'maxH',val:10,       label:'+10 max hammers'} },
  { id:'stage_18',     name:'Double Trouble',      desc:'Complete 18 stages',            icon:'⚡', reward:{type:'gold',val:25000,    label:'+25,000 gold'} },
  { id:'stage_36',     name:'Grand Master',        desc:'Complete all 36 stages',        icon:'👑', reward:{type:'goldPct',val:15,    label:'+15% gold from eggs'} },
  // -- Monkeys --
  { id:'monkey_2',     name:'New Friend',          desc:'Unlock a second monkey',        icon:'🐒', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'monkey_all',   name:'Monkey Business',     desc:'Unlock all monkeys',            icon:'🐵', reward:{type:'goldPct',val:10,    label:'+10% gold from eggs'} },
  // -- Feathers --
  { id:'feathers_50',  name:'Plucked',             desc:'Collect 50 feathers',           icon:'🪶', reward:{type:'feathers',val:10,   label:'+10 feathers'} },
  { id:'feathers_500', name:'Feather Duster',      desc:'Collect 500 feathers',          icon:'🦚', reward:{type:'feathers',val:50,   label:'+50 feathers'} },
  { id:'feather_buy',  name:'Shortcut',            desc:'Buy an item with feathers',     icon:'🛍️', reward:{type:'feathers',val:5,    label:'+5 feathers'} },
  { id:'feather_buy10',name:'Big Spender',         desc:'Buy 10 items with feathers',    icon:'💸', reward:{type:'gold',val:5000,     label:'+5,000 gold'} },
  // -- Multipliers --
  { id:'mult_found',   name:'Lucky Find',          desc:'Find your first multiplier',    icon:'🔢', reward:{type:'gold',val:200,      label:'+200 gold'} },
  { id:'mult_50',      name:'Multiplied!',         desc:'Use a x50 multiplier',          icon:'✖️', reward:{type:'gold',val:10000,    label:'+10,000 gold'} },
  { id:'mult_123',     name:'Jackpot!',            desc:'Find the legendary x123',       icon:'🎰', reward:{type:'gold',val:50000,    label:'+50,000 gold'} },
  { id:'mult_stack',   name:'Stacked!',            desc:'Use 3+ multipliers at once',    icon:'📚', reward:{type:'gold',val:3000,     label:'+3,000 gold'} },
  { id:'mult_big',     name:'Mega Combo',          desc:'Get a x20+ combined multiplier',icon:'🔥', reward:{type:'gold',val:8000,     label:'+8,000 gold'} },
  // -- Silver & Gold eggs --
  { id:'silver_10',    name:'Silver Streak',       desc:'Break 10 silver eggs',          icon:'🥈', reward:{type:'maxH',val:3,        label:'+3 max hammers'} },
  { id:'silver_100',   name:'Silver Mine',         desc:'Break 100 silver eggs',         icon:'⛏️', reward:{type:'maxH',val:8,        label:'+8 max hammers'} },
  { id:'gold_egg_10',  name:'Golden Touch',        desc:'Break 10 gold eggs',            icon:'🥇', reward:{type:'goldPct',val:3,     label:'+3% gold from eggs'} },
  { id:'gold_egg_50',  name:'Gold Rush',           desc:'Break 50 gold eggs',            icon:'🏅', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  // -- Daily login --
  { id:'streak_5',     name:'On a Roll',           desc:'5-day login streak',            icon:'📅', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'streak_20',    name:'Dedicated',            desc:'20-day login streak',           icon:'🔥', reward:{type:'maxH',val:10,       label:'+10 max hammers'} },
  { id:'daily_10',     name:'Regular',             desc:'Claim daily bonus 10 times',    icon:'📆', reward:{type:'gold',val:2000,     label:'+2,000 gold'} },
  { id:'daily_100',    name:'Centurion',           desc:'Claim daily bonus 100 times',   icon:'💯', reward:{type:'gold',val:20000,    label:'+20,000 gold'} },
  // -- Shopping --
  { id:'buy_hammer',   name:'Tool Upgrade',        desc:'Buy a special hammer',          icon:'🔨', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'buy_hat',      name:'Hat Collector',       desc:'Buy a hat',                     icon:'🎩', reward:{type:'gold',val:1000,     label:'+1,000 gold'} },
  { id:'buy_all_h',    name:'Arsenal',             desc:'Buy all special hammers',       icon:'🗡️', reward:{type:'goldPct',val:5,     label:'+5% gold from eggs'} },
  { id:'buy_all_hat',  name:'Millinery',           desc:'Buy all hats',                  icon:'🎪', reward:{type:'itemPct',val:5,     label:'+5% item drop rate'} },
  { id:'shop_10',      name:'Shopaholic',          desc:'Make 10 shop purchases',        icon:'🛒', reward:{type:'gold',val:3000,     label:'+3,000 gold'} },
  // -- Rounds --
  { id:'round_clear',  name:'Clean Sweep',         desc:'Break all eggs in one round',   icon:'🧹', reward:{type:'maxH',val:2,        label:'+2 max hammers'} },
  { id:'round_50',     name:'Marathon',            desc:'Clear 50 rounds',               icon:'🏃', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
  { id:'round_500',    name:'Unstoppable',         desc:'Clear 500 rounds',              icon:'🚂', reward:{type:'maxH',val:15,       label:'+15 max hammers'} },
  // -- Biggest win --
  { id:'bigwin_500',   name:'Payday',              desc:'Win 500+ gold in one smash',    icon:'💵', reward:{type:'gold',val:500,      label:'+500 gold'} },
  { id:'bigwin_5000',  name:'Windfall',            desc:'Win 5,000+ gold in one smash',  icon:'💎', reward:{type:'gold',val:5000,     label:'+5,000 gold'} },
  { id:'bigwin_50000', name:'Legendary Loot',      desc:'Win 50,000+ gold in one smash', icon:'🌟', reward:{type:'goldPct',val:10,    label:'+10% gold from eggs'} },
  // -- Hammer overflow --
  { id:'overflow',     name:'Overloaded',          desc:'Have more hammers than your max',icon:'📦', reward:{type:'maxH',val:5,        label:'+5 max hammers'} },
];
