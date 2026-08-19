import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Products that can be granted via daily reward (not real purchases).
// Keep this allowlist tight — these get inserted into play_purchases so
// restore-purchases won't revoke them.
const DAILY_GRANT_PRODUCTS = new Set(['goldmagnet'])

const ALLOWED_ORIGINS = new Set([
  'https://egg-breaker-adventures.vercel.app',
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1',
  ...(Deno.env.get('ALLOWED_ORIGIN') ? [Deno.env.get('ALLOWED_ORIGIN')!] : []),
])

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// ── Input shape checks (v3.10.11) ─────────────────────────────────────────
// device_id is 'eba-<uuid>' from payments.js getDeviceId() (one legacy CI id
// is 'ci-…'); user_id is a Supabase auth UUID. Reject anything else before
// touching the DB or Google — these endpoints are unauthenticated relays.
const DEVICE_RE = /^[A-Za-z0-9_.:-]{4,80}$/
const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function checkIds(device_id: unknown, user_id: unknown) {
  if (typeof device_id !== 'string' || !DEVICE_RE.test(device_id)) throw new Error('Invalid device_id')
  if (user_id != null && user_id !== '' && (typeof user_id !== 'string' || !UUID_RE.test(user_id))) throw new Error('Invalid user_id')
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const hdrs = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: hdrs })

  try {
    const { device_id, user_id, product_id } = await req.json()
    if (!device_id) throw new Error('Missing device_id')
    checkIds(device_id, user_id)
    if (!product_id || !DAILY_GRANT_PRODUCTS.has(product_id)) throw new Error('Invalid product_id')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Use a stable synthetic token so this is idempotent — safe to call multiple times.
    const purchase_token = `daily:${product_id}:${device_id}`

    const { error } = await supabase.from('play_purchases').upsert(
      {
        device_id,
        product_id,
        purchase_token,
        order_id: purchase_token,
        user_id: user_id || null,
        status: 'completed',
        disabled: false,
      },
      { onConflict: 'purchase_token', ignoreDuplicates: false }
    )

    if (error) throw new Error(error.message)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...hdrs, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...hdrs, 'Content-Type': 'application/json' },
    })
  }
})
