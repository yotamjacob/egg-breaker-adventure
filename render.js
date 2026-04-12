// ============================================================
//  Egg Breaker Adventures – UI Rendering
//  render.js  (requires config.js, data.js loaded first)
//
//  All DOM updates, visual builders, and tab renderers.
//  Gameplay logic lives in game.js.
// ============================================================

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// ==================== EGG RENDERING (16-bit pixel style) ====================
// damage: 0 = pristine, 1 = light cracks, 2 = heavy cracks, 3+ = broken
function makeEggSVG(type, damage) {
  const def = EGG_REGISTRY[type] || EGG_REGISTRY.normal;
  const c = def.colors;
  const crk = '#5a3010';
  let cracks = '';
  if (damage >= 1) {
    // Light cracks — top-center zigzag
    cracks += `
    <rect x="36" y="20" width="3" height="3" fill="${crk}"/>
    <rect x="33" y="23" width="3" height="3" fill="${crk}"/>
    <rect x="36" y="26" width="3" height="3" fill="${crk}"/>
    <rect x="39" y="29" width="3" height="3" fill="${crk}"/>
    <rect x="36" y="32" width="3" height="3" fill="${crk}"/>`;
  }
  if (damage >= 2) {
    // Heavy cracks — right side + left side
    cracks += `
    <rect x="48" y="28" width="3" height="3" fill="${crk}"/>
    <rect x="45" y="31" width="3" height="3" fill="${crk}"/>
    <rect x="48" y="34" width="3" height="3" fill="${crk}"/>
    <rect x="45" y="37" width="3" height="3" fill="${crk}"/>
    <rect x="24" y="40" width="3" height="3" fill="${crk}"/>
    <rect x="27" y="43" width="3" height="3" fill="${crk}"/>
    <rect x="24" y="46" width="3" height="3" fill="${crk}"/>
    <rect x="33" y="35" width="3" height="3" fill="${crk}"/>`;
  }
  const highlight = `
    <rect x="26" y="22" width="3" height="18" fill="${c.h}" opacity=".5"/>
    <rect x="29" y="19" width="3" height="12" fill="${c.h}" opacity=".35"/>`;
  return `<svg width="72" height="88" viewBox="0 0 80 96" shape-rendering="crispEdges">
    <ellipse cx="40" cy="90" rx="18" ry="4" fill="rgba(0,0,0,.25)"/>
    <ellipse cx="40" cy="50" rx="26" ry="35" fill="${c.s}" />
    <ellipse cx="40" cy="50" rx="23" ry="32" fill="${c.f}" />
    <ellipse cx="40" cy="34" rx="16" ry="10" fill="${c.h}" opacity=".25"/>
    ${highlight}
    <ellipse cx="40" cy="68" rx="18" ry="8" fill="${c.sh}" opacity=".2"/>
    ${cracks}
  </svg>`;
}

function eggLabel(type, hp, maxHp, broken) {
  if (!G['owned_spyglass']) return '';
  if (broken) return '<span class="egg-label">' + type + '</span>';
  return '<span class="egg-label">' + type + '<br>' + hp + '/' + maxHp + '</span>';
}

function renderEggTray() {
  const tray = $id('egg-tray');
  if (!G.roundEggs || G.roundEggs.length === 0) {
    newRound();
    return;
  }
  tray.innerHTML = '';
  // Grid-based placement with random jitter — guarantees no overlap
  const tW = tray.offsetWidth || 300;
  const tH = tray.offsetHeight || 250;
  const eW = 76, eH = 110; // SVG 88px + label ~20px
  const padX = 12, padTop = 10, padBot = 80; // extra bottom clearance for reward log
  const usableW = tW - padX * 2;
  const usableH = tH - padTop - padBot;
  const count = G.roundEggs.length;

  // Calculate grid: find best cols/rows to fit all eggs
  let cols = Math.ceil(Math.sqrt(count * (usableW / usableH)));
  let rows = Math.ceil(count / cols);
  if (cols < 1) cols = 1;
  if (rows < 1) rows = 1;

  const cellW = usableW / cols;
  const cellH = usableH / rows;
  // Max jitter so egg stays within its cell and away from border
  const jitterX = Math.max(0, (cellW - eW) / 2);
  const jitterY = Math.max(0, (cellH - eH) / 2);

  const positions = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const baseX = padX + col * cellW + (cellW - eW) / 2;
    const baseY = padTop + row * cellH + (cellH - eH) / 2;
    positions.push({
      x: baseX + (Math.random() * 2 - 1) * jitterX,
      y: baseY + (Math.random() * 2 - 1) * jitterY,
    });
  }
  // Shuffle positions so egg types aren't always in grid order
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = positions[i]; positions[i] = positions[j]; positions[j] = t;
  }

  G.roundEggs.forEach((egg, i) => {
    const pos = positions[i];
    const slot = document.createElement('div');
    const eggDef = EGG_REGISTRY[egg.type];
    slot.className = 'egg-slot' + (egg.broken ? ' broken' : '');
    slot.style.left = pos.x + 'px';
    slot.style.top = pos.y + 'px';
    const damage = egg.maxHp - egg.hp;
    slot.innerHTML = makeEggSVG(egg.type, egg.broken ? egg.maxHp : damage) +
      eggLabel(egg.type, egg.hp, egg.maxHp, egg.broken);
    slot.setAttribute('data-idx', String(i));
    if (!egg.broken) slot.onclick = function() { smashEgg(i); };
    tray.appendChild(slot);
  });
}

