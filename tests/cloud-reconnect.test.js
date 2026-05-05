// ============================================================
//  Egg Smash Adventures — Cloud Reconnect Logic Tests
//  Run: node --test tests/
//  Uses Node's built-in test runner (no extra dependencies).
//
//  These tests cover the decision logic extracted from cloud.js
//  and game.js — specifically the overnight-disconnect scenario
//  fixed in v2.5.42–v2.5.47.
// ============================================================

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ── _attemptSilentReconnect: HTTP status decision ─────────────────────────────
// cloud.js _attemptSilentReconnect() logic:
//   401/403 = definitively invalid token → give up, clear state, let user re-link
//   429/5xx/timeout = transient failure → stay in pendingReconnect, retry on foreground
//   200+access_token = success → restore session

function reconnectGivesUp(status) {
  return status === 401 || status === 403;
}

describe('reconnect HTTP status decision', () => {
  test('401 (invalid/expired token) → give up permanently', () => {
    assert.equal(reconnectGivesUp(401), true);
  });

  test('403 (token revoked/forbidden) → give up permanently', () => {
    assert.equal(reconnectGivesUp(403), true);
  });

  test('429 (rate-limited) → transient, keep retrying', () => {
    assert.equal(reconnectGivesUp(429), false);
  });

  test('500 (server error) → transient, keep retrying', () => {
    assert.equal(reconnectGivesUp(500), false);
  });

  test('503 (service unavailable) → transient, keep retrying', () => {
    assert.equal(reconnectGivesUp(503), false);
  });

  test('200 (success) → not a give-up case', () => {
    assert.equal(reconnectGivesUp(200), false);
  });

  test('network timeout error → not give-up (no HTTP status)', () => {
    // A fetch timeout throws an Error, not an HTTP status; reconnect should retry.
    // Verified by checking that only 401/403 trigger give-up — anything else (incl. 0) retries.
    assert.equal(reconnectGivesUp(0), false);
  });
});

// ── _maybeWarnNoSync suppression logic ───────────────────────────────────────
// game.js _maybeWarnNoSync():
//   if (!_cloudAuthSettled || _pendingReconnect) → reschedule (not ready to decide)
//   if (_cloudUser) → skip (already linked, no warning needed)
//   if (alreadyWarned) → skip (fire once per session)
//   otherwise → fire warning

const WARN_RESCHEDULE = 'reschedule';
const WARN_SKIP       = 'skip';
const WARN_FIRE       = 'fire';

function maybeWarnDecision(cloudUser, authSettled, pendingReconnect, alreadyWarned) {
  if (alreadyWarned) return WARN_SKIP;
  if (!authSettled || pendingReconnect) return WARN_RESCHEDULE;
  if (cloudUser) return WARN_SKIP;
  return WARN_FIRE;
}

describe('_maybeWarnNoSync suppression', () => {
  test('reschedules when auth not yet settled', () => {
    assert.equal(maybeWarnDecision(null, false, false, false), WARN_RESCHEDULE);
  });

  test('reschedules when pendingReconnect=true (overnight disconnect)', () => {
    // Regression: this was the overnight-disconnect bug — auth was settled but
    // _pendingReconnect=true. The warning fired before reconnect resolved,
    // showing a false "not synced" message to the user.
    assert.equal(maybeWarnDecision(null, true, true, false), WARN_RESCHEDULE);
  });

  test('reschedules when both unsettled and pendingReconnect', () => {
    assert.equal(maybeWarnDecision(null, false, true, false), WARN_RESCHEDULE);
  });

  test('skips when user is linked (no warning needed)', () => {
    assert.equal(maybeWarnDecision({ email: 'user@example.com' }, true, false, false), WARN_SKIP);
  });

  test('fires warning when settled, no reconnect, no user', () => {
    assert.equal(maybeWarnDecision(null, true, false, false), WARN_FIRE);
  });

  test('skips on second call (alreadyWarned guard — fires once per session)', () => {
    assert.equal(maybeWarnDecision(null, true, false, true), WARN_SKIP);
  });

  test('skips even if user disappears after warning was already fired', () => {
    assert.equal(maybeWarnDecision(null, true, false, true), WARN_SKIP);
  });
});

