import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPAL_BASE = 'https://api-m.paypal.com'

const PRODUCTS: Record<string, { name: string; price: string; oneTime?: boolean }> = {
  // Packs
  starter_pack: { name: 'Starter Pack',   price: '2.99', oneTime: true },
  gold_s:       { name: 'Gold Pack S',    price: '0.99' },
  gold_m:       { name: 'Gold Pack M',    price: '2.99' },
  gold_l:       { name: 'Gold Pack L',    price: '7.99' },
  hammers:      { name: 'Hammer Pack',    price: '0.99' },
  bananas:      { name: 'Monkey Key',     price: '1.99' },
  // Premium upgrades (one-time)
  luckycharm:   { name: 'Lucky Charm',    price: '2.99', oneTime: true },
  eggradar:     { name: 'Egg Radar',      price: '3.99', oneTime: true },
  doubledaily:  { name: 'Double Daily',   price: '3.99', oneTime: true },
  starsaver:    { name: 'Star Saver',     price: '2.99', oneTime: true },
  goldmagnet:   { name: 'Golden Magnet',  price: '1.99', oneTime: true },
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const hdrs = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: hdrs })

  try {
    const { device_id, product_id } = await req.json()
    if (!device_id || !product_id) throw new Error('Missing device_id or product_id')

    const product = PRODUCTS[product_id]
    if (!product) throw new Error('Invalid product_id')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Block re-purchase of one-time products
    if (product.oneTime) {
      const { data: existing } = await supabase
        .from('purchases')
        .select('id')
        .eq('device_id', device_id)
        .eq('product_id', product_id)
        .eq('status', 'completed')
        .maybeSingle()
      if (existing) throw new Error('Already purchased')
    }

    const token = await getPayPalToken(
      Deno.env.get('PAYPAL_CLIENT_ID')!,
      Deno.env.get('PAYPAL_SECRET')!
    )

    // Create PayPal order
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: product.price },
          description: `Egg Breaker Adventures — ${product.name}`,
        }],
      }),
    })
    const order = await orderRes.json()
    if (!order.id) throw new Error('Failed to create PayPal order')

    // Store pending purchase record
    await supabase.from('purchases').insert({
      device_id,
      product_id,
      paypal_order_id: order.id,
      amount: parseFloat(product.price),
      status: 'pending',
    })

    return new Response(JSON.stringify({ paypal_order_id: order.id }), {
      headers: { ...hdrs, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...hdrs, 'Content-Type': 'application/json' },
    })
  }
})
