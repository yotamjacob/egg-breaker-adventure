// ============================================================
//  Egg Smash Adventures – Hammer SVG Definitions
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

    // ---- BAT: Actual bat creature on a dark handle — hardcore & scary ----
    case 'bat': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <!-- Dark leather-wrapped handle -->
      <rect x="19" y="0" width="6" height="50" rx="1" fill="#1a0f0f" stroke="#0a0808" stroke-width="1"/>
      <rect x="17" y="6"  width="10" height="2" fill="#2a1818"/>
      <rect x="17" y="12" width="10" height="2" fill="#120c0c"/>
      <rect x="17" y="18" width="10" height="2" fill="#2a1818"/>
      <rect x="17" y="24" width="10" height="2" fill="#120c0c"/>
      <rect x="17" y="30" width="10" height="2" fill="#2a1818"/>
      <rect x="17" y="36" width="10" height="2" fill="#120c0c"/>
      <rect x="17" y="42" width="10" height="2" fill="#2a1818"/>
      <!-- Metal pommel band -->
      <rect x="15" y="47" width="14" height="5" rx="1" fill="#2a1a2a" stroke="#1a0a1a" stroke-width="1"/>
      <!-- BAT WINGS — jagged membrane fingers -->
      <polygon points="22,56 2,62 0,71 5,68 2,79 8,73 6,85 13,77 14,91 20,81 22,70" fill="#130b18" stroke="#0a0510" stroke-width="1"/>
      <polygon points="22,56 42,62 44,71 39,68 42,79 36,73 38,85 31,77 30,91 24,81 22,70" fill="#130b18" stroke="#0a0510" stroke-width="1"/>
      <!-- Wing vein lines -->
      <line x1="22" y1="57" x2="3"  y2="67" stroke="#1e1228" stroke-width="1" opacity=".7"/>
      <line x1="22" y1="59" x2="7"  y2="76" stroke="#1e1228" stroke-width="1" opacity=".6"/>
      <line x1="22" y1="61" x2="13" y2="84" stroke="#1e1228" stroke-width="1" opacity=".5"/>
      <line x1="22" y1="57" x2="41" y2="67" stroke="#1e1228" stroke-width="1" opacity=".7"/>
      <line x1="22" y1="59" x2="37" y2="76" stroke="#1e1228" stroke-width="1" opacity=".6"/>
      <line x1="22" y1="61" x2="31" y2="84" stroke="#1e1228" stroke-width="1" opacity=".5"/>
      <!-- Bat body -->
      <ellipse cx="22" cy="72" rx="7" ry="9" fill="#100a14" stroke="#0a0510" stroke-width="1"/>
      <!-- Bat head -->
      <ellipse cx="22" cy="56" rx="7" ry="6" fill="#100a14" stroke="#0a0510" stroke-width="1"/>
      <!-- Pointy ears -->
      <polygon points="15,52 12,42 19,53" fill="#100a14" stroke="#0a0510" stroke-width="1"/>
      <polygon points="29,52 32,42 25,53" fill="#100a14" stroke="#0a0510" stroke-width="1"/>
      <polygon points="16,51 14,45 18,52" fill="#4a1a2a" opacity=".7"/>
      <polygon points="28,51 30,45 26,52" fill="#4a1a2a" opacity=".7"/>
      <!-- Red glowing eyes -->
      <ellipse cx="18" cy="56" rx="3"   ry="2.5" fill="#cc0000"/>
      <ellipse cx="26" cy="56" rx="3"   ry="2.5" fill="#cc0000"/>
      <ellipse cx="18" cy="56" rx="1.5" ry="1.2" fill="#ff6060"/>
      <ellipse cx="26" cy="56" rx="1.5" ry="1.2" fill="#ff6060"/>
      <ellipse cx="18" cy="56" rx="5"   ry="4"   fill="#ff0000" opacity=".25"/>
      <ellipse cx="26" cy="56" rx="5"   ry="4"   fill="#ff0000" opacity=".25"/>
      <!-- Nose -->
      <ellipse cx="22" cy="59" rx="2" ry="1" fill="#1a0a1a"/>
      <!-- Fangs -->
      <polygon points="20,62 19,68 21.5,62" fill="#eeeeee"/>
      <polygon points="24,62 25,68 22.5,62" fill="#eeeeee"/>
      <!-- Red glow emanation -->
      <ellipse cx="22" cy="60" rx="16" ry="14" fill="#ff0000" opacity=".06"/>
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

    // ---- GOLDEN: Ornate royal hammer — gold version of the default hammer ----
    case 'golden': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs>
        <linearGradient id="gh" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#8B6508"/><stop offset="35%" stop-color="#FFD700"/>
          <stop offset="65%" stop-color="#FFD700"/><stop offset="100%" stop-color="#8B6508"/>
        </linearGradient>
        <linearGradient id="gh-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFE44D"/><stop offset="50%" stop-color="#FFD700"/><stop offset="100%" stop-color="#A67C00"/>
        </linearGradient>
      </defs>
      <!-- Ornate gold handle -->
      <rect x="19" y="0" width="6" height="64" rx="1" fill="url(#gh)" stroke="#7A5806" stroke-width="1"/>
      <!-- Filigree bands -->
      <rect x="18" y="8"  width="8" height="1.5" rx=".5" fill="#FFE890"/>
      <rect x="18" y="16" width="8" height="1.5" rx=".5" fill="#FFE890"/>
      <rect x="18" y="24" width="8" height="1.5" rx=".5" fill="#FFE890"/>
      <rect x="18" y="32" width="8" height="1.5" rx=".5" fill="#FFE890"/>
      <rect x="18" y="40" width="8" height="1.5" rx=".5" fill="#FFE890"/>
      <rect x="18" y="48" width="8" height="1.5" rx=".5" fill="#FFE890"/>
      <rect x="18" y="56" width="8" height="1.5" rx=".5" fill="#FFE890"/>
      <!-- Diamond ornaments on handle -->
      <rect x="21" y="12" width="2.5" height="2.5" fill="#FFE890" transform="rotate(45 22 13)"/>
      <rect x="21" y="28" width="2.5" height="2.5" fill="#FFE890" transform="rotate(45 22 29)"/>
      <rect x="21" y="44" width="2.5" height="2.5" fill="#FFE890" transform="rotate(45 22 45)"/>
      <!-- Crown-like collar -->
      <polygon points="12,64 15,57 18,64 22,55 26,64 29,57 32,64" fill="#FFD700" stroke="#8B6508" stroke-width=".5"/>
      <rect x="12" y="62" width="20" height="8" rx="1" fill="#DAA520" stroke="#8B6508" stroke-width="1"/>
      <circle cx="16" cy="66" r="2" fill="#ff4444"/>
      <circle cx="22" cy="66" r="2" fill="#60a5fa"/>
      <circle cx="28" cy="66" r="2" fill="#4ade80"/>
      <rect x="13" y="63" width="18" height="1" fill="#FFE44D" opacity=".5"/>
      <!-- GOLDEN HAMMER HEAD -->
      <rect x="2"  y="68" width="40" height="24" rx="2" fill="url(#gh-head)" stroke="#7A5806" stroke-width="1.5"/>
      <!-- Top bevel -->
      <rect x="2"  y="68" width="40" height="7"  rx="2" fill="#FFE44D"/>
      <rect x="4"  y="70" width="36" height="2"       fill="#FFF4A0" opacity=".6"/>
      <!-- Side shading -->
      <rect x="2"  y="68" width="5"  height="24" fill="#DAA520" opacity=".5"/>
      <rect x="37" y="68" width="5"  height="24" fill="#8B6508" opacity=".6"/>
      <!-- Engraved cross on face -->
      <rect x="20" y="72" width="4"  height="16" fill="#8B6508" opacity=".28"/>
      <rect x="12" y="77" width="20" height="4"  fill="#8B6508" opacity=".28"/>
      <!-- Bottom striking face -->
      <rect x="2"  y="86" width="40" height="6"  rx="1" fill="#A67C00" stroke="#7A5806" stroke-width=".5"/>
      <rect x="4"  y="87" width="36" height="2"       fill="#D4A017" opacity=".4"/>
      <!-- Corner gold rivets -->
      <circle cx="8"  cy="72" r="3" fill="#FFE44D" stroke="#8B6508" stroke-width="1"/>
      <circle cx="36" cy="72" r="3" fill="#FFE44D" stroke="#8B6508" stroke-width="1"/>
      <circle cx="8"  cy="85" r="3" fill="#FFE44D" stroke="#8B6508" stroke-width="1"/>
      <circle cx="36" cy="85" r="3" fill="#FFE44D" stroke="#8B6508" stroke-width="1"/>
      <circle cx="7"  cy="71" r="1" fill="#fff" opacity=".5"/>
      <circle cx="35" cy="71" r="1" fill="#fff" opacity=".5"/>
      <!-- Golden aura -->
      <ellipse cx="22" cy="80" rx="20" ry="14" fill="#FFD700" opacity=".06"/>
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

    // ---- CUCUMBER: A cucumber on a stick ----
    case 'cucumber': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs>
        <linearGradient id="cuke-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#3A8018"/><stop offset="30%" stop-color="#5AAA30"/>
          <stop offset="65%" stop-color="#6ABB40"/><stop offset="100%" stop-color="#3A8018"/>
        </linearGradient>
      </defs>
      <!-- Wooden stick handle -->
      <rect x="19" y="0" width="6" height="54" rx="1" fill="#7B4C14" stroke="#5A3610" stroke-width="1"/>
      <line x1="21" y1="4" x2="21" y2="48" stroke="#6B3C10" stroke-width=".5" opacity=".5"/>
      <line x1="23" y1="8" x2="23" y2="46" stroke="#8B5C20" stroke-width=".5" opacity=".3"/>
      <!-- Knot marks -->
      <rect x="18" y="16" width="8" height="2" rx="1" fill="#5A3610"/>
      <rect x="18" y="34" width="8" height="2" rx="1" fill="#5A3610"/>
      <!-- Collar -->
      <rect x="15" y="52" width="14" height="6" rx="1" fill="#4A7A20" stroke="#2E5A10" stroke-width="1"/>
      <rect x="16" y="53" width="12" height="2" fill="#6AAA30" opacity=".5"/>
      <!-- Stem nub -->
      <ellipse cx="22" cy="60" rx="5" ry="2.5" fill="#2E6010" stroke="#1E4010" stroke-width=".5"/>
      <!-- CUCUMBER BODY -->
      <ellipse cx="22" cy="79" rx="13" ry="20" fill="url(#cuke-g)" stroke="#2E6010" stroke-width="1.5"/>
      <!-- Belly highlight -->
      <ellipse cx="16" cy="76" rx="6" ry="13" fill="#80CC50" opacity=".35"/>
      <!-- Blossom tip -->
      <ellipse cx="22" cy="97" rx="6"  ry="3"  fill="#2E6010"/>
      <ellipse cx="22" cy="96" rx="4"  ry="2"  fill="#3A7020" opacity=".7"/>
      <!-- Characteristic bumps -->
      <circle cx="13" cy="68" r="2"   fill="#2E6010" opacity=".6"/>
      <circle cx="31" cy="65" r="2"   fill="#2E6010" opacity=".5"/>
      <circle cx="10" cy="80" r="2"   fill="#2E6010" opacity=".5"/>
      <circle cx="34" cy="77" r="2"   fill="#2E6010" opacity=".5"/>
      <circle cx="12" cy="91" r="1.5" fill="#2E6010" opacity=".45"/>
      <circle cx="32" cy="88" r="1.5" fill="#2E6010" opacity=".4"/>
      <circle cx="22" cy="72" r="1.5" fill="#2E6010" opacity=".4"/>
      <!-- Highlight stripe -->
      <ellipse cx="15" cy="75" rx="3" ry="11" fill="#90D060" opacity=".4"/>
    </svg>`;

    // ---- MJǪLLNIR: The Asgardian warhammer ----
    case 'mjolnir': return `<svg width="40" height="90" viewBox="0 0 44 100" ${S}>
      <defs>
        <linearGradient id="mj-iron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#68687c"/><stop offset="45%" stop-color="#38384c"/><stop offset="100%" stop-color="#18181e"/>
        </linearGradient>
        <linearGradient id="mj-bolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e8f4ff"/><stop offset="50%" stop-color="#88b8ff"/><stop offset="100%" stop-color="#4070e0"/>
        </linearGradient>
      </defs>
      <!-- Short leather-wrapped handle -->
      <rect x="18" y="0" width="8" height="36" rx="1" fill="#5a3a1e" stroke="#2a1808" stroke-width="1"/>
      <rect x="17" y="4"  width="10" height="2" fill="#7a4a28"/><rect x="17" y="8"  width="10" height="2" fill="#3a2010"/>
      <rect x="17" y="12" width="10" height="2" fill="#7a4a28"/><rect x="17" y="16" width="10" height="2" fill="#3a2010"/>
      <rect x="17" y="20" width="10" height="2" fill="#7a4a28"/><rect x="17" y="24" width="10" height="2" fill="#3a2010"/>
      <rect x="17" y="28" width="10" height="2" fill="#7a4a28"/><rect x="17" y="32" width="10" height="2" fill="#3a2010"/>
      <!-- Wrist loop -->
      <ellipse cx="22" cy="1" rx="4" ry="2" fill="none" stroke="#a07840" stroke-width="1.5"/>
      <!-- Guard / collar -->
      <rect x="10" y="34" width="24" height="8" rx="1" fill="#44406a" stroke="#24204a" stroke-width="1"/>
      <rect x="12" y="36" width="20" height="2" fill="#6860a0" opacity=".5"/>
      <rect x="10" y="40" width="24" height="2" fill="#1e1c38"/>
      <!-- MASSIVE head -->
      <rect x="1" y="42" width="42" height="50" rx="2" fill="url(#mj-iron)" stroke="#0c0c18" stroke-width="1.5"/>
      <!-- Top bevel -->
      <rect x="1" y="42" width="42" height="6" rx="2" fill="#727286"/>
      <rect x="3" y="43" width="38" height="2" fill="#9090a8" opacity=".4"/>
      <!-- Side shading -->
      <rect x="1" y="42" width="5" height="50" fill="#545468"/>
      <rect x="38" y="42" width="5" height="50" fill="#161620"/>
      <!-- Bottom striking face -->
      <rect x="1" y="85" width="42" height="7" rx="1" fill="#1e1e28"/>
      <!-- Norse border runes -->
      <rect x="4" y="46" width="36" height="1" fill="#6070c8" opacity=".6"/>
      <rect x="4" y="83" width="36" height="1" fill="#6070c8" opacity=".5"/>
      <rect x="4" y="46" width="1" height="38" fill="#6070c8" opacity=".6"/>
      <rect x="39" y="46" width="1" height="38" fill="#6070c8" opacity=".5"/>
      <!-- Rune tick marks -->
      <rect x="11" y="46" width="1" height="3" fill="#8898e0" opacity=".7"/>
      <rect x="19" y="46" width="1" height="3" fill="#8898e0" opacity=".7"/>
      <rect x="27" y="46" width="1" height="3" fill="#8898e0" opacity=".7"/>
      <rect x="35" y="46" width="1" height="3" fill="#8898e0" opacity=".7"/>
      <!-- Lightning bolt glow -->
      <ellipse cx="22" cy="66" rx="8" ry="14" fill="#4080ff" opacity=".2"/>
      <!-- Lightning bolt -->
      <polygon points="22,52 15,67 21,67 17,82 29,65 23,65 27,52" fill="url(#mj-bolt)" stroke="#3060c8" stroke-width=".5"/>
      <!-- Bolt bright core -->
      <polygon points="22,54 17,67 21,67 18.5,80 27,66 22.5,66 25.5,54" fill="#dff0ff" opacity=".55"/>
      <!-- Electric sparks -->
      <rect x="7"  y="50" width="2" height="2" fill="#a0c8ff" opacity=".9"/>
      <rect x="33" y="55" width="2" height="2" fill="#a0c8ff" opacity=".8"/>
      <rect x="6"  y="70" width="2" height="2" fill="#a0c8ff" opacity=".8"/>
      <rect x="35" y="74" width="2" height="2" fill="#a0c8ff" opacity=".7"/>
      <rect x="10" y="82" width="2" height="2" fill="#a0c8ff" opacity=".7"/>
      <rect x="30" y="48" width="2" height="2" fill="#c8e0ff" opacity=".6"/>
      <!-- Arc lines -->
      <line x1="5" y1="60" x2="10" y2="57" stroke="#7090d8" stroke-width="1" opacity=".6"/>
      <line x1="39" y1="65" x2="34" y2="62" stroke="#7090d8" stroke-width="1" opacity=".6"/>
      <!-- Corner rivets -->
      <circle cx="7"  cy="48" r="2.5" fill="#707088" stroke="#30304a" stroke-width=".5"/>
      <circle cx="37" cy="48" r="2.5" fill="#707088" stroke="#30304a" stroke-width=".5"/>
      <circle cx="7"  cy="84" r="2.5" fill="#707088" stroke="#30304a" stroke-width=".5"/>
      <circle cx="37" cy="84" r="2.5" fill="#707088" stroke="#30304a" stroke-width=".5"/>
      <!-- Overall electric blue glow -->
      <ellipse cx="22" cy="66" rx="18" ry="22" fill="#3060e0" opacity=".08"/>
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
