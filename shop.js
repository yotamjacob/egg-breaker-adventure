// ============================================================
//  Egg Smash Adventures — Shop
//  shop.js  (requires game.js loaded first)
//  Gold shop purchases (hammers, hats, supplies) and album
//  item purchases with feathers.
// ============================================================


function buyShopItem(category, id) {
  // Confirmation for non-consumable items when auto-buy is off
  const isConsumable = category === 'supply' && !SHOP_SUPPLIES.find(s => s.id === id)?.unique;
  if (!G.autoBuy && !isConsumable) {
    const item = category === 'hammer' ? SHOP_HAMMERS.find(h => h.id === id)
              : category === 'hat' ? SHOP_HATS.find(h => h.id === id)
              : SHOP_SUPPLIES.find(s => s.id === id);
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
    if (G.gold === 0 && !G._secretBroke) { G._secretBroke = true; checkAchievements(); saveGame(); }
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
    if (G.gold === 0 && !G._secretBroke) { G._secretBroke = true; checkAchievements(); saveGame(); }
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
    if (G.gold === 0 && !G._secretBroke) { G._secretBroke = true; checkAchievements(); saveGame(); }
    G.purchases = (G.purchases || 0) + 1;
    track('shop-purchase', { item: item.name, category: item.type });

    if (id === 'hammers5') { G.hammers = Math.min(G.maxH, G.hammers + 5); G.shopHammers5 = (G.shopHammers5 || 0) + 1; showShopSnack('+5 hammers purchased!'); }
    if (id === 'hammers20') { G.hammers = Math.min(G.maxH, G.hammers + 20); G.shopHammers20 = (G.shopHammers20 || 0) + 1; showShopSnack('+20 hammers purchased!'); }
    if (id === 'star1') { G.starPieces++; G.totalStarPieces++; updateStarBtn(); showShopSnack('+1 star piece purchased!'); }
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
  const grids = category === 'supply'
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
