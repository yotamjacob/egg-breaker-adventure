// ============================================================
//  Egg Smash Adventures — pixel icons (runtime)
//  pxicons.js  (bundled right after pxicons-map.js, before anything renders)
//
//  Replaces emoji characters in the DOM with pixel-art sprites at runtime.
//  Nothing in the render code changes: the emoji strings stay as the source
//  of truth (and the fallback). A MutationObserver on <body> wraps every
//  emoji text node it can find in <i class="px px16" data-e="…"> pointing at
//  a cell of img/px{12,16,24,32}.png (built by tools/build-icons.js from
//  Twemoji, CC-BY 4.0). Sheet size is chosen from the parent's font-size so
//  the pixel art is never scaled by a non-integer factor.
//
//  ROLLBACK: CONFIG.pixelIcons = false → this file does nothing and every
//  emoji renders as before. Git tag `pre-pixel-icons` is the full restore.
//
//  Skipped: <svg>, <canvas>, <script>, <style>, form fields, and any element
//  (or ancestor) carrying data-nopx.
// ============================================================
(function () {
  if (typeof CONFIG === 'undefined' || !CONFIG.pixelIcons) return;
  if (typeof PX_ICON_MAP === 'undefined' || typeof PX_ICON_COLS === 'undefined') return;

  const RE = /(?:\p{Extended_Pictographic}|[#*0-9]️⃣)(?:️|⃣|[\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic})*/gu;
  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CANVAS: 1, NOSCRIPT: 1, TITLE: 1, svg: 1, SVG: 1 };
  const SIZES = [12, 16, 24, 32];

  // Lookup tolerant to the VS16 selector (⚙ vs ⚙️): the map keys are whatever
  // the sources contain; runtime text may carry either form.
  const MAP = {};
  for (const k in PX_ICON_MAP) { MAP[k] = PX_ICON_MAP[k]; MAP[k.replace(/️/g, '')] = PX_ICON_MAP[k]; }
  function lookup(e) {
    if (e in MAP) return MAP[e];
    const bare = e.replace(/️/g, '');
    if (bare in MAP) return MAP[bare];
    return undefined;
  }

  function sizeFor(el) {
    let fs = 12;
    try { fs = parseFloat(getComputedStyle(el).fontSize) || 12; } catch (e) {}
    const want = fs * 1.35;
    for (const s of SIZES) if (want <= s + 2) return s;
    return 32;
  }
  function makeIcon(e, idx, size) {
    const i = document.createElement('i');
    i.className = 'px px' + size;
    i.setAttribute('data-e', e);
    i.setAttribute('role', 'img');
    i.setAttribute('aria-label', e);
    const col = idx % PX_ICON_COLS, row = Math.floor(idx / PX_ICON_COLS);
    i.style.backgroundPosition = (-col * size) + 'px ' + (-row * size) + 'px';
    return i;
  }
  function skipped(node) {
    for (let n = node.parentNode; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP_TAGS[n.tagName]) return true;
      if (n.namespaceURI && n.namespaceURI.indexOf('svg') !== -1) return true;
      if (n.hasAttribute('data-nopx')) return true;
    }
    return false;
  }
  function processText(tn) {
    const t = tn.nodeValue;
    if (!t || t.length < 1) return;
    RE.lastIndex = 0;
    if (!RE.test(t)) return;
    if (skipped(tn)) return;
    const parent = tn.parentNode;
    if (!parent) return;
    const size = sizeFor(parent);
    const frag = document.createDocumentFragment();
    let last = 0, any = false, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(t))) {
      const e = m[0];
      const idx = lookup(e);
      if (idx === undefined) continue;
      any = true;
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      frag.appendChild(makeIcon(e, idx, size));
      last = m.index + e.length;
    }
    if (!any) return;
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    parent.replaceChild(frag, tn);
  }
  function processTree(root) {
    if (root.nodeType === 3) { processText(root); return; }
    if (root.nodeType !== 1) return;
    if (SKIP_TAGS[root.tagName]) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; let n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (let i = 0; i < nodes.length; i++) processText(nodes[i]);
  }

  const mo = new MutationObserver(function (muts) {
    for (let i = 0; i < muts.length; i++) {
      const m = muts[i];
      if (m.type === 'characterData') processText(m.target);
      else for (let j = 0; j < m.addedNodes.length; j++) processTree(m.addedNodes[j]);
    }
  });
  function start() {
    try { processTree(document.body); } catch (e) {}
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  // Exposed for tests / manual re-pass
  window.__pxIcons = { processTree, lookup };
})();
