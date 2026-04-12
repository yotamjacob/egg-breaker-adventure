// ============================================================
//  Egg Breaker Adventures – Hammer SVG Definitions
//  hammers.js  (uses $id and G from game.js at runtime)
// ============================================================

// ==================== HAMMER CURSOR VISUALS ====================
function makeHammerSVG(hammerId) {
  const S = 'shape-rendering="crispEdges"';
  switch (hammerId) {

    // ---- DRUMSTICK: A giant turkey leg ----
    case 'drumstick': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <!-- Bone handle -->
      <rect x="18" y="0" width="8" height="58" rx="1" fill="#F5F0DC" stroke="#D4C9A8" stroke-width="1"/>
      <circle cx="22" cy="3" r="5" fill="#F5F0DC" stroke="#D4C9A8" stroke-width="1"/>
      <circle cx="22" cy="3" r="2" fill="#E8E0C8"/>
      <!-- Joint -->
      <ellipse cx="22" cy="56" rx="7" ry="5" fill="#D4A860" stroke="#B8862E" stroke-width="1"/>
      <!-- Meat -->
      <ellipse cx="22" cy="76" rx="16" ry="20" fill="#C8642A" stroke="#8B4513" stroke-width="1.5"/>
      <ellipse cx="22" cy="72" rx="13" ry="14" fill="#E87830"/>
      <ellipse cx="17" cy="68" rx="5" ry="7" fill="#F09848" opacity=".6"/>
      <!-- Crispy bits -->
      <rect x="10" y="82" width="4" height="3" rx="1" fill="#A04818"/>
      <rect x="28" y="78" width="4" height="3" rx="1" fill="#A04818"/>
      <rect x="18" y="90" width="5" height="3" rx="1" fill="#A04818"/>
    </svg>`;

    // ---- BAT: Sleek dark batmobile-inspired weapon ----
    case 'bat': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs><linearGradient id="bat-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a3a50"/><stop offset="100%" stop-color="#0f0f1e"/>
      </linearGradient></defs>
      <!-- Carbon fiber handle -->
      <rect x="19" y="0" width="6" height="60" fill="#1a1a2e" stroke="#0a0a18" stroke-width="1"/>
      <rect x="20" y="5" width="1" height="50" fill="#2a2a40" opacity=".5"/>
      <rect x="23" y="5" width="1" height="50" fill="#2a2a40" opacity=".3"/>
      <!-- Grip rings -->
      <rect x="17" y="10" width="10" height="2" fill="#3a3a50"/>
      <rect x="17" y="16" width="10" height="2" fill="#3a3a50"/>
      <rect x="17" y="22" width="10" height="2" fill="#3a3a50"/>
      <!-- Bat wing head -->
      <polygon points="22,58 0,72 4,82 14,78 22,92 30,78 40,82 44,72 22,58" fill="url(#bat-g)" stroke="#0a0a18" stroke-width="1.5"/>
      <!-- Wing membrane lines -->
      <line x1="22" y1="62" x2="6" y2="74" stroke="#2a2a3e" stroke-width="1"/>
      <line x1="22" y1="62" x2="38" y2="74" stroke="#2a2a3e" stroke-width="1"/>
      <line x1="22" y1="62" x2="14" y2="78" stroke="#1a1a30" stroke-width="1"/>
      <line x1="22" y1="62" x2="30" y2="78" stroke="#1a1a30" stroke-width="1"/>
      <!-- Eyes -->
      <ellipse cx="16" cy="72" rx="3" ry="2" fill="#ff3030"/>
      <ellipse cx="28" cy="72" rx="3" ry="2" fill="#ff3030"/>
      <ellipse cx="16" cy="72" rx="1.5" ry="1" fill="#ff8080"/>
      <ellipse cx="28" cy="72" rx="1.5" ry="1" fill="#ff8080"/>
      <!-- Glow -->
      <ellipse cx="22" cy="75" rx="10" ry="8" fill="#ff3030" opacity=".08"/>
    </svg>`;

    // ---- CRYSTAL: Magical floating crystal mace ----
    case 'crystal': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs><linearGradient id="crys-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#C9B0FF"/><stop offset="50%" stop-color="#9B7ED8"/><stop offset="100%" stop-color="#6B4E9B"/>
      </linearGradient></defs>
      <!-- Ornate staff -->
      <rect x="19" y="0" width="6" height="60" fill="#6B4E9B" stroke="#4B3070" stroke-width="1"/>
      <!-- Staff wrapping -->
      <rect x="18" y="8" width="8" height="2" fill="#9B7ED8" opacity=".6"/>
      <rect x="18" y="14" width="8" height="2" fill="#9B7ED8" opacity=".6"/>
      <rect x="18" y="20" width="8" height="2" fill="#9B7ED8" opacity=".6"/>
      <!-- Crystal holder ring -->
      <ellipse cx="22" cy="58" rx="10" ry="4" fill="#7B5EAB" stroke="#4B3070" stroke-width="1"/>
      <!-- Main crystal -->
      <polygon points="22,52 8,72 14,96 30,96 36,72" fill="url(#crys-g)" stroke="#7B5EB8" stroke-width="1.5"/>
      <!-- Crystal facets -->
      <polygon points="22,56 14,72 22,88" fill="#B090E8" opacity=".4"/>
      <polygon points="22,56 30,72 22,88" fill="#8060C0" opacity=".3"/>
      <!-- Inner glow -->
      <ellipse cx="22" cy="76" rx="6" ry="10" fill="#E0D0FF" opacity=".25"/>
      <!-- Sparkle points -->
      <rect x="15" y="66" width="2" height="2" fill="#fff" opacity=".7"/>
      <rect x="26" y="74" width="2" height="2" fill="#fff" opacity=".6"/>
      <rect x="20" y="82" width="2" height="2" fill="#fff" opacity=".5"/>
      <!-- Magic glow -->
      <ellipse cx="22" cy="76" rx="14" ry="18" fill="#9B7ED8" opacity=".1"/>
    </svg>`;

    // ---- GOLDEN: Royal scepter with golden orb ----
    case 'golden': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs><radialGradient id="gold-orb">
        <stop offset="0%" stop-color="#FFE44D"/><stop offset="60%" stop-color="#FFD700"/><stop offset="100%" stop-color="#B8860B"/>
      </radialGradient></defs>
      <!-- Royal staff -->
      <rect x="19" y="0" width="6" height="56" fill="#DAA520" stroke="#8B6508" stroke-width="1"/>
      <!-- Gold filigree -->
      <rect x="17" y="6" width="10" height="3" rx="1" fill="#FFD700"/>
      <rect x="17" y="14" width="10" height="3" rx="1" fill="#FFD700"/>
      <rect x="16" y="22" width="12" height="3" rx="1" fill="#FFD700"/>
      <!-- Crown base -->
      <polygon points="10,56 22,48 34,56 32,62 12,62" fill="#DAA520" stroke="#8B6508" stroke-width="1"/>
      <!-- Crown prongs -->
      <rect x="12" y="50" width="3" height="8" fill="#FFD700"/>
      <rect x="20" y="46" width="4" height="10" fill="#FFD700"/>
      <rect x="29" y="50" width="3" height="8" fill="#FFD700"/>
      <!-- Jewels on crown -->
      <circle cx="13" cy="51" r="2" fill="#ff3030"/>
      <circle cx="22" cy="47" r="2.5" fill="#60a5fa"/>
      <circle cx="31" cy="51" r="2" fill="#4ade80"/>
      <!-- Golden orb -->
      <circle cx="22" cy="78" r="18" fill="url(#gold-orb)" stroke="#8B6508" stroke-width="1.5"/>
      <ellipse cx="18" cy="72" rx="5" ry="6" fill="#FFE44D" opacity=".35"/>
      <!-- Cross on top of orb -->
      <rect x="20" y="62" width="4" height="12" fill="#B8860B"/>
      <rect x="16" y="66" width="12" height="3" fill="#B8860B"/>
      <!-- Shine -->
      <circle cx="16" cy="70" r="2" fill="#fff" opacity=".3"/>
    </svg>`;

    // ---- RAINBOW: Prismatic warhammer with swirling colors ----
    case 'rainbow': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs>
        <linearGradient id="rb-h" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ff6b6b"/><stop offset="25%" stop-color="#ffd700"/>
          <stop offset="50%" stop-color="#4ade80"/><stop offset="75%" stop-color="#60a5fa"/>
          <stop offset="100%" stop-color="#c084fc"/>
        </linearGradient>
        <linearGradient id="rb-head" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff6b6b"/><stop offset="20%" stop-color="#ffa500"/>
          <stop offset="40%" stop-color="#ffd700"/><stop offset="60%" stop-color="#4ade80"/>
          <stop offset="80%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#c084fc"/>
        </linearGradient>
      </defs>
      <!-- Rainbow handle -->
      <rect x="19" y="0" width="6" height="62" fill="url(#rb-h)" stroke="#888" stroke-width="1"/>
      <!-- Stars on handle -->
      <rect x="20" y="8" width="3" height="3" fill="#fff" opacity=".5"/>
      <rect x="21" y="20" width="3" height="3" fill="#fff" opacity=".4"/>
      <rect x="20" y="34" width="3" height="3" fill="#fff" opacity=".5"/>
      <rect x="21" y="46" width="3" height="3" fill="#fff" opacity=".3"/>
      <!-- Collar -->
      <ellipse cx="22" cy="60" rx="8" ry="4" fill="url(#rb-head)" stroke="#888" stroke-width="1"/>
      <!-- Hammer head - chunky warhammer shape -->
      <rect x="0" y="64" width="44" height="20" rx="2" fill="url(#rb-head)" stroke="#888" stroke-width="1.5"/>
      <!-- Facet lines -->
      <rect x="0" y="72" width="44" height="2" fill="rgba(255,255,255,.2)"/>
      <rect x="0" y="64" width="44" height="4" fill="rgba(255,255,255,.15)"/>
      <!-- Side spikes -->
      <polygon points="0,68 -4,74 0,80" fill="url(#rb-head)" stroke="#888" stroke-width="1"/>
      <polygon points="44,68 48,74 44,80" fill="url(#rb-head)" stroke="#888" stroke-width="1"/>
      <!-- Bottom face -->
      <rect x="2" y="84" width="40" height="8" rx="1" fill="url(#rb-head)" stroke="#888" stroke-width="1"/>
      <rect x="4" y="86" width="36" height="4" fill="rgba(255,255,255,.15)"/>
      <!-- Sparkle -->
      <rect x="6" y="67" width="2" height="2" fill="#fff" opacity=".6"/>
      <rect x="34" y="70" width="2" height="2" fill="#fff" opacity=".5"/>
      <rect x="18" y="87" width="2" height="2" fill="#fff" opacity=".5"/>
      <!-- Glow -->
      <ellipse cx="22" cy="76" rx="18" ry="14" fill="#ffd700" opacity=".06"/>
    </svg>`;

    // ---- CUCUMBER: A mighty cucumber ----
    case 'cucumber': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <!-- Stem handle -->
      <rect x="19" y="0" width="6" height="50" rx="2" fill="#2E7D32" stroke="#1B5E20" stroke-width="1"/>
      <rect x="20" y="5" width="1" height="40" fill="#43A047" opacity=".4"/>
      <rect x="23" y="8" width="1" height="35" fill="#388E3C" opacity=".3"/>
      <!-- Leaf at grip -->
      <ellipse cx="16" cy="12" rx="6" ry="3" fill="#4CAF50" stroke="#2E7D32" stroke-width=".5" transform="rotate(-20 16 12)"/>
      <ellipse cx="28" cy="18" rx="5" ry="3" fill="#4CAF50" stroke="#2E7D32" stroke-width=".5" transform="rotate(15 28 18)"/>
      <!-- Cucumber body (head) -->
      <rect x="4" y="48" width="36" height="44" rx="16" fill="#4CAF50" stroke="#2E7D32" stroke-width="1.5"/>
      <!-- Lighter belly -->
      <rect x="10" y="52" width="24" height="36" rx="12" fill="#66BB6A" opacity=".6"/>
      <!-- Bumps/texture -->
      <circle cx="12" cy="58" r="2" fill="#388E3C" opacity=".5"/>
      <circle cx="30" cy="62" r="2" fill="#388E3C" opacity=".5"/>
      <circle cx="16" cy="72" r="2" fill="#388E3C" opacity=".5"/>
      <circle cx="28" cy="78" r="2" fill="#388E3C" opacity=".5"/>
      <circle cx="20" cy="84" r="1.5" fill="#388E3C" opacity=".4"/>
      <!-- Highlight -->
      <rect x="14" y="54" width="3" height="14" rx="1" fill="#81C784" opacity=".5"/>
      <!-- Sparkle (it's special!) -->
      <rect x="32" cy="55" width="2" height="2" fill="#fff" opacity=".6"/>
      <rect x="10" cy="80" width="2" height="2" fill="#fff" opacity=".5"/>
    </svg>`;

    // ---- DEFAULT: Basic wooden hammer ----
    default: return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <!-- Wooden handle -->
      <rect x="19" y="0" width="6" height="74" rx="1" fill="#8B4513" stroke="#6B3410" stroke-width="1"/>
      <!-- Wood grain -->
      <line x1="21" y1="4" x2="21" y2="68" stroke="#7a3c10" stroke-width=".5" opacity=".4"/>
      <line x1="23" y1="8" x2="23" y2="60" stroke="#9a5c20" stroke-width=".5" opacity=".3"/>
      <!-- Iron collar -->
      <rect x="17" y="60" width="10" height="10" rx="1" fill="#7a5c1e" stroke="#5a3c0e" stroke-width="1"/>
      <rect x="18" y="62" width="8" height="2" fill="#9a7c3e" opacity=".5"/>
      <!-- Iron head -->
      <rect x="2" y="68" width="40" height="24" rx="2" fill="#585858" stroke="#383838" stroke-width="1"/>
      <!-- Top bevel -->
      <rect x="2" y="68" width="40" height="9" rx="2" fill="#7a7a7a"/>
      <rect x="4" y="70" width="36" height="3" fill="#8a8a8a" opacity=".4"/>
      <!-- Bottom face -->
      <rect x="2" y="86" width="40" height="6" rx="1" fill="#666"/>
      <!-- Rivets -->
      <circle cx="8" cy="73" r="2" fill="#5a5a5a" stroke="#444" stroke-width=".5"/>
      <circle cx="36" cy="73" r="2" fill="#5a5a5a" stroke="#444" stroke-width=".5"/>
      <circle cx="8" cy="86" r="2" fill="#5a5a5a" stroke="#444" stroke-width=".5"/>
      <circle cx="36" cy="86" r="2" fill="#5a5a5a" stroke="#444" stroke-width=".5"/>
    </svg>`;
  }
}

function updateHammerSVG() {
  $id('hammer').innerHTML = makeHammerSVG(G.hammer);
}
