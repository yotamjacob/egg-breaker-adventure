// ============================================================
//  Egg Smash Adventures — Hammer Mastery ("train your hammer")
//  mastery.js  (bundled after quests.js, before idle.js)
//
//  The EQUIPPED special hammer (G.hammer, not 'default') earns XP:
//  per hit, per break, per new rare item. Levels 1→10 from
//  CONFIG.hammerMastery.xpTable. Every owned hammer's own bonus grows with
//  ITS level (hammerScale = 0…1) — hooks live in smash.js next to the base
//  bonus they extend. L5 on any hammer: 3% hammer refund on hits with it.
//  L10: a unique perk per hammer (hammerPerk()).
//
//  Visuals without new art: the cursor hammer glows by level tier
//  (bronze / silver / gold / prismatic) and sparks from L5; shop cards show
//  "Lv N" + an XP bar. All module-level state is `var` (TDZ rule).
// ============================================================

function hammerXp(id) { return (G.hammerXp && typeof G.hammerXp[id] === 'number') ? G.hammerXp[id] : 0; }

/** 1..maxLevel from cumulative XP. */
function hammerLevel(id) {
  const t = CONFIG.hammerMastery.xpTable, xp = hammerXp(id);
  let lvl = 1;
  for (let i = 1; i < t.length; i++) if (xp >= t[i]) lvl = i + 1;
  return Math.min(lvl, CONFIG.hammerMastery.maxLevel);
}
function hammerOwned(id) { return id && id !== 'default' && Array.isArray(G.ownedHammers) && G.ownedHammers.includes(id); }
/** 0 (L1 or not owned) … 1 (max level). Multiply a scale entry by this. */
function hammerScale(id) {
  if (!hammerOwned(id)) return 0;
  const max = CONFIG.hammerMastery.maxLevel;
  return (hammerLevel(id) - 1) / (max - 1);
}
/** Convenience: CONFIG.hammerMastery.scale[id][key] * hammerScale(id), or 0. */
function hammerBoost(id, key) {
  const sc = CONFIG.hammerMastery.scale[id];
  if (!sc || sc[key] == null) return 0;
  return sc[key] * hammerScale(id);
}
/** True when `id` is owned and at max level (unique L10 perk active). */
function hammerPerk(id) { return hammerOwned(id) && hammerLevel(id) >= CONFIG.hammerMastery.maxLevel; }
/** XP progress inside the current level: { lvl, cur, need, pct, maxed }. */
function hammerXpInfo(id) {
  const t = CONFIG.hammerMastery.xpTable, lvl = hammerLevel(id), xp = hammerXp(id);
  if (lvl >= CONFIG.hammerMastery.maxLevel) return { lvl, cur: 0, need: 0, pct: 100, maxed: true };
  const lo = t[lvl - 1], hi = t[lvl];
  return { lvl, cur: xp - lo, need: hi - lo, pct: Math.floor((xp - lo) / (hi - lo) * 100), maxed: false };
}
function hammerName(id) { const h = SHOP_HAMMERS.find(x => x.id === id); return h ? h.name : id; }
function hammerTierClass(lvl) {
  return lvl >= 10 ? 'hlv-prism' : lvl >= 8 ? 'hlv-gold' : lvl >= 5 ? 'hlv-silver' : lvl >= 2 ? 'hlv-bronze' : '';
}
/** Glow class on the cursor hammer for the equipped hammer's level. */
function applyHammerGlow() {
  const el = $id('hammer'); if (!el) return;
  el.classList.remove('hlv-bronze', 'hlv-silver', 'hlv-gold', 'hlv-prism');
  if (!hammerOwned(G.hammer)) return;
  const c = hammerTierClass(hammerLevel(G.hammer));
  if (c) el.classList.add(c);
}