// ==================== MULTIPLIER QUEUE ====================
// All possible multiplier values (fixed order for badges)
const MULT_BADGE_VALUES = [2, 3, 5, 10, 50, 123];

// _selectedCounts: { 2: 1, 5: 2 } = one x2 and two x5 selected
function recalcActiveMult() {
  if (!G._selectedCounts) G._selectedCounts = {};
  let total = 0;
  for (const [val, count] of Object.entries(G._selectedCounts)) {
    total += parseInt(val) * count;
  }
  G.activeMult = total || 1;
  $id('active-mult').textContent = 'x' + G.activeMult;
}

function getMultCount(val) {
  return G.multQueue.filter(v => v === val).length;
}

function renderMultQueue() {
  const q = $id('mult-queue');
  q.innerHTML = '';
  if (!G._selectedCounts) G._selectedCounts = {};

  MULT_BADGE_VALUES.forEach(val => {
    // x123 is locked behind Top Hat purchase
    const locked123 = val === 123 && !hasBonus('unlock123');
    const owned = getMultCount(val);
    const selected = G._selectedCounts[val] || 0;
    const badge = document.createElement('span');
    badge.className = 'mult-chip' + (selected > 0 ? ' active' : '') + ((owned === 0 || locked123) ? ' muted' : '');
    let label;
    if (locked123) { label = '?'; }
    else if (owned === 0) { label = 'x' + val; }
    else if (selected > 0) { label = 'x' + val + ' [' + selected + '/' + owned + ']'; }
    else { label = 'x' + val + ' (' + owned + ')'; }
    badge.textContent = label;
    if (owned > 0) {
      badge.addEventListener('click', () => {
        if (!G._selectedCounts[val]) G._selectedCounts[val] = 0;
        if (G._selectedCounts[val] < owned) {
          G._selectedCounts[val]++;
        } else {
          G._selectedCounts[val] = 0;
        }
        recalcActiveMult();
        renderMultQueue();
      });
    }
    q.appendChild(badge);
  });
  recalcActiveMult();
}

function updateStarBtn() {
  const btn = $id('star-btn');
  const need = starfallCost();
  if (!isStarfallUnlocked()) {
    btn.disabled = true;
    $id('star-count').textContent = '🔒';
    $id('star-hint').textContent = 'Complete Stage 1';
    $id('star-count').parentElement.querySelector('.starfall-icon').textContent = '';
    return;
  }
  $id('star-count').parentElement.querySelector('.starfall-icon').textContent = '⭐';
  $id('star-count').parentElement.querySelector('.starfall-icon').textContent = '⭐';
  const ready = G.starPieces >= need && G.roundEggs && !G.roundEggs.every(e => e.broken);
  btn.disabled = !ready;
  $id('star-count').textContent = G.starPieces + ' / ' + need;
  $id('star-hint').textContent = ready ? 'Tap!' : '';
}

// ==================== UI RENDERING ====================
function updateResources() {
  $id('res-g').textContent = formatNum(G.gold);
  $id('res-b').textContent = G.crystalBananas;
  $id('res-f').textContent = G.feathers;

  // Hammer row with color + timer
  const hRow = $id('hammer-row');
  let hText = '🔨 Hammers: ' + G.hammers + '/' + G.maxH;
  if (G.hammers < G.maxH) hText += ' (' + G.regenCD + 's)';
  hRow.textContent = hText;
  hRow.className = 'hammer-row' + (G.hammers === 0 ? ' zero' : G.hammers < G.maxH ? ' regen' : ' full');

  updateStarBtn();
  updateOverallProgress();
}

