// ============================================================
//  Egg Smash Adventures — Umami funnel reader
//
//  Prints the early-player funnel from Umami. Every event here
//  fires for ANONYMOUS players too, unlike the admin dashboard,
//  which only ever sees people who signed in with Google
//  (cloud.js `_syncToCloud` returns early without `_cloudUser`).
//
//  TWO WAYS TO AUTHENTICATE
//
//  1. Share URL — works on the FREE plan (no API key):
//       Umami → Settings → Websites → edit the site → enable
//       "Share URL" → copy the link it gives you.
//       UMAMI_SHARE_URL='https://cloud.umami.is/share/XXXX/name' \
//         node tools/umami-funnel.js --days 14
//     The link is public while enabled; turn it off when done.
//     No PII is in these events (see the analytics rules in CLAUDE.md).
//
//  2. API key — Umami Cloud Pro only:
//       UMAMI_API_KEY=xxxx node tools/umami-funnel.js
//
//  Never commit either value: this repo is public.
//  No npm deps (node's built-in fetch) — npm is unreachable here,
//  see the machine-node-network-broken memory.
// ============================================================

const KEY       = process.env.UMAMI_API_KEY;
const SHARE_URL = process.env.UMAMI_SHARE_URL;

if (!KEY && !SHARE_URL) {
  console.error(
    'Need UMAMI_SHARE_URL (free plan) or UMAMI_API_KEY (Pro).\n\n' +
    'Free-plan route: Umami → Settings → Websites → edit your site →\n' +
    'enable "Share URL", copy the link, then:\n\n' +
    "  UMAMI_SHARE_URL='https://cloud.umami.is/share/XXXX/name' node tools/umami-funnel.js --days 14\n");
  process.exit(1);
}

const args  = process.argv.slice(2);
const argOf = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const days  = Number(argOf('--days') || 7);
const since = argOf('--since');
const endAt   = Date.now();
const startAt = since ? new Date(since + 'T00:00:00Z').getTime() : endAt - days * 86400000;

/** Resolve the share link into {origin, websiteId, headers} for the data calls. */
async function authFromShare(shareUrl) {
  const u = new URL(shareUrl);
  const m = u.pathname.match(/\/share\/([^/]+)/);
  if (!m) throw new Error('That does not look like a share URL (no /share/<id>/ in the path).');
  const shareId = m[1];
  const r = await fetch(`${u.origin}/api/share/${shareId}`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`share lookup failed: ${r.status} ${r.statusText} — ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  if (!j.token || !j.websiteId) throw new Error('share endpoint returned an unexpected shape: ' + JSON.stringify(j).slice(0, 300));
  return { base: `${u.origin}/api`, websiteId: j.websiteId, headers: { 'x-umami-share-token': j.token, accept: 'application/json' } };
}

function authFromKey() {
  return {
    base: process.env.UMAMI_API_BASE || 'https://api.umami.is/v1',
    websiteId: process.env.UMAMI_WEBSITE_ID || '343bb5db-6668-469d-a99c-9b6fcaa1c45a',
    headers: { 'x-umami-api-key': KEY, accept: 'application/json' },
  };
}

const pct = (a, b) => (b > 0 ? (a / b * 100).toFixed(1) + '%' : '—');
const val = o => (o && typeof o === 'object' ? o.value : o) || 0;

(async () => {
  const auth = SHARE_URL ? await authFromShare(SHARE_URL) : authFromKey();

  async function api(path, params) {
    const url = new URL(`${auth.base}/websites/${auth.websiteId}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const r = await fetch(url, { headers: auth.headers });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText} on ${path} — ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }

  const [stats, events] = await Promise.all([
    api('/stats',   { startAt, endAt }),
    api('/metrics', { startAt, endAt, type: 'event' }),
  ]);

  const n = Object.fromEntries((events || []).map(e => [e.x, e.y]));
  const range = `${new Date(startAt).toISOString().slice(0, 10)} → ${new Date(endAt).toISOString().slice(0, 10)}`;
  console.log(`\nEgg Smash Adventures — Umami  (${range})\n`);
  console.log(`  visitors ${val(stats.visitors)}   visits ${val(stats.visits)}   pageviews ${val(stats.pageviews)}`);
  const visits = val(stats.visits);
  if (visits) console.log(`  avg visit ${Math.round(val(stats.totaltime) / visits)}s`);

  const started = n['game-started'] || 0, smash = n['first-smash'] || 0, brk = n['first-break'] || 0;
  console.log('\n  EARLY FUNNEL (all players, incl. anonymous)');
  console.log(`    game-started   ${String(started).padStart(6)}`);
  console.log(`    first-smash    ${String(smash).padStart(6)}   ${pct(smash, started)} of started`);
  console.log(`    first-break    ${String(brk).padStart(6)}   ${pct(brk, smash)} of smashers`);

  const others = Object.entries(n)
    .filter(([k]) => !['game-started', 'first-smash', 'first-break'].includes(k))
    .sort((a, b) => b[1] - a[1]);
  if (others.length) {
    console.log('\n  OTHER EVENTS');
    for (const [k, v] of others) console.log(`    ${k.padEnd(24)} ${String(v).padStart(6)}`);
  }
  console.log();
})().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
