// ============================================================
//  Egg Smash Adventures – Particle System
//  particles.js  (requires config.js loaded first)
//
//  One canvas (#particle-canvas, over the egg tray), one rAF loop, several
//  particle families:
//    emit()      egg-break burst — shell shards + glowing sparks (the classic
//                effect, dt-scaled with drag/tumble/shrink easing)
//    sparkle()   glowing star burst (prizes, item finds)
//    starRain()  Starfall — a rain of stars across the tray
//    confetti()  Banana Shake — radial confetti + sparks + ring
//    setAmbient('rage'|'goose'|null) — continuous emitters while a skill is
//                active: rising embers / drifting gold dust
//  All motion is dt-scaled (k = dt/16.667) so 120 Hz screens are not twice
//  as fast, and everything eases out rather than popping away.
// ============================================================

const Particles = (() => {
  const MAX_PARTICLES = 420;
  let canvas, ctx, ps = [], running = false, _lastTick = 0;
  // Particle colors derived from egg registry
  const COLORS = {};
  CONFIG.eggTypes.forEach(function(def) { COLORS[def.id] = def.particles; });
  const R = Math.random;

  function init(c) { canvas = c; ctx = c.getContext('2d'); resize(); window.addEventListener('resize', resize); }
  function resize() {
    if (!canvas || !canvas.parentElement) return;
    const r = canvas.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    // Panel is collapsed (flex:0 0 0 when tab is hidden) — skip to avoid zeroing the canvas.
    // Without this guard a window resize while on another tab sets canvas to 0×0 and
    // particles become invisible when the user returns to the play tab.
    if (r.width === 0 || r.height === 0) return;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function _push(p) { if (ps.length < MAX_PARTICLES) ps.push(p); }

  // ── Egg break ────────────────────────────────────────────────────
  function emit(cx, cy, type, count) {
    const cols = COLORS[type] || COLORS.normal;
    // shell shards — pixel squares, radial spread, drag + gravity, tumble
    const shards = Math.max(4, Math.round(count * .7));
    for (let i = 0; i < shards; i++) {
      const a = (Math.PI * 2 / shards) * i + (R() - .5) * .9;
      const sp = 3.5 + R() * 6.5;
      _push({
        sh: 'shell', x: cx, y: cy,
        vx: Math.cos(a) * sp * (.8 + R() * .5), vy: Math.sin(a) * sp - 2.5 - R() * 3,
        life: 1, decay: .010 + R() * .007, sz: 3.5 + R() * 5.5,
        rot: R() * Math.PI * 2, rv: (R() - .5) * .35, grav: .11 + R() * .06, drag: .975,
        col: cols[R() * cols.length | 0],
      });
    }
    // sparks — additive glowing stars, faster, shorter
    const sparks = Math.max(3, Math.round(count * .45));
    for (let i = 0; i < sparks; i++) {
      const a = R() * Math.PI * 2, sp = 5 + R() * 7;
      _push({
        sh: 'star', add: true, x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 1, decay: .022 + R() * .014,
        sz: 2 + R() * 3, rot: R() * Math.PI, rv: (R() - .5) * .3, grav: .06, drag: .96,
        col: i % 3 === 0 ? '#FFFFFF' : '#FFE27A',
      });
    }
    _tryStart();
  }

  // ── Sparkle burst (prizes) ───────────────────────────────────────
  function sparkle(cx, cy, count, col) {
    for (let i = 0; i < count; i++) {
      const a = R() * Math.PI * 2, sp = 2 + R() * 5;
      _push({
        sh: 'star', add: true, x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5,
        life: 1, decay: .014 + R() * .012, sz: 2 + R() * 3.5,
        rot: R() * Math.PI, rv: (R() - .5) * .2, grav: .03, drag: .97, col: col || '#FFD700',
      });
    }
    _tryStart();
  }

  // ── Confetti burst (Banana Shake) ────────────────────────────────
  function confetti(cx, cy, colors, count) {
    const cols = colors || ['#FFE135', '#FFD700', '#FFF3B0', '#F5C542', '#FFFFFF'];
    _push({ sh: 'ring', x: cx, y: cy, r: 10, vr: 7, life: 1, decay: .05, col: '#FFE135', lw: 4 });
    for (let i = 0; i < (count || 70); i++) {
      const a = R() * Math.PI * 2, sp = 4 + R() * 9;
      _push({
        sh: 'paper', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4,
        life: 1, decay: .007 + R() * .006, w: 3 + R() * 4, hgt: 6 + R() * 6,
        rot: R() * Math.PI * 2, rv: (R() - .5) * .5, ph: R() * Math.PI * 2, grav: .12, drag: .965,
        col: cols[R() * cols.length | 0],
      });
    }
    for (let i = 0; i < 24; i++) {
      const a = R() * Math.PI * 2, sp = 6 + R() * 8;
      _push({ sh: 'star', add: true, x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 1, decay: .02 + R() * .012, sz: 2 + R() * 3, rot: 0, rv: .2, grav: .05, drag: .96, col: '#FFFFFF' });
    }
    _tryStart();
  }

  // ── Ambient emitters (skills) ────────────────────────────────────
  // rage: embers rising from the bottom, flickering orange/red.
  // goose: fine gold dust drifting down and swaying.
  let ambient = null, ambW = 0, ambH = 0, ambAcc = 0;
  function setAmbient(kind, w, h) {
    ambient = kind || null;
    if (w) ambW = w; if (h) ambH = h;
    if (ambient) _tryStart();
  }
  function _spawnAmbient() {
    if (ambient === 'rage') {
      _push({
        sh: 'ember', add: true, x: R() * ambW, y: ambH + 4 + R() * 10,
        vx: (R() - .5) * .4, vy: -(1.2 + R() * 1.8), life: 1, decay: .006 + R() * .006,
        sz: 1.5 + R() * 2.5, ph: R() * Math.PI * 2, tw: R() * Math.PI * 2, grav: -.004, drag: 1,
        col: ['#ff6b35', '#ff3b3b', '#ffb347', '#ffd27a'][R() * 4 | 0],
      });
    } else if (ambient === 'goose') {
      _push({
        sh: 'dust', add: true, x: R() * ambW, y: -6, vx: 0, vy: .5 + R() * .7,
        life: 1, decay: .0035 + R() * .003, sz: 1 + R() * 2.2, ph: R() * Math.PI * 2, tw: R() * Math.PI * 2, grav: 0, drag: 1,
        col: ['#FFD700', '#FFE27A', '#FFF6C8'][R() * 3 | 0],
      });
    }
  }
  const AMBIENT_RATE = { rage: .09, goose: .05 };   // particles per ms

  // ── Star rain (Starfall) ────────────────────────────────────────
  // A separate list so it is never starved by MAX_PARTICLES. Stars are
  // emitted over `durationMs`, fall with a gentle sway, spin, twinkle and
  // leave a short soft trail. Two depth layers: small dim stars in the back
  // fall faster and fainter; big bright ones in front carry the moment.
  let rain = [], rainW = 0, rainH = 0, rainEmitUntil = 0, rainPerMs = 0, rainAcc = 0, rainCol = null, rainX0 = null, rainX1 = null;
  function starRain(w, h, durationMs, count, colors, opts) {
    rainW = w; rainH = h; rainCol = colors || null;
    rainX0 = opts && opts.x0 != null ? opts.x0 : null;   // optional column: only rain between x0..x1
    rainX1 = opts && opts.x1 != null ? opts.x1 : null;
    rainEmitUntil = performance.now() + (durationMs || 1400);
    rainPerMs = (count || 80) / (durationMs || 1400);
    rainAcc = 1;   // first star this frame
    _tryStart();
  }
  function _spawnRainStar() {
    const back = R() < .4;
    const cols = rainCol || (back ? ['#ffe9a3', '#fff3c4'] : ['#FFD700', '#ffe27a', '#fff8dc']);
    const x = rainX0 != null ? rainX0 + R() * ((rainX1 != null ? rainX1 : rainW) - rainX0) : R() * (rainW + 60) - 30;
    rain.push({
      x, y: -14 - R() * 60,
      vy: back ? 4.2 + R() * 2 : 5.8 + R() * 3.2,
      sz: back ? 2.5 + R() * 2.5 : 5 + R() * 6,
      sway: 4 + R() * 10, ph: R() * Math.PI * 2, sp: .05 + R() * .05,
      rot: R() * Math.PI * 2, rv: (R() - .5) * .12,
      tw: R() * Math.PI * 2, back,
      col: cols[R() * cols.length | 0],
      a: back ? .55 : 1, t: 0,
    });
  }
  function _drawStar(r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
      if (i === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr); else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  function _stepRain(k, dt, h) {
    const now = performance.now();
    if (now < rainEmitUntil) {
      rainAcc += rainPerMs * dt;
      while (rainAcc >= 1) { rainAcc -= 1; _spawnRainStar(); }
    }
    for (let i = rain.length - 1; i >= 0; i--) {
      const s = rain[i];
      s.t += k; s.ph += s.sp * k; s.tw += .25 * k; s.rot += s.rv * k;
      s.y += s.vy * k;
      s.x += Math.cos(s.ph) * s.sway * .06 * k;
      if (s.y > h + 30) { rain.splice(i, 1); continue; }
      const fadeIn = Math.min(1, s.t / 8);
      const alpha = s.a * fadeIn * (.7 + .3 * Math.sin(s.tw));
      ctx.save();
      const tl = s.vy * (s.back ? 3 : 5);
      const g = ctx.createLinearGradient(s.x, s.y - tl, s.x, s.y);
      g.addColorStop(0, 'rgba(255,225,120,0)');
      g.addColorStop(1, 'rgba(255,225,120,' + (alpha * .55).toFixed(3) + ')');
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, s.sz * .45); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y - tl); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.translate(s.x, s.y);
      ctx.globalAlpha = alpha * (s.back ? .06 : .13);
      ctx.fillStyle = '#FFE27A';
      ctx.beginPath(); ctx.arc(0, 0, s.sz * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(s.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.col; _drawStar(s.sz);
      if (!s.back) { ctx.globalAlpha = alpha * .9; ctx.fillStyle = '#FFFFFF'; _drawStar(s.sz * .42); }
      ctx.restore();
    }
  }

  // ── Generic particle step/draw ───────────────────────────────────
  function _stepParticles(k, w, h) {
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      if (p.sh === 'ring') {
        p.r += p.vr * k; p.life -= p.decay * k;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life) * .85;
        ctx.strokeStyle = p.col; ctx.lineWidth = Math.max(1, p.lw * p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        continue;
      }
      // physics
      const drag = Math.pow(p.drag == null ? .98 : p.drag, k);
      p.vx *= drag; p.vy = p.vy * drag + (p.grav || 0) * k;
      p.x += p.vx * k; p.y += p.vy * k;
      if (p.ph != null) { p.ph += .08 * k; p.x += Math.sin(p.ph) * .35 * k; }
      if (p.tw != null) p.tw += .3 * k;
      if (p.rv) p.rot += p.rv * k;
      p.life -= p.decay * k;
      if (p.life <= 0 || p.y > h + 40 || p.y < -60) { ps.splice(i, 1); continue; }
      const life = p.life;
      let alpha = Math.min(1, life * 2.2);
      if (p.tw != null) alpha *= .6 + .4 * Math.sin(p.tw);
      ctx.save();
      if (p.add) ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.col;
      if (p.sh === 'shell') {
        // pixel-art shard: square with a dark edge, shrinking as it dies
        ctx.rotate(p.rot);
        const s = Math.max(1, Math.round(p.sz * (.55 + .45 * life)));
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        ctx.fillRect(-s, s - 1, s * 2, 1);
        ctx.fillRect(s - 1, -s, 1, s * 2);
      } else if (p.sh === 'star') {
        // glowing cross with a soft halo
        ctx.rotate(p.rot || 0);
        const s = Math.max(1, Math.round(p.sz));
        ctx.globalAlpha = alpha * .35;
        ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.fillRect(-1, -s, 2, s * 2);
        ctx.fillRect(-s, -1, s * 2, 2);
      } else if (p.sh === 'mote' || p.sh === 'dust' || p.sh === 'ember') {
        const s = p.sz;
        ctx.globalAlpha = alpha * .3;
        ctx.beginPath(); ctx.arc(0, 0, s * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
        if (p.sh === 'ember') { ctx.globalAlpha = alpha * .8; ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.arc(0, 0, s * .45, 0, Math.PI * 2); ctx.fill(); }
      } else if (p.sh === 'paper') {
        // confetti: a rectangle that flutters by scaling its width with a phase
        ctx.rotate(p.rot);
        const fl = Math.abs(Math.sin(p.ph * 2)) * .8 + .2;
        ctx.fillRect(-p.w * fl / 2, -p.hgt / 2, p.w * fl, p.hgt);
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        ctx.fillRect(-p.w * fl / 2, p.hgt / 2 - 1, p.w * fl, 1);
      }
      ctx.restore();
    }
  }

  function _busy() { return ps.length > 0 || rain.length > 0 || performance.now() < rainEmitUntil || !!ambient; }

  function resume() { resize(); running = false; _tryStart(); }
  function _tryStart() {
    if (!_busy() || document.hidden) return;
    if (!running || performance.now() - _lastTick > 500) { running = false; _lastTick = 0; loop(); }
  }
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) resume();
  });
  function loop() {
    if (document.hidden) { running = false; return; }
    running = true;
    const now = performance.now();
    const dt = _lastTick ? Math.min(100, now - _lastTick) : 16.667;
    _lastTick = now;
    const k = Math.min(3, dt / 16.667);
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
    if (ambient) {
      if (!ambW || !ambH) { ambW = w; ambH = h; }
      ambAcc += (AMBIENT_RATE[ambient] || 0) * dt;
      while (ambAcc >= 1) { ambAcc -= 1; _spawnAmbient(); }
    }
    if (rain.length || now < rainEmitUntil) _stepRain(k, dt, h);
    _stepParticles(k, w, h);
    if (_busy()) requestAnimationFrame(loop); else running = false;
  }
  return { init, emit, sparkle, starRain, confetti, setAmbient, resize, resume };
})();
