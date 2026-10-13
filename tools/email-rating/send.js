#!/usr/bin/env node
// Sends the top-players gift + rating email through Resend (same account as the
// weekly digest). Run by .github/workflows/gift-email.yml so the API key never
// leaves GitHub secrets.
//
//   MODE=test  → one email to TEST_TO (DIGEST_TO), subject prefixed [TEST]
//   MODE=live  → every row of RECIPIENTS ("email,eggs" lines, a repo secret —
//                the repo is public, so the list is never committed or logged);
//                CONFIRM must equal the recipient count
//   node tools/email-rating/send.js --out file.html   → render only, send nothing
//
// The Gmail connector can't be used for this: it strips every <img> and most
// background styles from outgoing HTML (probed 2026-10-13).
const fs = require('fs');
const path = require('path');

const ASSET_BASE = 'https://www.eggbreakeradventure.com/email';
const SUBJECT = 'A gift for you, top smasher 🎁';
const PLAY = 'https://play.google.com/store/apps/details?id=com.eggbreakeradventures.app';

const env = process.env;
const MODE = env.MODE || 'test';
const REPLY_TO = env.REPLY_TO || '';

function playUrl(content) {
  const ref = `utm_source=email&utm_medium=email&utm_campaign=top_players_rating&utm_content=${content}`;
  return `${PLAY}&amp;referrer=${encodeURIComponent(ref)}`;
}

// Snapshot counts lag, so round DOWN to the hundred and say "4,800+"
function eggsLabel(n) {
  const v = Math.max(1000, Math.floor(Number(n) / 100) * 100);
  return v.toLocaleString('en-US');
}

function render(eggs) {
  const tpl = fs.readFileSync(path.join(__dirname, 'email.html'), 'utf8');
  const unsub = REPLY_TO ? `mailto:${REPLY_TO}?subject=Unsubscribe` : 'https://www.eggbreakeradventure.com/privacy';
  const vars = {
    ASSET_BASE, EGGS: eggsLabel(eggs), SENDER_NAME: 'Yotam',
    PLAY_URL: playUrl('rate_cta'), PLAY_OPEN_URL: playUrl('open_game'), UNSUBSCRIBE_URL: unsub,
  };
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  if (/\{\{\w+\}\}/.test(html)) throw new Error('unfilled placeholder in template');
  const text = `You've smashed ${vars.EGGS}+ eggs, which puts you among our most dedicated players, so Lucky Charm (2x uncommon & rare item drops) and Double Daily (2x daily login rewards) are now yours. Free, forever.

Open the game and tap Premium - they switch on automatically.

Enjoying the game? A quick rating on Google Play helps a small indie game more than anything:
${PLAY}

Thank you for smashing with us.
Yotam - Egg Smash Adventures`;
  return { html, text };
}

async function send(to, eggs, subject) {
  const { html, text } = render(eggs);
  const from = env.FROM.includes('<') ? env.FROM : `Egg Smash Adventures <${env.FROM}>`;
  const body = { from, to: [to], subject, html, text };
  if (REPLY_TO) {
    body.reply_to = REPLY_TO;
    body.headers = { 'List-Unsubscribe': `<mailto:${REPLY_TO}?subject=Unsubscribe>` };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const out = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${out}`);
  return JSON.parse(out).id;
}

(async () => {
  const outIdx = process.argv.indexOf('--out');
  if (outIdx > 0) {
    fs.writeFileSync(process.argv[outIdx + 1], render(4812).html);
    console.log('rendered', process.argv[outIdx + 1]);
    return;
  }
  if (!env.RESEND_API_KEY || !env.FROM) throw new Error('RESEND_API_KEY and FROM are required');

  if (MODE === 'test') {
    // TEST_TO may hold several comma-separated inboxes (DIGEST_TO + GIFT_TEST_TO)
    const tos = (env.TEST_TO || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!tos.length) throw new Error('TEST_TO is required');
    for (const to of tos) console.log('test sent', await send(to, 4812, '[TEST] ' + SUBJECT));
    return;
  }

  if (MODE === 'live') {
    const rows = (env.RECIPIENTS || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('email'))
      .map(l => { const [email, eggs] = l.split(','); return { email: email.trim(), eggs: Number(eggs) }; })
      .filter(r => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email) && r.eggs > 0);
    if (!rows.length) throw new Error('RECIPIENTS secret is empty');
    if (String(rows.length) !== String(env.CONFIRM || '').trim())
      throw new Error(`CONFIRM must be ${rows.length} (the recipient count) to send`);
    let ok = 0;
    for (const [i, r] of rows.entries()) {
      try { await send(r.email, r.eggs, SUBJECT); ok++; console.log(`sent ${i + 1}/${rows.length}`); }
      catch (e) { console.log(`FAILED ${i + 1}/${rows.length}: ${e.message.replace(/[^\s@]+@[^\s@]+/g, '<email>')}`); }
      await new Promise(r => setTimeout(r, 700)); // Resend allows 2 req/s
    }
    console.log(`done: ${ok}/${rows.length} sent`);
    if (ok !== rows.length) process.exit(1);
    return;
  }
  throw new Error('MODE must be test or live');
})().catch(e => { console.error(e.message); process.exit(1); });
