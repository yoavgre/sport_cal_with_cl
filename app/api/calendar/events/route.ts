import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/calendar/events
 * Returns cached fixtures for the authenticated user's follows.
 * Reads from cached_fixtures (populated by /api/sync/fixtures).
 * No date-range limit — returns all synced fixtures so the calendar
 * can show events far in the future (e.g. World Cup 2026 Final in July).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's follows (leagues, teams, players)
  const { data: follows } = await supabase
    .from('follows')
    .select('entity_type, entity_id, sport')
    .eq('user_id', user.id)

  if (!follows || follows.length === 0) {
    return NextResponse.json([])
  }

  const leagueFollows = follows.filter((f) => f.entity_type === 'league')
  const teamFollows = follows.filter((f) => f.entity_type === 'team')
  const playerFollows = follows.filter((f) => f.entity_type === 'player')

  // Build OR conditions for a single efficient query
  const orConditions: string[] = []

  for (const f of leagueFollows) {
    orConditions.push(`and(sport.eq.${f.sport},league_id.eq.${f.entity_id})`)
  }

  for (const f of teamFollows) {
    orConditions.push(`and(sport.eq.${f.sport},home_team_id.eq.${f.entity_id})`)
    orConditions.push(`and(sport.eq.${f.sport},away_team_id.eq.${f.entity_id})`)
  }

  for (const f of playerFollows) {
    // player_ids is a text[] column; PostgREST supports @> (contains) via cs.
    orConditions.push(`and(sport.eq.${f.sport},player_ids.cs.{${f.entity_id}})`)
  }

  if (orConditions.length === 0) {
    return NextResponse.json([])
  }

  const serviceSupabase = createServiceClient()

  const { data: fixtures, error } = await serviceSupabase
    .from('cached_fixtures')
    .select('*')
    .or(orConditions.join(','))
    .order('start_time', { ascending: true })

  if (error) {
    console.error('[/api/calendar/events] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(fixtures ?? [])
}
