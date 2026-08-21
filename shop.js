// ============================================================
//  Egg Smash Adventures — Shop
//  shop.js  (requires game.js loaded first)
//  Gold shop purchases (hammers, hats, supplies) and album
//  item purchases with feathers.
// ============================================================


// ---- Shop sub-tabs (Supplies / Upgrades / Auto / Hammers / Hats) ----
// One section visible at a time instead of one long scroll. renderShop()
// still fills every grid (cheap), we only toggle visibility. `var` for the
// boot-time TDZ rule (see CLAUDE.md).
var _shopTab = 'consumables';
function setShopTab(name) {
  _shopTab = name || 'consumables';
  document.querySelectorAll('#panel-shop .shop-tab').forEach(b => b.classList.toggle('active', b.dataset.shop === _shopTab));
  document.querySelectorAll('#panel-shop .shop-section').forEach(sec => sec.classList.toggle('hidden', sec.dataset.shop !== _shopTab));
  const panel = $id('panel-shop'); if (panel) panel.scrollTop = 0;
}
document.addEventListener('click', e => {
  const b = e.target.closest('#panel-shop .shop-tab');
  if (b) setShopTab(b.dataset.shop);
});

// ---- Long-press multi-buy (repeatable consumables only) ----
// Hold a consumable card to buy it repeatedly, accelerating while held.
// Delegated on document because doBuyShopItem() → renderShop() rebuilds the
// grid after every purchase, destroying the pressed card mid-hold — the hold
// is tracked by item id, never by element. `var` for the boot TDZ rule.
var _mbTimer = null, _mbBought = false;
function _mbStop() { if (_mbTimer) { clearTimeout(_mbTimer); _mbTimer = null; } }
function _mbTick(id, interval) {
  const before = G.purchases || 0;
  doBuyShopItem('supply', id);
  // No purchase counted = blocked (broke / hammers full / queue full). The
  // normal alert/snack for that already fired once — stop instead of spamming.
  if ((G.purchases || 0) === before) { _mbStop(); return; }
  _mbBought = true;
  const next = Math.max(120, interval * 0.85);
  _mbTimer = setTimeout(function() { _mbTick(id, next); }, next);
}
document.addEventListener('pointerdown', function(e) {
  // Always clear the stale suppress flag: when the hold's release lands on a
  // rebuilt grid no click ever fires, and a leftover true would eat the next
  // genuine tap.
  _mbBought = false;
  if (e.button !== 0) return;
  const card = e.target.closest('#shop-consumables .shop-card');
  if (!card || !card.dataset.id) return;
  const s = SHOP_SUPPLIES.find(function(x) { return x.id === card.dataset.id; });
  if (!s || s.unique) return;
  _mbStop();
  // 450ms before the first repeat: a tap still buys once via the card's
  // click handler, and a scroll flick never triggers a purchase.
  _mbTimer = setTimeout(function() { _mbTick(s.id, 300); }, 450);
});
document.addEventListener('pointerup', _mbStop);
document.addEventListener('pointercancel', _mbStop);
// Releasing a hold that already bought must not buy once more via the click
// the release synthesizes (capture phase — the card's own listener never runs).
document.addEventListener('click', function(e) {
  if (_mbBought && e.target.closest('#shop-consumables')) {
    e.stopPropagation(); e.preventDefault(); _mbBought = false;
  }
}, true);

function buyShopItem(category, id) {
  // Confirmation for non-consumable items when auto-buy is off
  const isConsumable = category === 'supply' && !SHOP_SUPPLIES.find(s => s.id === id)?.unique;
  if (!G.autoBuy && !isConsumable) {
    let item = category === 'hammer' ? SHOP_HAMMERS.find(h => h.id === id)
             : category === 'hat' ? SHOP_HATS.find(h => h.id === id)
             : category === 'autotap' ? SHOP_AUTOTAP.find(s => s.id === id)
             : SHOP_SUPPLIES.find(s => s.id === id);
    if (item && category === 'autotap') {
      // Leveled upgrades: price depends on the current level; null = maxed/owned
      const price = autoTapPrice(id);
      if (price == null) { doBuyShopItem(category, id); return; }
      item = { ...item, cost: price };
    }
    if (item && item.cost > 0) {
      const alreadyOwned = (category === 'hammer' && G.ownedHammers.includes(id))
                        || (category === 'hat' && G.ownedHats.includes(id))
                        || (category === 'supply' && item.unique && (id === 'fastregen' ? G.fastRegen : G['owned_' + id]));
      if (!alreadyOwned && G.gold >= item.cost) {
        showConfirm(item.emoji || '🛒', 'Buy ' + item.name + '?', formatNum(item.cost) + ' gold', function() {
          doBuyShopItem(category, id);
        });
        return;
      }
    }
  }
  doBuyShopItem(category, id);
}

