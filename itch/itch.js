/* ============================================================
   itch.js — ITCH BUILD ONLY
   Loaded only by /dist-itch/index.html. Never bundled into the
   Vercel/Android build.

   Responsibilities:
     B1. Turn the premium shop's "Available on Android" notice
         into a tappable Google Play badge link.
     B2. Add a low-key persistent "Get it on Google Play" CTA.
     C.  Inject the desktop phone-frame decor + side CTA (the CSS
         in itch.css scopes the visual treatment to >=900px).

   HARD GATE: everything below runs only when window.AndroidBridge
   is ABSENT, so none of it can ever appear inside the Android TWA.
   ============================================================ */
(function () {
  'use strict';

  // Never run inside the Android TWA.
  if (typeof window.AndroidBridge !== 'undefined') return;

  var PLAY_URL =
    'https://play.google.com/store/apps/details?id=com.eggbreakeradventures.app' +
    '&referrer=utm_source%3Ditch.io%26utm_medium%3Dwebgame';
  var HOOK = 'Keep your progress safe forever — cloud save on Android.';
  var BADGE = './google-play-badge.png';

  function playLink(extraClass) {
    var a = document.createElement('a');
    a.href = PLAY_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('data-umami-event', 'play-store-click');
    if (extraClass) a.className = extraClass;
    return a;
  }

  // ---- B1: premium shop "Available on Android" → Play badge ----
  // renderPremiumShop() rebuilds #panel-premium and (50ms later)
  // initPremiumShop() injects fresh .android-only-msg nodes, so we
  // observe the panel and re-link whenever new ones appear.
  function linkAndroidNotes() {
    var notes = document.querySelectorAll(
      '.android-only-msg:not([data-itch-linked])'
    );
    for (var i = 0; i < notes.length; i++) {
      var note = notes[i];
      note.setAttribute('data-itch-linked', '1');
      var link = playLink('itch-play-link');
      var badge = document.createElement('img');
      badge.src = BADGE;
      badge.alt = 'Get it on Google Play';
      badge.className = 'itch-play-badge';
      var hook = document.createElement('span');
      hook.className = 'itch-play-hook';
      hook.textContent = HOOK;
      link.appendChild(badge);
      link.appendChild(hook);
      note.textContent = '';
      note.appendChild(link);
    }
  }

  var premiumPanel = document.getElementById('panel-premium');
  if (premiumPanel && typeof MutationObserver === 'function') {
    new MutationObserver(linkAndroidNotes).observe(premiumPanel, {
      childList: true,
      subtree: true,
    });
  }
  linkAndroidNotes();

  // ---- B2: persistent low-key CTA (narrow / portrait fallback) ----
  var cta = playLink('itch-cta');
  var ctaBadge = document.createElement('img');
  ctaBadge.src = BADGE;
  ctaBadge.alt = 'Get it on Google Play';
  ctaBadge.className = 'itch-cta-badge';
  var ctaHook = document.createElement('span');
  ctaHook.className = 'itch-cta-hook';
  ctaHook.textContent = HOOK;
  cta.appendChild(ctaHook);
  cta.appendChild(ctaBadge);
  document.body.appendChild(cta);

  // ---- C: desktop phone-frame bezel (CSS shows it >=900px) ----
  var frame = document.createElement('div');
  frame.className = 'itch-frame';
  frame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(frame);

  // ---- C: scattered decor reusing existing sprites ----
  // {src, side, edge%, top%, size, rotation}
  var DECOR = [
    { src: 'img/cracked_golden_egg_icon.png', side: 'left',  edge: 4,  top: 12, size: 120, rot: -12 },
    { src: 'img/golden_goose.png',            side: 'left',  edge: 7,  top: 58, size: 130, rot: 8 },
    { src: 'img/banana_shake.png',            side: 'left',  edge: 3,  top: 82, size: 96,  rot: -6 },
    { src: 'img/rage_monkey.png',             side: 'right', edge: 5,  top: 16, size: 124, rot: 10 },
    { src: 'img/cracked_golden_egg_icon.png', side: 'right', edge: 8,  top: 70, size: 100, rot: 14 },
    { src: 'img/golden_goose.png',            side: 'right', edge: 3,  top: 90, size: 92,  rot: -10 },
  ];
  var decor = document.createElement('div');
  decor.className = 'itch-decor';
  decor.setAttribute('aria-hidden', 'true');
  DECOR.forEach(function (d, i) {
    var img = document.createElement('img');
    img.src = d.src;
    img.alt = '';
    img.style.width = d.size + 'px';
    img.style.top = d.top + '%';
    img.style[d.side] = d.edge + 'vw';
    img.style.opacity = '0.18';
    img.style.setProperty('--r', d.rot + 'deg');
    img.style.animationDelay = (i * 0.8) + 's';
    decor.appendChild(img);
  });
  document.body.appendChild(decor);

  // ---- C: desktop side CTA (badge + cloud-save hook) ----
  var desk = document.createElement('div');
  desk.className = 'itch-deskcta';
  var title = document.createElement('div');
  title.className = 'itch-deskcta-title';
  title.textContent = 'Loving the game?';
  var deskHook = document.createElement('div');
  deskHook.className = 'itch-deskcta-hook itch-play-hook';
  deskHook.textContent = HOOK;
  var deskLink = playLink('itch-deskcta-badge');
  var deskBadge = document.createElement('img');
  deskBadge.src = BADGE;
  deskBadge.alt = 'Get it on Google Play';
  deskLink.appendChild(deskBadge);
  desk.appendChild(title);
  desk.appendChild(deskHook);
  desk.appendChild(deskLink);
  document.body.appendChild(desk);
})();
