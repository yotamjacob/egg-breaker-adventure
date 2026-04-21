// ============================================================
//  Egg Smash Adventures – Cloud Save & Push Notifications
//  cloud.js  (requires game.js and payments.js loaded first)
// ============================================================

// Pre-warm serviceWorker.ready so it's resolved before the user taps anything
const _swReady = ('serviceWorker' in navigator) ? navigator.serviceWorker.ready : Promise.resolve(null);

// ==================== CLOUD SAVE ====================

// ── Payment debug logger ─────────────────────────────────────────────────────
// In-memory primary (works even when localStorage is blocked / private mode).
// Also mirrors to localStorage so logs survive a page reload.
const _payLogs = [];
function _payLog(msg) {
  const ts = new Date().toISOString().substring(11, 19);
  const entry = '[' + ts + '] ' + msg;
  _payLogs.push(entry);
  if (_payLogs.length > 60) _payLogs.shift();
  try { localStorage.setItem('_payDbg', JSON.stringify(_payLogs)); } catch (e) { /* ignore */ }
}
function showPayLog() {
  // Snapshot current premium state at copy time for easy diagnosis
  const premState = PREMIUM_PRODUCTS.filter(p => p.boughtKey).map(p => p.id + '=' + (G[p.boughtKey] ? '✓' : '✗')).join(' ');
  const deviceId  = (() => { try { return getDeviceId().slice(0, 12); } catch(e) { return '?'; } })();
  const userId    = _cloudUser ? _cloudUser.id.slice(0, 12) : 'not linked';
  const header    = '[STATE] device=' + deviceId + ' user=' + userId + '\n[STATE] ' + premState;
  const lines = _payLogs.length ? _payLogs : (() => { try { return JSON.parse(localStorage.getItem('_payDbg') || '[]'); } catch(e) { return []; } })();
  const text  = header + '\n' + (lines.length ? lines.join('\n') : '(log empty — attempt a purchase or restore first)');
  navigator.clipboard.writeText(text)
    .then(() => showShopSnack('📋 Payment log copied! Paste it in chat.'))
    .catch(() => { alert(text); });
}
function clearPayLog() {
  _payLogs.length = 0;
  try { localStorage.removeItem('_payDbg'); } catch (e) { /* ignore */ }
  showShopSnack('Payment debug log cleared.');
}
// ────────────────────────────────────────────────────────────────────────────

// ── OAuth debug logger ───────────────────────────────────────────────────────
// Persists across page reloads (survives the OAuth redirect) via localStorage.
// Read with the "📋 OAuth Debug" button in the Cloud Save modal.
function _oauthLog(msg) {
  try {
    const ts = new Date().toISOString().substring(11, 19);
    const logs = JSON.parse(localStorage.getItem('_oauthDbg') || '[]');
    logs.push('[' + ts + '] ' + msg);
    if (logs.length > 40) logs.splice(0, logs.length - 40);
    localStorage.setItem('_oauthDbg', JSON.stringify(logs));
  } catch (e) { /* storage full or private mode */ }
}
function showOauthDebugLog() {
  const logs = JSON.parse(localStorage.getItem('_oauthDbg') || '[]');
  const text = logs.length ? logs.join('\n') : '(log is empty — tap Link Google Account first)';
  navigator.clipboard.writeText(text)
    .then(() => showShopSnack('📋 OAuth log copied! Paste it in chat.'))
    .catch(() => {
      // Fallback: show in alert so the user can manually copy
      alert(text);
    });
}
function clearOauthDebugLog() {
  localStorage.removeItem('_oauthDbg');
  showShopSnack('OAuth debug log cleared.');
}
// ────────────────────────────────────────────────────────────────────────────

