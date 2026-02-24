import type { League, Player, Fixture } from '@/types/sports'

async function proxyFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(
    `/api/sports/tennis/${endpoint}`,
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  )
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
  return res.json()
}

export async function getTennisTournaments(): Promise<League[]> {
  const data = await proxyFetch('leagues', {})
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    return {
      id: item.id,
      name: item.name,
      type: 'Tournament',
      logo: item.logo ?? '',
      country: (item.country as Record<string, unknown>)?.name ?? '',
      countryCode: (item.country as Record<string, unknown>)?.code ?? null,
      flag: (item.country as Record<string, unknown>)?.flag ?? null,
      season: String(new Date().getFullYear()),
    } as League
  })
}

export async function getTennisGames(params: {
  league?: number
  player?: number
  season?: number
  next?: number
}): Promise<Fixture[]> {
  const queryParams: Record<string, string> = {}
  if (params.league) queryParams.league = String(params.league)
  if (params.player) queryParams.player = String(params.player)
  if (params.season) queryParams.season = String(params.season)
  if (params.next) queryParams.next = String(params.next)

  const data = await proxyFetch('games', queryParams)
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    const players = item.players as Array<Record<string, unknown>>
    const league = item.league as Record<string, unknown>
    const status = item.status as Record<string, unknown>
    const scores = item.scores as Array<Record<string, unknown>>
    const startTime = item.date as string

    const player1 = players?.[0]?.player as Record<string, unknown>
    const player2 = players?.[1]?.player as Record<string, unknown>

    const estimatedEnd = new Date(startTime)
    estimatedEnd.setMinutes(estimatedEnd.getMinutes() + 180)

    const score1 = scores?.[0]?.score as Record<string, unknown>
    const score2 = scores?.[1]?.score as Record<string, unknown>

    return {
      id: item.id,
      sport: 'tennis',
      leagueId: league?.id,
      leagueName: league?.name,
      leagueLogo: league?.logo,
      season: String(item.season ?? new Date().getFullYear()),
      homeTeam: player1 ? { id: player1.id as number, name: player1.name as string, logo: player1.photo as string ?? '' } : null,
      awayTeam: player2 ? { id: player2.id as number, name: player2.name as string, logo: player2.photo as string ?? '' } : null,
      startTime,
      endTime: estimatedEnd.toISOString(),
      status: status?.short ?? null,
      venue: null,
      round: item.round as string ?? null,
      homeScore: score1?.sets as number ?? null,
      awayScore: score2?.sets as number ?? null,
    } as Fixture
  })
}

export async function getTennisPlayers(params?: {
  search?: string
}): Promise<Player[]> {
  const queryParams: Record<string, string> = {}
  if (params?.search) queryParams.search = params.search

  const data = await proxyFetch('players', queryParams)
  return (data.response ?? []).map((item: Record<string, unknown>) => {
    return {
      id: item.id,
      name: item.name,
      photo: item.photo ?? '',
      nationality: item.country as string ?? null,
      position: null,
      age: item.age ?? null,
      teamId: null,
      teamName: null,
    } as Player
  })
}
