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

// Query a public resolver, not the system one: macOS caches negative answers,
// so a freshly added record looks missing for minutes if you ask locally.
function dig(type, name, resolver) {
  try {
    const at = resolver === null ? '' : '@' + (resolver || '8.8.8.8') + ' ';
    return execSync(`dig +short ${at}${type} ${name}`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch (e) { return []; }
}
/** GET that follows redirects (apex → www is normal on Vercel) and reports the final URL. */
function head(url, depth) {
  depth = depth || 0;
  return new Promise(res => {
    const req = https.get(url, { timeout: 12000 }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && depth < 4) {
        r.resume();
        const next = r.headers.location.startsWith('http') ? r.headers.location : new URL(r.headers.location, url).href;
        return res(head(next, depth + 1).then ? head(next, depth + 1) : null);
      }
      let body = '';
      r.on('data', d => { if (body.length < 4000) body += d; });
      r.on('end', () => res({ status: r.statusCode, url, body, redirected: depth > 0 }));
    });
    req.on('timeout', () => { req.destroy(); res({ status: 0, url, error: 'timeout' }); });
    req.on('error', e => res({ status: 0, url, error: e.message }));
  });
}

(async () => {
  console.log('\nChecking ' + domain + '\n');
  let fatal = 0;

  // 1. Search Console TXT
  // Cross-check two public resolvers so a single stale cache cannot hide it
  const txt = [...new Set(dig('TXT', domain, '8.8.8.8').concat(dig('TXT', domain, '1.1.1.1')))]
    .map(s => s.replace(/^"|"$/g, ''));
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
  // Vercel serves from several ranges (76.76.21.21 historically, 216.198.79.x /
  // 64.29.17.x now) — match by range, not by one address that ages badly.
  const isVercelIp = ip => /^(76\.76\.21\.|216\.198\.79\.|64\.29\.17\.)/.test(ip);
  const ns = dig('NS', domain);
  if (ns.some(n => /vercel-dns/.test(n))) console.log(ok('nameservers are Vercel (' + ns.join(', ') + ') → manage DNS in the Vercel dashboard, not the registrar'));
  else if (ns.length) console.log(warn('nameservers: ' + ns.join(', ') + ' → add DNS records at that provider'));
  const a = dig('A', domain), aw = dig('A', 'www.' + domain), cname = dig('CNAME', 'www.' + domain);
  if (a.some(isVercelIp)) console.log(ok('apex A → ' + a.join(', ') + ' (Vercel)'));
  else if (a.length) console.log(warn('apex A → ' + a.join(', ') + ' (not a Vercel range)'));
  else console.log(warn('no apex A record yet'));
  if (cname.length) console.log(ok('www CNAME → ' + cname.join(', ')));
  else if (aw.some(isVercelIp)) console.log(ok('www A → ' + aw.join(', ') + ' (Vercel)'));
  else console.log(warn('www does not resolve to Vercel'));

  // 3 + 4. The URLs Google will fetch
  console.log('\n3. URLs the OAuth consent screen needs');
  let canonical = null;
  for (const path of ['/', '/privacy', '/terms']) {
    const r = await head('https://' + domain + path);
    if (r && r.status === 200) {
      const titled = /Egg Smash|Egg Breaker/i.test(r.body || '');
      if (path === '/') canonical = r.url;
      console.log(ok(r.url + ' → 200' + (titled ? ' (game content found)' : '') + (r.redirected ? '  [redirected]' : '')));
      if (path === '/' && !titled) console.log(warn('  home page did not mention the game — Google requires an obviously relevant home page'));
    } else {
      console.log(bad('https://' + domain + path + ' → ' + ((r && (r.error || r.status)) || 'failed')));
      fatal++;
    }
  }
  if (canonical) console.log('\n  Use this exact URL as the OAuth home page: ' + canonical);

  console.log('\n' + (fatal
    ? '\x1b[31mNot ready.\x1b[0m Fix the ✗ items, then re-run. DNS can take minutes to hours to propagate.'
    : '\x1b[32mReady.\x1b[0m Verify the Domain property in Search Console, then set the home/privacy/terms URLs\nand the authorized domain in the OAuth consent screen to ' + domain + ' and re-submit branding.') + '\n');
})();
