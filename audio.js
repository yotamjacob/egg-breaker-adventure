// ============================================================
//  Egg Smash Adventures – Audio
//  audio.js  (standalone, no dependencies)
// ============================================================

const SFX = (() => {
  let ctx, on = true;
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, vol, type) {
    const c = ensure(), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }
  function noise(dur, vol) {
    const c = ensure(), len = c.sampleRate * dur;
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const s = c.createBufferSource(); s.buffer = buf;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(g).connect(c.destination); s.start();
  }
  function play(n) {
    if (!on) return;
    try {
      // 16-bit chiptune style: square & triangle waves
      if (n === 'hit') {
        noise(.006, .16);
        const c = ensure(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(380, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(78, c.currentTime + .036);
        g.gain.setValueAtTime(.36, c.currentTime);
        g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .036);
        o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + .036);
      }
      if (n === 'crunch') {
        noise(.008, .2);
        const c = ensure(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(400, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(80, c.currentTime + .04);
        g.gain.setValueAtTime(.5, c.currentTime);
        g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .04);
        o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + .04);
        setTimeout(() => {
          const c2 = ensure(), o2 = c2.createOscillator(), g2 = c2.createGain();
          o2.type = 'sine';
          o2.frequency.setValueAtTime(560, c2.currentTime);
          o2.frequency.exponentialRampToValueAtTime(90, c2.currentTime + .03);
          g2.gain.setValueAtTime(.3, c2.currentTime);
          g2.gain.exponentialRampToValueAtTime(.001, c2.currentTime + .03);
          o2.connect(g2).connect(c2.destination); o2.start(); o2.stop(c2.currentTime + .03);
        }, 20);
      }
      if (n === 'coin')    { tone(1047, .06, .16, 'square'); setTimeout(() => tone(1319, .08, .13, 'square'), 45); setTimeout(() => tone(1568, .1, .09, 'triangle'), 90); }
      if (n === 'gem')     { tone(1047, .06, .1, 'square'); setTimeout(() => tone(1319, .06, .08, 'square'), 40); setTimeout(() => tone(1568, .12, .07, 'triangle'), 80); }
      if (n === 'star')    { tone(784, .08, .1, 'square'); setTimeout(() => tone(988, .08, .08, 'square'), 60); setTimeout(() => tone(1319, .12, .07, 'triangle'), 120); }
      if (n === 'item')    { [0,70,140].forEach((t, i) => setTimeout(() => tone(523 + i * 262, .1, .1, 'square'), t)); }
      if (n === 'empty')   { tone(165, .12, .1, 'square'); setTimeout(() => tone(131, .1, .08, 'square'), 60); }
      if (n === 'starfall'){ [0,50,100,150,200,250].forEach((t, i) => setTimeout(() => tone(440 * Math.pow(2, i / 5), .15, .1, 'square'), t)); }
      if (n === 'levelup') { [0,80,160,240].forEach((t, i) => setTimeout(() => tone(523 * Math.pow(2, i / 4), .18, .1, 'square'), t)); }
      if (n === 'achieve') { tone(880, .1, .1, 'square'); setTimeout(() => tone(1047, .1, .09, 'square'), 80); setTimeout(() => tone(1319, .15, .08, 'triangle'), 160); }
      if (n === 'mult')    { tone(880, .04, .09, 'triangle'); setTimeout(() => tone(1108, .05, .07, 'triangle'), 35); }
      if (n === 'buy')     { tone(523, .06, .1, 'square'); setTimeout(() => tone(659, .08, .08, 'square'), 50); }
      if (n === 'err')     { tone(196, .1, .12, 'square'); setTimeout(() => tone(165, .08, .1, 'square'), 60); }
      if (n === 'tier')    { [0,70,140,210,280].forEach((t, i) => setTimeout(() => tone(523 * Math.pow(2, i / 6), .15, .1, 'square'), t)); }
      if (n === 'complete') {
        // Ascending arpeggio C-E-G-C'-E'
        [[523,.2],[659,.2],[784,.2],[1047,.25],[1319,.3]].forEach(([f, d], i) =>
          setTimeout(() => tone(f, d, .12, 'square'), i * 110));
        // Triumphant held chord
        setTimeout(() => { tone(1047, .6, .1, 'square'); tone(1319, .6, .09, 'triangle'); tone(1568, .6, .08, 'triangle'); }, 620);
      }
      if (n === 'fanfare') {
        // Grand ascending run C-E-G-A-C'-E'-G'
        [[523,.12],[659,.12],[784,.12],[880,.12],[1047,.18],[1319,.18],[1568,.22]].forEach(([f,d],i) =>
          setTimeout(() => tone(f, d, .13, 'square'), i * 80));
        // Full triumphant chord
        setTimeout(() => {
          tone(1047, 1.0, .12, 'square'); tone(1319, 1.0, .10, 'triangle');
          tone(1568, 1.0, .09, 'triangle'); tone(2093, 1.0, .07, 'triangle');
        }, 640);
        // Echo sparkle
        setTimeout(() => { tone(2093, .25, .06, 'square'); tone(2637, .3, .05, 'triangle'); }, 1200);
      }
    } catch (_) {}
  }
  return { play, toggle() { on = !on; return on; }, isOn() { return on; } };
})();

