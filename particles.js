// ============================================================
//  Egg Smash Adventures – Particle System
//  particles.js  (requires config.js loaded first)
// ============================================================

const Particles = (() => {
  const MAX_PARTICLES = 300;
  let canvas, ctx, ps = [], running = false, _lastTick = 0;
  // Particle colors derived from egg registry
  const COLORS = {};
  CONFIG.eggTypes.forEach(function(def) { COLORS[def.id] = def.particles; });
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
  function emit(cx, cy, type, count) {
    const cols = COLORS[type] || COLORS.normal;
    const toAdd = Math.min(count, MAX_PARTICLES - ps.length);
    for (let i = 0; i < toAdd; i++) {
      const isSpark = i % 4 === 0; // mix 1-in-4 as bright sparkles
      const a = (Math.PI * 2 / count) * i + (Math.random() - .5) * .9;
      const sp = isSpark ? 5 + Math.random() * 6 : 4 + Math.random() * 7;
      ps.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp * (.8 + Math.random() * .5),
        vy: Math.sin(a) * sp - 2.5 - Math.random() * 3,
        life: 1, decay: isSpark ? .015 + Math.random() * .008 : .010 + Math.random() * .007,
        sz: isSpark ? 2 + Math.random() * 3 : 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2, rv: (Math.random() - .5) * .4,
        grav: .10 + Math.random() * .06,
        col: isSpark ? '#FFFFFF' : cols[Math.random() * cols.length | 0],
        sh: isSpark ? 'star' : 'shell',
      });
    }
    _tryStart();
  }
  function sparkle(cx, cy, count, col) {
    const toAdd = Math.min(count, MAX_PARTICLES - ps.length);
    for (let i = 0; i < toAdd; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
      ps.push({
        x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5,
        life: 1, decay: .014 + Math.random() * .012, sz: 2 + Math.random() * 3.5,
        rot: 0, rv: 0, grav: .025, col: col || '#FFD700', sh: 'star',
      });
    }
    _tryStart();
  }
  // ── Star rain (Starfall) ────────────────────────────────────────
  // A separate list so it is never starved by MAX_PARTICLES. Stars are
  // emitted over `durationMs`, fall with a gentle sway, spin, twinkle and
  // leave a short soft trail. Two depth layers: small dim stars in the back
  // fall faster and fainter; big bright ones in front carry the moment.
  // Motion is dt-scaled so 120 Hz screens are not twice as fast.
  let rain = [], rainW = 0, rainH = 0, rainEmitUntil = 0, rainPerMs = 0, rainAcc = 0, rainCol = null;
  function starRain(w, h, durationMs, count, colors) {
    rainW = w; rainH = h; rainCol = colors || null;
    rainEmitUntil = performance.now() + (durationMs || 1400);
    rainPerMs = (count || 80) / (durationMs || 1400);
    rainAcc = 1;   // first star this frame
    _tryStart();
  }
  function _spawnRainStar() {
    const back = Math.random() < .4;
    const cols = rainCol || (back ? ['#ffe9a3', '#fff3c4'] : ['#FFD700', '#ffe27a', '#fff8dc']);
    rain.push({
      x: Math.random() * (rainW + 60) - 30, y: -14 - Math.random() * 60,
      vy: back ? 3.2 + Math.random() * 1.6 : 4.4 + Math.random() * 2.6,
      sz: back ? 2.5 + Math.random() * 2.5 : 5 + Math.random() * 6,
      sway: 4 + Math.random() * 10, ph: Math.random() * Math.PI * 2, sp: .05 + Math.random() * .05,
      rot: Math.random() * Math.PI * 2, rv: (Math.random() - .5) * .12,
      tw: Math.random() * Math.PI * 2, back,
      col: cols[Math.random() * cols.length | 0],
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
  function _stepRain(dt, h) {
    const k = Math.min(3, dt / 16.667);
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
      // trail: soft line behind the star, fading out
      const tl = s.vy * (s.back ? 3 : 5);
      const g = ctx.createLinearGradient(s.x, s.y - tl, s.x, s.y);
      g.addColorStop(0, 'rgba(255,225,120,0)');
      g.addColorStop(1, 'rgba(255,225,120,' + (alpha * .55).toFixed(3) + ')');
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, s.sz * .45); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y - tl); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.translate(s.x, s.y);
      // halo
      ctx.globalAlpha = alpha * (s.back ? .06 : .13);
      ctx.fillStyle = '#FFE27A';
      ctx.beginPath(); ctx.arc(0, 0, s.sz * 1.5, 0, Math.PI * 2); ctx.fill();
      // star body + white core
      ctx.rotate(s.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.col; _drawStar(s.sz);
      if (!s.back) { ctx.globalAlpha = alpha * .9; ctx.fillStyle = '#FFFFFF'; _drawStar(s.sz * .42); }
      ctx.restore();
    }
  }
  function _busy() { return ps.length > 0 || rain.length > 0 || performance.now() < rainEmitUntil; }

  function resume() { resize(); running = false; _tryStart(); }
  function _tryStart() {
    if (!_busy() || document.hidden) return;
    if (!running || performance.now() - _lastTick > 500) { running = false; loop(); }
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
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
    if (rain.length || now < rainEmitUntil) _stepRain(dt, h);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.vx *= .98; p.vy += p.grav; p.x += p.vx; p.y += p.vy;
      p.rot += p.rv; p.life -= p.decay;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2.5);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      if (p.sh === 'shell') {
        // Pixel-art: draw as small squares
        const s = Math.round(p.sz);
        ctx.fillRect(-s, -s, s * 2, s * 2);
        // Dark pixel border
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.fillRect(-s, s, s * 2, 1);
        ctx.fillRect(s, -s, 1, s * 2);
      } else {
        // Pixel-art sparkle: cross/plus shape
        const s = Math.round(p.sz);
        ctx.fillRect(-1, -s, 2, s * 2); // vertical
        ctx.fillRect(-s, -1, s * 2, 2); // horizontal
      }
      ctx.restore();
    }
    if (_busy()) requestAnimationFrame(loop); else running = false;
  }
  return { init, emit, sparkle, starRain, resize, resume };
})();