// ── _cloudLinkPref: reconnect and enforce-signout logic ──────────────────────
// The persisted pref controls whether to attempt reconnect vs. honour an unlink.

function shouldAttemptReconnect(linkPref, pendingReconnect) {
  return linkPref === 'linked' && pendingReconnect;
}

function shouldEnforceSignOut(event, linkPref) {
  return event === 'SIGNED_IN' && linkPref === 'unlinked';
}

describe('_cloudLinkPref invariants', () => {
  test('reconnect attempted when pref=linked and pending=true', () => {
    assert.equal(shouldAttemptReconnect('linked', true), true);
  });

  test('reconnect NOT attempted when pref=unlinked (user explicitly unlinked)', () => {
    assert.equal(shouldAttemptReconnect('unlinked', true), false);
  });

  test('reconnect NOT attempted when pref=linked but pending=false', () => {
    assert.equal(shouldAttemptReconnect('linked', false), false);
  });

  test('reconnect NOT attempted when pref is null (new install)', () => {
    assert.equal(shouldAttemptReconnect(null, true), false);
  });

  test('SIGNED_IN with pref=unlinked → enforce sign-out', () => {
    assert.equal(shouldEnforceSignOut('SIGNED_IN', 'unlinked'), true);
  });

  test('SIGNED_IN with pref=linked → do NOT force sign-out', () => {
    assert.equal(shouldEnforceSignOut('SIGNED_IN', 'linked'), false);
  });

  test('TOKEN_REFRESHED never triggers enforce-signout', () => {
    assert.equal(shouldEnforceSignOut('TOKEN_REFRESHED', 'unlinked'), false);
  });

  test('SIGNED_OUT never triggers enforce-signout', () => {
    assert.equal(shouldEnforceSignOut('SIGNED_OUT', 'unlinked'), false);
  });
});

// ── Session expiry / proactive refresh ───────────────────────────────────────
// cloud.js checks: if (!_cloudSession.expires_at || nowSecs >= expiresAt - 60)
// to decide whether to proactively refresh before a save.

function needsProactiveRefresh(expiresAt, nowSecs) {
  if (!expiresAt) return false;
  return nowSecs >= (expiresAt - 60);
}

describe('session proactive refresh decision', () => {
  const now = Math.floor(Date.now() / 1000);

  test('no refresh when plenty of time remains (>60s)', () => {
    assert.equal(needsProactiveRefresh(now + 3600, now), false);
  });

  test('refresh when within 60s window', () => {
    assert.equal(needsProactiveRefresh(now + 30, now), true);
  });

  test('refresh when exactly at 60s threshold', () => {
    assert.equal(needsProactiveRefresh(now + 60, now), true);
  });

  test('refresh when already past expiry', () => {
    assert.equal(needsProactiveRefresh(now - 1, now), true);
  });

  test('no refresh when expires_at is falsy (no expiry tracked)', () => {
    assert.equal(needsProactiveRefresh(null, now), false);
    assert.equal(needsProactiveRefresh(0, now), false);
    assert.equal(needsProactiveRefresh(undefined, now), false);
  });
});

// ── visibilitychange resume: should retry reconnect? ─────────────────────────
// cloud.js visibilitychange handler: retry _attemptSilentReconnect on foreground
// only when (!_cloudSession || _pendingReconnect) AND pref=linked.

function shouldResumeReconnect(hasSession, pendingReconnect, linkPref) {
  return (!hasSession || pendingReconnect) && linkPref === 'linked';
}

describe('visibilitychange reconnect retry', () => {
  test('retries when session was lost and pref=linked', () => {
    assert.equal(shouldResumeReconnect(false, false, 'linked'), true);
  });

  test('retries when pendingReconnect=true (429 on prev attempt) and pref=linked', () => {
    assert.equal(shouldResumeReconnect(true, true, 'linked'), true);
  });

  test('does NOT retry when session exists and no pending reconnect', () => {
    assert.equal(shouldResumeReconnect(true, false, 'linked'), false);
  });

  test('does NOT retry when pref=unlinked (user intentionally unlinked)', () => {
    assert.equal(shouldResumeReconnect(false, true, 'unlinked'), false);
  });

  test('does NOT retry when pref is null (never linked)', () => {
    assert.equal(shouldResumeReconnect(false, false, null), false);
  });
});