function updateOverallProgress() {
  let totalItems = 0, foundItems = 0;
  let totalStages = 0, doneStages = 0;
  let unlockedMonkeys = 0;

  MONKEY_DATA.forEach((m, mi) => {
    const mp = G.monkeys[mi];
    if (mp.unlocked) unlockedMonkeys++;
    m.stages.forEach((s, si) => {
      totalStages++;
      const items = s.collection.items;
      totalItems += items.length;
      if (mp.unlocked && mp.collections[si]) {
        foundItems += mp.collections[si].filter(Boolean).length;
      }
      if (mp.unlocked && mp.tiers && mp.tiers[si] >= 3) {
        doneStages++;
      }
    });
  });

  const pct = totalItems > 0 ? Math.round((foundItems / totalItems) * 100) : 0;
  $id('overall-pct').textContent = pct + '%';
  $id('overall-fill').style.width = pct + '%';
  $id('overall-detail').innerHTML =
    '<span>Items: <strong>' + foundItems + '/' + totalItems + '</strong></span>' +
    '<span>Stages: <strong>' + doneStages + '/' + totalStages + '</strong></span>' +
    '<span>Monkeys: <strong>' + unlockedMonkeys + '/' + MONKEY_DATA.length + '</strong></span>';
}

function updateStageBar() {
  const prog = curProgress();
  const si = curActiveStage();
  const stage = curStage();
  const items = stage.collection.items;
  const collected = prog.collections[si];
  const found = collected.filter(Boolean).length;
  const total = items.length;
  const tier = (prog.tiers && prog.tiers[si]) || 0;
  const tierNames = ['Bronze', 'Silver', 'Gold'];
  const tierIdx = Math.min(tier, 2);

  $id('stage-name').textContent = 'Stage ' + (si + 1) + ': ' + stage.name;
  const tierEl = $id('stage-tier');
  tierEl.textContent = tier >= 3 ? '✅ Done' : tierNames[tierIdx];
  tierEl.className = 'stage-tier ' + (tier >= 3 ? 'complete' : tierNames[tierIdx].toLowerCase());

  const pct = Math.min(100, (found / total) * 100);
  const fill = $id('stage-fill');
  fill.style.width = pct + '%';
  fill.className = 'prog-fill' + (found >= total ? ' complete' : '');

  if (tier >= 3) {
    // Stage complete — suggest next stage
    const nextIdx = si + 1;
    if (nextIdx <= prog.stage && nextIdx < curMonkey().stages.length) {
      $id('stage-detail').textContent = 'Tap here for next stage ▶';
    } else {
      $id('stage-detail').textContent = found + '/' + total + ' items';
    }
  } else {
    $id('stage-detail').textContent = found + '/' + total + ' items';
  }
}

function renderAll() {
  const monkey = curMonkey();
  $id('monkey-avatar').textContent = monkey.emoji;
  $id('monkey-subtitle').textContent = monkey.name;
  $id('sound-btn').textContent = G.soundOn ? '🔊' : '🔇';

  updateResources();
  updateStageBar();
  updateHammerSVG();
  renderEggTray();
  renderMultQueue();
  renderAlbum();
  renderMonkeys();
  renderShop();
  updateAutoBuyBtn();
  renderStats();
  renderAchievements();
  checkDaily();
}

function renderAlbum() {
  const monkey = curMonkey();
  const prog = curProgress();
  const stagesDiv = $id('album-stages');
  stagesDiv.innerHTML = '';

  monkey.stages.forEach((stage, i) => {
    const btn = document.createElement('button');
    btn.className = 'album-stage-btn';
    const tier = (prog.tiers && prog.tiers[i]) || 0;
    const unlocked = i <= prog.stage;
    // Color by tier
    if (!unlocked)     btn.classList.add('locked');
    else if (tier >= 3) btn.classList.add('complete');   // green
    else if (tier >= 2) btn.classList.add('tier-gold');   // gold
    else if (tier >= 1) btn.classList.add('tier-silver'); // silver
    else                btn.classList.add('tier-bronze'); // bronze/gray
    if (i === curActiveStage()) btn.classList.add('active');
    btn.textContent = (i + 1) + '. ' + stage.name;
    btn.disabled = !unlocked;
    if (unlocked) {
      btn.addEventListener('click', () => {
        switchStage(i);
        renderAlbumStage(i);
      });
    }
    stagesDiv.appendChild(btn);
  });

  renderAlbumStage(curActiveStage());
}

function featherCost(rarity, stageIdx) {
  const C = CONFIG;
  const rarityKey = rarity === 1 ? 'common' : rarity === 2 ? 'uncommon' : 'rare';
  const base = C.featherItemCost[rarityKey];
  return Math.round(base * Math.pow(C.featherStageMultiplier, stageIdx));
}

