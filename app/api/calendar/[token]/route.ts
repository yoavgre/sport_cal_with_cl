import { createServiceClient } from '@/lib/supabase/server'
import { generateICS } from '@/lib/calendar/ics-generator'
import type { CachedFixture } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params
  // Strip .ics extension if present (calendar apps append it to the URL)
  const token = rawToken.replace(/\.ics$/, '')
  const supabase = createServiceClient()

  // Resolve token to user_id
  const { data: tokenRow } = await supabase
    .from('calendar_tokens')
    .select('user_id')
    .eq('token', token)
    .single()

  if (!tokenRow) {
    return new Response('Calendar not found', { status: 404 })
  }

  // Get user's follows
  const { data: follows } = await supabase
    .from('follows')
    .select('*')
    .eq('user_id', tokenRow.user_id)

  if (!follows || follows.length === 0) {
    const emptyICS = generateICS([], 'My Sport Calendar')
    return new Response(emptyICS, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }

  const teamIds = follows.filter((f) => f.entity_type === 'team').map((f) => f.entity_id)
  const leagueIds = follows.filter((f) => f.entity_type === 'league').map((f) => f.entity_id)
  const playerIds = follows.filter((f) => f.entity_type === 'player').map((f) => f.entity_id)
  const sports = follows.filter((f) => f.entity_type === 'sport').map((f) => f.entity_id)

  const from = new Date()
  from.setDate(from.getDate() - 30)
  const to = new Date()
  to.setDate(to.getDate() + 90)

  const fixtureQuery = supabase
    .from('cached_fixtures')
    .select('*')
    .gte('start_time', from.toISOString())
    .lte('start_time', to.toISOString())

  const orConditions: string[] = []
  if (teamIds.length > 0) {
    orConditions.push(`home_team_id.in.(${teamIds.join(',')})`)
    orConditions.push(`away_team_id.in.(${teamIds.join(',')})`)
  }
  if (leagueIds.length > 0) {
    orConditions.push(`league_id.in.(${leagueIds.join(',')})`)
  }
  if (sports.length > 0) {
    orConditions.push(`sport.in.(${sports.join(',')})`)
  }

  let fixtures: CachedFixture[] = []

  if (orConditions.length > 0) {
    const { data } = await fixtureQuery.or(orConditions.join(','))
    fixtures = data ?? []
  }

  // Separate query for player_ids (GIN array overlap)
  if (playerIds.length > 0) {
    const { data: playerFixtures } = await supabase
      .from('cached_fixtures')
      .select('*')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .overlaps('player_ids', playerIds)
    if (playerFixtures) {
      fixtures = [...fixtures, ...playerFixtures]
    }
  }

  // Deduplicate by fixture_id
  const unique = Array.from(
    new Map(fixtures.map((f) => [f.fixture_id, f])).values()
  )

  const icsString = generateICS(unique, 'My Sport Calendar')

  return new Response(icsString, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sportcal.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  })
}
