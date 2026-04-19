import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import LZString from 'https://esm.sh/lz-string@1.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const MONKEY_LABELS = [
  { emoji: '🐵', name: 'Mr. Monkey' },
  { emoji: '🔧', name: 'Steampunk' },
  { emoji: '👸', name: 'Princess' },
  { emoji: '🚀', name: 'Space Cadette' },
  { emoji: '🧙', name: 'Odin' },
]

function parseSave(saveData: string | null): any | null {
  if (!saveData) return null
  try {
    const json = saveData.startsWith('lz:')
      ? LZString.decompressFromUTF16(saveData.slice(3))
      : saveData
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

function extractStats(g: any) {
  const activeMonkey = g.activeMonkey ?? 0
  const mp = g.monkeys?.[activeMonkey]
  const activeStage = mp?.activeStage ?? 0
  const ml = MONKEY_LABELS[activeMonkey] ?? { emoji: '🐵', name: `Monkey ${activeMonkey}` }
  return {
    totalEggs:            g.totalEggs          || 0,
    totalGold:            g.totalGold          || 0,
    gold:                 g.gold               || 0,
    totalPlayTime:        g.totalPlayTime      || 0,
    stagesCompleted:      g.stagesCompleted    || 0,
    totalItems:           g.totalItems         || 0,
    consecutiveDays:      g.consecutiveDays    || 0,
    longestStreak:        g.longestStreak      || 0,
    totalDailyClaims:     g.totalDailyClaims   || 0,
    monkeyEmoji:          ml.emoji,
    monkeyName:           ml.name,
    monkeyStage:          activeStage + 1,
    monkeyTier:           mp?.tiers?.[activeStage] ?? 0,
    monkeysUnlocked:      (g.monkeys || []).filter((m: any) => m.unlocked).length,
    totalMonkeys:         (g.monkeys || []).length,
    ownedHammers:         Math.max(0, (g.ownedHammers || []).length - 1),
    ownedHats:            Math.max(0, (g.ownedHats    || []).length - 1),
    fastRegen:            !!g.fastRegen,
    owned_spyglass:       !!g.owned_spyglass,
    premiumPurchases:     g.premiumPurchases   || 0,
    premium_starter_pack: !!g.premium_starter_pack,
    firstPlayDate:        g.firstPlayDate      || 0,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const adminSecret = Deno.env.get('ADMIN_SECRET')
  const provided    = req.headers.get('x-admin-secret') ?? ''
  if (!adminSecret || provided !== adminSecret)
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })

  if (req.method !== 'GET')
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: saves, error } = await supabase
    .from('game_saves')
    .select('user_id, save_data, saved_at, last_seen_at')
    .order('last_seen_at', { ascending: false, nullsFirst: false })

  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })

  // Build email map
  const emailMap: Record<string, string> = {}
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    const users = data?.users ?? []
    for (const u of users) if (u.email) emailMap[u.id] = u.email
    if (users.length < 1000) break
    page++
  }

  const players = (saves ?? []).map(row => {
    const g = parseSave(row.save_data)
    return {
      user_id:      row.user_id,
      email:        emailMap[row.user_id] ?? null,
      saved_at:     row.saved_at,
      last_seen_at: row.last_seen_at,
      stats:        g ? extractStats(g) : null,
    }
  })

  return new Response(JSON.stringify(players), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