let _albumStageIdx = 0; // track which stage the album is viewing

function renderAlbumStage(stageIdx) {
  _albumStageIdx = stageIdx;
  const monkey = curMonkey();
  const prog = curProgress();
  const stage = monkey.stages[stageIdx];
  const collected = prog.collections[stageIdx] || [];
  const div = $id('album-items');

  const foundCount = collected.filter(Boolean).length;
  const totalItems = stage.collection.items.length;

  let html = '';
  if (foundCount >= totalItems) {
    html += '<div class="pity-bar complete"><span class="pity-label">Collection complete!</span></div>';
  }
  html += '<div class="album-grid">';
  stage.collection.items.forEach((item, i) => {
    const found = collected[i];
    const rarityClass = 'rarity-' + item[2];
    const rarityLabel = ['', 'Common', 'Uncommon', 'Rare'][item[2]];
    const cost = featherCost(item[2], stageIdx);

    const quote = item[3] ? item[3].replace(/^"|"$/g, '') : '';
    const tipText = found
      ? item[1] + (quote ? ' — ' + quote : '')
      : (quote ? '??? — ' + quote : '???');
    const tipEsc = tipText.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;');
    html += '<div class="album-item ' + (found ? 'found' : 'locked') + '" data-tip="' + tipEsc + '">';
    html += '<span class="item-emoji">' + (found ? item[0] : '❓') + '</span>';
    html += '<span class="item-name">' + (found ? item[1] : '???') + '</span>';
    html += '<span class="album-rarity ' + rarityClass + '">' + rarityLabel + '</span>';
    if (!found) {
      html += '<button class="feather-buy-btn" data-stage="' + stageIdx + '" data-idx2="' + i + '" data-cost="' + cost + '">' +
        '🪶 ' + cost + '</button>';
    }
    html += '</div>';
  });
  html += '</div>';
  div.innerHTML = html;

  // Event delegation for buy buttons (desktop)
  div.onclick = (e) => {
    const btn = e.target.closest('.feather-buy-btn');
    if (btn) buyAlbumItem(parseInt(btn.dataset.stage), parseInt(btn.dataset.idx2), parseInt(btn.dataset.cost));
  };

  // Update active button
  document.querySelectorAll('.album-stage-btn').forEach((b, i) => {
    b.classList.toggle('active', i === stageIdx);
  });
}

function renderMonkeys() {
  const grid = $id('monkey-grid');
  grid.innerHTML = '';
  MONKEY_DATA.forEach((m, i) => {
    const mp = G.monkeys[i];
    const isActive = i === G.activeMonkey;
    const card = document.createElement('div');
    card.className = 'monkey-card' + (isActive ? ' active' : '');
    if (mp.unlocked && !isActive) card.setAttribute('data-monkey', String(i));

    let inner = '<span class="m-emoji">' + m.emoji + '</span>';
    inner += '<span class="m-name">' + m.name + '</span>';
    inner += '<span class="m-perk">' + m.perkDesc + '</span>';

    if (mp.unlocked) {
      const stageNum = mp.completed ? m.stages.length : mp.stage + 1;
      let totalItems = 0, foundItems = 0;
      m.stages.forEach((s, si) => {
        totalItems += s.collection.items.length;
        if (mp.collections[si]) foundItems += mp.collections[si].filter(Boolean).length;
      });
      const pct = totalItems > 0 ? Math.round(foundItems / totalItems * 100) : 0;
      const isDone = mp.completed;
      inner += '<span class="m-progress' + (isDone ? ' done' : '') + '">' +
        (isDone ? '✅ ' : '') + 'Stage ' + stageNum + '/' + m.stages.length + ' — ' + pct + '%</span>';
      inner += '<div class="m-prog-track"><div class="m-prog-fill' + (isDone ? ' done' : '') + '" style="width:' + pct + '%"></div></div>';
    } else {
      inner += '<span class="m-cost">' + m.cost + ' 🍌 Crystal Bananas</span>';
      inner += '<button class="monkey-unlock-btn" data-unlock="' + i + '">Unlock</button>';
    }

    card.innerHTML = inner;

    // Attach handlers AFTER innerHTML
    if (mp.unlocked && !isActive) {
      card.onclick = function() { switchMonkey(i); };
    }
    if (!mp.unlocked) {
      const btn = card.querySelector('.monkey-unlock-btn');
      if (btn) btn.onclick = function(e) { e.stopPropagation(); unlockMonkey(i); };
    }

    grid.appendChild(card);
  });
}

