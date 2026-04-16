import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PACKAGE_NAME = 'com.eggbreakeradventures.app'
const PLAY_API     = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications'

// Products that can be purchased multiple times — must be consumed to allow re-purchase
const CONSUMABLE = new Set(['gold_s', 'gold_m', 'gold_l', 'hammers', 'bananas'])

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

// Base64url encode a string or ArrayBuffer
function base64url(data: string | ArrayBuffer): string {
  let str: string
  if (typeof data === 'string') {
    str = btoa(unescape(encodeURIComponent(data)))
  } else {
    const bytes = new Uint8Array(data as ArrayBuffer)
    let binary = ''
    bytes.forEach(b => (binary += String.fromCharCode(b)))
    str = btoa(binary)
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Sign a JWT using the service account private key and exchange for an access token
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson)
  const now = Math.floor(Date.now() / 1000)

  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  }))

  const sigInput = `${header}.${payload}`

  // Parse PKCS8 PEM private key
  const pemBody  = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(sigInput),
  )

  const jwt = `${sigInput}.${base64url(signature)}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Failed to get Google access token')
  return tokenData.access_token
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const hdrs   = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: hdrs })

  try {
    const { device_id, product_id, purchase_token } = await req.json()
    if (!device_id || !product_id || !purchase_token) throw new Error('Missing fields')
    if (!REWARDS[product_id]) throw new Error('Unknown product')

    const googleToken = await getGoogleAccessToken(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')!)

    // Verify the purchase with Google Play Developer API
    const verifyRes = await fetch(
      `${PLAY_API}/${PACKAGE_NAME}/purchases/products/${product_id}/tokens/${purchase_token}`,
      { headers: { 'Authorization': `Bearer ${googleToken}` } },
    )
    const purchase = await verifyRes.json()

    if (!verifyRes.ok)         throw new Error('Play API error: ' + (purchase.error?.message ?? verifyRes.status))
    if (purchase.purchaseState !== 0) throw new Error('Purchase not completed (state: ' + purchase.purchaseState + ')')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Idempotency — return success without re-granting if already processed
    const { data: existing } = await supabase
      .from('play_purchases')
      .select('id')
      .eq('purchase_token', purchase_token)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, reward: {}, already_processed: true }),
        { headers: { ...hdrs, 'Content-Type': 'application/json' } },
      )
    }

    // Acknowledge (non-consumable) or consume (consumable) via Play API
    const action = CONSUMABLE.has(product_id) ? 'consume' : 'acknowledge'
    await fetch(
      `${PLAY_API}/${PACKAGE_NAME}/purchases/products/${product_id}/tokens/${purchase_token}:${action}`,
      {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
      },
    )

    // Record the purchase to prevent replay attacks
    await supabase.from('play_purchases').insert({
      device_id,
      product_id,
      purchase_token,
      order_id: purchase.orderId ?? null,
      status:   'completed',
    })

    return new Response(
      JSON.stringify({ success: true, reward: REWARDS[product_id] }),
      { headers: { ...hdrs, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status:  400,
      headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    })
  }
})
