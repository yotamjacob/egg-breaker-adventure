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
    if (!canvas.parentElement) return;
    const r = canvas.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
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
  function resume() { _tryStart(); }
  function _tryStart() {
    if (ps.length === 0 || document.hidden) return;
    if (!running || performance.now() - _lastTick > 500) { running = false; loop(); }
  }
  function loop() {
    running = true;
    _lastTick = performance.now();
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
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
    if (ps.length > 0) requestAnimationFrame(loop); else running = false;
  }
  return { init, emit, sparkle, resize, resume };
})();