function initCloudSave() {
  if (typeof supabase === 'undefined') { _oauthLog('INIT: supabase SDK not loaded'); return; }

  // Log the page URL at startup — this is the key line after an OAuth redirect:
  // if the auth code was delivered, it shows up here as ?code=... or #access_token=...
  _oauthLog('INIT url=' + window.location.href.substring(0, 200));
  _oauthLog('INIT AndroidBridge=' + (typeof window.AndroidBridge) +
            ' UA=' + navigator.userAgent.substring(50, 110));

  _sbClient = supabase.createClient(_SUPABASE_URL, _SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  _sbClient.auth.onAuthStateChange(async (event, session) => {
    _oauthLog('AUTH event=' + event + ' user=' + (session?.user?.email || 'none'));
    // If we're in the middle of an intentional unlink, ignore any SIGNED_IN that
    // fires (can happen if Supabase auto-refreshes the token immediately after signOut).
    if (_cloudUnlinking && event === 'SIGNED_IN') return;
    if (event === 'SIGNED_OUT') _cloudUnlinking = false;
    // Enforce the persisted link preference — survives game resets since it lives
    // outside SAVE_KEY. If the user explicitly unlinked, auto-sign-out any session
    // that Supabase restores on app restart or hard reset.
    if (event === 'SIGNED_IN') {
      try {
        if (localStorage.getItem('_cloudLinkPref') === 'unlinked') {
          _oauthLog('AUTH: SIGNED_IN but pref=unlinked — enforcing signOut');
          _cloudSession = null; _cloudUser = null; _renderCloudModal();
          _sbClient.auth.signOut().catch(() => {});
          return;
        }
      } catch (e) {}
    }
    // Cache the full session — gives us a fresh access_token without any network calls.
    // onAuthStateChange fires on TOKEN_REFRESHED too, so _cloudSession stays current.
    _cloudSession = session || null;
    _cloudUser = session ? session.user : null;
    _renderCloudModal();
    if (event === 'SIGNED_IN') await _onCloudSignIn();
  });
  // Restore session on page load (handles OAuth redirect-back)
  _sbClient.auth.getSession().then(({ data }) => {
    _oauthLog('getSession user=' + (data?.session?.user?.email || 'none'));
    _cloudSession = data.session || null;
    _cloudUser = data.session ? data.session.user : null;
    _renderCloudModal();
  }).catch(e => _oauthLog('getSession ERROR: ' + e.message));
}

// Called from Android onNewIntent() for implicit flow (#access_token=...).
// Kept for backwards-compat; primary Android path is now PKCE via handleAndroidPkceCallback.
function handleAndroidOAuthCallback(fragment) {
  _oauthLog('handleAndroidOAuthCallback fragment=' + fragment.substring(0, 80));
  if (!_sbClient) { _oauthLog('handleAndroidOAuthCallback: no _sbClient'); return; }
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  const access_token  = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token) { _oauthLog('handleAndroidOAuthCallback: no access_token'); return; }
  _sbClient.auth.setSession({ access_token, refresh_token: refresh_token || '' })
    .then(({ data, error }) => {
      _oauthLog('setSession user=' + (data?.session?.user?.email || 'none') +
                ' err=' + (error?.message || 'none'));
    })
    .catch(e => _oauthLog('setSession catch=' + e.message));
}

// Called from Android onNewIntent() for PKCE flow (?code=...).
// Supabase JS v2 defaults to PKCE — the redirect arrives as eggbreakeradventures://oauth/callback?code=xxxx.
// exchangeCodeForSession() looks up the stored code_verifier from localStorage and exchanges the code,
// firing onAuthStateChange(SIGNED_IN) without any page reload.
async function handleAndroidPkceCallback(code) {
  _oauthLog('handleAndroidPkceCallback code=' + (code ? code.substring(0, 20) + '...' : 'null'));
  if (!_sbClient || !code) { _oauthLog('handleAndroidPkceCallback: missing sbClient or code'); return; }
  try {
    const { data, error } = await _sbClient.auth.exchangeCodeForSession(code);
    _oauthLog('exchangeCode user=' + (data?.session?.user?.email || 'none') + ' err=' + (error?.message || 'none'));
  } catch (e) {
    _oauthLog('handleAndroidPkceCallback exception: ' + e.message);
  }
}

function openCloudSaveModal() {
  closeOverlay('overlay-settings');
  $id('overlay-cloudsave').classList.remove('hidden');
  _renderCloudModal();
  // Fetch last cloud save timestamp if linked — raw fetch to avoid stale Supabase client token
  if (_cloudSession && _cloudUser) {
    fetch(_SUPABASE_URL + '/rest/v1/game_saves?select=saved_at&user_id=eq.' + _cloudUser.id, {
      headers: {
        'apikey':        _SUPABASE_ANON,
        'Authorization': 'Bearer ' + _cloudSession.access_token,
      },
    }).then(r => r.ok ? r.json() : null)
      .then(rows => {
        G._cloudSavedAt = (rows && rows[0]) ? new Date(rows[0].saved_at).getTime() : 0;
        _renderCloudModal();
      }).catch(() => {});
  }
}

