import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPAL_BASE = 'https://api-m.paypal.com'

const REWARDS: Record<string, { gold?: number; hammers?: number; bananas?: number }> = {
  // Packs
  starter_pack: { gold: 25000, hammers: 50, bananas: 3 },
  gold_s:       { gold: 10000 },
  gold_m:       { gold: 50000 },
  gold_l:       { gold: 200000 },
  hammers:      { hammers: 100 },
  bananas:      { bananas: 9 },
  // Premium upgrades — no resource reward; client applies owned flag via product_id
  luckycharm:   {},
  eggradar:     {},
  doubledaily:  {},
  starsaver:    {},
  goldmagnet:   {},
}

const ALLOWED_ORIGINS = new Set([
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1',
  ...(Deno.env.get('ALLOWED_ORIGIN') ? [Deno.env.get('ALLOWED_ORIGIN')!] : []),
])

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : null
  return {
    'Access-Control-Allow-Origin': allowed ?? '',
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const hdrs = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: hdrs })

  try {
    const { device_id, paypal_order_id, product_id } = await req.json()
    if (!device_id || !paypal_order_id || !product_id) throw new Error('Missing fields')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify this purchase belongs to this device and is still pending
    const { data: purchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('paypal_order_id', paypal_order_id)
      .eq('device_id', device_id)
      .eq('product_id', product_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (!purchase) throw new Error('Purchase not found or already processed')

    // Capture with PayPal
    const token = await getPayPalToken(
      Deno.env.get('PAYPAL_CLIENT_ID')!,
      Deno.env.get('PAYPAL_SECRET')!
    )

    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${paypal_order_id}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const capture = await captureRes.json()

    if (capture.status !== 'COMPLETED') throw new Error('Payment capture failed')

    // Mark as completed
    await supabase
      .from('purchases')
      .update({ status: 'completed' })
      .eq('paypal_order_id', paypal_order_id)

    return new Response(
      JSON.stringify({ success: true, product_id, reward: REWARDS[product_id] }),
      { headers: { ...hdrs, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
