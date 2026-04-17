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
    if (e.statusCode === 410) return false  // expired — remove it
    console.warn('[push] send failed', e.statusCode, e.body)
    return true  // keep subscription, may be a temporary error
  }
}

serve(async () => {
  const now     = new Date()
  const cutoff  = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString()

  // Fetch all push subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('device_id, subscription, user_id, updated_at')

  if (!subs?.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { 'Content-Type': 'application/json' } })

  // Fetch game_saves for authenticated users so we can use last_seen_at / hammers_full_at
  const userIds = subs.filter(s => s.user_id).map(s => s.user_id as string)
  const { data: saves } = userIds.length > 0
    ? await supabase.from('game_saves').select('user_id, last_seen_at, hammers_full_at').in('user_id', userIds)
    : { data: [] as any[] }

  const savesMap = new Map((saves ?? []).map((s: any) => [s.user_id, s]))

  const expiredDevices: string[] = []
  let sent = 0

  for (const sub of subs) {
    const save      = sub.user_id ? savesMap.get(sub.user_id) : null
    // lastSeen: prefer game_saves.last_seen_at (updated on every save), fall back to subscription timestamp
    const lastSeen  = save?.last_seen_at ?? sub.updated_at
    const inactive  = new Date(lastSeen) < new Date(cutoff)

    // Hammers-full check (authenticated users only — requires game_saves)
    let sentHammersFull = false
    if (save?.hammers_full_at) {
      const fullAt       = new Date(save.hammers_full_at)
      const seenAfterFull = save.last_seen_at && new Date(save.last_seen_at) >= fullAt
      if (fullAt < now && !seenAfterFull) {
        const ok = await sendPush(sub.subscription, {
          title: 'Egg Breaker Adventure Revival',
          body:  'Your hammers are full — come break some eggs!',
          tag:   'hammers-full',
          url:   '/',
        })
        if (!ok) expiredDevices.push(sub.device_id)
        else {
          sentHammersFull = true
          sent++
          await supabase.from('game_saves').update({ hammers_full_at: null }).eq('user_id', sub.user_id)
        }
      }
    }

    // Daily reward — skip if we just sent a hammers-full (avoid double-notifying)
    if (inactive && !sentHammersFull) {
      const ok = await sendPush(sub.subscription, {
        title: 'Egg Breaker Adventure Revival',
        body:  'Your daily reward is ready. Come claim it!',
        tag:   'daily-reward',
        url:   '/?tab=daily',
      })
      if (!ok) expiredDevices.push(sub.device_id)
      else sent++
    }
  }

  if (expiredDevices.length) {
    await supabase.from('push_subscriptions').delete().in('device_id', expiredDevices)
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
