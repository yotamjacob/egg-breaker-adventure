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
  return status === 400 || status === 401 || status === 403;
}

describe('reconnect HTTP status decision', () => {
  test('400 (invalid_grant — token expired/rotated) → give up permanently', () => {
    assert.equal(reconnectGivesUp(400), true);
  });

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

// ── Duplicate SIGNED_OUT guard ────────────────────────────────────────────────
// Bug: Supabase fires SIGNED_OUT twice on startup when stored session is expired.
// Both calls hit the SIGNED_OUT handler, scheduling two simultaneous reconnects.
// Fix: if _pendingReconnect is already true when SIGNED_OUT arrives, ignore it.

function signedOutShouldSchedule(pendingReconnect, isUnlinking, linkPref) {
  if (isUnlinking) return false;
  if (linkPref !== 'linked') return false;
  if (pendingReconnect) return false; // duplicate — already scheduled
  return true;
}

describe('duplicate SIGNED_OUT guard', () => {
  test('first SIGNED_OUT schedules reconnect', () => {
    assert.equal(signedOutShouldSchedule(false, false, 'linked'), true);
  });

  test('second SIGNED_OUT is ignored (pendingReconnect already true)', () => {
    // Regression: without this guard, two simultaneous reconnects both get 400
    // and both call _clearCloudState(), producing confusing double-log entries.
    assert.equal(signedOutShouldSchedule(true, false, 'linked'), false);
  });

  test('SIGNED_OUT during unlinking is ignored regardless of pendingReconnect', () => {
    assert.equal(signedOutShouldSchedule(false, true, 'linked'), false);
  });

  test('SIGNED_OUT with pref=unlinked never schedules reconnect', () => {
    assert.equal(signedOutShouldSchedule(false, false, 'unlinked'), false);
  });
});

// ── Concurrent refresh dedup ──────────────────────────────────────────────────
// Bug: visibilitychange + auto-save can both trigger _refreshCloudSession at the
// same moment. Two simultaneous token-rotation requests corrupt the refresh token
// chain — one caller gets the new token, the other uses a now-invalidated token.
// Fix: _refreshInFlight promise dedup — second caller awaits the first promise.

function refreshDedupDecision(inFlight) {
  return inFlight ? 'dedup' : 'start';
}

describe('concurrent refresh dedup', () => {
  test('first caller starts a new refresh', () => {
    assert.equal(refreshDedupDecision(null), 'start');
  });

  test('second concurrent caller is deduped (awaits existing promise)', () => {
    // Regression: two simultaneous POST /auth/v1/token?grant_type=refresh_token
    // with the same refresh_token — Supabase rotates it on first use, making the
    // second request fail with 400 invalid_grant and clearing the session.
    const fakePromise = Promise.resolve(true);
    assert.equal(refreshDedupDecision(fakePromise), 'dedup');
  });

  test('after first refresh completes, next call starts fresh', () => {
    assert.equal(refreshDedupDecision(null), 'start'); // _refreshInFlight reset to null
  });
});

// ── _cloudRefTok must be persisted immediately after raw HTTP refresh ─────────
// Bug (v2.5.59): _cloudRefTok was only written inside onAuthStateChange, which
// fires asynchronously after _sbClient.auth.setSession(). A force-close between
// the raw HTTP refresh and that callback left _cloudRefTok pointing at the
// already-rotated (consumed) old token — causing HTTP 400 on the next cold start.
// Fix: write _cloudRefTok to localStorage immediately after raw HTTP refresh,
// before the async setSession call.
//
// Invariant: after rawHttpRefreshSucceeds(), storage must contain the NEW token,
// not the old one, so a force-close at any point afterwards is safe.

function simulateRawHttpRefreshWithImmediateStorage(newRefreshToken, storage) {
  // Mirrors the fixed code path in _doRefreshCloudSession:
  // 1. Raw HTTP refresh returns new tokens
  // 2. Write _cloudRefTok immediately (the fix)
  // 3. setSession() is called async (not modelled here — simulating force-close window)
  if (newRefreshToken) {
    storage['_cloudRefTok'] = newRefreshToken;
  }
  return storage['_cloudRefTok'];
}

function simulateRawHttpRefreshWithoutImmediateStorage(newRefreshToken, storage) {
  // The old (buggy) code path: _cloudRefTok only written via onAuthStateChange,
  // which fires after setSession resolves. Simulates force-close before that fires.
  // storage is never written here — simulates the kill-window.
  return storage['_cloudRefTok']; // still holds old token
}

describe('_cloudRefTok persisted immediately after raw HTTP refresh', () => {
  test('fix: storage holds NEW token immediately after raw refresh (safe for force-close)', () => {
    const storage = { '_cloudRefTok': 'old-token' };
    const result = simulateRawHttpRefreshWithImmediateStorage('new-token', storage);
    assert.equal(result, 'new-token',
      'after raw HTTP refresh, _cloudRefTok must be the new token before setSession fires');
  });

  test('regression: old code leaves stale token in storage during kill window', () => {
    // Documents the bug: if force-close happens before onAuthStateChange fires,
    // the next reconnect uses the old (already-rotated) token → HTTP 400.
    const storage = { '_cloudRefTok': 'old-token' };
    const result = simulateRawHttpRefreshWithoutImmediateStorage('new-token', storage);
    assert.equal(result, 'old-token',
      'without the fix, storage still holds old token during the async window — reconnect fails with 400');
  });

  test('storage is not overwritten when server returns no new refresh token', () => {
    // Supabase always returns a new refresh_token, but guard against null just in case.
    const storage = { '_cloudRefTok': 'existing-token' };
    simulateRawHttpRefreshWithImmediateStorage(null, storage);
    assert.equal(storage['_cloudRefTok'], 'existing-token',
      'when d.refresh_token is falsy, _cloudRefTok must not be cleared');
  });
});
