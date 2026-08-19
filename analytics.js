// ============================================================
//  Egg Smash Adventures — Analytics & attribution
//
//  Thin wrapper over Umami (already loaded in index.html). Every
//  call is fail-safe: if the script is blocked, offline, or absent,
//  tracking silently no-ops and the game is unaffected. Analytics
//  must never be able to break play.
//
//  Events emitted here:
//    game-started      once per page load, carries traffic source
//    play-store-click  any outbound click to the Play listing
//    share-click       player opened the share sheet / copied a link
//    share-completed   share actually went through
//    referral-arrival  player arrived via someone else's share link
//
//  Content pages (marketing surfaces) use declarative
//  data-umami-event attributes instead — no JS needed there.
// ============================================================

const PLAY_LISTING_URL = 'https://play.google.com/store/apps/details?id=com.eggbreakeradventures.app';

// First-touch attribution, kept in its own localStorage key.
// NOT inside SAVE_KEY: resetGame() clears the save, and losing the
// record of where a player originally came from would silently
// corrupt acquisition reporting.
const ATTRIBUTION_KEY = '_ebaAttribution';

/**
 * Builds a Play Store URL carrying campaign attribution.
 *
 * Play Console reads campaign data out of the `referrer` parameter, NOT
 * from bare ?utm_source= on the listing URL — those are dropped. The utm_*
 * pairs therefore go URL-encoded inside `referrer`, which is what shows up
 * in Play Console's acquisition reports and in the install referrer API.
 *
 * @param {string} content - utm_content, i.e. which button was clicked.
 */
function playStoreUrl(content) {
  // Forward the FIRST source that brought this browser here (e.g. a paid
  // campaign) so Play Console credits the install to it; `utm_content`
  // stays the button that was clicked. Falls back to the old web/cta tag.
  const first = firstTouchSource();
  const src = (first && first.source) || 'web';
  const med = (first && first.medium) || 'cta';
  const cmp = (first && first.campaign) || 'play_install';
  const referrer = 'utm_source=' + encodeURIComponent(src) +
                   '&utm_medium=' + encodeURIComponent(med) +
                   '&utm_campaign=' + encodeURIComponent(cmp) +
                   '&utm_content=' + encodeURIComponent(content || 'unknown');
  return PLAY_LISTING_URL + '&referrer=' + encodeURIComponent(referrer);
}

// ── Meta Pixel ───────────────────────────────────────────────
// Inert unless META_PIXEL_ID (config.js) is set. Loads only on our own
// hostnames so the itch build, localhost and the Android WebView never
// report into the ad account. Every call is fail-safe like track().
const _META_HOSTS = /(^|\.)(eggbreakeradventure\.com|egg-breaker-adventures\.vercel\.app)$/;

function _metaAllowed() {
  try {
    if (typeof META_PIXEL_ID === 'undefined' || !META_PIXEL_ID) return false;
    if (window.AndroidBridge) return false;
    return _META_HOSTS.test(window.location.hostname);
  } catch (e) { return false; }
}

/** Injects the pixel (standard fbevents loader) and fires PageView. Idempotent. */
function initMetaPixel() {
  try {
    if (!_metaAllowed() || window._metaPixelInit) return;
    window._metaPixelInit = true;
    const w = window; const n = w.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!w._fbq) w._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const t = document.createElement('script'); t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(t);
    w.fbq('init', META_PIXEL_ID);
    w.fbq('track', 'PageView');
  } catch (e) { /* never break the game */ }
}

/**
 * Fire a Meta event. `standard` = true → fbq('track', name) (PageView, Lead…),
 * otherwise fbq('trackCustom', name). Never throws.
 */
function metaTrack(name, data, standard) {
  try {
    if (!_metaAllowed() || typeof window.fbq !== 'function') return;
    window.fbq(standard ? 'track' : 'trackCustom', name, data || {});
  } catch (e) { /* analytics must never break the game */ }
}

/** Fire an analytics event. Never throws. */
function track(event, data) {
  try {
    if (typeof window === 'undefined') return;
    if (!window.umami || typeof window.umami.track !== 'function') return;
    if (data && Object.keys(data).length) window.umami.track(event, data);
    else window.umami.track(event);
  } catch (e) { /* analytics must never break the game */ }
}

/** Opens the Play listing with attribution and records the click. */
function openPlayStore(source) {
  track('play-store-click', { source: source || 'unknown', platform: _platform() });
  metaTrack('PlayStoreClick', { source: source || 'unknown' });
  openExternalUrl(playStoreUrl(source || 'unknown'));
}

function _platform() {
  try {
    if (window.AndroidBridge) return 'android-app';
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
    return 'web';
  } catch (e) { return 'web'; }
}

/**
 * Classifies where this visit came from, preferring explicit campaign
 * tags over the referrer header (which is often stripped or self-referential).
 */
function _readSource() {
  const out = { source: 'direct', medium: 'none', campaign: '', referrerHost: '' };
  try {
    const q = new URLSearchParams(window.location.search);

    if (q.get('utm_source')) {
      out.source   = q.get('utm_source');
      out.medium   = q.get('utm_medium')   || 'unknown';
      out.campaign = q.get('utm_campaign') || '';
      return out;
    }

    // A share link is its own acquisition channel.
    if (q.get('ref')) {
      out.source = 'share-link';
      out.medium = 'referral';
      return out;
    }

    const r = document.referrer;
    if (r) {
      const host = new URL(r).hostname.replace(/^www\./, '');
      out.referrerHost = host;
      if (host && host !== window.location.hostname) {
        out.source = host;
        out.medium = /google|bing|duckduckgo|yahoo|ecosia|brave/.test(host) ? 'organic' : 'referral';
      }
    }
  } catch (e) { /* malformed URL / referrer — fall through to direct */ }
  return out;
}

/** Stores the FIRST source we ever saw for this browser; later visits do not overwrite it. */
function _recordFirstTouch(src) {
  try {
    if (localStorage.getItem(ATTRIBUTION_KEY)) return;
    if (src.source === 'direct') return;   // don't lock in "direct" before a real source appears
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({
      source: src.source, medium: src.medium, campaign: src.campaign, at: Date.now(),
    }));
  } catch (e) { /* private mode / quota */ }
}

function firstTouchSource() {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/**
 * Fires once per page load, after the save is loaded so returning-vs-new
 * is accurate. Called from game.js init.
 */
function trackGameStarted() {
  const src = _readSource();
  _recordFirstTouch(src);
  const first = firstTouchSource();
  initMetaPixel();

  track('game-started', {
    source:       src.source,
    medium:       src.medium,
    campaign:     src.campaign || undefined,
    platform:     _platform(),
    firstSource:  first ? first.source : src.source,
    returning:    (G && G.totalEggs > 0) ? 'yes' : 'no',
    daysSinceFirstPlay: _daysSinceFirstPlay(),
  });
  metaTrack('GameStarted', { returning: (G && G.totalEggs > 0) ? 'yes' : 'no' });
}

/** Whole days since G.firstPlayDate (YYYY-MM-DD); undefined when unknown. */
function _daysSinceFirstPlay() {
  try {
    if (!G || !G.firstPlayDate) return undefined;
    const d = Math.floor((Date.now() - new Date(G.firstPlayDate).getTime()) / 86400000);
    return d >= 0 && d < 10000 ? d : undefined;
  } catch (e) { return undefined; }
}
