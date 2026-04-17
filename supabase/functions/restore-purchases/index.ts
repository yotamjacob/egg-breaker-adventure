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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const hdrs = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: hdrs })

  try {
    const { device_id } = await req.json()
    if (!device_id) throw new Error('Missing device_id')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: rows, error } = await supabase
      .from('purchases')
      .select('product_id')
      .eq('device_id', device_id)
      .eq('status', 'completed')

    if (error) throw new Error(error.message)

    const purchases = (rows || []).map(row => ({
      product_id: row.product_id,
      reward: REWARDS[row.product_id] ?? {},
    }))

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
