import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPAL_BASE = 'https://api-m.paypal.com'

const REWARDS: Record<string, { gold?: number; hammers?: number; bananas?: number }> = {
  starter_pack: { gold: 25000, hammers: 50, bananas: 3 },
  gold_s:       { gold: 10000 },
  gold_m:       { gold: 50000 },
  gold_l:       { gold: 200000 },
  hammers:      { hammers: 100 },
  bananas:      { bananas: 9 },
  luckycharm:   {},
  eggradar:     {},
  doubledaily:  {},
  starsaver:    {},
  goldmagnet:   {},
}

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

async function getPayPalToken(clientId: string, secret: string): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${clientId}:${secret}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to get PayPal token')
  return data.access_token
}

function addUnique(
  purchases: { product_id: string; reward: object }[],
  product_id: string
) {
  if (!purchases.find(p => p.product_id === product_id)) {
    purchases.push({ product_id, reward: REWARDS[product_id] ?? {} })
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const hdrs = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: hdrs })

  try {
    const { device_id, user_id } = await req.json()
    if (!device_id) throw new Error('Missing device_id')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const purchases: { product_id: string; reward: object }[] = []

    // ── 1. PayPal completed — by device_id ────────────────────────────────
    const { data: paypalByDevice } = await supabase
      .from('purchases')
      .select('product_id')
      .eq('device_id', device_id)
      .eq('status', 'completed')
    for (const row of (paypalByDevice || [])) addUnique(purchases, row.product_id)

    // ── 2. PayPal completed — by user_id (fallback for device_id changes) ─
    if (user_id) {
      const { data: paypalByUser } = await supabase
        .from('purchases')
        .select('product_id')
        .eq('user_id', user_id)
        .eq('status', 'completed')
      for (const row of (paypalByUser || [])) addUnique(purchases, row.product_id)
    }

    // ── 3. Google Play completed — by device_id ───────────────────────────
    const { data: playByDevice } = await supabase
      .from('play_purchases')
      .select('product_id')
      .eq('device_id', device_id)
      .eq('status', 'completed')
    for (const row of (playByDevice || [])) addUnique(purchases, row.product_id)

    // ── 4. Google Play completed — by user_id ────────────────────────────
    if (user_id) {
      const { data: playByUser } = await supabase
        .from('play_purchases')
        .select('product_id')
        .eq('user_id', user_id)
        .eq('status', 'completed')
      for (const row of (playByUser || [])) addUnique(purchases, row.product_id)
    }

    // ── 5. Pending PayPal — try to capture ───────────────────────────────
    const { data: pendingRows } = await supabase
      .from('purchases')
      .select('product_id, paypal_order_id')
      .eq('device_id', device_id)
      .eq('status', 'pending')

    if (pendingRows && pendingRows.length > 0) {
      let paypalToken: string | null = null
      try {
        paypalToken = await getPayPalToken(
          Deno.env.get('PAYPAL_CLIENT_ID')!,
          Deno.env.get('PAYPAL_SECRET')!
        )
      } catch (_) {}

      if (paypalToken) {
        for (const p of pendingRows) {
          try {
            const captureRes = await fetch(
              `${PAYPAL_BASE}/v2/checkout/orders/${p.paypal_order_id}/capture`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${paypalToken}`,
                  'Content-Type': 'application/json',
                },
              }
            )
            const capture = await captureRes.json()
            const alreadyCaptured = capture.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED'
            if (capture.status === 'COMPLETED' || alreadyCaptured) {
              await supabase
                .from('purchases')
                .update({ status: 'completed' })
                .eq('paypal_order_id', p.paypal_order_id)
              addUnique(purchases, p.product_id)
            }
          } catch (_) {}
        }
      }
    }

    return new Response(
      JSON.stringify({ purchases }),
      { headers: { ...hdrs, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...hdrs, 'Content-Type': 'application/json' },
    })
  }
})
