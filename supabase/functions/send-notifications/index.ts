import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import webpush from 'npm:web-push'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL   = Deno.env.get('VAPID_EMAIL') ?? 'mailto:yotam@exacti.us'

// Max parallel push sends — keeps well within FCM rate limits and edge fn timeout
const CONCURRENCY = 50
// Rows per DB page — PostgREST default is 1000, be explicit
const PAGE_SIZE   = 500
// Max devices per bulk UPDATE/DELETE — avoids URL-length issues in PostgREST
const DB_BATCH    = 1000

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ── FCM helpers ────────────────────────────────────────────────────────────────

let _fcmAccessToken: string | null = null
let _fcmTokenExpiry = 0

async function getFcmAccessToken(): Promise<string> {
  if (_fcmAccessToken && Date.now() < _fcmTokenExpiry - 60_000) return _fcmAccessToken

  const sa = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!)

  const now   = Math.floor(Date.now() / 1000)
  const claim = {
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  const header  = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const payload = btoa(JSON.stringify(claim)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const toSign  = header + '.' + payload

  const pemBody    = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const keyBuffer  = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey  = await crypto.subtle.importKey(
    'pkcs8', keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )
  const sigBuffer  = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(toSign))
  const sig        = btoa(String.fromCharCode(...new Uint8Array(sigBuffer))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const jwt        = toSign + '.' + sig

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await resp.json()
  if (!data.access_token) throw new Error(`FCM OAuth failed: ${JSON.stringify(data)}`)
  _fcmAccessToken = data.access_token
  _fcmTokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000
  return _fcmAccessToken!
}

async function sendFcm(fcmToken: string, payload: { title: string; body: string; tag: string; url: string }, logs: string[]): Promise<boolean> {
  try {
    const sa          = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!)
    const projectId   = sa.project_id
    const accessToken = await getFcmAccessToken()

    const resp = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title: payload.title, body: payload.body },
            data:          { url: payload.url, tag: payload.tag },
            android:       { priority: 'high' },
          },
        }),
      }
    )
    if (!resp.ok) {
      const body = await resp.text()
      logs.push(`[fcm] status=${resp.status} body=${body}`)
      console.warn('[fcm] send failed', resp.status, body)
      if (resp.status === 404 || resp.status === 410) return false
      return true
    }
    logs.push(`[fcm] sent OK`)
    return true
  } catch (e: any) {
    logs.push(`[fcm] exception: ${e?.message}`)
    console.warn('[fcm] send failed (exception)', e)
    return true
  }
}

// ── Web Push helper ────────────────────────────────────────────────────────────

async function sendWebPush(subscription: object, payload: object): Promise<boolean> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return true
  } catch (e: any) {
    if (e.statusCode === 410 || e.statusCode === 404) return false
    console.warn('[webpush] send failed', e.statusCode, e.body)
    return true
  }
}

// ── Nighttime guard ────────────────────────────────────────────────────────────

function isNighttime(tz: string | null): boolean {
  if (!tz) return false
  try {
    const hour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', hour12: false,
    }).format(new Date()), 10)
    return hour < 8 || hour >= 21
  } catch { return false }
}

// ── Concurrency helper ─────────────────────────────────────────────────────────

// Process items in chunks of `concurrency` parallel operations.
// JS is single-threaded so shared array mutations between concurrent callbacks are safe.
async function runConcurrent<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    await Promise.all(items.slice(i, i + concurrency).map(fn))
  }
}

// Bulk DB update/delete in safe-sized batches to avoid PostgREST URL-length limits
async function bulkUpdate(devices: string[], patch: Record<string, unknown>) {
  for (let i = 0; i < devices.length; i += DB_BATCH) {
    const { error } = await supabase
      .from('push_subscriptions')
      .update(patch)
      .in('device_id', devices.slice(i, i + DB_BATCH))
    if (error) console.error('[send-notif] bulk update failed', error)
  }
}

