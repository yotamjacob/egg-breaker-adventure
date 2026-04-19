// ============================================================
//  Egg Smash Adventures – Payments
//  payments.js  (requires game.js loaded first)
//  Handles PayPal web payments, Google Play Billing (Android TWA),
//  purchase verification, and restore-purchases flow.
// ============================================================

// ==================== PREMIUM / PAYPAL ====================

const PREMIUM_PRODUCTS = [
  // ── Packs ────────────────────────────────────────────────────────────────
  { id: 'starter_pack', name: 'Starter Pack',   emoji: '🎁', price: '$2.99', desc: '25,000 gold + 50 hammers + 3 Crystal Bananas', featured: true, oneTime: true },
  { id: 'gold_s',       name: 'Gold Pack S',    emoji: '🪙', price: '$0.99', desc: '10,000 gold' },
  { id: 'gold_m',       name: 'Gold Pack M',    emoji: '💰', price: '$2.99', desc: '50,000 gold' },
  { id: 'gold_l',       name: 'Gold Pack L',    emoji: '🏆', price: '$7.99', desc: '200,000 gold' },
  { id: 'hammers',      name: 'Hammer Pack',    emoji: '🔨', price: '$0.99', desc: '100 hammers' },
  { id: 'bananas',      name: 'Monkey Key',     emoji: '🍌', price: '$1.99', desc: '9 Crystal Bananas — unlock any monkey instantly', oneTime: false },
  // ── Premium upgrades (moved from gold shop — too long to grind) ──────────
  { id: 'luckycharm',  name: 'Lucky Charm',    emoji: '🍀', price: '$2.99', desc: '2x rare item drop chance', oneTime: true, boughtKey: 'owned_luckycharm' },
  { id: 'eggradar',    name: 'Egg Radar',       emoji: '📡', price: '$3.99', desc: '+50% rare egg spawns',    oneTime: true, boughtKey: 'owned_eggradar' },
  { id: 'doubledaily', name: 'Double Daily',    emoji: '📅', price: '$3.99', desc: '2x daily login rewards',  oneTime: true, boughtKey: 'owned_doubledaily' },
  { id: 'starsaver',   name: 'Star Saver',      emoji: '✨', price: '$2.99', desc: 'Starfall costs 6 stars instead of 7', oneTime: true, boughtKey: 'owned_starsaver' },
  { id: 'goldmagnet',  name: 'Golden Magnet',   emoji: '🧲', price: '$1.99', desc: '+20% gold from all egg drops', oneTime: true, boughtKey: 'owned_goldmagnet' },
];

function getDeviceId() {
  if (!G.deviceId) {
    G.deviceId = 'eba-' + crypto.randomUUID();
    saveGame();
  }
  return G.deviceId;
}

let _paypalReady = false;
let _paypalLoading = false;

function loadPayPalSDK() {
  return new Promise((resolve, reject) => {
    if (_paypalReady) { resolve(); return; }
    if (_paypalLoading) {
      const wait = setInterval(() => { if (_paypalReady) { clearInterval(wait); resolve(); } }, 100);
      return;
    }
    _paypalLoading = true;
    const s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + _PAYPAL_CLIENT + '&currency=USD';
    s.onload  = () => { _paypalReady = true; _paypalLoading = false; resolve(); };
    s.onerror = () => { _paypalLoading = false; reject(new Error('PayPal SDK failed to load')); };
    document.head.appendChild(s);
  });
}

// ── Google Play Billing (Android TWA via AndroidBridge) ───────────────────
// Android calls window.onPlayPurchaseResult(productId, token, success, errorMsg)
// after the native billing sheet completes.
window.onPlayPurchaseResult = async function(productId, purchaseToken, success, error) {
  _payLog('onPlayPurchaseResult pid=' + productId + ' success=' + success + ' error=' + (error || 'none'));
  if (!success || !purchaseToken) {
    // code 7 = ITEM_ALREADY_OWNED — silently restore rather than showing an error
    if (error && String(error).includes('7')) {
      _payLog('ITEM_ALREADY_OWNED — triggering restore');
      restorePurchases();
      return;
    }
    if (error) showShopSnack('⚠️ ' + error);
    return;
  }
  // If called from queryOwnedPurchases on startup and this non-consumable is already
  // applied in game state, skip the verify network call (idempotent — already owned).
  const _prod = PREMIUM_PRODUCTS.find(p => p.id === productId);
  if (_prod && _prod.boughtKey && G[_prod.boughtKey]) {
    _payLog('onPlayPurchaseResult: ' + productId + ' already owned in game state — skip verify');
    return;
  }
  try {
    // Use same-origin Vercel proxy to avoid CORS failures from the Android WebView
    _payLog('verify START token=' + purchaseToken.slice(0, 20));
    let res;
    try {
      res = await fetch('/api/verify-play-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: getDeviceId(), product_id: productId, purchase_token: purchaseToken, user_id: _cloudUser ? _cloudUser.id : null }),
      });
    } catch (fetchErr) {
      _payLog('verify FETCH_THROW: ' + fetchErr.message);
      throw fetchErr;
    }
    _payLog('verify HTTP=' + res.status);
    const text = await res.text();
    _payLog('verify BODY=' + text.slice(0, 300));
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('verify parse error (HTTP ' + res.status + '): ' + text.slice(0, 80)); }
    if (data.error) { _payLog('verify APP_ERROR: ' + data.error); throw new Error(data.error); }
    if (!data.success) { _payLog('verify not success: ' + JSON.stringify(data)); return; }
    _payLog('verify OK reward=' + JSON.stringify(data.reward || {}));
    applyPurchaseReward(productId, data.reward);
  } catch (e) {
    showShopSnack('⚠️ ' + (e.message || 'Purchase verification failed.'));
  }
};

