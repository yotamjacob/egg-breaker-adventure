import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1',
  'https://egg-breaker-adventures.vercel.app',
  ...(Deno.env.get('ALLOWED_ORIGIN') ? [Deno.env.get('ALLOWED_ORIGIN')!] : []),
])

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : null
  return {
    'Access-Control-Allow-Origin': allowed ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const hdrs = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: hdrs })

  try {
    const { device_id, subscription, fcm_token, user_id, timezone, hammers_full_at } = await req.json()
    if (!device_id) {
      return new Response(JSON.stringify({ error: 'missing device_id' }), { status: 400, headers: hdrs })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Partial update: only hammers_full_at (no new subscription token needed).
    // Only update the field when a value is provided — never clear a pending timestamp.
    if (!subscription && !fcm_token) {
      if (hammers_full_at) {
        const { error } = await supabase
          .from('push_subscriptions')
          .update({ hammers_full_at })
          .eq('device_id', device_id)
        if (error) throw error
      }
      return new Response(JSON.stringify({ ok: true }), { headers: hdrs })
    }

    // Full upsert — only include hammers_full_at when the client explicitly provides it.
    // Omitting it lets the server's notification-sent clear (null) survive the next app open.
    const patch: Record<string, unknown> = {
      device_id,
      subscription:  subscription || null,
      fcm_token:     fcm_token    || null,
      user_id:       user_id      || null,
      timezone:      timezone     || null,
      updated_at:    new Date().toISOString(),
    }
    if (hammers_full_at) patch.hammers_full_at = hammers_full_at

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(patch, { onConflict: 'device_id' })

    if (error) throw error
    return new Response(JSON.stringify({ ok: true }), { headers: hdrs })
  } catch (e) {
    console.error('[subscribe-push]', e)
    return new Response(JSON.stringify({ error: 'internal error' }), { status: 500, headers: hdrs })
  }
})