// ==================== SHOP UI ====================
// Bonus descriptions for tooltips
const BONUS_INFO = {
  lessEmpty:    { stat: 'Empty egg chance',   effect: 'x0.4 (60% reduction)', unit: '' },
  moreStars:    { stat: 'Star piece weight',  effect: 'x1.15 (+15%)',         unit: '' },
  moreFeathers: { stat: 'Feather weight',     effect: 'x1.2 (+20%)',          unit: '' },
  moreItems:    { stat: 'Item drop weight',   effect: 'x1.1 (+10%)',          unit: '' },
  moreGold:     { stat: 'Gold value',         effect: 'x1.2 (+20%)',          unit: '' },
  freeEgg:      { stat: 'Free hit chance',    effect: '10%',                  unit: '' },
  goldBoost:    { stat: 'Gold value',         effect: 'x1.1 (+10%)',          unit: '' },
  starBoost:    { stat: 'Star piece weight',  effect: 'x1.1 (+10%)',          unit: '' },
  unlock123:    { stat: 'x123 multiplier',      effect: 'Unlocked',            unit: '' },
  itemBoost:    { stat: 'Item drop weight',   effect: 'x1.15 (+15%)',         unit: '' },
};

function buildShopTooltip(bonus, owned) {
  if (!bonus || !BONUS_INFO[bonus]) return '';
  const info = BONUS_INFO[bonus];
  if (owned) return info.stat + ': ' + info.effect + ' (active)';
  const already = hasBonus(bonus);
  if (already) return info.stat + ': already active from another source';
  return info.stat + ': ' + info.effect + ' on purchase';
}

function buildSupplyTooltip(id) {
  switch (id) {
    case 'hammers5':   return 'Adds 5 hammers (current: ' + G.hammers + '/' + G.maxH + ')';
    case 'hammers20':  return 'Adds 20 hammers (current: ' + G.hammers + '/' + G.maxH + ')';
    case 'star1':      return 'Adds 1 star piece (current: ' + G.starPieces + '/' + CONFIG.starPiecesForStarfall + ')';
    case 'mult5':      return 'Adds x5 to your multiplier queue (current queue: ' + G.multQueue.length + ')';
    case 'maxhammers': return 'Hammer cap +5 (current max: ' + G.maxH + ' → ' + (G.maxH + 5) + ')';
    case 'fastregen':  return 'Hammer regen: ' + CONFIG.regenInterval + 's → ' + CONFIG.fastRegenInterval + 's per hammer';
    default: return '';
  }
}

function renderShop() {
  // Hammers
  const hGrid = $id('shop-hammers');
  hGrid.innerHTML = '';
  SHOP_HAMMERS.forEach(h => {
    if (h.cost === 0) return;
    const owned = G.ownedHammers.includes(h.id);
    const isCursor = G.hammer === h.id;
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : '') + (isCursor ? ' equipped' : '');
    card.dataset.id = h.id;
    card.innerHTML =
      '<span class="s-emoji">' + h.emoji + '</span>' +
      '<span class="s-name">' + h.name + '</span>' +
      '<span class="s-desc">' + h.desc + '</span>' +
      (owned
        ? '<span class="s-status">OWNED</span>'
        : '<span class="s-cost">' + formatNum(h.cost) + ' 🪙</span>');
    card.addEventListener('click', () => buyShopItem('hammer', h.id));
    hGrid.appendChild(card);
  });

  // Hats
  const hatGrid = $id('shop-hats');
  hatGrid.innerHTML = '';
  SHOP_HATS.forEach(h => {
    if (h.cost === 0) return;
    const owned = G.ownedHats.includes(h.id);
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : '');
    card.dataset.id = h.id;
    card.innerHTML =
      '<span class="s-emoji">' + h.emoji + '</span>' +
      '<span class="s-name">' + h.name + '</span>' +
      '<span class="s-desc">' + h.desc + '</span>' +
      (owned
        ? '<span class="s-status">OWNED</span>'
        : '<span class="s-cost">' + formatNum(h.cost) + ' 🪙</span>');
    if (!owned) card.addEventListener('click', () => buyShopItem('hat', h.id));
    hatGrid.appendChild(card);
  });

  // Consumables vs Upgrades
  const cGrid = $id('shop-consumables');
  const uGrid = $id('shop-upgrades');
  cGrid.innerHTML = '';
  uGrid.innerHTML = '';
  SHOP_SUPPLIES.forEach(s => {
    const isOwned = s.unique && (s.id === 'fastregen' ? G.fastRegen : G['owned_' + s.id]);
    const card = document.createElement('div');
    card.className = 'shop-card' + (isOwned ? ' owned' : '');
    card.dataset.id = s.id;
    card.innerHTML =
      '<span class="s-emoji">' + s.emoji + '</span>' +
      '<span class="s-name">' + s.name + '</span>' +
      (isOwned
        ? '<span class="s-status">OWNED</span>'
        : '<span class="s-cost">' + formatNum(s.cost) + ' 🪙</span>');
    if (!isOwned) card.addEventListener('click', () => buyShopItem('supply', s.id));
    (s.unique ? uGrid : cGrid).appendChild(card);
  });
}