function _isAndroidBilling() {
  return typeof window.AndroidBridge !== 'undefined' &&
         typeof window.AndroidBridge.purchaseProduct === 'function';
}

async function initPremiumShop() {
  _payLog('initPremiumShop android=' + _isAndroidBilling());
  // Android TWA: use native Play Billing via AndroidBridge
  if (_isAndroidBilling()) {
    for (const product of PREMIUM_PRODUCTS) {
      const el = document.getElementById('paypal-btn-' + product.id);
      if (!el || el.dataset.rendered) continue;
      el.dataset.rendered = '1';
      const btn = document.createElement('button');
      btn.className = 'play-buy-btn';
      btn.textContent = 'Buy — ' + product.price;
      btn.onclick = () => {
        if (!_cloudUser) {
          showConfirm('🔐', 'Sign in required', 'Link your Google account before purchasing — this protects your purchase if you reinstall or reset.', () => openCloudSaveModal(), 'Sign In');
          return;
        }
        window.AndroidBridge.purchaseProduct(product.id);
      };
      el.appendChild(btn);
    }
    return;
  }

  // Web: PayPal
  try {
    await loadPayPalSDK();
  } catch (e) {
    msg('Could not load payment system. Check your connection.');
    return;
  }

  const deviceId = getDeviceId();

  for (const product of PREMIUM_PRODUCTS) {
    const el = document.getElementById('paypal-btn-' + product.id);
    if (!el || el.dataset.rendered) continue;
    el.dataset.rendered = '1';
    const pid   = product.id;
    const price = product.price.replace('$', '');

    const createOrder = async () => {
      _payLog('createOrder START pid=' + pid);
      let res;
      try {
        res = await fetch(_SUPABASE_URL + '/functions/v1/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': _SUPABASE_ANON, 'Authorization': 'Bearer ' + _SUPABASE_ANON },
          body: JSON.stringify({ device_id: deviceId, product_id: pid, user_id: _cloudUser ? _cloudUser.id : null }),
        });
      } catch (fetchErr) {
        _payLog('createOrder FETCH_THROW: ' + fetchErr.message);
        throw fetchErr;
      }
      _payLog('createOrder HTTP=' + res.status);
      const text = await res.text();
      _payLog('createOrder BODY=' + text.slice(0, 200));
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error('createOrder parse error: ' + text.slice(0,80)); }
      if (data.error) { _payLog('createOrder APP_ERROR: ' + data.error); throw new Error(data.error); }
      _payLog('createOrder OK orderId=' + data.paypal_order_id);
      return data.paypal_order_id;
    };

    const captureOrder = async (orderId) => {
      _payLog('capture START pid=' + pid + ' orderId=' + orderId + ' device=' + deviceId.slice(0,8));
      let res;
      try {
        res = await fetch('/api/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId, paypal_order_id: orderId, product_id: pid }),
        });
      } catch (fetchErr) {
        _payLog('capture FETCH_THROW: ' + fetchErr.message);
        throw fetchErr;
      }
      _payLog('capture HTTP=' + res.status + ' ok=' + res.ok);
      const text = await res.text();
      _payLog('capture BODY=' + text.slice(0, 300));
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        _payLog('capture JSON_FAIL: ' + parseErr.message);
        throw new Error('Response parse error (HTTP ' + res.status + '): ' + text.slice(0, 80));
      }
      if (result.error) {
        _payLog('capture APP_ERROR: ' + result.error);
        throw new Error(result.error);
      }
      _payLog('capture OK reward=' + JSON.stringify(result.reward || {}));
      return result;
    };

    paypal.Buttons({
      style: { layout: 'horizontal', color: 'blue', shape: 'rect', label: 'pay', height: 35, tagline: false },
      createOrder,
      onApprove: async (data) => {
        try {
          const result = await captureOrder(data.orderID);
          applyPurchaseReward(pid, result.reward);
        } catch (e) {
          showShopSnack('⚠️ Error: ' + e.message.slice(0, 60) + ' — see Debug Log');
          msg('Payment error: ' + e.message);
        }
      },
      onError: (err) => { _payLog('onError: ' + (err?.message || JSON.stringify(err))); msg('Payment failed. Please try again.'); },
    }).render('#paypal-btn-' + pid);
  }
}

