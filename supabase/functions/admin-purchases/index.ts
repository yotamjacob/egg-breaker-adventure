import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const adminSecret = Deno.env.get('ADMIN_SECRET')
  const provided = req.headers.get('x-admin-secret') ?? ''
  if (!adminSecret || provided !== adminSecret) return unauthorized()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // GET — list all purchases with user email
  if (req.method === 'GET') {
    const { data: purchases, error } = await supabase
      .from('play_purchases')
      .select('id, device_id, user_id, product_id, order_id, status, created_at')
      .order('created_at', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })

    // Build email map from auth users (paginate to get all)
    let emailMap: Record<string, string> = {}
    let page = 1
    while (true) {
      const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      const users = data?.users ?? []
      for (const u of users) if (u.email) emailMap[u.id] = u.email
      if (users.length < 1000) break
      page++
    }

    // For purchases with no user_id, try resolving via push_subscriptions device
    const nullUserDevices = purchases.filter(p => !p.user_id && p.device_id).map(p => p.device_id)
    let deviceUserMap: Record<string, string> = {}
    if (nullUserDevices.length) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('device_id, user_id')
        .in('device_id', nullUserDevices)
        .not('user_id', 'is', null)
      for (const s of subs ?? []) deviceUserMap[s.device_id] = emailMap[s.user_id] ?? s.user_id
    }

    const rows = purchases.map(p => ({
      ...p,
      email: p.user_id ? (emailMap[p.user_id] ?? null) : (deviceUserMap[p.device_id] ?? null),
    }))
    return new Response(JSON.stringify(rows), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // DELETE — remove a purchase by id or device_id
  if (req.method === 'DELETE') {
    const { id, device_id } = await req.json()
    if (!id && !device_id) return new Response(JSON.stringify({ error: 'id or device_id required' }), { status: 400, headers: corsHeaders })

    let query = supabase.from('play_purchases').delete()
    query = id ? query.eq('id', id) : query.eq('device_id', device_id)
    const { error, count } = await query.select()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true, deleted: count }), { headers: corsHeaders })
  }

  return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: corsHeaders })
})