function doBuyShopItem(category, id) {
  if (category === 'hammer') {
    const item = SHOP_HAMMERS.find(h => h.id === id);
    if (!item || item.cost === 0) return;
    if (G.ownedHammers.includes(id)) {
      // Toggle cursor appearance (bonus is always active regardless)
      G.hammer = G.hammer === id ? 'default' : id;
      SFX.play('buy');
      updateHammerSVG();
      renderShop();
      saveGame();
      return;
    }
    if (G.gold < item.cost) { showAlert('🪙', 'Need ' + formatNum(item.cost) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.ownedHammers.push(id);
    invalidateBonusCache();
    G.hammer = id;
    G.purchases = (G.purchases || 0) + 1;
    track('shop-purchase', { item: item.name, category: 'hammer' });
    SFX.play('buy');
    updateHammerSVG();
    showShopSnack(item.name + ' purchased!');
  }

  if (category === 'hat') {
    const item = SHOP_HATS.find(h => h.id === id);
    if (!item || item.cost === 0) return;
    if (G.ownedHats.includes(id)) {
      if (G.hat === id) { G.hat = 'none'; invalidateBonusCache(); renderAll(); saveGame(); showShopSnack(item.name + ' removed!'); return; }
      G.hat = id;
      invalidateBonusCache();
      renderAll();
      saveGame();
      showShopSnack(item.name + ' equipped!');
      return;
    }
    if (G.gold < item.cost) { showAlert('🪙', 'Need ' + formatNum(item.cost) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return; }
    G.gold -= item.cost;
    G.ownedHats.push(id);
    invalidateBonusCache();
    G.hat = id;
    G.purchases = (G.purchases || 0) + 1;
    track('shop-purchase', { item: item.name, category: 'hat' });
    SFX.play('buy');
    showShopSnack(item.name + ' purchased!');
    checkAchievements();
    updateResources();
    renderAll(); renderPremiumShop(); saveGame();
    const hatCard = [...$id('shop-hats').children].find(c => c.dataset && c.dataset.id === id);
    if (hatCard) hatCard.classList.add('just-bought');
    return;
  }

  if (category === 'autotap') {
    if (!buyAutoTapUpgrade(id)) return;
  }

  if (category === 'supply') {
    const item = SHOP_SUPPLIES.find(s => s.id === id);
    if (!item) return;
    if (id === 'fastregen' && G.fastRegen) { showShopSnack('Already purchased!'); return; }
    if (item.unique && id !== 'fastregen' && G['owned_' + id]) { showShopSnack('Already purchased!'); return; }
    // Block purchases that have no room
    if ((id === 'hammers5' || id === 'hammers20') && G.hammers >= G.maxH) { showShopSnack('Hammers already full!'); SFX.play('err'); return; }
    const isFreeHammers20 = id === 'hammers20' && !G.shopHammers20;
    if (!isFreeHammers20 && G.gold < item.cost) { showAlert('🪙', 'Need ' + formatNum(item.cost) + ' gold! (have ' + formatNum(G.gold) + ')'); SFX.play('err'); return; }
    if (!isFreeHammers20) G.gold -= item.cost;
    G.purchases = (G.purchases || 0) + 1;
    track('shop-purchase', { item: item.name, category: item.type });

    if (id === 'hammers5') { G.hammers = Math.min(G.maxH, G.hammers + 5); G.shopHammers5 = (G.shopHammers5 || 0) + 1; showShopSnack('+5 hammers purchased!'); }
    if (id === 'hammers20') { G.hammers = Math.min(G.maxH, G.hammers + 20); G.shopHammers20 = (G.shopHammers20 || 0) + 1; showShopSnack('+20 hammers purchased!'); }
    if (id === 'star1') { G.starPieces++; G.totalStarPieces++; if (typeof questCredit === 'function') questCredit('totalStarPieces', 1); updateStarBtn(); showShopSnack('+1 star piece purchased!'); }
    if (id === 'mult5') { if (G.multQueue.length < 50) { G.multQueue.push(5); G.shopMult5 = (G.shopMult5 || 0) + 1; } renderMultQueue(); showShopSnack('x5 multiplier purchased!'); }
    if (id === 'fastregen') { G.fastRegen = true; showShopSnack('Fast Regen unlocked!'); }
    if (id === 'spyglass') { G['owned_spyglass'] = true; renderEggTray(); showShopSnack('Spyglass unlocked!'); }
    if (id === 'cleanse') { G['owned_cleanse'] = true; showShopSnack('Cleanse unlocked — hex immunity active!'); }

    SFX.play('buy');
  }

  checkAchievements();
  updateResources();
  // Re-render immediately (no delay), then flash the fresh card
  renderShop(); renderPremiumShop(); saveGame();
  const grids = category === 'autotap'
    ? [...$id('shop-autotap').children]
    : category === 'supply'
    ? [...$id('shop-consumables').children, ...$id('shop-upgrades').children]
    : [...$id('shop-' + (category === 'hammer' ? 'hammers' : 'hats')).children];
  for (const c of grids) {
    if (c.dataset && c.dataset.id === id) {
      c.classList.add('just-bought');
      break;
    }
  }
}


function buyAlbumItem(stageIdx, itemIdx, cost) {
  if (G.feathers < cost) {
    showAlert('🪶', 'Need ' + cost + ' feathers! (have ' + G.feathers + ')');
    SFX.play('err');
    return;
  }
  const prog = curProgress();
  if (prog.collections[stageIdx][itemIdx]) {
    msg('Already found!', 'shop');
    return;
  }
  G.feathers -= cost;
  prog.collections[stageIdx][itemIdx] = true;
  G.totalItems++;
  // Items bought with feathers are not "found" — don't progress item quests
  if (typeof questCredit === 'function') questCredit('totalItems', 1);
  G.feathersBought = (G.feathersBought || 0) + 1;
  SFX.play('item');

  const monkey = curMonkey();
  const item = monkey.stages[stageIdx].collection.items[itemIdx];
  msg('Bought ' + item[0] + ' ' + item[1] + '!', 'shop');

  checkCollectionComplete(true);
  checkAchievements();
  updateResources();
  updateStageBar();
  updateOverallProgress();
  renderAlbumStage(stageIdx);
  saveGame();
}