function _renderCloudModal() {
  const linked   = !!_cloudUser;
  const linkBtn  = $id('cloud-link-btn');
  const saveBtn  = $id('cloud-save-action-btn');
  const loadBtn  = $id('cloud-load-action-btn');
  const tsEl     = $id('cloud-timestamp');
  const cbEl     = $id('cloud-autosave-cb');
  if (!linkBtn) return;
  if (linked) {
    linkBtn.classList.add('cloud-link-linked');
    $id('cloud-link-label').textContent = '✓ ' + _cloudUser.email;
  } else {
    linkBtn.classList.remove('cloud-link-linked');
    $id('cloud-link-label').textContent = 'Link Google Account';
  }
  saveBtn.disabled = !linked;
  loadBtn.disabled = !linked || !G._cloudSavedAt;
  const delBtn = $id('cloud-delete-action-btn');
  if (delBtn) delBtn.disabled = !linked;
  tsEl.textContent = G._cloudSavedAt
    ? _timeAgo(G._cloudSavedAt) + ' (' + _formatSaveDate(G._cloudSavedAt) + ')'
    : 'No cloud save yet';
  if (cbEl) {
    cbEl.checked  = !!G.cloudAutoSave;
    cbEl.disabled = !linked;
    cbEl.closest('.cloud-autosave-row').classList.toggle('disabled', !linked);
  }
}

function _startCloudAutoSave() {
  _stopCloudAutoSave();
  if (!G.cloudAutoSave || !_sbClient || !_cloudUser) return;
  _cloudSyncTimer = setInterval(async () => {
    try {
      await _syncToCloud();
      msg('☁️ Auto-saved to cloud');
    } catch (e) {
      console.warn('[cloud] auto-save failed:', e);
    }
  }, 15 * 60 * 1000);
}

// On a 401 (expired token cached before Supabase finished refreshing), call
// refreshSession() directly — it's a plain HTTP POST that won't hang like the
// DB auth interceptor — then update _cloudSession for the next request.
async function _refreshCloudSession() {
  const result = await Promise.race([
    _sbClient.auth.refreshSession(),
    new Promise((_, r) => setTimeout(() => r(new Error('refresh timeout')), 5000)),
  ]);
  if (result.data && result.data.session) {
    _cloudSession = result.data.session;
    return true;
  }
  return false;
}

function _stopCloudAutoSave() {
  if (_cloudSyncTimer) { clearInterval(_cloudSyncTimer); _cloudSyncTimer = null; }
}

function toggleCloudAutoSave(checked) {
  if (!_sbClient || !_cloudUser) { G.cloudAutoSave = false; _renderCloudModal(); return; }
  G.cloudAutoSave = checked;
  if (checked) _startCloudAutoSave(); else _stopCloudAutoSave();
  saveGame();
  _renderCloudModal();
}

