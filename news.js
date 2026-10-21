// ============================================================
//  Egg Smash Adventures — "What's new" card (v3.12.1)
//  news.js  (bundled right after theegg.js)
//
//  A small card that slides down from the top once per content release, for
//  returning players only (new players discover everything naturally). It is
//  not a modal: play continues underneath, and ✕ / "Got it" / a swipe up /
//  Esc all close it. Seen-state lives in its own localStorage key, outside
//  SAVE_KEY, so a reset doesn't bring it back.
//
//  It waits for the splash and any open overlay (daily reward, away report),
//  and it stands in for The Egg's own intro popup (one announcement, not two).
//  All module state is `var` (TDZ rule, see idle.js).
// ============================================================

var NEWS_ID = '3.12.0';               // bump only for a new content release
var NEWS_KEY = '_ebaNewsSeen';
var _newsPending = false;             // theegg.js holds its intro while this is true
var _newsEl = null;

function _newsSeen() {
  try { return localStorage.getItem(NEWS_KEY) === NEWS_ID; } catch (e) { return true; }
}
function _newsMarkSeen() {
  try { localStorage.setItem(NEWS_KEY, NEWS_ID); } catch (e) {}
}

function showNewsCard() {
  if (_newsEl) return;
  _newsPending = false;
  _newsMarkSeen();
  const eggOpen = typeof theEggUnlocked === 'function' && theEggUnlocked();
  // The card announces The Egg — its separate intro popup would be a second announcement
  if (eggOpen && typeof theEggState === 'function') { theEggState().introSeen = true; saveGame(); }
  const icon = (n, s) => (typeof eaIconUrl === 'function' ? '<img class="news-ic" src="' + eaIconUrl(n, s) + '" alt="">' : '');
  const el = document.createElement('div');
  el.className = 'news-card';
  el.id = 'news-card';
  el.setAttribute('role', 'status');
  el.innerHTML =
    '<div class="news-head"><span class="news-title">NEW IN 3.12</span>' +
    '<button type="button" class="news-x" aria-label="Close">✕</button></div>' +
    '<div class="news-row">' + icon('egg', 2) + '<div class="news-txt"><b>The Egg</b><span>A giant golden egg and a swarm of flying monkeys. Earn permanent Blessings for the main game.</span></div></div>' +
    '<div class="news-row">' + icon('crown', 2) + '<div class="news-txt"><b>Legend stages</b><span>A hard new finale for every monkey, 47 new items.</span></div></div>' +
    '<div class="news-actions">' +
    (eggOpen ? '<button type="button" class="news-btn news-go">Open The Egg</button>'
             : '<span class="news-note">The Egg appears at Mr. Monkey stage ' + (CONFIG.theEgg.unlockStage + 1) + '</span>') +
    '<button type="button" class="news-btn news-ok">Got it</button></div>';
  document.body.appendChild(el);
  _newsEl = el;
  el.querySelector('.news-x').onclick = () => closeNewsCard('x');
  el.querySelector('.news-ok').onclick = () => closeNewsCard('ok');
  const go = el.querySelector('.news-go');
  if (go) go.onclick = () => {
    closeNewsCard('open');
    const play = document.querySelector('.nav-play');
    if (play && !$id('panel-play').classList.contains('active')) play.click();
    setTimeout(() => { if (typeof openTheEgg === 'function') openTheEgg(); }, 120);
  };
  // swipe up to dismiss
  let y0 = null;
  el.addEventListener('pointerdown', e => { if (!e.target.closest('button')) y0 = e.clientY; });
  el.addEventListener('pointerup', e => { if (y0 !== null && e.clientY - y0 < -24) closeNewsCard('swipe'); y0 = null; });
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  if (typeof track === 'function') track('news-shown', { id: NEWS_ID });
}

function closeNewsCard(how) {
  const el = _newsEl; if (!el) return;
  _newsEl = null;
  el.classList.remove('show');
  setTimeout(() => el.remove(), 320);
  if (typeof track === 'function') track('news-dismissed', { id: NEWS_ID, how: how || 'x' });
}

(function _newsBoot() {
  try {
    if (_newsSeen()) return;
    // Only players who had played before this session — not someone on their first visit
    const returning = (G.totalEggs || 0) > 0 || (G.stagesCompleted || 0) > 0;
    if (!returning) { _newsMarkSeen(); return; }
    _newsPending = true;
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && _newsEl) closeNewsCard('esc'); });
    const start = Date.now();
    const wait = () => {
      if (Date.now() - start > 60000) { _newsPending = false; return; }   // give up quietly; try next launch
      const busy = document.querySelector('.overlay:not(.hidden)') ||
        ($id('referral-banner') && $id('referral-banner').classList.contains('show'));
      if (busy || document.hidden) { setTimeout(wait, 1000); return; }
      setTimeout(showNewsCard, 900);
    };
    if (typeof _whenSplashGone === 'function') _whenSplashGone(wait); else setTimeout(wait, 4000);
  } catch (e) { _newsPending = false; }
})();
