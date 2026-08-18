#!/usr/bin/env node
// ============================================================
//  tools/send-campaign.js — email registered players via Resend
//
//  Sends marketing/emails/<name>.html (+ .md plain-text alternative) to every
//  cloud-save player with an email, one message per recipient (clean reply
//  threads, no address leaks), with List-Unsubscribe headers.
//
//  DRY RUN BY DEFAULT — prints the recipient count and a sample, sends
//  nothing. Add --send to actually send.
//
//  Env (put them in a git-ignored .env or export them):
//    RESEND_API_KEY   Resend key (same one the weekly digest uses)
//    CAMPAIGN_FROM    e.g. "Egg Smash Adventures <hello@eggbreakeradventure.com>"
//                     — the domain must be verified in Resend
//    ADMIN_SECRET     x-admin-secret for the admin-players edge function
//    SUPABASE_ANON    anon key (read from cloud.js if not set)
//
//  Options:
//    --send                    really send (otherwise dry run)
//    --to a@b.com,c@d.com      override recipients (skip the player fetch) — good for a test send
//    --template NAME           marketing/emails/NAME.html  (default new-joiner-welcome)
//    --subject "…"             (default: from the template's <title> or the .md subject line #1)
//    --since-days N            only players seen in the last N days
//    --exclude a@b.com,…       skip these (unsubscribed)
//    --limit N                 cap recipients (Resend free tier: 100/day)
//    --reply-to addr           default yotameggbreaker@gmail.com
//    --unsub-file PATH         newline list of unsubscribed addresses (default marketing/emails/unsubscribed.txt, git-ignored)
// ============================================================
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// tiny .env loader (no dependency)
try {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (e) {}

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i === -1 ? def : (args[i + 1] || def); };
const flag = name => args.includes(name);
const SEND = flag('--send');
const TEMPLATE = opt('--template', 'new-joiner-welcome');
const REPLY_TO = opt('--reply-to', 'yotameggbreaker@gmail.com');
const LIMIT = parseInt(opt('--limit', '0'), 10) || 0;
const SINCE_DAYS = parseInt(opt('--since-days', '0'), 10) || 0;
const UNSUB_FILE = opt('--unsub-file', path.join(ROOT, 'marketing', 'emails', 'unsubscribed.txt'));

const html = fs.readFileSync(path.join(ROOT, 'marketing', 'emails', TEMPLATE + '.html'), 'utf8');
const md = fs.existsSync(path.join(ROOT, 'marketing', 'emails', TEMPLATE + '.md')) ? fs.readFileSync(path.join(ROOT, 'marketing', 'emails', TEMPLATE + '.md'), 'utf8') : '';
const textBlock = (md.match(/```\n([\s\S]*?)```/) || [])[1] || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const subject = opt('--subject', (md.match(/^\d\.\s+`([^`]+)`/m) || [])[1] || (html.match(/<title>([^<]+)<\/title>/) || [])[1] || 'Egg Smash Adventures');

function anonKey() {
  if (process.env.SUPABASE_ANON) return process.env.SUPABASE_ANON;
  const src = fs.readFileSync(path.join(ROOT, 'cloud.js'), 'utf8');
  const m = src.match(/_SUPABASE_ANON\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : '';
}
const isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const norm = e => String(e || '').trim().toLowerCase();

async function fetchPlayers() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET not set (needed to read the player list) — or pass --to');
  const anon = anonKey();
  const res = await fetch('https://hhpikvqeopscjdzuhbfk.supabase.co/functions/v1/admin-players', {
    headers: { Authorization: 'Bearer ' + anon, apikey: anon, 'x-admin-secret': secret },
  });
  if (!res.ok) throw new Error('admin-players HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
  const players = await res.json();
  const cutoff = SINCE_DAYS ? Date.now() - SINCE_DAYS * 86400000 : 0;
  return players
    .filter(p => p.email && isEmail(p.email))
    .filter(p => !cutoff || new Date(p.last_seen_at || p.saved_at || 0).getTime() >= cutoff)
    .map(p => ({ email: norm(p.email), lastSeen: p.last_seen_at || p.saved_at }));
}

async function sendOne(key, from, to) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], reply_to: REPLY_TO, subject, html, text: textBlock,
      headers: {
        'List-Unsubscribe': '<mailto:' + REPLY_TO + '?subject=Unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [{ name: 'campaign', value: TEMPLATE }],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Resend ' + res.status + ' ' + (body.message || body.name || ''));
  return body.id;
}

(async () => {
  // Recipients
  let list;
  const toArg = opt('--to', '');
  if (toArg) list = toArg.split(',').map(norm).filter(isEmail).map(email => ({ email }));
  else list = await fetchPlayers();
  const excl = new Set((opt('--exclude', '') || '').split(',').map(norm).filter(Boolean));
  if (fs.existsSync(UNSUB_FILE)) fs.readFileSync(UNSUB_FILE, 'utf8').split('\n').map(norm).filter(Boolean).forEach(e => excl.add(e));
  const seen = new Set();
  let recipients = list.filter(r => { if (excl.has(r.email) || seen.has(r.email)) return false; seen.add(r.email); return true; });
  const total = recipients.length;
  if (LIMIT && recipients.length > LIMIT) recipients = recipients.slice(0, LIMIT);

  console.log('\nCampaign: ' + TEMPLATE + '\nSubject:  ' + subject + '\nFrom:     ' + (process.env.CAMPAIGN_FROM || '(CAMPAIGN_FROM not set)') + '\nReply-To: ' + REPLY_TO);
  console.log('Recipients: ' + recipients.length + (LIMIT && total > LIMIT ? ' (of ' + total + ', capped by --limit)' : '') + (excl.size ? '  · excluded ' + excl.size : ''));
  console.log('Sample:     ' + recipients.slice(0, 5).map(r => r.email.replace(/^(.{2}).*(@.*)$/, '$1***$2')).join(', '));

  if (!SEND) { console.log('\nDRY RUN — nothing sent. Add --send to send.\n'); return; }
  const key = process.env.RESEND_API_KEY, from = process.env.CAMPAIGN_FROM;
  if (!key) throw new Error('RESEND_API_KEY not set');
  if (!from) throw new Error('CAMPAIGN_FROM not set (a Resend-verified sender)');

  const logPath = path.join(ROOT, 'marketing', 'emails', 'sent-' + TEMPLATE + '.log');   // git-ignored
  const already = new Set(fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').split('\n').map(l => l.split('\t')[1]).filter(Boolean) : []);
  let ok = 0, skipped = 0, failed = 0;
  for (const r of recipients) {
    if (already.has(r.email)) { skipped++; continue; }   // re-runs never double-send
    try {
      const id = await sendOne(key, from, r.email);
      fs.appendFileSync(logPath, new Date().toISOString() + '\t' + r.email + '\t' + id + '\n');
      ok++; process.stdout.write('.');
    } catch (e) { failed++; console.error('\n  ✗ ' + r.email + ': ' + e.message); }
    await new Promise(res => setTimeout(res, 600));   // ~1.5/s, well under Resend's rate limit
  }
  console.log('\n\nSent ' + ok + ' · skipped (already sent) ' + skipped + ' · failed ' + failed + '\nLog: ' + logPath + '\n');
})().catch(e => { console.error('\n' + e.message); process.exit(1); });