function linkGoogleAccount() {
  _oauthLog('LINK called user=' + (_cloudUser ? _cloudUser.email : 'null') +
            ' _cloudUnlinking=' + _cloudUnlinking + ' sbClient=' + !!_sbClient);
  _cloudUnlinking = false; // defensive reset — clears any race condition from a prior unlink
  if (!_sbClient) { showShopSnack('⚠️ Service not connected — reload the app'); return; }
  if (_cloudUser) {
    // overlay-confirm has z-index:950, overlay-cloudsave has z-index:900 —
    // confirm appears on top without closing the cloud modal first.
    showConfirm('☁️', 'Unlink Google account?', _cloudUser.email, function() {
      // Clear state immediately — don't wait for signOut to resolve.
      // _cloudUnlinking prevents onAuthStateChange(SIGNED_IN) from restoring the user
      // if Supabase fires a token refresh right after signOut.
      _cloudUnlinking = true;
      try { localStorage.setItem('_cloudLinkPref', 'unlinked'); } catch (e) {}
      _cloudUser = null;
      _stopCloudAutoSave();
      closeOverlay('overlay-cloudsave');
      track('cloud-save', { action: 'unlink' });
      _renderCloudModal();
      showShopSnack('Google account unlinked.');
      _sbClient.auth.signOut()
        .then(() => { _cloudUnlinking = false; })
        .catch(e => { console.error('[cloud] signOut error:', e); _cloudUnlinking = false; });
    }, 'Unlink');
    return;
  }
  // On Android: use a custom URI scheme so Chrome Custom Tab routes the callback directly
  // to onNewIntent() without relying on App Links verification (which can fail on
  // direct APK installs or devices that haven't run the verification check).
  // NOTE: eggbreakeradventures://oauth/callback must be in Supabase → Auth → Redirect URLs.
  // On web: keep the HTTPS origin so Supabase's detectSessionInUrl handles the code on reload.
  // The old custom-scheme issue (Chrome stripping #fragment) only applied to implicit flow;
  // Supabase JS v2 uses PKCE by default (?code=…), so there is no fragment to strip.
  const isAndroidApp = typeof window.AndroidBridge !== 'undefined';
  const redirectTo = isAndroidApp
    ? 'eggbreakeradventures://oauth/callback'
    : window.location.origin + '/';
  _oauthLog('LINK isAndroid=' + isAndroidApp + ' redirectTo=' + redirectTo);
  showShopSnack('Connecting to Google...');
  _sbClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  }).then(({ data, error }) => {
    if (error) {
      _oauthLog('OAUTH error=' + error.message);
      showShopSnack('⚠️ ' + error.message);
      return;
    }
    _oauthLog('OAUTH url=' + (data?.url?.substring(0, 100) || 'null'));
    if (!data?.url) { showShopSnack('⚠️ No auth URL'); return; }
    // Mark OAuth as in-flight in localStorage with a timestamp (survives page reloads and
    // webView.loadUrl navigations). TTL of 5 min prevents stale flags from persisting.
    try { localStorage.setItem('_oauthPending', String(Date.now())); } catch (e) {}
    try { localStorage.setItem('_cloudLinkPref', 'linked'); } catch (e) {}
    _oauthLog('OAUTH navigating to auth URL');
    window.location.href = data.url;
  }).catch(e => { _oauthLog('OAUTH catch=' + e.message); showShopSnack('⚠️ ' + e.message); });
}

async function deleteCloudData() {
  if (!_sbClient || !_cloudUser) return;
  showConfirm('🗑️', 'Delete all cloud data?', 'This removes your save from our servers. Your local save is unaffected.', async function() {
    const prevSavedAt = G._cloudSavedAt;
    G._cloudSavedAt = 0;
    saveGame();
    _renderCloudModal(); // disable Load before the async delete starts
    try {
      await _sbClient.from('game_saves').delete().eq('user_id', _cloudUser.id);
      track('cloud-save', { action: 'delete-data' });
      _cloudUnlinking = true; // block any SIGNED_IN race during signOut
      _cloudUser = null;
      _stopCloudAutoSave();
      await _sbClient.auth.signOut();
      _cloudUnlinking = false;
      _renderCloudModal();
      showShopSnack('Cloud data deleted.');
    } catch (e) {
      G._cloudSavedAt = prevSavedAt; // restore if delete failed
      saveGame();
      _cloudUnlinking = false;
      _cloudUser = null;
      _renderCloudModal();
      showShopSnack('Delete failed. Try again.');
    }
  }, 'Delete');
}

async function _onCloudSignIn() {
  if (!_sbClient || !_cloudUser) return;
  track('cloud-save', { action: 'link' });
  _startCloudAutoSave();
  _renderCloudModal();
  // localStorage flag with timestamp set by linkGoogleAccount() — 5-min TTL guards against
  // stale flags. localStorage survives page reloads and webView.loadUrl() navigations.
  const _oauthPendingTs = (() => { try { return parseInt(localStorage.getItem('_oauthPending') || '0', 10); } catch(e) { return 0; } })();
  const _isOAuthPending = _oauthPendingTs > 0 && Date.now() - _oauthPendingTs < 5 * 60 * 1000;
  if (_isOAuthPending) {
    try { localStorage.removeItem('_oauthPending'); } catch (e) {}
    _oauthLog('SIGNED_IN: OAuth pending flag found — showing linked notification');
    // Auto-enable 15-min cloud save on first link
    if (!G.cloudAutoSave) {
      G.cloudAutoSave = true;
      _startCloudAutoSave();
      saveGame();
    }
    setTimeout(() => {
      showShopSnack('☁️ Google account linked! Auto-save enabled.');
      openCloudSaveModal(); // reopen modal (was closed by page reload on web)
    }, 400);
  }

  // Smart load: compare cloud vs local timestamps and act accordingly
  try {
    const { data } = await _sbClient
      .from('game_saves').select('save_data, saved_at')
      .eq('user_id', _cloudUser.id).maybeSingle();

    if (!data) return; // no cloud save on record — nothing to do

    const cloudTs  = new Date(data.saved_at).getTime();
    G._cloudSavedAt = cloudTs;
    _renderCloudModal();

    const localEmpty  = G.totalEggs === 0;           // fresh install / new device
    const cloudNewer  = cloudTs > (G._savedAt || 0); // cloud has more recent progress

    if (localEmpty) {
      // No local progress — silently restore cloud save
      _applyCloudSave(data.save_data);
      track('cloud-save', { action: 'load' });
      showShopSnack('☁️ Cloud save loaded!');
    } else if (cloudNewer) {
      // Both sides have progress but cloud is newer — ask the player
      showConfirm('☁️', 'Load cloud save?',
        'Found a cloud save from ' + _timeAgo(cloudTs) + '.\nLoad it? Your current local progress will be replaced.',
        function() {
          _applyCloudSave(data.save_data);
          track('cloud-save', { action: 'load' });
          showShopSnack('☁️ Cloud save loaded!');
        }, 'Load it');
    }
    // local is newer — do nothing; auto-save will sync local → cloud shortly
  } catch (e) {
    console.warn('[cloud] sign-in check failed:', e);
  }
}