async function restorePurchases(opts = {}) {
  const silent = opts.silent || false;
  if (!silent) showShopSnack('Checking purchases...');
  const deviceId = getDeviceId();
  const userId   = _cloudUser ? _cloudUser.id : null;
  _payLog('restore START silent=' + silent + ' device=' + deviceId.slice(0, 8) + ' user=' + (userId ? userId.slice(0, 8) : 'null'));
  try {
    const res = await fetch('/api/restore-purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, user_id: userId }),
    });
    _payLog('restore HTTP=' + res.status);
    const data = await res.json();
    _payLog('restore BODY=' + JSON.stringify(data).slice(0, 300));
    if (data.error) throw new Error(data.error);
    if (data.reset_premium) {
      _payLog('restore: admin reset_premium — clearing PREMIUM_KEY');
      localStorage.removeItem(PREMIUM_KEY);
      for (const k of PREMIUM_FIELDS) {
        if (k === 'deviceId') continue;
        G[k] = typeof G[k] === 'number' ? 0 : false;
      }
      saveGame();
      renderPremiumShop();
    }
    // Revoke individually disabled products (works without login or premium_reset_requested flag)
    const revokeIds = data.revoke_products || [];
    if (revokeIds.length > 0) {
      _payLog('restore: revoking disabled products=[' + revokeIds.join(',') + ']');
      let revokeChanged = false;
      revokeIds.forEach(pid => {
        const prod = PREMIUM_PRODUCTS.find(p => p.id === pid);
        if (prod && prod.boughtKey && G[prod.boughtKey]) { G[prod.boughtKey] = false; revokeChanged = true; }
        if (pid === 'starter_pack' && G.premium_starter_pack) { G.premium_starter_pack = false; revokeChanged = true; }
      });
      if (revokeChanged) { saveGame(); savePremium(); renderPremiumShop(); }
    }
    const purchases = data.purchases || [];
    _payLog('restore found=' + purchases.length + ' items=[' + purchases.map(p => p.product_id).join(',') + ']');
    if (purchases.length === 0) {
      if (!silent) showShopSnack('No purchases found to restore.');
      return;
    }
    if (silent) {
      // Silent restore: only apply non-consumable upgrades to avoid re-granting gold/hammers
      let changed = false;
      purchases.forEach(p => {
        const prod = PREMIUM_PRODUCTS.find(x => x.id === p.product_id);
        if (prod && prod.boughtKey && !G[prod.boughtKey]) { G[prod.boughtKey] = true; changed = true; _payLog('restore silent applied ' + p.product_id); }
        if (p.product_id === 'starter_pack' && !G.premium_starter_pack) { G.premium_starter_pack = true; changed = true; }
      });
      if (changed) { saveGame(); savePremium(); renderPremiumShop(); }
      return;
    }
    purchases.forEach(p => applyPurchaseReward(p.product_id, p.reward));
    showShopSnack(purchases.length + ' purchase' + (purchases.length > 1 ? 's' : '') + ' restored!');
  } catch (e) {
    _payLog('restore ERROR=' + (e.message || 'unknown'));
    if (!silent) showShopSnack('Restore failed: ' + (e.message || 'Check connection'));
  }
}

function applyPurchaseReward(productId, reward = {}) {
  if (reward.gold)    { G.gold += reward.gold; G.totalGold += reward.gold; }
  if (reward.hammers) { G.hammers += reward.hammers; }
  if (reward.bananas) { G.crystalBananas += reward.bananas; }
  if (productId === 'starter_pack') G.premium_starter_pack = true;
  // Premium upgrades: set owned flag by boughtKey
  const prod = PREMIUM_PRODUCTS.find(p => p.id === productId);
  if (prod && prod.boughtKey) G[prod.boughtKey] = true;
  // Batch products declare quantity > 1 — count each unit as a separate purchase
  const qty = (prod && prod.quantity) || 1;
  G.premiumPurchases = (G.premiumPurchases || 0) + qty;
  track('premium-purchase', { product: productId, quantity: qty });
  checkAchievements();
  saveGame();
  savePremium(); // write to isolated premium store — survives resets and save wipes
  updateResources();
  renderPremiumShop();
  const parts = [];
  if (reward.gold)    parts.push(reward.gold.toLocaleString() + ' gold');
  if (reward.hammers) parts.push(reward.hammers + ' hammers');
  if (reward.bananas) parts.push(reward.bananas + ' Crystal Bananas');
  const label = prod ? (qty > 1 ? qty + '× ' + prod.name : prod.name) : 'Upgrade';
  if (parts.length > 0) {
    showShopSnack('🎉 ' + label + '!');
    msg('🎉 ' + parts.join(' + ') + ' added to your account!');
  } else {
    showShopSnack('🎉 ' + label + ' unlocked!');
    msg('🎉 ' + label + ' unlocked!');
  }
  SFX.play('buy');
}
