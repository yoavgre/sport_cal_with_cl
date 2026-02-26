import type { CachedFixture } from '@/types/database'
import type { CalendarEvent } from '@/types/sports'
import { SPORT_COLORS } from '@/types/sports'
import { addMinutes } from 'date-fns'

const SPORT_DURATIONS: Record<string, number> = {
  football: 105,
  basketball: 150,
  tennis: 180,
}

export function fixtureToCalendarEvent(fixture: CachedFixture): CalendarEvent {
  const raw = fixture.raw_data

  const startDate = new Date(fixture.start_time)
  const endDate = fixture.end_time
    ? new Date(fixture.end_time)
    : addMinutes(startDate, SPORT_DURATIONS[fixture.sport] ?? 120)

  let homeTeam: string | null = null
  let awayTeam: string | null = null
  let homeScore: number | null = null
  let awayScore: number | null = null
  let leagueName: string | null = null
  let leagueLogo: string | null = null
  let round: string | null = fixture.round ?? null

  if (fixture.sport === 'football') {
    const teams = raw.teams as Record<string, unknown>
    const goals = raw.goals as Record<string, unknown>
    const league = raw.league as Record<string, unknown>
    const rawHome = (teams?.home as Record<string, unknown>)?.name as string ?? null
    const rawAway = (teams?.away as Record<string, unknown>)?.name as string ?? null
    // Treat null or "TBD" as unknown
    homeTeam = rawHome && rawHome !== 'TBD' ? rawHome : null
    awayTeam = rawAway && rawAway !== 'TBD' ? rawAway : null
    homeScore = goals?.home as number ?? null
    awayScore = goals?.away as number ?? null
    leagueName = league?.name as string ?? null
    leagueLogo = league?.logo as string ?? null
    if (!round) round = league?.round as string ?? null
  } else if (fixture.sport === 'basketball') {
    const teams = raw.teams as Record<string, unknown>
    const scores = raw.scores as Record<string, unknown>
    const league = raw.league as Record<string, unknown>
    homeTeam = (teams?.home as Record<string, unknown>)?.name as string ?? null
    awayTeam = (teams?.away as Record<string, unknown>)?.name as string ?? null
    homeScore = ((scores?.home as Record<string, unknown>)?.total as number) ?? null
    awayScore = ((scores?.away as Record<string, unknown>)?.total as number) ?? null
    leagueName = league?.name as string ?? null
    leagueLogo = league?.logo as string ?? null
  } else if (fixture.sport === 'tennis') {
    const players = raw.players as Array<Record<string, unknown>> | undefined
    const league = raw.league as Record<string, unknown>
    homeTeam = (players?.[0]?.player as Record<string, unknown>)?.name as string ?? null
    awayTeam = (players?.[1]?.player as Record<string, unknown>)?.name as string ?? null
    leagueName = league?.name as string ?? null
    leagueLogo = league?.logo as string ?? null
  }

  // Build a meaningful title even when teams are TBD (knockout stage placeholder fixtures)
  const title = homeTeam && awayTeam
    ? `${homeTeam} vs ${awayTeam}`
    : round
      ? `${leagueName ? `${leagueName} – ` : ''}${round}`
      : leagueName ?? 'Match'

  return {
    id: `${fixture.sport}-${fixture.fixture_id}`,
    title,
    start: startDate,
    end: endDate,
    sport: fixture.sport,
    leagueId: fixture.league_id,
    venue: fixture.venue,
    status: fixture.status,
    homeTeam,
    awayTeam,
    homeTeamLogo: fixture.home_team_logo ?? null,
    awayTeamLogo: fixture.away_team_logo ?? null,
    homeScore,
    awayScore,
    leagueName,
    leagueLogo,
  }
}