function cloudSaveManual() {
  if (!_sbClient || !_cloudUser) return;
  showConfirm('☁️', 'Save to cloud?', 'This will overwrite your current cloud save.', function() {
    closeOverlay('overlay-cloudsave');
    showShopSnack('☁️ Saving...', 12000);
    const _timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
    Promise.race([_syncToCloud(), _timeout])
      .then(() => showShopSnack('☁️ Saved to cloud!'))
      .catch(e => { showShopSnack('⚠️ Save failed.'); console.warn('[cloud] save error:', e); });
  }, 'Save');
}

function cloudLoadManual() {
  if (!_sbClient || !_cloudUser) return;
  showConfirm('📥', 'Load from cloud?', 'This will overwrite your current game progress.', function() {
    closeOverlay('overlay-cloudsave');
    showShopSnack('☁️ Loading...', 12000);
    const _timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
    const _load = (async function() {
      if (!_cloudSession) { _cloudUser = null; _renderCloudModal(); throw new Error('no session'); }
      const _doLoadFetch = (token) => fetch(
        _SUPABASE_URL + '/rest/v1/game_saves?select=save_data&user_id=eq.' + _cloudUser.id,
        { headers: { 'apikey': _SUPABASE_ANON, 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' } }
      );
      let resp = await _doLoadFetch(_cloudSession.access_token);
      if (resp.status === 401) {
        const refreshed = await _refreshCloudSession();
        if (!refreshed) throw new Error('HTTP 401 — session expired');
        resp = await _doLoadFetch(_cloudSession.access_token);
      }
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const rows = await resp.json();
      if (!rows.length) throw new Error('no data');
      _applyCloudSave(rows[0].save_data);
      track('cloud-save', { action: 'load' });
    })();
    Promise.race([_load, _timeout])
      .then(() => showShopSnack('☁️ Cloud save loaded!'))
      .catch(e => {
        if (e.message === 'no data') { showShopSnack('No cloud save found.'); return; }
        showShopSnack('⚠️ Load failed.');
        console.warn('[cloud] load error:', e);
      });
  }, 'Load');
}

async function _syncToCloud() {
  if (!_sbClient || !_cloudUser) return;
  const d = {};
  for (const k of Object.keys(DEFAULT_STATE)) d[k] = G[k];
  if (G.roundEggs) {
    d.roundEggs = G.roundEggs.map(egg => { const { _smashing, ...clean } = egg; return clean; });
  }
  const json = JSON.stringify(d);
  const compressed = 'lz:' + LZString.compressToUTF16(json);
  // Calculate when hammers will be full (for push notification scheduling)
  const regenSec    = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
  const secsToFull  = G.hammers < G.maxH ? (G.maxH - G.hammers) * regenSec : 0;
  const hammersFullAt = secsToFull > 0
    ? new Date(Date.now() + secsToFull * 1000).toISOString()
    : null;
  // Use the session token cached by onAuthStateChange.
  // If it's expired (401), refresh once then retry — covers the race where
  // onAuthStateChange fires before _recoverAndRefresh finishes its refresh.
  if (!_cloudSession) { _cloudUser = null; _renderCloudModal(); throw new Error('no session'); }
  // Proactively refresh if token expires within the next 60 s to avoid a 401 round-trip.
  if (_cloudSession.expires_at && (Date.now() / 1000) >= (_cloudSession.expires_at - 60)) {
    await _refreshCloudSession();
    if (!_cloudSession) throw new Error('session lost after proactive refresh');
  }
  const _doSaveFetch = (token) => fetch(_SUPABASE_URL + '/rest/v1/game_saves', {
    method: 'POST',
    headers: {
      'apikey':        _SUPABASE_ANON,
      'Authorization': 'Bearer ' + token,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id:         _cloudUser.id,
      save_data:       compressed,
      saved_at:        new Date(G._savedAt).toISOString(),
      last_seen_at:    new Date().toISOString(),
      hammers_full_at: hammersFullAt,
    }),
  });
  let resp = await _doSaveFetch(_cloudSession.access_token);
  if (resp.status === 401) {
    const refreshed = await _refreshCloudSession();
    if (!refreshed) throw new Error('HTTP 401 — session expired');
    resp = await _doSaveFetch(_cloudSession.access_token);
  }
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  G._cloudSavedAt = G._savedAt;
  saveGame();
  track('cloud-save', { action: 'save' });
  // Keep push_subscriptions.hammers_full_at in sync so cron fires at the right time
  if (localStorage.getItem('eba_push_sub')) {
    fetch(_SUPABASE_URL + '/functions/v1/subscribe-push', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': _SUPABASE_ANON, 'Authorization': 'Bearer ' + _SUPABASE_ANON },
      body:    JSON.stringify({ device_id: getDeviceId(), hammers_full_at: hammersFullAt }),
    }).catch(() => {});
  }
}

