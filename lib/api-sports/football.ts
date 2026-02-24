import type { League, Team, Player, Fixture } from '@/types/sports'

const CURRENT_SEASON = new Date().getFullYear()

// Internal fetch via the caching proxy — always use this, not fetchApiSports directly
async function proxyFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(
    `/api/sports/football/${endpoint}`,
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  )
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
  return res.json()
}

export async function getFootballLeagues(params?: {
  current?: boolean
  country?: string
}): Promise<League[]> {
  const queryParams: Record<string, string> = {}
  if (params?.current) queryParams.current = 'true'
  if (params?.country) queryParams.country = params.country

  const data = await proxyFetch('leagues', queryParams)
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    const league = item.league as Record<string, unknown>
    const country = item.country as Record<string, unknown>
    const seasons = item.seasons as Array<Record<string, unknown>>
    const currentSeason = seasons?.find((s) => s.current) ?? seasons?.[0]
    return {
      id: league.id,
      name: league.name,
      type: league.type,
      logo: league.logo,
      country: country?.name ?? '',
      countryCode: country?.code ?? null,
      flag: country?.flag ?? null,
      season: currentSeason?.year ?? CURRENT_SEASON,
    } as League
  })
}

export async function getFootballTeams(
  leagueId: number,
  season: number
): Promise<Team[]> {
  const data = await proxyFetch('teams', {
    league: String(leagueId),
    season: String(season),
  })
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    const team = item.team as Record<string, unknown>
    const venue = item.venue as Record<string, unknown>
    return {
      id: team.id,
      name: team.name,
      logo: team.logo,
      country: team.country ?? null,
      founded: team.founded ?? null,
      venue: venue?.name ?? null,
    } as Team
  })
}

export async function getFootballFixtures(params: {
  league?: number
  team?: number
  season?: number
  next?: number
  from?: string
  to?: string
}): Promise<Fixture[]> {
  const queryParams: Record<string, string> = {}
  if (params.league) queryParams.league = String(params.league)
  if (params.team) queryParams.team = String(params.team)
  if (params.season) queryParams.season = String(params.season)
  if (params.next) queryParams.next = String(params.next)
  if (params.from) queryParams.from = params.from
  if (params.to) queryParams.to = params.to

  const data = await proxyFetch('fixtures', queryParams)
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    const fixture = item.fixture as Record<string, unknown>
    const league = item.league as Record<string, unknown>
    const teams = item.teams as Record<string, unknown>
    const goals = item.goals as Record<string, unknown>
    const home = teams?.home as Record<string, unknown>
    const away = teams?.away as Record<string, unknown>
    const status = fixture.status as Record<string, unknown>
    const startTime = fixture.date as string
    const estimatedEnd = new Date(startTime)
    estimatedEnd.setMinutes(estimatedEnd.getMinutes() + 105)

    return {
      id: fixture.id,
      sport: 'football',
      leagueId: league?.id,
      leagueName: league?.name,
      leagueLogo: league?.logo,
      season: String(league?.season),
      homeTeam: home ? { id: home.id, name: home.name, logo: home.logo } : null,
      awayTeam: away ? { id: away.id, name: away.name, logo: away.logo } : null,
      startTime,
      endTime: estimatedEnd.toISOString(),
      status: status?.short ?? null,
      venue: (fixture.venue as Record<string, unknown>)?.name as string ?? null,
      round: league?.round as string ?? null,
      homeScore: goals?.home as number ?? null,
      awayScore: goals?.away as number ?? null,
    } as Fixture
  })
}

export async function getFootballPlayers(
  teamId: number,
  season: number
): Promise<Player[]> {
  const data = await proxyFetch('players', {
    team: String(teamId),
    season: String(season),
  })
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    const player = item.player as Record<string, unknown>
    const stats = (item.statistics as Array<Record<string, unknown>>)?.[0]
    const team = stats?.team as Record<string, unknown>
    return {
      id: player.id,
      name: player.name,
      photo: player.photo,
      nationality: player.nationality ?? null,
      position: (stats?.games as Record<string, unknown>)?.position ?? null,
      age: player.age ?? null,
      teamId: team?.id ?? null,
      teamName: team?.name ?? null,
    } as Player
  })
}
