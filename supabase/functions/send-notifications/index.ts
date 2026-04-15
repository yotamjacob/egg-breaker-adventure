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

async function sendPush(subscription: object, payload: object): Promise<boolean> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return true
  } catch (e: any) {
    // 410 Gone = subscription expired, remove it
    if (e.statusCode === 410) return false
    console.warn('[push] send failed', e.statusCode, e.body)
    return true // keep subscription, may be temporary
  }
}

serve(async (req) => {
  // Allow manual trigger via POST or scheduled invocation
  const now = new Date()

  // 1. Daily reward notification — send to all subscribers not seen in last 20 hours
  const { data: dailySubs } = await supabase
    .from('push_subscriptions')
    .select('device_id, subscription')
    .lt('updated_at', new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString())

  const expiredDevices: string[] = []

  for (const row of dailySubs ?? []) {
    const ok = await sendPush(row.subscription, {
      title: 'Egg Breaker Adventure Revival',
      body: 'Your daily reward is ready. Come claim it.',
      tag: 'daily-reward',
      url: '/?tab=daily',
    })
    if (!ok) expiredDevices.push(row.device_id)
  }

  // 2. Hammers full notification
  const { data: hammerSubs } = await supabase
    .from('game_saves')
    .select('device_id, hammers_full_at, last_seen_at, push_subscriptions(subscription)')
    .not('hammers_full_at', 'is', null)
    .lt('hammers_full_at', now.toISOString())
    // only if user hasn't opened the app since hammers filled
    .lt('last_seen_at', supabase.rpc ? 'hammers_full_at' : now.toISOString())

  for (const row of hammerSubs ?? []) {
    if (!row.last_seen_at || new Date(row.last_seen_at) >= new Date(row.hammers_full_at)) continue
    const sub = (row as any).push_subscriptions?.[0]?.subscription
    if (!sub) continue
    const ok = await sendPush(sub, {
      title: 'Egg Breaker Adventure Revival',
      body: 'Your hammers are full.',
      tag: 'hammers-full',
      url: '/',
    })
    if (!ok && row.device_id) expiredDevices.push(row.device_id)
    // Clear hammers_full_at so we don't re-notify
    await supabase.from('game_saves').update({ hammers_full_at: null }).eq('device_id', row.device_id)
  }

  // Remove expired subscriptions
  if (expiredDevices.length) {
    await supabase.from('push_subscriptions').delete().in('device_id', expiredDevices)
  }

  return new Response(JSON.stringify({ ok: true, sent: (dailySubs?.length ?? 0) }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