/** Award XP to the equipped special hammer. Handles level-ups. */
function addHammerXp(amount) {
  const id = G.hammer;
  if (!amount || !hammerOwned(id)) return;
  if (!G.hammerXp || typeof G.hammerXp !== 'object') G.hammerXp = {};
  const before = hammerLevel(id);
  G.hammerXp[id] = (G.hammerXp[id] || 0) + amount;
  const after = hammerLevel(id);
  if (after > before) _hammerLevelUp(id, after);
}
function _hammerLevelUp(id, lvl) {
  const name = hammerName(id);
  const perk = lvl >= CONFIG.hammerMastery.maxLevel ? ' — ' + hammerPerkDesc(id) : lvl === 5 ? ' — 3% free hits unlocked' : '';
  msg('⚒️ ' + name + ' reached Lv ' + lvl + perk, 'trophies');
  try {
    SFX.play('achieve');
    const z = $id('prize-zone'); if (z && typeof spawnFloat === 'function') spawnFloat(z, name + ' Lv ' + lvl + '!', '#ffe27a', 'mega');
    const wrap = $id('egg-tray-wrap');
    if (wrap && typeof Particles !== 'undefined') { const r = wrap.getBoundingClientRect(); Particles.sparkle(r.width / 2, r.height * .4, 26, hammerSparkColor(id)); }
  } catch (e) {}
  applyHammerGlow();
  if (typeof checkAchievements === 'function') checkAchievements();
  const shopPanel = $id('panel-shop');
  if (shopPanel && shopPanel.classList.contains('active') && typeof renderShop === 'function') renderShop();
}
function hammerSparkColor(id) {
  return ({ drumstick: '#ffd27a', bat: '#b39ddb', crystal: '#c4b5fd', golden: '#FFD700', rainbow: '#ff8fd0', cucumber: '#8bf59a', mjolnir: '#ffe033', gavel: '#d8a0ff' })[id] || '#FFD700';
}
/** Human text for the unique L10 perk (shop card + level-up message). */
function hammerPerkDesc(id) {
  return ({
    drumstick: 'Encore: star prizes have a 25% chance of +1 piece',
    bat:       'Consolation: empty eggs still pay 25 gold',
    crystal:   'Plumage: every feather prize gives +1',
    golden:    'Jackpot: 5% of gold prizes pay ×5',
    rainbow:   'Refraction: duplicate items pay double gold',
    cucumber:  'Salad days: double hits can chain into a triple',
    mjolnir:   'Thunderclap: Starfall costs only 5 star pieces',
    gavel:     'Appeal: every verdict refunds the hammer',
  })[id] || '';
}
/** Highest hammer level owned + count at max (achievements). */
function hammerMasteryStats() {
  let best = 0, maxed = 0, owned = 0;
  SHOP_HAMMERS.forEach(h => { if (h.cost === 0 || !hammerOwned(h.id)) return; owned++; const l = hammerLevel(h.id); if (l > best) best = l; if (l >= CONFIG.hammerMastery.maxLevel) maxed++; });
  return { best, maxed, owned, total: SHOP_HAMMERS.filter(h => h.cost > 0).length };
}
/** Shop-card fragment: "Lv 3 · 120/400" + bar (owned hammers only). */
function hammerCardMastery(id) {
  if (!hammerOwned(id)) return '';
  const i = hammerXpInfo(id);
  const perkNow = i.maxed ? hammerPerkDesc(id) : null;
  return '<div class="hm-row"><span class="hm-lv ' + hammerTierClass(i.lvl) + '">Lv ' + i.lvl + (i.maxed ? ' MAX' : '') + '</span>' +
    (i.maxed ? '' : '<span class="hm-xp">' + formatNum(i.cur) + '/' + formatNum(i.need) + '</span>') + '</div>' +
    '<div class="m-prog-track hm-track"><div class="m-prog-fill' + (i.maxed ? ' done' : '') + '" style="width:' + i.pct + '%"></div></div>' +
    (perkNow ? '<div class="hm-perk">★ ' + perkNow + '</div>' : (i.lvl >= 5 ? '<div class="hm-perk hm-perk-dim">3% free hits · L10: ' + hammerPerkDesc(id) + '</div>' : '<div class="hm-perk hm-perk-dim">L5: 3% free hits · L10: ' + hammerPerkDesc(id) + '</div>'));
}

(function _masteryBoot() { try { applyHammerGlow(); } catch (e) {} })();
