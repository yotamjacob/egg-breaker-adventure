// ============================================================
//  Egg Breaker Adventures – Audio
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
      if (n === 'hit')     { noise(.08, .2); tone(220, .06, .15, 'square'); tone(110, .04, .1, 'square'); }
      if (n === 'coin')    { tone(988, .08, .12, 'square'); setTimeout(() => tone(1319, .1, .1, 'square'), 50); }
      if (n === 'gem')     { tone(1047, .06, .1, 'square'); setTimeout(() => tone(1319, .06, .08, 'square'), 40); setTimeout(() => tone(1568, .12, .07, 'triangle'), 80); }
      if (n === 'star')    { tone(784, .08, .1, 'square'); setTimeout(() => tone(988, .08, .08, 'square'), 60); setTimeout(() => tone(1319, .12, .07, 'triangle'), 120); }
      if (n === 'item')    { [0,70,140].forEach((t, i) => setTimeout(() => tone(523 + i * 262, .1, .1, 'square'), t)); }
      if (n === 'empty')   { tone(165, .12, .1, 'square'); setTimeout(() => tone(131, .1, .08, 'square'), 60); }
      if (n === 'starfall'){ [0,50,100,150,200,250].forEach((t, i) => setTimeout(() => tone(440 * Math.pow(2, i / 5), .15, .1, 'square'), t)); }
      if (n === 'levelup') { [0,80,160,240].forEach((t, i) => setTimeout(() => tone(523 * Math.pow(2, i / 4), .18, .1, 'square'), t)); }
      if (n === 'achieve') { tone(880, .1, .1, 'square'); setTimeout(() => tone(1047, .1, .09, 'square'), 80); setTimeout(() => tone(1319, .15, .08, 'triangle'), 160); }
      if (n === 'buy')     { tone(523, .06, .1, 'square'); setTimeout(() => tone(659, .08, .08, 'square'), 50); }
      if (n === 'err')     { tone(196, .1, .12, 'square'); setTimeout(() => tone(165, .08, .1, 'square'), 60); }
      if (n === 'tier')    { [0,70,140,210,280].forEach((t, i) => setTimeout(() => tone(523 * Math.pow(2, i / 6), .15, .1, 'square'), t)); }
    } catch (_) {}
  }
  return { play, toggle() { on = !on; return on; }, isOn() { return on; } };
})();

// ============================================================
//  Music Player — per-monkey looping tracks with fade in/out
// ============================================================
const MUSIC = (() => {
  const VOLUME   = 0.3;   // balanced against SFX oscillators
  const FADE_MS  = 700;   // fade duration in ms
  const STEP_MS  = 16;    // ~60 fps

  const TRACKS = {
    mr_monkey: 'audio/mrmonkey.mp3',
    steampunk:  'audio/steampunk.mp3',
    princess:   'audio/princess.mp3',
    space:      'audio/space.mp3',
    odin:       'audio/odin.mp3',
  };

  let audio      = null;
  let on         = true;
  let currentSrc = null;
  let _timer     = null;

  function _clearTimer() {
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  function _fadeIn(el) {
    _clearTimer();
    el.volume = 0;
    el.play().catch(() => {});
    const delta = VOLUME / (FADE_MS / STEP_MS);
    _timer = setInterval(() => {
      el.volume = Math.min(VOLUME, el.volume + delta);
      if (el.volume >= VOLUME) _clearTimer();
    }, STEP_MS);
  }

  function _fadeOut(el, done) {
    _clearTimer();
    const delta = (el.volume || VOLUME) / (FADE_MS / STEP_MS);
    _timer = setInterval(() => {
      el.volume = Math.max(0, el.volume - delta);
      if (el.volume <= 0) { _clearTimer(); el.pause(); if (done) done(); }
    }, STEP_MS);
  }

  function _start(src) {
    audio = new Audio(src);
    audio.loop = true;
    if (on) _fadeIn(audio);
  }

  function play(monkeyId) {
    const src = TRACKS[monkeyId];
    if (!src || currentSrc === src) return;
    currentSrc = src;
    if (audio && !audio.paused) {
      _fadeOut(audio, () => _start(src));
    } else {
      _start(src);
    }
  }

  function toggle() {
    on = !on;
    if (on) {
      if (audio) _fadeIn(audio);
      else if (currentSrc) _start(currentSrc);
    } else {
      if (audio) _fadeOut(audio, () => {});
    }
    return on;
  }

  function isOn() { return on; }

  // Retry on first user gesture — browser autoplay policy
  document.addEventListener('pointerdown', () => {
    if (on && audio && audio.paused) _fadeIn(audio);
  }, { once: true });

  return { play, toggle, isOn };
})();
