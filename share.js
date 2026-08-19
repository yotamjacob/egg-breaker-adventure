// ============================================================
//  Egg Smash Adventures — Share / referral loop
//
//  Turns players into a distribution channel: a share action builds
//  a link encoding the sharer's progress, and opening that link shows
//  a "your friend reached Stage X" banner before dropping straight
//  into instant play.
//
//  Loaded AFTER game.js in the bundle so its init runs after
//  trackGameStarted() — the referral params must still be on the URL
//  when analytics classifies the traffic source, and this file strips
//  them afterwards.
//
//  Share links point at "/" with plain query params rather than a
//  server-rendered route. That keeps them purely static: a share link
//  cannot 500, cannot depend on a function cold start, and works from
//  the SW cache offline. See TODO(owner) below for the dynamic-preview
//  upgrade path.
// ============================================================

const SHARE_ORIGIN   = 'https://www.eggbreakeradventure.com/';  // owned domain (v3.10.13) — also the Meta-verified ad landing host
const SHARE_CODE_KEY = '_ebaShareCode';   // own key — must survive resetGame()

// ── Share code ────────────────────────────────────────────────
// A short, stable, per-device code so repeat shares from the same
// player are attributable to one another. Not a user identifier and
// never sent anywhere except inside the share link itself.
function _shareCode() {
  try {
    let c = localStorage.getItem(SHARE_CODE_KEY);
    if (!c) {
      c = Math.random().toString(36).slice(2, 8);
      localStorage.setItem(SHARE_CODE_KEY, c);
    }
    return c;
  } catch (e) {
    return 'anon';
  }
}

/** Percentage of the current monkey's album that is filled. */
function _albumPercent() {
  try {
    const prog = curProgress();
    let found = 0, total = 0;
    (prog.collections || []).forEach(items => {
      (items || []).forEach(v => { total++; if (v) found++; });
    });
    return total ? Math.round(found / total * 100) : 0;
  } catch (e) { return 0; }
}

/** Human-readable stage number (1-based) of the stage being played. */
function _shareStage() {
  try { return (curActiveStage() || 0) + 1; } catch (e) { return 1; }
}

/**
 * Builds the share URL. Progress is encoded in the query string so the
 * landing banner can be personalised without a server round-trip.
 *   st = stage reached, al = album %, mk = monkey index, ref = share code
 */
function buildShareUrl() {
  const q = new URLSearchParams();
  q.set('ref', _shareCode());
  q.set('st', String(_shareStage()));
  q.set('al', String(_albumPercent()));
  q.set('mk', String(G.activeMonkey || 0));
  return SHARE_ORIGIN + '?' + q.toString();
}

function _shareMessage() {
  const stage  = _shareStage();
  const monkey = (typeof curMonkey === 'function' && curMonkey()) ? curMonkey().name : 'Mr. Monkey';
  return 'I reached Stage ' + stage + ' with ' + monkey +
         ' in Egg Smash Adventures — can you beat it?';
}

/**
 * Share entry point. Uses the native share sheet where available and
 * falls back to copying the link. Never throws: a failed share must not
 * interrupt play.
 */
function shareGame(source) {
  const url  = buildShareUrl();
  const text = _shareMessage();
  const where = source || 'unknown';

  track('share-click', { source: where, stage: _shareStage(), album: _albumPercent() });

  // navigator.share needs HTTPS + a user gesture; it rejects with
  // AbortError when the user dismisses the sheet, which is NOT a failure
  // and must not be counted as a completed share.
  if (navigator.share) {
    navigator.share({ title: 'Egg Smash Adventures', text: text, url: url })
      .then(() => track('share-completed', { method: 'native', source: where }))
      .catch(err => {
        if (err && err.name === 'AbortError') return;      // user cancelled
        _copyShareLink(url, where);                        // sheet unavailable → copy
      });
    return;
  }

  _copyShareLink(url, where);
}

function _copyShareLink(url, where) {
  const done = () => {
    showShopSnack('🔗 Link copied — send it to a friend!', 2400);
    track('share-completed', { method: 'clipboard', source: where });
  };

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => _copyFallback(url, done));
      return;
    }
  } catch (e) { /* fall through */ }
  _copyFallback(url, done);
}

/** Clipboard API is unavailable in some Android WebView configurations. */
function _copyFallback(url, done) {
  try {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:absolute;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) { done(); return; }
  } catch (e) { /* fall through */ }
  showShopSnack('Could not copy the link');
}

// ── Referral arrival ──────────────────────────────────────────

/**
 * Reads referral params, shows the banner, records the arrival, then
 * strips the params from the address bar so a refresh does not replay
 * the banner and the URL stays clean if the player shares it onward.
 */
function initReferralBanner() {
  let q;
  try { q = new URLSearchParams(window.location.search); } catch (e) { return; }

  const ref   = q.get('ref');
  const stage = parseInt(q.get('st'), 10);
  const album = parseInt(q.get('al'), 10);
  if (!ref && !stage) return;

  // Ignore a player's own link — bouncing off your own share is not a referral.
  const own = ref && ref === _shareCode();

  track('referral-arrival', {
    ref: ref || 'none',
    stage: isFinite(stage) ? stage : 0,
    album: isFinite(album) ? album : 0,
    self: own ? 'yes' : 'no',
  });

  // Wait for the splash to clear before showing the banner. The splash is
  // z-index 9999 and sits there for ~4.6s after load, so a banner shown
  // immediately would burn most of its life hidden behind it.
  if (!own) _whenSplashGone(() => _showReferralBanner(stage, album));

  // Strip only the referral params (+ Meta's fbclid, which would otherwise make
  // every ad click a distinct URL in the pageview report); leave utm_*/?tab= intact.
  try {
    ['ref', 'st', 'al', 'mk', 'fbclid'].forEach(k => q.delete(k));
    const rest = q.toString();
    window.history.replaceState({}, '',
      window.location.pathname + (rest ? '?' + rest : '') + window.location.hash);
  } catch (e) { /* replaceState unavailable — harmless */ }
}

