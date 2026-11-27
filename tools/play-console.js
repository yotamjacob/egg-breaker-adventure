#!/usr/bin/env node
// Google Play access for the PM automation (v3.12.9).
// Runs ONLY inside GitHub Actions (.github/workflows/play-console.yml), where the
// service-account key lives in the PLAY_SERVICE_ACCOUNT_JSON secret. It never prints
// the key or the access token.
//
//   MODE=report  -> reviews from the last 7 days (the API returns nothing older),
//                   crash + ANR rate for the last 28 days, written to play-report.json
//                   and the job summary.
//   MODE=reply   -> REPLIES='[{"reviewId":"...","text":"..."}]' posts each reply
//                   (Play limit: 350 characters). Already-answered reviews are skipped.
//
// Service account: eggsmash-pm@egg-breaker-adventures-revival.iam.gserviceaccount.com
// Play permissions: View app information, View app quality information, Reply to reviews.
const crypto = require('crypto');
const fs = require('fs');

const PKG = 'com.eggbreakeradventures.app';
const MODE = process.env.MODE || 'report';
const SCOPES = [
  'https://www.googleapis.com/auth/androidpublisher',
  'https://www.googleapis.com/auth/playdeveloperreporting',
].join(' ');

function die(msg) { console.error('play-console: ' + msg); process.exit(1); }

async function accessToken() {
  let sa;
  try { sa = JSON.parse(process.env.PLAY_SERVICE_ACCOUNT_JSON || ''); }
  catch (e) { die('PLAY_SERVICE_ACCOUNT_JSON is missing or not JSON'); }
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email, scope: SCOPES, aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  });
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig }),
  });
  const j = await r.json();
  if (!j.access_token) die('token exchange failed: HTTP ' + r.status + ' ' + (j.error || '') + ' ' + (j.error_description || ''));
  return j.access_token;
}

async function api(token, method, url, body) {
  const r = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text.slice(0, 500) }; }
  return { ok: r.ok, status: r.status, data };
}

