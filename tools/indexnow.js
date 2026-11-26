#!/usr/bin/env node
// IndexNow ping — tells Bing (and every IndexNow partner: Yandex, Seznam, Naver)
// that the sitemap's URLs changed, right after a push to main. The key file
// lives at the site root (indexnow-<key>.txt) and is public by design.
// Google does not use IndexNow; its crawl is driven by the sitemap in Search
// Console. No secrets, no retries beyond one: a miss costs nothing, the next
// deploy pings again.
//   node tools/indexnow.js            # ping every sitemap URL
//   node tools/indexnow.js --dry-run  # print the payload only
const fs = require('fs');
const path = require('path');

const HOST = 'www.eggbreakeradventure.com';
const KEY  = 'cb480594e8d85d53560672f4f6423d2d';
const DRY  = process.argv.includes('--dry-run');

const xml  = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urls.length) { console.error('indexnow: sitemap.xml has no URLs'); process.exit(1); }

const body = { host: HOST, key: KEY, keyLocation: `https://${HOST}/indexnow-${KEY}.txt`, urlList: urls };
if (DRY) { console.log(JSON.stringify(body, null, 2)); process.exit(0); }

fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
}).then(async r => {
  // 200 = accepted, 202 = accepted + key will be validated. Anything else is a soft failure.
  console.log(`indexnow: HTTP ${r.status} for ${urls.length} URLs`);
  if (r.status !== 200 && r.status !== 202) console.log(await r.text());
}).catch(e => console.log('indexnow: ping failed (non-fatal):', e.message));
