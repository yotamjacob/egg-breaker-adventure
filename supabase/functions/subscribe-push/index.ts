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
    const { device_id, subscription, user_id } = await req.json()
    if (!device_id || !subscription) {
      return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400, headers: hdrs })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { device_id, subscription, user_id: user_id || null, updated_at: new Date().toISOString() },
        { onConflict: 'device_id' }
      )

    if (error) throw error
    return new Response(JSON.stringify({ ok: true }), { headers: hdrs })
  } catch (e) {
    console.error('[subscribe-push]', e)
    return new Response(JSON.stringify({ error: 'internal error' }), { status: 500, headers: hdrs })
  }
})
