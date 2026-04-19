import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Check if admin requested a premium cache reset for this user
    let resetPremium = false
    if (user_id) {
      const { data: saveRow } = await supabase
        .from('game_saves').select('premium_reset_requested').eq('user_id', user_id).maybeSingle()
      if (saveRow?.premium_reset_requested) {
        resetPremium = true
        await supabase.from('game_saves').update({ premium_reset_requested: false }).eq('user_id', user_id)
      }
    }

    // ── 1. PayPal completed — by device_id ────────────────────────────────
    const { data: paypalByDevice } = await supabase
      .from('purchases')
      .select('product_id')
      .eq('device_id', device_id)
      .eq('status', 'completed')
      .eq('disabled', false)
    for (const row of (paypalByDevice || [])) addUnique(purchases, row.product_id)
    // Back-fill user_id on rows found by device_id
    if (user_id && paypalByDevice?.length) {
      await supabase.from('purchases').update({ user_id })
        .eq('device_id', device_id).eq('status', 'completed').is('user_id', null)
    }

    // ── 2. PayPal completed — by user_id (fallback for device_id changes) ─
    if (user_id) {
      const { data: paypalByUser } = await supabase
        .from('purchases')
        .select('product_id')
        .eq('user_id', user_id)
        .eq('status', 'completed')
        .eq('disabled', false)
      for (const row of (paypalByUser || [])) addUnique(purchases, row.product_id)
    }

    // ── 3. Google Play completed — by device_id ───────────────────────────
    const { data: playByDevice } = await supabase
      .from('play_purchases')
      .select('product_id')
      .eq('device_id', device_id)
      .eq('status', 'completed')
      .eq('disabled', false)
    for (const row of (playByDevice || [])) addUnique(purchases, row.product_id)
    // Back-fill user_id on rows found by device_id
    if (user_id && playByDevice?.length) {
      await supabase.from('play_purchases').update({ user_id })
        .eq('device_id', device_id).eq('status', 'completed').is('user_id', null)
    }

    // ── 4. Google Play completed — by user_id ────────────────────────────
    if (user_id) {
      const { data: playByUser } = await supabase
        .from('play_purchases')
        .select('product_id')
        .eq('user_id', user_id)
        .eq('status', 'completed')
        .eq('disabled', false)
      for (const row of (playByUser || [])) addUnique(purchases, row.product_id)
    }

    // ── 5. Disabled products — tell client to revoke them ────────────────
    // Works regardless of login state; no flag required.
    const revokeIds = new Set<string>()
    const { data: disabledPaypalDevice } = await supabase.from('purchases')
      .select('product_id').eq('device_id', device_id).eq('disabled', true)
    for (const r of (disabledPaypalDevice || [])) revokeIds.add(r.product_id)
    const { data: disabledPlayDevice } = await supabase.from('play_purchases')
      .select('product_id').eq('device_id', device_id).eq('disabled', true)
    for (const r of (disabledPlayDevice || [])) revokeIds.add(r.product_id)
    if (user_id) {
      const { data: disabledPaypalUser } = await supabase.from('purchases')
        .select('product_id').eq('user_id', user_id).eq('disabled', true)
      for (const r of (disabledPaypalUser || [])) revokeIds.add(r.product_id)
      const { data: disabledPlayUser } = await supabase.from('play_purchases')
        .select('product_id').eq('user_id', user_id).eq('disabled', true)
      for (const r of (disabledPlayUser || [])) revokeIds.add(r.product_id)
    }
    // Don't revoke something that's also in the valid purchases list
    for (const p of purchases) revokeIds.delete(p.product_id)
    const revokeProducts = [...revokeIds]

    return new Response(
      JSON.stringify({ purchases, ...(revokeProducts.length ? { revoke_products: revokeProducts } : {}), ...(resetPremium ? { reset_premium: true } : {}) }),
      { headers: { ...hdrs, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...hdrs, 'Content-Type': 'application/json' },
    })
  }
})
