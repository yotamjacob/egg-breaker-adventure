import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import LZString from 'https://esm.sh/lz-string@1.5.0'

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

// Constant-time secret compare — `!==` leaks match length via timing.
function secretOk(provided: string, expected: string | undefined): boolean {
  if (!expected || provided.length !== expected.length) return false
  let d = 0
  for (let i = 0; i < expected.length; i++) d |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  return d === 0
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

// Save data is player-controlled JSON (anyone signed in can write arbitrary
// values into their own row). Every field is coerced to a number/boolean here
// so the admin dashboard only ever receives primitives it can render safely.
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}
function arr(v: unknown): any[] { return Array.isArray(v) ? v : [] }

function extractStats(g: any) {
  const activeMonkey = Math.max(0, Math.floor(num(g.activeMonkey)))
  const monkeys = arr(g.monkeys)
  const mp = monkeys[activeMonkey]
  const activeStage = Math.max(0, Math.floor(num(mp?.activeStage)))
  const ml = MONKEY_LABELS[activeMonkey] ?? { emoji: '🐵', name: `Monkey ${activeMonkey}` }
  return {
    totalEggs:            num(g.totalEggs),
    totalGold:            num(g.totalGold),
    gold:                 num(g.gold),
    totalPlayTime:        num(g.totalPlayTime),
    stagesCompleted:      num(g.stagesCompleted),
    totalItems:           num(g.totalItems),
    consecutiveDays:      num(g.consecutiveDays),
    longestStreak:        num(g.longestStreak),
    totalDailyClaims:     num(g.totalDailyClaims),
    monkeyEmoji:          ml.emoji,
    monkeyName:           ml.name,
    monkeyStage:          activeStage + 1,
    monkeyTier:           num(arr(mp?.tiers)[activeStage]),
    monkeysUnlocked:      monkeys.filter((m: any) => m && m.unlocked).length,
    totalMonkeys:         monkeys.length,
    ownedHammers:         Math.max(0, arr(g.ownedHammers).length - 1),
    ownedHats:            Math.max(0, arr(g.ownedHats).length - 1),
    fastRegen:            !!g.fastRegen,
    owned_spyglass:       !!g.owned_spyglass,
    owned_luckycharm:     !!g.owned_luckycharm,
    owned_eggradar:       !!g.owned_eggradar,
    owned_doubledaily:    !!g.owned_doubledaily,
    owned_starsaver:      !!g.owned_starsaver,
    owned_goldmagnet:     !!g.owned_goldmagnet,
    premiumPurchases:     num(g.premiumPurchases),
    premium_starter_pack: !!g.premium_starter_pack,
    firstPlayDate:        typeof g.firstPlayDate === 'string' ? g.firstPlayDate.slice(0, 32) : num(g.firstPlayDate),
  }
}

// One malformed save must not 500 the whole Players tab.
function safeStats(g: any) {
  try { return g && typeof g === 'object' ? extractStats(g) : null } catch { return null }
}

serve(async (req) => {
  const corsHeaders = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const provided = req.headers.get('x-admin-secret') ?? ''
  if (!secretOk(provided, Deno.env.get('ADMIN_SECRET')))
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
      stats:        safeStats(g),
    }
  })

  return new Response(JSON.stringify(players), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