async function bulkDelete(devices: string[]) {
  for (let i = 0; i < devices.length; i += DB_BATCH) {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .in('device_id', devices.slice(i, i + DB_BATCH))
    if (error) console.error('[send-notif] bulk delete failed', error)
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  const url        = new URL(req.url)
  const testDevice = url.searchParams.get('test_device')
  const now        = new Date()
  const nowIso     = now.toISOString()

  const inactiveCutoff     = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString()
  const dedupeCutoff       = new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString()
  const hammersDedupCutoff = new Date(now.getTime() - 10 * 60 * 1000).toISOString()

  // ── Fetch only eligible subscribers ───────────────────────────────────────
  // Conditions (applied in SQL — never load the whole table):
  //   • not recently notified: last_notified_at IS NULL OR < 22h ago
  //   • actually needs a notification: hammers_full_at < now  OR  updated_at < 20h ago
  //
  // updated_at is a reliable last-activity proxy because every auto-save (every 15 min)
  // patches push_subscriptions.hammers_full_at, which bumps updated_at.

  const allSubs: any[] = []

  if (testDevice) {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('device_id, subscription, fcm_token, timezone, last_notified_at, hammers_full_at, updated_at')
      .eq('device_id', testDevice)
    if (data) allSubs.push(...data)
  } else {
    let page = 0
    while (true) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('device_id, subscription, fcm_token, timezone, last_notified_at, hammers_full_at, updated_at')
        .or(`last_notified_at.is.null,last_notified_at.lt.${dedupeCutoff}`)
        .or(`hammers_full_at.lt.${nowIso},updated_at.lt.${inactiveCutoff}`)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) { console.error('[send-notif] query error', error); break }
      if (!data?.length) break
      allSubs.push(...data)
      if (data.length < PAGE_SIZE) break
      page++
    }
  }

  if (!allSubs.length) return new Response(JSON.stringify({ ok: true, sent: 0, subs: 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })

  const expiredDevices: string[]     = []
  const notifiedDevices: string[]    = []
  const hammersFullDevices: string[] = []
  const debugLogs: string[]          = []
  let sent = 0

  // ── Send notifications concurrently ───────────────────────────────────────
  await runConcurrent(allSubs, async (sub) => {
    const isTest = !!testDevice
    if (!isTest && isNighttime(sub.timezone)) return

    const logs = isTest ? debugLogs : []

    const sendPush = sub.fcm_token
      ? (p: any) => sendFcm(sub.fcm_token, p, logs)
      : sub.subscription
        ? (p: any) => sendWebPush(sub.subscription, p)
        : null
    if (!sendPush) { logs.push(`device=${sub.device_id} skip: no delivery method`); return }

    logs.push(`device=${sub.device_id} fcm=${!!sub.fcm_token} hammers_full_at=${sub.hammers_full_at ?? 'none'}`)

    // Hammers-full notification
    let sentHammersFull = false
    if (sub.hammers_full_at) {
      const fullAt = new Date(sub.hammers_full_at)
      const recentlyHammersNotified = sub.last_notified_at && new Date(sub.last_notified_at) > new Date(hammersDedupCutoff)
      logs.push(`hammers check: fullAt=${fullAt.toISOString()} past=${fullAt < now} recentDedup=${recentlyHammersNotified}`)
      if ((fullAt < now || isTest) && (!recentlyHammersNotified || isTest)) {
        const ok = await sendPush({ title: 'Egg Smash Adventures', body: "Your hammers are full, get smashin'!", tag: 'hammers-full', url: '/' })
        if (!ok) expiredDevices.push(sub.device_id)
        else {
          sentHammersFull = true
          sent++
          notifiedDevices.push(sub.device_id)
          hammersFullDevices.push(sub.device_id)
          logs.push('hammers-full sent')
        }
      }
    }

    // Daily reward notification
    const recentlyNotified = sub.last_notified_at && new Date(sub.last_notified_at) > new Date(dedupeCutoff)
    const inactive = new Date(sub.updated_at) < new Date(inactiveCutoff)
    logs.push(`daily check: inactive=${inactive} sentHammersFull=${sentHammersFull} recentDedup=${recentlyNotified}`)
    if ((inactive || isTest) && !sentHammersFull && !recentlyNotified) {
      const ok = await sendPush({ title: 'Egg Smash Adventures', body: 'Your daily reward is ready. Come claim it!', tag: 'daily-reward', url: '/?tab=daily' })
      if (!ok) expiredDevices.push(sub.device_id)
      else { sent++; notifiedDevices.push(sub.device_id); logs.push('daily sent') }
    }
  }, CONCURRENCY)

  // ── Bulk DB updates ────────────────────────────────────────────────────────
  if (notifiedDevices.length)   await bulkUpdate(notifiedDevices, { last_notified_at: nowIso })
  if (hammersFullDevices.length) await bulkUpdate(hammersFullDevices, { hammers_full_at: null })
  if (expiredDevices.length)    await bulkDelete(expiredDevices)

  console.log(`[send-notif] done — sent=${sent} eligible=${allSubs.length} expired=${expiredDevices.length}`)

  return new Response(JSON.stringify({
    ok: true, sent, subs: allSubs.length,
    ...(testDevice ? { logs: debugLogs } : {}),
  }), { headers: { 'Content-Type': 'application/json' } })
})
