// ============================================================
//  Egg Smash Adventures — Smoke Tests
//  Runs against the live production environment.
//  Triggered by GitHub Actions cron (08:00 + 20:00 UTC).
//
//  Required env var (GitHub secret):
//    SUPABASE_SERVICE_ROLE_KEY — enables DB-write tests (cloud save,
//    push cleanup). Tests that need it are skipped when absent.
// ============================================================

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');

const APP    = 'https://egg-breaker-adventures.vercel.app';
const SB     = 'https://hhpikvqeopscjdzuhbfk.supabase.co';
const ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocGlrdnFlb3BzY2pkenVoYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzA2NDUsImV4cCI6MjA5MTcwNjY0NX0.-iYI6Wf8eREEBKFxfty7ot1Ke8AqjC73xlT7KCTZaqc';
const SVC    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEED_SVC = !SVC && 'requires SUPABASE_SERVICE_ROLE_KEY secret';
const MS     = 30_000;

// Stable CI device — never a real player device
const CI_DEVICE = 'ci-smoke-test-00000';

function anon(extra = {}) {
  return { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}`, ...extra };
}
function svc(extra = {}) {
  return { 'Content-Type': 'application/json', apikey: SVC,  Authorization: `Bearer ${SVC}`,  ...extra };
}

async function GET(url, headers = {}, fetchOpts = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), MS);
  try   { return await fetch(url, { headers, signal: c.signal, ...fetchOpts }); }
  finally { clearTimeout(t); }
}

async function POST(url, body, headers = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), MS);
  try   { return await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
    signal: c.signal,
  }); }
  finally { clearTimeout(t); }
}

// ── App availability ──────────────────────────────────────────────────────────

describe('app', () => {
  test('index page returns 200 HTML', async () => {
    const r = await GET(`${APP}/`);
    assert.equal(r.status, 200, `Expected 200, got ${r.status}`);
    assert.match(r.headers.get('content-type') ?? '', /text\/html/i);
  });

  test('bundle.min.js is served and non-empty', async () => {
    const r = await GET(`${APP}/bundle.min.js`);
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.ok(text.length > 50_000, `Bundle suspiciously small: ${text.length} bytes`);
  });

  test('sw.js is served', async () => {
    const r = await GET(`${APP}/sw.js`);
    assert.equal(r.status, 200);
  });

  test('manifest.json is valid with required fields', async () => {
    const r = await GET(`${APP}/manifest.json`);
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.ok(data.name, 'manifest.json is missing name');
    assert.ok(Array.isArray(data.icons) && data.icons.length > 0, 'manifest.json is missing icons');
  });

  test('sw.js CACHE_VERSION matches config.js VERSION', async () => {
    // Catches the common mistake of forgetting to bump sw.js when deploying.
    const swText  = await (await GET(`${APP}/sw.js`)).text();
    const swVer   = swText.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    assert.ok(swVer, 'CACHE_VERSION not found in live sw.js');

    const cfgText = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
    const cfgVer  = cfgText.match(/const VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    assert.ok(cfgVer, 'VERSION not found in config.js');

    assert.equal(swVer, cfgVer,
      `Version mismatch — sw.js has ${swVer} but config.js has ${cfgVer}. Did you forget to bump sw.js?`);
  });
});

// ── Supabase / auth health ────────────────────────────────────────────────────

describe('supabase', () => {
  test('auth service is healthy', async () => {
    const r = await GET(`${SB}/auth/v1/health`, { apikey: ANON });
    assert.equal(r.status, 200, `Supabase auth health returned ${r.status}`);
  });

  test('Google OAuth provider is configured', async () => {
    // When Google is configured, Supabase 302-redirects to Google's consent page.
    // 400 means the provider is disabled; 500 means a server error.
    const r = await GET(`${SB}/auth/v1/authorize?provider=google`, {}, { redirect: 'manual' });
    assert.ok(
      [301, 302, 303, 307, 308].includes(r.status),
      `Expected redirect to Google — got ${r.status}. Is Google OAuth enabled in Supabase dashboard?`
    );
  });

  test('REST API is reachable with service key', { skip: NEED_SVC }, async () => {
    const r = await GET(`${SB}/rest/v1/game_saves?select=user_id&limit=1`, svc());
    assert.ok(r.status < 300, `REST API returned ${r.status}`);
  });

  test('game_saves timestamp fetch (order+limit) is valid', { skip: NEED_SVC }, async () => {
    // Mirrors the openCloudSaveModal raw-fetch that was returning null on 401 and zeroing
    // G._cloudSavedAt — verifies the query shape works with service key.
    const r = await GET(
      `${SB}/rest/v1/game_saves?select=saved_at&order=saved_at.desc&limit=1`,
      svc()
    );
    assert.ok(r.status < 300, `game_saves timestamp query returned ${r.status}`);
    const rows = await r.json();
    assert.ok(Array.isArray(rows), `Expected array from game_saves: ${JSON.stringify(rows)}`);
  });
});

// ── Purchases ─────────────────────────────────────────────────────────────────

describe('purchases', () => {
  test('restore-purchases proxy returns valid structure', async () => {
    const r = await POST(`${APP}/api/restore-purchases`, { device_id: CI_DEVICE });
    assert.ok(r.status < 500, `restore-purchases server error: ${r.status}`);
    const body = await r.json().catch(() => null);
    assert.ok(body !== null, 'restore-purchases returned non-JSON body');
    assert.ok(Array.isArray(body.purchases),
      `Expected purchases array — got: ${JSON.stringify(body)}`);
  });

  test('verify-play-purchase proxy rejects an invalid token', async () => {
    const r = await POST(`${APP}/api/verify-play-purchase`, {
      device_id:      CI_DEVICE,
      product_id:     'gold_s',
      purchase_token: 'ci-invalid-token-do-not-grant',
    });
    assert.ok(r.status < 500, `verify-play-purchase server error: ${r.status}`);
    const body = await r.json().catch(() => null);
    assert.ok(body !== null, 'verify-play-purchase returned non-JSON body');
    // This assertion protects against the most dangerous failure mode: granting items for free.
    assert.ok(
      body.success !== true,
      `CRITICAL: verify-play-purchase returned success:true for a fake token — ${JSON.stringify(body)}`
    );
  });
});

// ── Push notifications ────────────────────────────────────────────────────────

describe('push', () => {
  // Tests run sequentially inside a describe block — cleanup always follows the subscribe test.

  test('subscribe-push accepts a registration', async () => {
    const r = await POST(
      `${SB}/functions/v1/subscribe-push`,
      { device_id: CI_DEVICE, fcm_token: 'ci-invalid-fcm-000', timezone: 'UTC' },
      anon()
    );
    assert.ok(r.status < 500, `subscribe-push server error: ${r.status}`);
    const body = await r.json();
    assert.equal(body.ok, true, `subscribe-push failed — ${JSON.stringify(body)}`);
  });

  test('send-notifications function completes without error', async () => {
    // This is the real cron function. It respects the 22-hour dedup window,
    // so calling it here will not send duplicate notifications to real users.
    const r = await GET(`${SB}/functions/v1/send-notifications`, anon());
    assert.ok(r.status < 500, `send-notifications server error: ${r.status}`);
    const body = await r.json().catch(() => null);
    assert.ok(body !== null, 'send-notifications returned non-JSON');
    assert.equal(body.ok, true, `send-notifications returned ok:false — ${JSON.stringify(body)}`);
  });

  test('send-notifications: test_device targets CI subscriber and returns logs', async () => {
    // Calls the function with test_device= to bypass nighttime/dedup guards and
    // target only the CI subscriber registered above. Verifies the function found
    // the device, processed it, and returned structured debug logs.
    // FCM delivery itself will fail (invalid token) but that is expected — we are
    // testing the notification pipeline, not FCM reachability.
    const r = await POST(
      `${SB}/functions/v1/send-notifications?test_device=${CI_DEVICE}`,
      {},
      anon()
    );
    assert.ok(r.status < 500, `test_device call failed with ${r.status}`);
    const body = await r.json().catch(() => null);
    assert.ok(body !== null, 'send-notifications returned non-JSON');
    assert.equal(body.ok, true, `ok:false — ${JSON.stringify(body)}`);
    assert.equal(body.subs, 1, `Expected subs:1 for CI device — ${JSON.stringify(body)}`);
    assert.ok(
      Array.isArray(body.logs) && body.logs.some(l => l.includes(CI_DEVICE)),
      `CI device not found in debug logs — ${JSON.stringify(body)}`
    );
  });

  test('cleanup: delete CI push subscription', { skip: NEED_SVC }, async () => {
    const r = await fetch(`${SB}/rest/v1/push_subscriptions?device_id=eq.${CI_DEVICE}`, {
      method: 'DELETE', headers: svc(),
    });
    assert.ok(r.status < 300, `Cleanup DELETE failed: ${r.status}`);
  });
});

// ── subscribe-push: hammers_full_at preservation ─────────────────────────────

describe('push-hammers', () => {
  // Verifies that a partial subscribe-push update does NOT clear hammers_full_at
  // when the field is omitted — prevents the foreground-fill race condition where
  // auto-save was cancelling pending hammer-full notifications.

  const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 h

  test('set hammers_full_at on CI subscriber', { skip: NEED_SVC }, async () => {
    // Ensure CI device exists first
    await POST(`${SB}/functions/v1/subscribe-push`,
      { device_id: CI_DEVICE, fcm_token: 'ci-hammer-test-000', timezone: 'UTC', hammers_full_at: FUTURE },
      anon());
    // Verify it was stored
    const r = await GET(`${SB}/rest/v1/push_subscriptions?device_id=eq.${CI_DEVICE}&select=hammers_full_at`, svc());
    const rows = await r.json();
    assert.equal(rows[0]?.hammers_full_at, FUTURE, `hammers_full_at not stored: ${JSON.stringify(rows)}`);
  });

  test('partial update without hammers_full_at preserves existing value', { skip: NEED_SVC }, async () => {
    // Simulate what happens when hammers are full — client sends no hammers_full_at field
    const r = await POST(`${SB}/functions/v1/subscribe-push`,
      { device_id: CI_DEVICE },  // no hammers_full_at → should NOT clear the DB value
      anon());
    assert.equal((await r.json()).ok, true);

    const check = await GET(`${SB}/rest/v1/push_subscriptions?device_id=eq.${CI_DEVICE}&select=hammers_full_at`, svc());
    const rows  = await check.json();
    assert.equal(rows[0]?.hammers_full_at, FUTURE,
      `hammers_full_at was cleared when it should have been preserved: ${JSON.stringify(rows)}`);
  });

  test('cleanup: delete CI hammer-test subscription', { skip: NEED_SVC }, async () => {
    const r = await fetch(`${SB}/rest/v1/push_subscriptions?device_id=eq.${CI_DEVICE}`,
      { method: 'DELETE', headers: svc() });
    assert.ok(r.status < 300, `Cleanup failed: ${r.status}`);
  });
});

// ── Cloud save round-trip ─────────────────────────────────────────────────────

describe('cloud', () => {
  test('game save write → read → verify → delete', { skip: NEED_SVC }, async () => {
    // Create a temporary Supabase auth user so game_saves FK constraint is satisfied.
    const createRes = await POST(
      `${SB}/auth/v1/admin/users`,
      { email: `ci-smoke-${Date.now()}@ci.invalid`, password: 'CI-smoke-!1Az', email_confirm: true },
      { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
    );
    assert.equal(createRes.status, 200, `Failed to create CI test user: ${createRes.status}`);
    const { id: userId } = await createRes.json();
    assert.ok(userId, 'No user_id returned from auth user creation');

    const payload = `lz:ci-test-${Date.now()}`;

    try {
      // Write
      const writeRes = await POST(
        `${SB}/rest/v1/game_saves`,
        { user_id: userId, save_data: payload, saved_at: new Date().toISOString(), last_seen_at: new Date().toISOString() },
        svc({ Prefer: 'resolution=merge-duplicates,return=minimal' })
      );
      assert.ok(writeRes.status < 300, `game_saves write failed: ${writeRes.status}`);

      // Read back
      const readRes = await GET(`${SB}/rest/v1/game_saves?user_id=eq.${userId}&select=save_data`, svc());
      assert.equal(readRes.status, 200);
      const rows = await readRes.json();
      assert.equal(rows[0]?.save_data, payload, `Round-trip mismatch: wrote "${payload}", read "${rows[0]?.save_data}"`);
    } finally {
      // Always clean up even if assertions above fail.
      await fetch(`${SB}/rest/v1/game_saves?user_id=eq.${userId}`,
        { method: 'DELETE', headers: svc() }).catch(() => {});
      await fetch(`${SB}/auth/v1/admin/users/${userId}`,
        { method: 'DELETE', headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
    }
  });
});
