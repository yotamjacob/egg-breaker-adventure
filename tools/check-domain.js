#!/usr/bin/env node
// ============================================================
//  tools/check-domain.js — is the new domain ready for Google
//  OAuth brand verification?
//
//  Checks, in order:
//    1. Google Search Console TXT record on the apex domain
//    2. DNS pointing at Vercel (apex A record / CNAME *.vercel-dns.com)
//    3. HTTPS serving the game (200 + the game's <title>)
//    4. The three URLs the OAuth consent screen needs: /, /privacy, /terms
//
//  Run: node tools/check-domain.js <domain> [expected-txt-value]
//  e.g. node tools/check-domain.js eggsmashadventures.com
// ============================================================
const { execSync } = require('child_process');
const https = require('https');

const domain = (process.argv[2] || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const expectTxt = process.argv[3] || 'google-site-verification=';
if (!domain) {
  console.error('usage: node tools/check-domain.js <domain> [expected-txt-value]');
  process.exit(1);
}
const ok = s => '  \x1b[32m✓\x1b[0m ' + s;
const bad = s => '  \x1b[31m✗\x1b[0m ' + s;
const warn = s => '  \x1b[33m!\x1b[0m ' + s;

function dig(type, name) {
  try { return execSync(`dig +short ${type} ${name}`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean); }
  catch (e) { return []; }
}
function head(url) {
  return new Promise(res => {
    const req = https.get(url, { timeout: 12000 }, r => {
      let body = '';
      r.on('data', d => { if (body.length < 4000) body += d; });
      r.on('end', () => res({ status: r.statusCode, location: r.headers.location, body }));
    });
    req.on('timeout', () => { req.destroy(); res({ status: 0, error: 'timeout' }); });
    req.on('error', e => res({ status: 0, error: e.message }));
  });
}

(async () => {
  console.log('\nChecking ' + domain + '\n');
  let fatal = 0;

  // 1. Search Console TXT
  const txt = dig('TXT', domain).map(s => s.replace(/^"|"$/g, ''));
  const gsv = txt.filter(t => t.startsWith('google-site-verification='));
  console.log('1. Google Search Console TXT (apex)');
  if (!gsv.length) { console.log(bad('no google-site-verification TXT on ' + domain)); fatal++; }
  else {
    gsv.forEach(t => console.log(ok(t)));
    if (expectTxt !== 'google-site-verification=' && !gsv.includes(expectTxt)) {
      console.log(warn('none of these match the value you were given — check for a typo or a stale record'));
    }
  }
  if (txt.length > gsv.length) console.log(warn('other TXT records present: ' + (txt.length - gsv.length)));

  // 2. Vercel DNS
  console.log('\n2. DNS pointing at Vercel');
  // Vercel has used several apex IPs (76.76.21.21 historically, 216.198.79.x /
  // 64.29.17.x now) — compare against whatever the live project resolves to
  // rather than a hardcoded address that ages badly.
  const vercelIps = new Set(dig('A', 'egg-breaker-adventures.vercel.app').concat(['76.76.21.21']));
  const a = dig('A', domain), cname = dig('CNAME', 'www.' + domain);
  if (a.some(ip => vercelIps.has(ip))) console.log(ok('apex A → ' + a.join(', ') + ' (Vercel)'));
  else if (a.length) console.log(warn('apex A → ' + a.join(', ') + ' — expected one of: ' + [...vercelIps].join(', ')));
  else console.log(warn('no apex A record yet'));
  if (cname.some(c => /vercel-dns\.com|vercel\.app/.test(c))) console.log(ok('www CNAME → ' + cname.join(', ')));
  else if (cname.length) console.log(warn('www CNAME → ' + cname.join(', ')));
  else console.log(warn('no www CNAME (optional)'));

  // 3 + 4. The URLs Google will fetch
  console.log('\n3. URLs the OAuth consent screen needs');
  for (const path of ['/', '/privacy', '/terms']) {
    const r = await head('https://' + domain + path);
    if (r.status === 200) {
      const titled = /Egg Smash|Egg Breaker/i.test(r.body || '');
      console.log(ok('https://' + domain + path + ' → 200' + (titled ? ' (game content found)' : '')));
      if (path === '/' && !titled) console.log(warn('  home page did not mention the game — Google requires an obviously relevant home page'));
    } else if (r.status >= 300 && r.status < 400) {
      console.log(warn('https://' + domain + path + ' → ' + r.status + ' redirect to ' + r.location));
    } else {
      console.log(bad('https://' + domain + path + ' → ' + (r.error || r.status)));
      fatal++;
    }
  }

  console.log('\n' + (fatal
    ? '\x1b[31mNot ready.\x1b[0m Fix the ✗ items, then re-run. DNS can take minutes to hours to propagate.'
    : '\x1b[32mReady.\x1b[0m Verify the Domain property in Search Console, then set the home/privacy/terms URLs\nand the authorized domain in the OAuth consent screen to ' + domain + ' and re-submit branding.') + '\n');
})();
