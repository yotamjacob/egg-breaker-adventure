import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS: only the origins that actually host admin.html (v3.10.11). A bare
// `*` let any page script the endpoints with a stolen secret from the browser.
const ADMIN_ORIGINS = new Set([
  'https://egg-breaker-adventures.vercel.app',
  'https://eggbreakeradventure.com',
  'https://www.eggbreakeradventure.com',
  'http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:8080',
])
function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ADMIN_ORIGINS.has(origin) ? origin : 'https://egg-breaker-adventures.vercel.app',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-admin-secret',
    'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, POST, OPTIONS',
  }
}

// Constant-time secret compare — `!==` leaks match length via timing.
function secretOk(provided: string, expected: string | undefined): boolean {
  if (!expected || provided.length !== expected.length) return false
  let d = 0
  for (let i = 0; i < expected.length; i++) d |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  return d === 0
}

function unauthorized(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
}

serve(async (req) => {
  const corsHeaders = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const provided = req.headers.get('x-admin-secret') ?? ''
  if (!secretOk(provided, Deno.env.get('ADMIN_SECRET'))) return unauthorized(corsHeaders)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // GET — list all purchases (Play + PayPal) with user email
  if (req.method === 'GET') {
    const [{ data: playRows, error: e1 }, { data: paypalRows, error: e2 }] = await Promise.all([
      supabase.from('play_purchases').select('id, device_id, user_id, product_id, order_id, status, disabled, created_at'),
      supabase.from('purchases').select('id, device_id, user_id, product_id, paypal_order_id, status, disabled, created_at'),
    ])
    if (e1 || e2) return new Response(JSON.stringify({ error: (e1 ?? e2)!.message }), { status: 500, headers: corsHeaders })

    const allPurchases = [
      ...(playRows ?? []).map(r => ({ ...r, source: 'play',   order_id: r.order_id ?? null,       disabled: r.disabled ?? false })),
      ...(paypalRows ?? []).map(r => ({ ...r, source: 'paypal', order_id: r.paypal_order_id ?? null, disabled: r.disabled ?? false })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Build email map (paginated)
    let emailMap: Record<string, string> = {}
    let page = 1
    while (true) {
      const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      const users = data?.users ?? []
      for (const u of users) if (u.email) emailMap[u.id] = u.email
      if (users.length < 1000) break
      page++
    }

    // For null user_id rows, fall back to push_subscriptions device lookup
    const nullUserDevices = allPurchases.filter(p => !p.user_id && p.device_id).map(p => p.device_id)
    let deviceUserMap: Record<string, string> = {}
    if (nullUserDevices.length) {
      const { data: subs } = await supabase
        .from('push_subscriptions').select('device_id, user_id')
        .in('device_id', nullUserDevices).not('user_id', 'is', null)
      for (const s of subs ?? []) deviceUserMap[s.device_id] = emailMap[s.user_id] ?? s.user_id
    }

    const rows = allPurchases.map(p => ({
      ...p,
      email: p.user_id ? (emailMap[p.user_id] ?? null) : (deviceUserMap[p.device_id] ?? null),
    }))
    return new Response(JSON.stringify(rows), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // DELETE — remove a purchase by id from the correct table
  if (req.method === 'DELETE') {
    const { id, source } = await req.json()
    if (!id || !source) return new Response(JSON.stringify({ error: 'id and source required' }), { status: 400, headers: corsHeaders })

    const table = source === 'paypal' ? 'purchases' : 'play_purchases'
    const { error, count } = await supabase.from(table).delete().eq('id', id).select()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true, deleted: count }), { headers: corsHeaders })
  }

  // PATCH — toggle disabled flag
  if (req.method === 'PATCH') {
    const { id, source, disabled } = await req.json()
    if (!id || !source || typeof disabled !== 'boolean') return new Response(JSON.stringify({ error: 'id, source, disabled required' }), { status: 400, headers: corsHeaders })

    const table = source === 'paypal' ? 'purchases' : 'play_purchases'
    const { error } = await supabase.from(table).update({ disabled }).eq('id', id)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true, disabled }), { headers: corsHeaders })
  }

  // POST — request premium cache reset for a user (picked up on next restore)
  if (req.method === 'POST') {
    const { user_id } = await req.json()
    if (!user_id) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: corsHeaders })
    const { error } = await supabase.from('game_saves').update({ premium_reset_requested: true }).eq('user_id', user_id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  }

  return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: corsHeaders })
})
