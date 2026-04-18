import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import webpush from 'npm:web-push'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL   = Deno.env.get('VAPID_EMAIL') ?? 'mailto:yotam@exacti.us'

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Returns true if it's quiet hours (9pm–8am) in the user's local timezone
function isNighttime(tz: string | null): boolean {
  if (!tz) return false
  try {
    const hour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', hour12: false,
    }).format(new Date()), 10)
    return hour < 8 || hour >= 21
  } catch { return false }
}

async function sendPush(subscription: object, payload: object): Promise<boolean> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return true
  } catch (e: any) {
    if (e.statusCode === 410) return false  // expired — remove it
    console.warn('[push] send failed', e.statusCode, e.body)
    return true  // keep subscription, may be a temporary error
  }
}

serve(async (req) => {
  const url        = new URL(req.url)
  const testDevice = url.searchParams.get('test_device')  // bypass all checks for this device_id
  const now        = new Date()
  const inactiveCutoff  = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString()
  const dedupeCutoff    = new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString()

  // Fetch subscriptions — all, or just the test device
  let query = supabase
    .from('push_subscriptions')
    .select('device_id, subscription, user_id, updated_at, last_notified_at, timezone')
  if (testDevice) query = query.eq('device_id', testDevice)
  const { data: subs } = await query

  if (!subs?.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })

  // Fetch game_saves for authenticated users (last_seen_at / hammers_full_at)
  const userIds = subs.filter(s => s.user_id).map(s => s.user_id as string)
  const { data: saves } = userIds.length > 0
    ? await supabase.from('game_saves').select('user_id, last_seen_at, hammers_full_at').in('user_id', userIds)
    : { data: [] as any[] }
  const savesMap = new Map((saves ?? []).map((s: any) => [s.user_id, s]))

  const expiredDevices: string[]  = []
  const notifiedDevices: string[] = []
  let sent = 0

  for (const sub of subs) {
    const isTest = !!testDevice

    // Skip nighttime unless this is a test ping
    if (!isTest && isNighttime(sub.timezone)) continue

    const save     = sub.user_id ? savesMap.get(sub.user_id) : null
    const lastSeen = save?.last_seen_at ?? sub.updated_at
    const inactive = new Date(lastSeen) < new Date(inactiveCutoff)

    // --- Hammers-full notification (authenticated users only) ---
    let sentHammersFull = false
    if (save?.hammers_full_at) {
      const fullAt        = new Date(save.hammers_full_at)
      const seenAfterFull = save.last_seen_at && new Date(save.last_seen_at) >= fullAt
      if ((fullAt < now && !seenAfterFull) || isTest) {
        const ok = await sendPush(sub.subscription, {
          title: 'Egg Breaker Adventures',
          body:  'Your hammers are full — come break some eggs!',
          tag:   'hammers-full',
          url:   '/',
        })
        if (!ok) expiredDevices.push(sub.device_id)
        else {
          sentHammersFull = true
          sent++
          notifiedDevices.push(sub.device_id)
          if (!isTest) {
            await supabase.from('game_saves').update({ hammers_full_at: null }).eq('user_id', sub.user_id)
          }
        }
      }
    }

    // --- Daily-reward notification ---
    // Skip if: recently notified (within 22h), or just sent hammers-full
    const recentlyNotified = sub.last_notified_at && new Date(sub.last_notified_at) > new Date(dedupeCutoff)
    if ((inactive || isTest) && !sentHammersFull && !recentlyNotified) {
      const ok = await sendPush(sub.subscription, {
        title: 'Egg Breaker Adventures',
        body:  'Your daily reward is ready. Come claim it!',
        tag:   'daily-reward',
        url:   '/?tab=daily',
      })
      if (!ok) expiredDevices.push(sub.device_id)
      else {
        sent++
        notifiedDevices.push(sub.device_id)
      }
    }
  }

  // Stamp last_notified_at for all devices that received any notification
  if (notifiedDevices.length) {
    await supabase.from('push_subscriptions')
      .update({ last_notified_at: now.toISOString() })
      .in('device_id', notifiedDevices)
  }

  if (expiredDevices.length) {
    await supabase.from('push_subscriptions').delete().in('device_id', expiredDevices)
  }

  return new Response(JSON.stringify({ ok: true, sent, test: !!testDevice }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