/** Calls cb once the splash screen is fading or gone (capped, so it always runs). */
function _whenSplashGone(cb) {
  const start = Date.now();
  (function check() {
    const sp = document.getElementById('splash-screen');
    if (!sp || sp.classList.contains('fade-out') || Date.now() - start > 9000) {
      setTimeout(cb, 250);   // let the fade finish so the banner slides in clean
      return;
    }
    setTimeout(check, 200);
  })();
}

function _showReferralBanner(stage, album) {
  const el = $id('referral-banner');
  if (!el) return;

  let headline;
  if (isFinite(stage) && stage > 0) {
    headline = 'A friend reached <strong>Stage ' + stage + '</strong>' +
               (isFinite(album) && album > 0 ? ' with <strong>' + album + '%</strong> of the album' : '') +
               ' — can you beat it?';
  } else {
    headline = 'A friend sent you this. <strong>Smash some eggs.</strong>';
  }

  const textEl = $id('referral-banner-text');
  if (textEl) textEl.innerHTML = headline;

  el.classList.remove('hidden');
  // Next frame, so the transform transition actually animates.
  requestAnimationFrame(() => el.classList.add('show'));

  // Auto-dismiss — this is a greeting, not a gate. The player is already
  // in the game behind it.
  setTimeout(dismissReferralBanner, 11000);
}

function dismissReferralBanner() {
  const el = $id('referral-banner');
  if (!el || el.classList.contains('hidden')) return;
  el.classList.remove('show');
  setTimeout(() => el.classList.add('hidden'), 320);
}

/* ------------------------------------------------------------------
   Web-only banner: "looks best on mobile + sync to cloud" + Play link.
   ------------------------------------------------------------------ */

// Own key, never inside SAVE_KEY — same reasoning as _cloudLinkPref and
// _ebaAttribution: a resetGame() must not bring the nag back.
const WEB_BANNER_KEY = '_ebaWebBanner';   // '1' once the player closes the card — permanent
// Legacy values (< v3.9.2) were a snooze deadline in ms. Anything numeric is
// therefore an OLD dismissal: honour it while it has not expired, then clear
// it. Without this, everyone who ever closed the old banner would never see
// the card again (v3.9.3 fix).
function _webBannerDismissed() {
  let v;
  try { v = localStorage.getItem(WEB_BANNER_KEY); } catch (e) { return true; }
  if (!v) return false;
  if (v === '1') return true;
  const until = parseInt(v, 10);
  if (isFinite(until) && until > Date.now()) return true;   // old snooze still running
  try { localStorage.removeItem(WEB_BANNER_KEY); } catch (e) {}
  return false;
}

/**
 * Shows the "get the app" card on the plain web/PWA build only:
 *  - never inside the Android app (AndroidBridge present) — they already have it
 *  - never on the itch.io build — itch.js paints its own Play CTA
 *  - not while the referral greeting is up (both are fixed elements)
 *  - never again once the player has closed it in v3.9.2+ (an expired legacy
 *    snooze from the old banner is cleared, see _webBannerDismissed)
 *  - (v3.9.2: it used to auto-hide
 *    after 14s and return a week later; it now floats at the side of the
 *    viewport, out of the game column, and simply stays until dismissed)
 */
function initWebBanner() {
  try {
    if (window.AndroidBridge) return;
    if (_webBannerDismissed()) return;
  } catch (e) { return; }

  _whenSplashGone(function tryShow() {
    // itch.js is injected after the bundle, so this can only be checked now.
    if (document.querySelector('.itch-cta')) return;
    const ref = $id('referral-banner');
    if (ref && !ref.classList.contains('hidden')) { setTimeout(tryShow, 1500); return; }
    _showWebBanner();
  });
}

function _showWebBanner() {
  const el = $id('web-banner');
  if (!el) return;
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('show'));
  track('web-banner-shown');
}

/** Closing it is permanent — the key lives outside SAVE_KEY so a reset cannot bring it back. */
function dismissWebBanner(byUser) {
  const el = $id('web-banner');
  if (!el || el.classList.contains('hidden')) return;
  el.classList.remove('show');
  setTimeout(() => el.classList.add('hidden'), 380);
  if (byUser) {
    try { localStorage.setItem(WEB_BANNER_KEY, '1'); } catch (e) {}
    track('web-banner-dismissed');
  }
}

// TODO(owner): richer link previews for shares.
// Share links currently resolve to the static index.html, so a shared link
// previews with the generic gameplay card rather than "reached Stage 7".
// To personalise it, add a Vercel function at /s that returns a small HTML
// document with dynamic og:title/og:description (and optionally an
// @vercel/og image), then redirects to /?ref=... . Deliberately not done
// here: a serverless hop is a new failure mode on the single most
// important link in the funnel, and it cannot be verified before deploy.

initReferralBanner();
initWebBanner();