function _applyCloudSave(saveData) {
  try {
    const json = saveData.startsWith('lz:')
      ? LZString.decompressFromUTF16(saveData.slice(3)) : saveData;
    const d = JSON.parse(json);
    for (const k of Object.keys(DEFAULT_STATE)) {
      if (d[k] !== undefined && d[k] !== null &&
          (DEFAULT_STATE[k] === null || typeof d[k] === typeof DEFAULT_STATE[k])) {
        G[k] = d[k];
      }
    }
    if (d.roundEggs) G.roundEggs = d.roundEggs;
    migrateSave(G);
    saveGame();
    renderAll();
    MUSIC.play(curMonkey().id);
    // Premium items are stored separately from game progress — re-apply after
    // loading cloud save so items bought on any platform are restored automatically.
    if (_cloudUser) restorePurchases({ silent: true });
  } catch (e) {
    console.warn('[cloud] restore failed:', e);
  }
}

function _timeAgo(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function _formatSaveDate(ms) {
  const d = new Date(ms);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return hh + ':' + mm + ' · ' + months[d.getMonth()] + ' ' + d.getDate();
}

// ==================== PUSH NOTIFICATIONS ====================
const _VAPID_PUBLIC = 'BGdua8JjkIIkYoN5DKeIWLl9ic0s_W9iPyBopA00Smqr1n_4X7ikxQ5PnK9aasLwnFtqyF243nRS256KeY-aYEw';

function _urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64  = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── Android FCM token delivery ─────────────────────────────────────────────────
// Called by MainActivity.sendFcmTokenToJs() after AndroidBridge.requestFcmToken()
let _fcmSubscribeResolve = null;
let _fcmSubscribeReject  = null;
let _fcmToken = null;  // cached so visibilitychange can re-sync without re-requesting

window.onFcmToken = async function(token) {
  _fcmToken = token;
  if (_fcmSubscribeResolve) {
    // User just tapped enable — resolve the pending promise
    const resolve = _fcmSubscribeResolve;
    _fcmSubscribeResolve = null;
    _fcmSubscribeReject  = null;
    resolve(token);
  } else if (localStorage.getItem('eba_push_sub')) {
    // Startup token refresh — silently re-register with current hammers state
    _sendFcmSubscription(token).catch(() => {});
  }
};

// Re-sync hammers_full_at whenever the user backgrounds the app
document.addEventListener('visibilitychange', () => {
  if (document.hidden && _fcmToken && localStorage.getItem('eba_push_sub')) {
    _sendFcmSubscription(_fcmToken).catch(() => {});
  }
});

async function _sendFcmSubscription(token) {
  const regenSec     = G.fastRegen ? CONFIG.fastRegenInterval : CONFIG.regenInterval;
  const secsToFull   = G.hammers < G.maxH ? (G.maxH - G.hammers) * regenSec : 0;
  const hammersFullAt = secsToFull > 0 ? new Date(Date.now() + secsToFull * 1000).toISOString() : null;
  await fetch(_SUPABASE_URL + '/functions/v1/subscribe-push', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': _SUPABASE_ANON, 'Authorization': 'Bearer ' + _SUPABASE_ANON },
    body:    JSON.stringify({
      device_id:       getDeviceId(),
      fcm_token:       token,
      user_id:         _cloudUser?.id ?? null,
      timezone:        Intl.DateTimeFormat().resolvedOptions().timeZone,
      hammers_full_at: hammersFullAt,
    }),
  });
}