// ==================== STATS / ACHIEVEMENTS ====================
function renderStats() {
  $id('life-stats').innerHTML = [
    ['Eggs broken', G.totalEggs],
    ['Empties', G.totalEmpties || 0],
    ['Gold earned', formatNum(G.totalGold)],
    ['Star pieces', G.totalStarPieces],
    ['Feathers', G.totalFeathers],
    ['Items found', G.totalItems],
    ['Biggest win', formatNum(G.biggestWin)],
    ['Highest mult', 'x' + G.highestMult],
    ['Starfalls', G.starfallsUsed],
    ['Collections', G.collectionsCompleted],
    ['Stages done', G.stagesCompleted],
    ['Round clears', G.roundClears],
    ['Daily claims', G.totalDailyClaims || 0],
  ].map(([k, v]) => '<span>' + k + ': <strong>' + v + '</strong></span>').join('');
}

// Check if a trophy should be hidden (belongs to an undiscovered egg type)
function isTrophyHidden(a) {
  const secretEggs = CONFIG.eggTypes.filter(d => !isEggDiscovered(d.id));
  return secretEggs.some(d => a.id.startsWith(d.id + '_'));
}

function renderAchievements() {
  const grid = $id('achieve-grid');
  grid.innerHTML = '';
  ACHIEVEMENT_DATA.forEach(a => {
    const hidden = isTrophyHidden(a);
    const unlocked = G.achieved.includes(a.id);
    const card = document.createElement('div');
    card.className = 'achieve-card ' + (unlocked ? 'unlocked' : 'locked');
    if (hidden) {
      card.innerHTML =
        '<span class="a-icon">❓</span>' +
        '<div class="a-info"><span class="a-name">???</span>' +
        '<span class="a-desc">Discover a new egg type to reveal</span></div>';
    } else {
      const rewardLabel = a.reward ? a.reward.label : '';
      card.innerHTML =
        '<span class="a-icon">' + a.icon + '</span>' +
        '<div class="a-info"><span class="a-name">' + a.name + '</span> ' +
        '<span class="a-desc">' + a.desc + '</span>' +
        (rewardLabel ? ' <span class="a-reward">' + rewardLabel + '</span>' : '') +
        '</div>';
    }
    grid.appendChild(card);
  });
}

