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

    // Attach emails for rows that have a user_id
    const userIds = [...new Set(purchases.filter(p => p.user_id).map(p => p.user_id))]
    let emailMap: Record<string, string> = {}
    if (userIds.length) {
      const { data: users } = await supabase.auth.admin.listUsers()
      emailMap = Object.fromEntries((users?.users ?? []).map(u => [u.id, u.email ?? '']))
    }

    const rows = purchases.map(p => ({ ...p, email: emailMap[p.user_id] ?? null }))
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