async function listReviews(token) {
  const out = []; let pageToken;
  do {
    const u = new URL(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}/reviews`);
    u.searchParams.set('maxResults', '100');
    if (pageToken) u.searchParams.set('token', pageToken);
    const r = await api(token, 'GET', u);
    if (!r.ok) return { error: `reviews.list HTTP ${r.status}: ${JSON.stringify(r.data).slice(0, 300)}`, reviews: out };
    for (const rv of r.data.reviews || []) {
      const user = (rv.comments || []).find(c => c.userComment)?.userComment || {};
      const dev = (rv.comments || []).find(c => c.developerComment)?.developerComment;
      out.push({
        reviewId: rv.reviewId,
        stars: user.starRating,
        text: (user.text || '').trim(),
        language: user.reviewerLanguage,
        appVersion: user.appVersionName,
        device: user.deviceMetadata?.productName,
        at: user.lastModified?.seconds ? new Date(+user.lastModified.seconds * 1000).toISOString() : null,
        replied: !!dev,
      });
    }
    pageToken = r.data.tokenPagination?.nextPageToken;
  } while (pageToken);
  return { reviews: out };
}

function ymd(d) { return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }; }

async function vital(token, metricSet, metrics) {
  // Vitals lag ~2 days; ask for the 28 days ending 3 days ago.
  const end = new Date(Date.now() - 3 * 86400e3), start = new Date(end.getTime() - 28 * 86400e3);
  const tz = { id: 'America/Los_Angeles' };
  const r = await api(token, 'POST',
    `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${PKG}/${metricSet}:query`,
    { timelineSpec: { aggregationPeriod: 'DAILY', startTime: { ...ymd(start), timeZone: tz }, endTime: { ...ymd(end), timeZone: tz } },
      metrics, pageSize: 100 });
  if (!r.ok) return { error: `${metricSet} HTTP ${r.status}: ${JSON.stringify(r.data).slice(0, 300)}` };
  const rows = (r.data.rows || []).map(row => {
    const o = { date: `${row.startTime.year}-${String(row.startTime.month).padStart(2, '0')}-${String(row.startTime.day).padStart(2, '0')}` };
    for (const m of row.metrics || []) o[m.metric] = m.decimalValue ? +m.decimalValue.value : null;
    return o;
  });
  // Weighted 28-day rate: sum(rate*users)/sum(users).
  const rateKey = metrics[0];
  const users = rows.reduce((s, x) => s + (x.distinctUsers || 0), 0);
  const weighted = users ? rows.reduce((s, x) => s + (x[rateKey] || 0) * (x.distinctUsers || 0), 0) / users : null;
  return { days: rows.length, distinctUserDays: users, rate28d: weighted };
}

function summary(lines) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (f) fs.appendFileSync(f, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
}

(async () => {
  const token = await accessToken();

  if (MODE === 'report') {
    const rv = await listReviews(token);
    const crash = await vital(token, 'crashRateMetricSet', ['crashRate', 'distinctUsers']);
    const anr = await vital(token, 'anrRateMetricSet', ['anrRate', 'distinctUsers']);
    const report = { generatedAt: new Date().toISOString(), package: PKG, reviews7d: rv, crash, anr };
    fs.writeFileSync('play-report.json', JSON.stringify(report, null, 2));
    const pct = v => v == null ? 'n/a' : (v * 100).toFixed(2) + '%';
    const unanswered = (rv.reviews || []).filter(r => !r.replied);
    summary([
      '## Play report',
      `Reviews with text in the last 7 days: ${(rv.reviews || []).length} (unanswered: ${unanswered.length})${rv.error ? ' | ERROR: ' + rv.error : ''}`,
      `Crash rate (28d, user-weighted): ${crash.error ? 'ERROR: ' + crash.error : pct(crash.rate28d) + ' over ' + crash.days + ' days'}`,
      `ANR rate (28d, user-weighted): ${anr.error ? 'ERROR: ' + anr.error : pct(anr.rate28d) + ' over ' + anr.days + ' days'}`,
      '',
      ...unanswered.map(r => `- [${r.stars}★] (${r.reviewId}) ${r.text.replace(/\s+/g, ' ').slice(0, 300)}`),
    ]);
    // Machine-readable line for the cloud PM session reading the job log.
    console.log('PLAY_REPORT_JSON ' + JSON.stringify(report));
    if (rv.error && crash.error && anr.error) process.exit(1);
    return;
  }

  if (MODE === 'reply') {
    let items;
    try { items = JSON.parse(process.env.REPLIES || '[]'); } catch (e) { die('REPLIES is not valid JSON'); }
    if (!Array.isArray(items) || !items.length) die('REPLIES is empty');
    const current = await listReviews(token);
    const answered = new Set((current.reviews || []).filter(r => r.replied).map(r => r.reviewId));
    const lines = ['## Play replies'];
    let failed = 0;
    for (const it of items) {
      const text = String(it.text || '').trim();
      if (!it.reviewId || !text) { lines.push(`- skipped: missing reviewId or text`); failed++; continue; }
      if (text.length > 350) { lines.push(`- ${it.reviewId}: skipped, ${text.length} chars > 350`); failed++; continue; }
      if (answered.has(it.reviewId)) { lines.push(`- ${it.reviewId}: already answered, skipped`); continue; }
      const r = await api(token, 'POST',
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}/reviews/${encodeURIComponent(it.reviewId)}:reply`,
        { replyText: text });
      if (r.ok) lines.push(`- ${it.reviewId}: replied`);
      else { failed++; lines.push(`- ${it.reviewId}: HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`); }
    }
    summary(lines);
    process.exit(failed ? 1 : 0);
  }

  die('unknown MODE ' + MODE);
})().catch(e => die(e.message));