// ============================================================
//  Music Player — per-monkey looping tracks with fade in/out
// ============================================================
const MUSIC = (() => {
  const VOLUME   = 0.23;  // balanced against SFX oscillators (-25%)
  const FADE_MS  = 2000;  // fade duration in ms (~2 s in/out)
  const STEP_MS  = 16;    // ~60 fps

  const TRACKS = {
    mr_monkey: 'audio/mrmonkey.mp3',
    steampunk:  'audio/steampunk.mp3',
    princess:   'audio/princess.mp3',
    space:      'audio/space.mp3',
    odin:       'audio/odin.mp3',
  };

  // Per-track volume overrides (multiplier relative to VOLUME)
  const TRACK_VOL = { space: 0.50 };   // Space Cadet is louder — reduce ~50% total

  // Tracks with abrupt loop points — use crossfade instead of audio.loop
  const CROSSFADE_TRACKS = new Set(['steampunk']);

  let audio           = null;
  let _crossfadeNext  = null;  // second element during active crossfade
  let on              = true;
  let currentSrc      = null;
  let currentVol      = VOLUME;
  let _timer          = null;
  let _crossTimer     = null;
  let _pausedForVisibility = false;

  function _clearTimer() {
    if (_timer) { clearInterval(_timer); _timer = null; }
  }
  function _clearCrossTimer() {
    if (_crossTimer) { clearInterval(_crossTimer); _crossTimer = null; }
  }

  function _fadeIn(el, targetVol) {
    const target = targetVol !== undefined ? targetVol : currentVol;
    _clearTimer();
    el.volume = 0;
    el.play().catch(() => {});
    const delta = target / (FADE_MS / STEP_MS);
    _timer = setInterval(() => {
      el.volume = Math.min(target, el.volume + delta);
      if (el.volume >= target) _clearTimer();
    }, STEP_MS);
  }

  function _fadeOut(el, done) {
    _clearTimer();
    const delta = (el.volume || currentVol) / (FADE_MS / STEP_MS);
    _timer = setInterval(() => {
      el.volume = Math.max(0, el.volume - delta);
      if (el.volume <= 0) { _clearTimer(); el.pause(); if (done) done(); }
    }, STEP_MS);
  }

  function _setupCrossfade(el, src, targetVol) {
    el.loop = false;
    function onTimeUpdate() {
      if (!el.duration || !isFinite(el.duration)) return;
      if (el.duration - el.currentTime > FADE_MS / 1000 + 0.1) return;
      el.removeEventListener('timeupdate', onTimeUpdate);
      const next = new Audio(src);
      next.volume = 0;
      next.play().catch(() => {});
      _crossfadeNext = next;
      _clearCrossTimer();
      const steps = FADE_MS / STEP_MS;
      const delta = targetVol / steps;
      let step = 0;
      _crossTimer = setInterval(() => {
        step++;
        el.volume  = Math.max(0, targetVol - delta * step);
        next.volume = Math.min(targetVol, delta * step);
        if (step >= steps) {
          _clearCrossTimer();
          el.pause(); el.src = '';
          audio = next;
          _crossfadeNext = null;
          _setupCrossfade(next, src, targetVol);
        }
      }, STEP_MS);
    }
    el.addEventListener('timeupdate', onTimeUpdate);
  }

  function _updateMediaSession(playing) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Egg Smash Adventures',
      artwork: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ]
    });
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }

  // Wire up system media controls (notification shade play/pause on Android)
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play',  () => { if (!on) toggle(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (on)  toggle(); });
    navigator.mediaSession.setActionHandler('stop',  () => { if (on)  toggle(); });
  }

  function _start(src, targetVol) {
    const needsCross = CROSSFADE_TRACKS.has(
      Object.keys(TRACKS).find(id => TRACKS[id] === src)
    );
    audio = new Audio(src);
    audio.loop = !needsCross;
    if (on) { _fadeIn(audio, targetVol); _updateMediaSession(true); }
    if (needsCross) {
      audio.addEventListener('loadedmetadata', () => _setupCrossfade(audio, src, targetVol), { once: true });
    }
  }

  function play(monkeyId) {
    const src = TRACKS[monkeyId];
    if (!src || currentSrc === src) return;
    currentSrc = src;
    currentVol = VOLUME * (TRACK_VOL[monkeyId] !== undefined ? TRACK_VOL[monkeyId] : 1);
    // Clean up any in-progress crossfade
    _clearCrossTimer();
    if (_crossfadeNext) { _crossfadeNext.pause(); _crossfadeNext.src = ''; _crossfadeNext = null; }
    if (audio && !audio.paused) {
      _fadeOut(audio, () => _start(src, currentVol));
    } else {
      _start(src, currentVol);
    }
  }

  function toggle() {
    on = !on;
    if (on) {
      if (audio) _fadeIn(audio, currentVol);
      else if (currentSrc) _start(currentSrc, currentVol);
      _updateMediaSession(true);
    } else {
      if (audio) _fadeOut(audio, () => {});
      _updateMediaSession(false);
    }
    return on;
  }

  function isOn() { return on; }

  // Retry on first user gesture — browser autoplay policy
  document.addEventListener('pointerdown', () => {
    if (on && audio && audio.paused && !_pausedForVisibility) _fadeIn(audio, currentVol);
  }, { once: true });

  // Pause music when tab/window is hidden, resume when restored
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (on && audio && !audio.paused) {
        _fadeOut(audio, () => {});
        _pausedForVisibility = true;
      }
    } else {
      if (_pausedForVisibility) {
        _pausedForVisibility = false;
        if (on && audio) _fadeIn(audio, currentVol);
      }
    }
  });

  return { play, toggle, isOn };
})();
