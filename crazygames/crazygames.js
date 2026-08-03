/* ============================================================
   crazygames.js — CRAZYGAMES BUILD ONLY
   Loaded only by /dist-crazy/index.html. Never bundled into the
   Vercel/Android/itch builds.

   CrazyGames Basic Launch forbids, inside the game:
     · external login options      → Cloud Save (Google OAuth/Supabase)
     · external payment providers  → Premium shop / "Available on Android"
     · cross-promotion off-platform→ Google Play CTA, itch/site links
     · external analytics          → umami (stripped at build time)

   The bundle is shared across platforms, so rather than fork the
   game this shim removes the offending entry points from the DOM.
   The build step already strips the Supabase and Sentry CDN tags,
   and both are guarded by `typeof` checks upstream, so cloud save
   disables itself cleanly — this only hides the now-dead controls.

   Belt and braces: everything runs on DOMContentLoaded AND again
   on a short observer, because renderPremiumShop() rebuilds
   #panel-premium asynchronously.
   ============================================================ */
(function () {
  'use strict';

  // Never run inside the Android TWA (defensive — this file never ships there).
  if (typeof window.AndroidBridge !== 'undefined') return;

  var GONE = 'cg-hidden';

  function hide(el) {
    if (el && !el.classList.contains(GONE)) el.classList.add(GONE);
  }

  function stripSettingsEntries() {
    // Push notifications are delivered by an external service (Supabase +
    // FCM). The build's network guard blocks those calls, so the toggle
    // would be a control that silently does nothing — hide it.
    hide(document.getElementById('notif-toggle-btn'));

    var btns = document.querySelectorAll('.settings-menu-btn');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var t = (b.textContent || '').toLowerCase();
      // Cloud Save  → external login (Google OAuth)
      // Google Play → cross-promotion to another store
      // Guide/Story/Press/Online/vs-Original → links off the CrazyGames domain
      // Share       → produces a link to the Vercel origin
      if (t.indexOf('cloud save') > -1 ||
          t.indexOf('google play') > -1 ||
          t.indexOf('game guide') > -1 ||
          t.indexOf('the story') > -1 ||
          t.indexOf('press kit') > -1 ||
          t.indexOf('play egg breaker online') > -1 ||
          t.indexOf('vs the original') > -1 ||
          t.indexOf('share your progress') > -1) {
        hide(b);
      }
    }
  }

  function stripPremium() {
    // The Premium tab sells one-time purchases through Google Play, which
    // CrazyGames requires to go through their own provider instead.
    var tab = document.querySelector('.nav-tab[data-tab="premium"]');
    hide(tab);
    var panel = document.getElementById('panel-premium');
    hide(panel);

    // If the player is somehow left on the premium panel, bounce to Play.
    if (panel && panel.classList.contains('active')) {
      var play = document.querySelector('.nav-play');
      if (play) play.click();
    }
  }

  function stripReferralBanner() {
    // Referral banners are driven by ?ref= links back to the Vercel site;
    // that flow does not exist here.
    hide(document.getElementById('referral-banner'));
  }

  function apply() {
    stripSettingsEntries();
    stripPremium();
    stripReferralBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  // renderPremiumShop()/openSettings() rebuild their DOM on demand, so
  // re-apply whenever those subtrees change.
  if (typeof MutationObserver === 'function') {
    var obs = new MutationObserver(apply);
    var root = document.getElementById('app');
    if (root) obs.observe(root, { childList: true, subtree: true });
  }

  // Final sweep after the game's own deferred renders settle.
  setTimeout(apply, 1200);
  setTimeout(apply, 4000);
})();