async function toggleNotifications() {
  const label = $id('notif-toggle-label');
  const btn   = $id('notif-toggle-btn');
  const re = () => { if (btn) btn.disabled = false; };

  if (btn) btn.disabled = true;

  // Already subscribed — unsubscribe
  if (localStorage.getItem('eba_push_sub')) {
    if (!window.AndroidBridge) {
      try {
        const sw  = await _swReady;
        const sub = await sw.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      } catch (_) {}
    }
    localStorage.removeItem('eba_push_sub');
    label.textContent = 'OFF';
    label.classList.remove('on');
    re(); return;
  }

  // Android: request FCM token via native bridge
  if (window.AndroidBridge) {
    _payLog('notif: AndroidBridge detected, requestFcmToken=' + typeof window.AndroidBridge.requestFcmToken);
    if (typeof window.AndroidBridge.requestFcmToken !== 'function') {
      msg('Please update the app to enable push notifications.');
      re(); return;
    }
    try {
      const token = await new Promise((resolve, reject) => {
        _fcmSubscribeResolve = resolve;
        _fcmSubscribeReject  = reject;
        setTimeout(() => {
          if (_fcmSubscribeReject === reject) {
            _fcmSubscribeResolve = null;
            _fcmSubscribeReject  = null;
            reject(new Error('Token request timed out — check Firebase setup'));
          }
        }, 8000);
        _payLog('notif: calling requestFcmToken');
        window.AndroidBridge.requestFcmToken();
      });
      _payLog('notif: got token, subscribing');
      await _sendFcmSubscription(token);
      localStorage.setItem('eba_push_sub', '1');
      label.textContent = 'ON';
      label.classList.add('on');
      _payLog('notif: subscribed OK');
    } catch (e) {
      _payLog('notif: error ' + e.message);
      msg('Could not enable notifications: ' + (e.message || String(e)));
    }
    re(); return;
  }

  // Web push (browser)
  if (typeof Notification === 'undefined') {
    msg('Push notifications are not supported in this browser.');
    re(); return;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      msg('Notification permission denied.');
      re(); return;
    }

    const sw  = await _swReady;
    const sub = await sw.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: _urlBase64ToUint8Array(_VAPID_PUBLIC),
    });
    await fetch(_SUPABASE_URL + '/functions/v1/subscribe-push', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': _SUPABASE_ANON, 'Authorization': 'Bearer ' + _SUPABASE_ANON },
      body:    JSON.stringify({
        device_id:    getDeviceId(),
        subscription: sub.toJSON(),
        user_id:      _cloudUser?.id ?? null,
        timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    localStorage.setItem('eba_push_sub', '1');
    label.textContent = 'ON';
    label.classList.add('on');
  } catch (e) {
    console.warn('[push] subscribe failed', e);
    msg('Could not enable notifications: ' + (e.message || String(e)));
  }
  re();
}

function _initNotifBtn() {
  const btn   = $id('notif-toggle-btn');
  const label = $id('notif-toggle-label');
  if (!btn || !label) return;
  const hasSub    = localStorage.getItem('eba_push_sub');
  // On Android trust the stored flag; on browser verify the OS permission
  const isGranted = window.AndroidBridge
    ? true
    : (typeof Notification !== 'undefined' && Notification.permission === 'granted');
  if (hasSub && isGranted) {
    label.textContent = 'ON';
    label.classList.add('on');
    // Silently refresh FCM token on every startup so the server always has the latest
    if (window.AndroidBridge && window.AndroidBridge.requestFcmToken) {
      window.AndroidBridge.requestFcmToken();
    }
  } else {
    if (hasSub) localStorage.removeItem('eba_push_sub');
    label.textContent = 'OFF';
    label.classList.remove('on');
  }
}