// ==================== DAILY CALENDAR ====================
function renderDailyCalendar() {
  $id('daily-day').textContent = G.consecutiveDays;
  const cal = $id('daily-calendar');
  if (!cal) return;
  const currentDay = G.consecutiveDays;

  let html = '';
  for (let i = 0; i < DAILY_REWARDS.length; i++) {
    const r = DAILY_REWARDS[i];
    const day = r.day;
    let cls = 'daily-cell';
    if (r.type === 'banana') cls += ' banana';

    if (day < currentDay) {
      cls += ' claimed';
    } else if (day === currentDay) {
      cls += G.dailyClaimed ? ' claimed' : ' current';
    } else {
      cls += ' locked';
    }

    const clickable = day === currentDay && !G.dailyClaimed;
    const isClaimed = (day < currentDay) || (day === currentDay && G.dailyClaimed);
    html += '<div class="' + cls + '"' +
      (clickable ? ' onclick="claimDaily()" style="cursor:pointer"' : '') + '>' +
      '<span class="dc-day">Day ' + day + '</span>' +
      '<span class="dc-icon">' + (isClaimed ? '✅' : r.icon) + '</span>' +
      '<span class="dc-label">' + r.label + '</span>' +
      '</div>';
  }
  cal.innerHTML = html;

  // Scroll to current day
  const currentEl = cal.querySelector('.current, .claimed:last-of-type');
  if (currentEl) currentEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

// ==================== LEXICON ====================
function buildLexicon() {
  const C = CONFIG;
  const spawnTotal = C.eggTypes.reduce((s, d) => s + d.spawnWeight, 0);
  const pct = (type) => {
    const d = C.eggTypes.find(e => e.id === type);
    return d ? (d.spawnWeight / spawnTotal * 100).toFixed(0) : '0';
  };
  const emptyPct = (type) => {
    const d = C.eggTypes.find(e => e.id === type);
    if (!d) return '0';
    const w = d.prizes;
    const t = Object.values(w).reduce((a,b) => a + b, 0);
    return (w.empty / t * 100).toFixed(0);
  };
  const uniqueMults = [...new Set(C.multiplierValues)].sort((a,b) => a - b);
  const minGold = C.goldValues.gold_s[0];
  const maxGold = C.goldValues.gold_l[1];
  const minHammer = Math.min(...C.hammerPrizeAmounts);
  const maxHammer = Math.max(...C.hammerPrizeAmounts);
  const dupMin = C.duplicateGoldRange[0];
  const dupMax = C.duplicateGoldRange[1];
  const fMin = C.featherDropRange[0];
  const fMax = C.featherDropRange[1];

  return [
  {
    id: 'basics', icon: '📖', title: 'How to Play',
    html: () => `
<p>Smash eggs, win prizes, complete collections. Each round gives you 3–7 eggs — click one to break it with a hammer. Collect themed items to clear stages, earn Crystal Bananas, and unlock new monkeys.</p>
<p><strong>Keys:</strong> Space/Enter = smash, Ctrl+S = starfall.</p>
<p>Progress auto-saves to your browser.</p>
`
  },
  {
    id: 'eggs', icon: '🥚', title: 'Eggs & Hammers',
    html: () => `
<p>Each hit costs <strong>1 hammer</strong>. Eggs spawn randomly each round — rarer eggs take more hits but give better prizes.</p>
<table class="lex-table">
<tr><th>Egg</th><th>HP</th><th>Spawn Rate</th><th>Special</th></tr>
${C.eggTypes.map(d => isEggDiscovered(d.id)
  ? '<tr><td>' + d.emoji + ' ' + d.name + '</td><td class="num">' + d.hp + '</td><td class="num">~' + pct(d.id) + '%</td><td>' + d.desc + '</td></tr>'
  : '<tr><td>❓ ???</td><td class="num">?</td><td class="num">?</td><td>Undiscovered — keep playing!</td></tr>'
).join('')}
</table>
<p>You start with <strong>${C.startingHammers} hammers</strong>. They regenerate at +1 every ${C.regenInterval}s (${C.fastRegenInterval}s with Fast Regen from the shop). Daily login gives ${C.dailyBaseHammers} + up to ${C.dailyBonusCap} bonus hammers based on your streak. Tier-ups also increase your max.</p>
`
  },
  {
    id: 'prizes', icon: '🎁', title: 'What\'s Inside',
    html: () => `
<p><strong>Gold</strong> — main currency (${minGold}–${maxGold} base, boosted by egg type, multipliers, and equipment). Spend it in the shop.</p>
<p><strong>Star Pieces</strong> — collect ${C.starPiecesForStarfall} to trigger <strong>Starfall</strong>, which smashes all remaining eggs for free. ${C.eggTypes.filter(d => isEggDiscovered(d.id)).map(d => d.name + ': ' + d.starPieces).join(', ')}.</p>
<p><strong>Multipliers</strong> — ${uniqueMults.map(v => 'x' + v).join(', ')}. Stored in a queue. Click one to activate it before your next smash — it boosts gold, feathers, stars, and hammers. Other prizes get bonus gold.</p>
<p><strong>Feathers</strong> — spend in the Album tab to buy missing items directly (${fMin}–${fMax} per drop, doubled from silver eggs). Prices increase with stage and rarity.</p>
<p><strong>Collection Items</strong> — themed items for the current stage. New ones count toward completion. Duplicates convert to ${dupMin}–${dupMax} gold.</p>
<p><strong>Bonus Hammers</strong> — Silver eggs only. ${minHammer}–${maxHammer} free hammers.</p>
`
  },
  {
    id: 'progress', icon: '📚', title: 'Stages & Collections',
    html: () => `
<p>Each monkey has <strong>${MONKEY_DATA[0].stages.length} stages</strong>. Each stage has a themed collection of items in three rarities (Common, Uncommon, Rare).</p>
<table class="lex-table">
<tr><th>Tier</th><th>Collect</th><th>Reward</th></tr>
<tr><td class="hl">Bronze → Silver</td><td class="num">${Math.round(C.tierThresholds.bronze * 100)}%</td><td>+${C.tierRewards.silver.maxHammers} max hammers</td></tr>
<tr><td class="hl">Silver → Gold</td><td class="num">${Math.round(C.tierThresholds.silver * 100)}%</td><td>+${C.tierRewards.gold.maxHammers} max hammers, unlocks next stage</td></tr>
<tr><td class="hl">Gold → Complete</td><td class="num">${Math.round(C.tierThresholds.gold * 100)}%</td><td>+${C.crystalBananasPerStage} Crystal Banana</td></tr>
</table>
<p>Later stages have more eggs per round (up to 7) but also more items to find.</p>
`
  },
  {
    id: 'monkeys', icon: '🐵', title: 'Monkeys',
    html: () => {
      let rows = '';
      MONKEY_DATA.forEach(m => {
        rows += '<tr><td>' + m.emoji + ' ' + m.name + '</td><td class="num">' +
          (m.cost === 0 ? 'Free' : m.cost + ' 🍌') + '</td><td>' + m.perkDesc + '</td></tr>';
      });
      return `
<p>Each monkey is a separate adventure with ${MONKEY_DATA[0].stages.length} stages. Unlock new ones with Crystal Bananas (${C.crystalBananasPerStage} per completed stage). Perks stack with equipment.</p>
<table class="lex-table">
<tr><th>Monkey</th><th>Cost</th><th>Perk</th></tr>
${rows}
</table>
`;
    }
  },
  {
    id: 'shop', icon: '🛒', title: 'Shop',
    html: () => {
      let hRows = '';
      SHOP_HAMMERS.forEach(h => { if (h.cost > 0) hRows += '<tr><td>' + h.emoji + ' ' + h.name + '</td><td class="num">' + formatNum(h.cost) + '</td><td>' + h.desc + '</td></tr>'; });
      let hatRows = '';
      SHOP_HATS.forEach(h => { if (h.cost > 0) hatRows += '<tr><td>' + h.emoji + ' ' + h.name + '</td><td class="num">' + formatNum(h.cost) + '</td><td>' + h.desc + '</td></tr>'; });
      return `
<p><strong>Hammers</strong> — permanent. Bonus is always active regardless of what's equipped.</p>
<table class="lex-table"><tr><th>Hammer</th><th>Cost</th><th>Effect</th></tr>${hRows}</table>
<p><strong>Hats</strong> — permanent. Bonus is always active regardless of what's equipped.</p>
<table class="lex-table"><tr><th>Hat</th><th>Cost</th><th>Effect</th></tr>${hatRows}</table>
<p><strong>Supplies</strong> — consumables: hammer packs, star pieces (${formatNum(SHOP_SUPPLIES.find(s=>s.id==='star1').cost)}), multipliers (${formatNum(SHOP_SUPPLIES.find(s=>s.id==='mult5').cost)}), +5 hammer cap (${formatNum(SHOP_SUPPLIES.find(s=>s.id==='maxhammers').cost)}), fast regen (${formatNum(SHOP_SUPPLIES.find(s=>s.id==='fastregen').cost)}, one-time).</p>
<p>All bonuses are permanent once purchased and stack multiplicatively — hammers, hats, and monkey perks all accumulate.</p>
`;
    }
  },
  {
    id: 'tips', icon: '🧠', title: 'Quick Tips',
    html: () => {
      const bigMult = Math.max(...C.multiplierValues);
      return `
<p><strong>Early on:</strong> smash Normal eggs, claim dailies, let hammers regen naturally.</p>
<p><strong>Mid game:</strong> Silver eggs can't be empty and drop bonus hammers — self-sustaining once you have enough.</p>
<p><strong>Late game:</strong> Gold eggs + saved multipliers = massive rewards. Starfall on a late-stage round is the ultimate move.</p>
<p><strong>Save x${bigMult} multipliers</strong> for Gold egg large-gold rolls (${C.goldValues.gold_l[0]}–${C.goldValues.gold_l[1]} base). One lucky hit can net huge gold.</p>
<p><strong>Best builds:</strong> Princess + Golden Hammer + Crown for gold farming. Space Cadette + Rainbow + Pirate for fast collection completion.</p>
`;
    }
  },
  ];
}

function renderLexicon() {
  const content = $id('lex-content');
  content.innerHTML = '';
  buildLexicon().forEach(sec => {
    const section = document.createElement('div');
    section.className = 'lex-section';
    section.innerHTML =
      '<div class="lex-section-head">' +
        '<span class="lex-icon">' + sec.icon + '</span>' +
        '<span class="lex-title">' + sec.title + '</span>' +
      '</div>' +
      '<div class="lex-body">' + sec.html() + '</div>';
    content.appendChild(section);
  });
}

function updateAutoBuyBtn() {
  const btn = $id('auto-buy-btn');
  if (btn) {
    btn.textContent = G.autoBuy ? 'ON' : 'OFF';
    btn.classList.toggle('on', G.autoBuy);
  }
}
