import type { League, Team, Player, Fixture } from '@/types/sports'

async function proxyFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(
    `/api/sports/basketball/${endpoint}`,
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  )
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
  return res.json()
}

export async function getBasketballLeagues(): Promise<League[]> {
  const currentYear = new Date().getFullYear()
  const data = await proxyFetch('leagues', { season: String(currentYear) })
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    // Basketball leagues: fields are FLAT at top level (no nested .league object)
    const country = item.country as Record<string, unknown>
    const seasons = item.seasons as Array<Record<string, unknown>>
    const latestSeason = seasons?.[seasons.length - 1]
    return {
      id: item.id as number,
      name: item.name as string,
      type: item.type as string ?? 'League',
      logo: item.logo as string ?? '',
      country: country?.name as string ?? '',
      countryCode: country?.code as string ?? null,
      flag: country?.flag as string ?? null,
      season: String(latestSeason?.season ?? currentYear),
    } as League
  })
}

export async function getBasketballTeams(
  leagueId: number,
  season: number
): Promise<Team[]> {
  const data = await proxyFetch('teams', {
    league: String(leagueId),
    season: String(season),
  })
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    // Basketball teams: also flat at top level
    return {
      id: item.id as number,
      name: item.name as string,
      logo: item.logo as string ?? '',
      country: (item.country as Record<string, unknown>)?.name as string ?? null,
      founded: null,
      venue: null,
    } as Team
  })
}

export async function getBasketballGames(params: {
  league?: number
  team?: number
  season?: number
  date?: string
}): Promise<Fixture[]> {
  const queryParams: Record<string, string> = {}
  if (params.league) queryParams.league = String(params.league)
  if (params.team) queryParams.team = String(params.team)
  if (params.season) queryParams.season = String(params.season)
  if (params.date) queryParams.date = params.date

  const data = await proxyFetch('games', queryParams)
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    const teams = item.teams as Record<string, unknown>
    const scores = item.scores as Record<string, unknown>
    const home = teams?.home as Record<string, unknown>
    const away = teams?.away as Record<string, unknown>
    const homeScore = scores?.home as Record<string, unknown>
    const awayScore = scores?.away as Record<string, unknown>
    const league = item.league as Record<string, unknown>
    const status = item.status as Record<string, unknown>
    const startTime = item.date as string

    const estimatedEnd = new Date(startTime)
    estimatedEnd.setMinutes(estimatedEnd.getMinutes() + 150)

    return {
      id: item.id as number,
      sport: 'basketball',
      leagueId: league?.id as number,
      leagueName: league?.name as string,
      leagueLogo: league?.logo as string,
      season: String(item.season ?? new Date().getFullYear()),
      homeTeam: home ? { id: home.id as number, name: home.name as string, logo: home.logo as string } : null,
      awayTeam: away ? { id: away.id as number, name: away.name as string, logo: away.logo as string } : null,
      startTime,
      endTime: estimatedEnd.toISOString(),
      status: status?.short as string ?? null,
      venue: null,
      round: null,
      homeScore: homeScore?.total as number ?? null,
      awayScore: awayScore?.total as number ?? null,
    } as Fixture
  })
}

export async function getBasketballPlayers(teamId: number): Promise<Player[]> {
  const data = await proxyFetch('players', { team: String(teamId) })
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    return {
      id: item.id as number,
      name: item.name as string,
      photo: item.photo as string ?? '',
      nationality: (item.country as Record<string, unknown>)?.name as string ?? null,
      position: item.position as string ?? null,
      age: null,
      teamId,
      teamName: null,
    } as Player
  })
}
