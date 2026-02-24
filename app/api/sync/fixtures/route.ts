/**
 * POST /api/sync/fixtures
 *
 * Syncs football fixtures for all followed entities into cached_fixtures.
 * Detects rescheduled / postponed / cancelled fixtures and logs them to fixture_changes.
 *
 * Designed to be called:
 *   - By a Supabase cron job (pg_cron) every 6 hours
 *   - By the /calendar page on mount (debounced, once per session)
 *   - Manually via settings page "Refresh Calendar"
 *
 * Auth: expects CRON_SECRET header (matches env var) OR authenticated user session.
 * Returns: summary JSON { synced, new, updated, changes, errors[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET ?? ''

// TTL strategy (seconds):
//   completed fixtures  → 86400 (24h, data won't change)
//   today's fixtures    → 300   (5min, live updates)
//   next 7 days         → 3600  (1h)
//   7+ days out         → 21600 (6h)
function computeTTL(startTime: Date, status: string): number {
  const DONE = ['FT', 'AET', 'PEN', 'AOT', 'FIN', 'AWD', 'WO']
  if (DONE.includes(status)) return 86400
  const now = new Date()
  const diffMs = startTime.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 3600        // past, not finished yet (live?)
  if (diffDays < 1) return 300         // today
  if (diffDays < 7) return 3600        // this week
  return 21600                          // far future
}

// Detect whether a fixture has meaningfully changed
function detectChange(
  existing: Record<string, unknown>,
  incoming: {
    start_time: string
    status: string
    home_score: number | null
    away_score: number | null
  }
): { type: string; old: Record<string, unknown>; next: Record<string, unknown> } | null {
  const oldStart = existing.start_time as string
  const newStart = incoming.start_time
  const oldStatus = existing.status as string
  const newStatus = incoming.status

  // Reschedule: start_time changed by more than 5 minutes
  if (oldStart && newStart) {
    const diffMin = Math.abs(new Date(newStart).getTime() - new Date(oldStart).getTime()) / 60000
    if (diffMin > 5) {
      return {
        type: 'reschedule',
        old: { start_time: oldStart, status: oldStatus },
        next: { start_time: newStart, status: newStatus },
      }
    }
  }

  // Status changed to postponed/cancelled
  const POSTPONED = ['PST', 'CANC', 'ABD', 'INT', 'SUSP']
  if (!POSTPONED.includes(oldStatus) && POSTPONED.includes(newStatus)) {
    return {
      type: newStatus === 'CANC' ? 'cancel' : 'postpone',
      old: { status: oldStatus },
      next: { status: newStatus },
    }
  }

  // Score changed
  const oldHome = existing.home_score as number | null
  const oldAway = existing.away_score as number | null
  if (
    (incoming.home_score != null || incoming.away_score != null) &&
    (oldHome !== incoming.home_score || oldAway !== incoming.away_score)
  ) {
    return {
      type: 'score_update',
      old: { home_score: oldHome, away_score: oldAway, status: oldStatus },
      next: { home_score: incoming.home_score, away_score: incoming.away_score, status: newStatus },
    }
  }

  return null
}

function footballSeason(): number {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
}

async function fetchFixtures(
  sport: string,
  paramKey: string,
  paramValue: string,
  season: string,
  from: string,
  to: string
): Promise<Record<string, unknown>[]> {
  const endpoint = sport === 'basketball' ? 'games' : 'fixtures'
  const seasonParam = encodeURIComponent(season)
  let url = `${APP_URL}/api/sports/${sport}/${endpoint}?${paramKey}=${paramValue}&season=${seasonParam}`
  if (sport === 'football') {
    url += `&from=${from}&to=${to}`
  } else {
    url += `&date=${from}`
  }
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.response ?? []
  } catch {
    return []
  }
}

function parseFootballFixture(item: Record<string, unknown>) {
  const fixture = item.fixture as Record<string, unknown>
  const league = item.league as Record<string, unknown>
  const teams = item.teams as Record<string, unknown>
  const goals = item.goals as Record<string, unknown>
  const home = (teams?.home ?? {}) as Record<string, unknown>
  const away = (teams?.away ?? {}) as Record<string, unknown>
  const status = (fixture?.status ?? {}) as Record<string, unknown>

  return {
    fixture_id: String(fixture?.id),
    sport: 'football',
    league_id: String(league?.id),
    season: String(league?.season ?? footballSeason()),
    home_team_id: String(home?.id),
    away_team_id: String(away?.id),
    home_team_name: home?.name as string ?? null,
    away_team_name: away?.name as string ?? null,
    home_team_logo: home?.logo as string ?? null,
    away_team_logo: away?.logo as string ?? null,
    league_name: league?.name as string ?? null,
    league_logo: league?.logo as string ?? null,
    start_time: fixture?.date as string,
    status: status?.short as string ?? 'NS',
    venue: (fixture?.venue as Record<string, unknown>)?.name as string ?? null,
    round: league?.round as string ?? null,
    home_score: goals?.home as number ?? null,
    away_score: goals?.away as number ?? null,
    player_ids: [] as string[],
    raw_data: item,
  }
}

function parseBasketballGame(item: Record<string, unknown>) {
  const teams = item.teams as Record<string, unknown>
  const scores = item.scores as Record<string, unknown>
  const league = item.league as Record<string, unknown>
  const status = item.status as Record<string, unknown>
  const home = (teams?.home ?? {}) as Record<string, unknown>
  const away = (teams?.away ?? {}) as Record<string, unknown>
  const homeScore = (scores?.home ?? {}) as Record<string, unknown>
  const awayScore = (scores?.away ?? {}) as Record<string, unknown>

  return {
    fixture_id: String(item?.id),
    sport: 'basketball',
    league_id: String(league?.id),
    season: String(item?.season ?? ''),
    home_team_id: String(home?.id),
    away_team_id: String(away?.id),
    home_team_name: home?.name as string ?? null,
    away_team_name: away?.name as string ?? null,
    home_team_logo: home?.logo as string ?? null,
    away_team_logo: away?.logo as string ?? null,
    league_name: league?.name as string ?? null,
    league_logo: league?.logo as string ?? null,
    start_time: item?.date as string,
    status: status?.short as string ?? 'NS',
    venue: null,
    round: null,
    home_score: homeScore?.total as number ?? null,
    away_score: awayScore?.total as number ?? null,
    player_ids: [] as string[],
    raw_data: item,
  }
}

export async function POST(request: NextRequest) {
  // Auth: CRON_SECRET header OR valid user session
  const cronHeader = request.headers.get('x-cron-secret')
  const isAuthorizedCron = CRON_SECRET && cronHeader === CRON_SECRET

  if (!isAuthorizedCron) {
    // Fall back to checking session
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServiceClient()

  // Date window: past 7 days → next 365 days
  // Extended so knockout-stage fixtures for tournaments like the World Cup and
  // Champions League final are captured even when teams aren't determined yet.
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 7)
  const toDate = new Date()
  toDate.setDate(toDate.getDate() + 365)
  const from = fromDate.toISOString().split('T')[0]
  const to = toDate.toISOString().split('T')[0]

  const season = String(footballSeason())
  const basketballSeason = new Date().getMonth() >= 9
    ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`

  // Determine scope: sync all unique followed entities across all users
  const { data: allFollows } = await supabase
    .from('follows')
    .select('entity_type, entity_id, sport, entity_metadata')

  if (!allFollows || allFollows.length === 0) {
    return NextResponse.json({ synced: 0, new: 0, updated: 0, changes: 0, errors: [] })
  }

  // Deduplicate: unique (entity_type, entity_id, sport, season) combos
  // Include season from entity_metadata so World Cup 2026 (season "2026") is
  // fetched with the correct season, not the club-football default ("2025").
  const seen = new Set<string>()
  const uniqueEntities: Array<{ entity_type: string; entity_id: string; sport: string; metaSeason?: string }> = []
  for (const f of allFollows) {
    const metaSeason = (f.entity_metadata as Record<string, unknown> | null)?.season as string | undefined
    const key = `${f.entity_type}:${f.entity_id}:${f.sport}:${metaSeason ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueEntities.push({ entity_type: f.entity_type, entity_id: f.entity_id, sport: f.sport, metaSeason })
    }
  }

  const stats = { synced: 0, new: 0, updated: 0, changes: 0, errors: [] as string[] }

  // Load existing cached fixtures for this window to compare
  const { data: existing } = await supabase
    .from('cached_fixtures')
    .select('sport, fixture_id, start_time, status, home_score, away_score, fetched_at, ttl_seconds')
    .gte('start_time', fromDate.toISOString())
    .lte('start_time', toDate.toISOString())

  const existingMap = new Map<string, Record<string, unknown>>()
  for (const row of existing ?? []) {
    existingMap.set(`${row.sport}:${row.fixture_id}`, row as Record<string, unknown>)
  }

  const fixturesToUpsert: Record<string, unknown>[] = []
  const changesToLog: Array<{
    sport: string
    fixture_id: string
    change_type: string
    old_value: Record<string, unknown>
    new_value: Record<string, unknown>
  }> = []

  for (const entity of uniqueEntities) {
    if (entity.entity_type === 'player') continue // players don't map to fixtures directly here

    const sportKey = entity.sport
    const paramKey = entity.entity_type === 'team' ? 'team' : 'league'
    const sportSeason = sportKey === 'basketball' ? basketballSeason : (entity.metaSeason ?? season)

    try {
      const raw = await fetchFixtures(sportKey, paramKey, entity.entity_id, sportSeason, from, to)

      for (const item of raw) {
        const parsed = sportKey === 'football'
          ? parseFootballFixture(item as Record<string, unknown>)
          : parseBasketballGame(item as Record<string, unknown>)

        if (!parsed.fixture_id || !parsed.start_time) continue

        const cacheKey = `${parsed.sport}:${parsed.fixture_id}`
        const startTime = new Date(parsed.start_time)
        const ttl = computeTTL(startTime, parsed.status)

        // Check if we should skip (still within TTL)
        const prev = existingMap.get(cacheKey)
        if (prev) {
          const fetchedAt = new Date(prev.fetched_at as string).getTime()
          const ttlMs = (prev.ttl_seconds as number) * 1000
          const isStale = Date.now() > fetchedAt + ttlMs
          if (!isStale) continue // skip non-stale fixtures
        }

        // Detect changes
        if (prev) {
          const change = detectChange(prev, {
            start_time: parsed.start_time,
            status: parsed.status,
            home_score: parsed.home_score,
            away_score: parsed.away_score,
          })
          if (change) {
            changesToLog.push({
              sport: parsed.sport,
              fixture_id: parsed.fixture_id,
              change_type: change.type,
              old_value: change.old,
              new_value: change.next,
            })
            stats.changes++
          }
          stats.updated++
        } else {
          stats.new++
        }

        fixturesToUpsert.push({
          sport: parsed.sport,
          fixture_id: parsed.fixture_id,
          league_id: parsed.league_id,
          season: parsed.season,
          home_team_id: parsed.home_team_id,
          away_team_id: parsed.away_team_id,
          home_team_name: parsed.home_team_name,
          away_team_name: parsed.away_team_name,
          home_team_logo: parsed.home_team_logo,
          away_team_logo: parsed.away_team_logo,
          league_name: parsed.league_name,
          league_logo: parsed.league_logo,
          start_time: parsed.start_time,
          status: parsed.status,
          venue: parsed.venue,
          round: parsed.round,
          home_score: parsed.home_score,
          away_score: parsed.away_score,
          player_ids: parsed.player_ids,
          raw_data: parsed.raw_data,
          fetched_at: new Date().toISOString(),
          ttl_seconds: ttl,
        })

        stats.synced++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      stats.errors.push(`${entity.sport}/${entity.entity_type}/${entity.entity_id}: ${msg}`)
    }
  }

  // Batch upsert fixtures
  if (fixturesToUpsert.length > 0) {
    // Upsert in chunks of 100 to avoid request size limits
    const CHUNK = 100
    for (let i = 0; i < fixturesToUpsert.length; i += CHUNK) {
      const chunk = fixturesToUpsert.slice(i, i + CHUNK)
      const { error } = await supabase
        .from('cached_fixtures')
        .upsert(chunk, { onConflict: 'sport,fixture_id' })
      if (error) {
        stats.errors.push(`Upsert error: ${error.message}`)
      }
    }
  }

  // Log detected changes
  if (changesToLog.length > 0) {
    await supabase.from('fixture_changes').insert(changesToLog)
  }

  return NextResponse.json(stats)
}

// GET: return recent sync stats for settings page
export async function GET(request: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svcSupabase = createServiceClient()
  const { data: changes } = await svcSupabase
    .from('fixture_changes')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(20)

  const { count } = await svcSupabase
    .from('cached_fixtures')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({ changes: changes ?? [], cached_count: count ?? 0 })
}
