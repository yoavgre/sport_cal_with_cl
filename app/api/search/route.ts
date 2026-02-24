import { NextRequest, NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// Football season helper
function footballSeason() {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
}

async function proxyFetch(sport: string, endpoint: string, params: Record<string, string>) {
  const url = new URL(`${APP_URL}/api/sports/${sport}/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return data.response ?? []
}

function mapFootballLeague(item: Record<string, unknown>, season: string) {
  const league = item.league as Record<string, unknown>
  const country = item.country as Record<string, unknown>
  const seasons = item.seasons as Array<Record<string, unknown>>
  const currentSeason = seasons?.find((se) => se.current) ?? seasons?.[seasons.length - 1]
  return {
    id: league?.id,
    name: league?.name,
    logo: league?.logo,
    type: league?.type,
    country: country?.name,
    flag: country?.flag,
    sport: 'football',
    season: String(currentSeason?.year ?? season),
    entityType: 'league' as const,
  }
}

function mapBasketballLeague(item: Record<string, unknown>) {
  const country = item.country as Record<string, unknown>
  const seasons = item.seasons as Array<Record<string, unknown>>
  const latestSeason = seasons?.[seasons.length - 1]
  return {
    id: item.id,
    name: item.name,
    logo: item.logo,
    type: item.type,
    country: country?.name,
    flag: (country as Record<string, unknown>)?.flag,
    sport: 'basketball',
    season: String(latestSeason?.season ?? '2024-2025'),
    entityType: 'league' as const,
  }
}

function mapFootballTeam(item: Record<string, unknown>, season: string) {
  const team = item.team as Record<string, unknown>
  const venue = item.venue as Record<string, unknown>
  return {
    id: team?.id,
    name: team?.name,
    logo: team?.logo,
    country: team?.country,
    venue: venue?.name,
    national: team?.national as boolean,
    sport: 'football',
    season,
    entityType: 'team' as const,
  }
}

function mapFootballPlayer(item: Record<string, unknown>, season: string) {
  const p = item.player as Record<string, unknown>
  const stats = (item.statistics as Array<Record<string, unknown>>)?.[0]
  const team = stats?.team as Record<string, unknown>
  return {
    id: p?.id,
    name: p?.name,
    photo: p?.photo,
    nationality: p?.nationality,
    age: p?.age,
    position: (stats?.games as Record<string, unknown>)?.position,
    teamName: team?.name,
    teamLogo: team?.logo,
    teamId: team?.id,
    sport: 'football',
    season,
    entityType: 'player' as const,
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()
  const sport = request.nextUrl.searchParams.get('sport') // optional filter
  const type = request.nextUrl.searchParams.get('type')   // 'league' | 'team' | 'player' | all

  if (!query || query.length < 2) {
    return NextResponse.json({ leagues: [], teams: [], players: [] })
  }

  const season = String(footballSeason())
  const sports = sport ? [sport] : ['football', 'basketball']

  const results: {
    leagues: unknown[]
    teams: unknown[]
    players: unknown[]
  } = { leagues: [], teams: [], players: [] }

  await Promise.allSettled(
    sports.flatMap((s) => {
      const tasks = []

      // Search leagues
      if (!type || type === 'league') {
        tasks.push(
          proxyFetch(s, 'leagues', { search: query }).then((items) => {
            const mapped = items.map((item: Record<string, unknown>) =>
              s === 'football' ? mapFootballLeague(item, season) : mapBasketballLeague(item)
            )
            results.leagues.push(...mapped)
          })
        )
      }

      // Search teams - football supports club + national teams
      if ((!type || type === 'team') && s === 'football') {
        // Search club teams
        tasks.push(
          proxyFetch('football', 'teams', { search: query }).then((items) => {
            const mapped = items.map((item: Record<string, unknown>) => mapFootballTeam(item, season))
            results.teams.push(...mapped)
          })
        )
        // Also search national teams separately
        tasks.push(
          proxyFetch('football', 'teams', { search: query, type: 'national' }).then((items) => {
            const mapped = items.map((item: Record<string, unknown>) => mapFootballTeam(item, season))
            // Avoid duplicates (club search may also return national teams)
            const existingIds = new Set(results.teams.map((t) => (t as { id: unknown }).id))
            const newItems = mapped.filter((t: { id: unknown }) => !existingIds.has(t.id))
            results.teams.push(...newItems)
          })
        )
      } else if ((!type || type === 'team') && s === 'basketball') {
        tasks.push(
          proxyFetch('basketball', 'teams', { search: query }).then((items) => {
            const mapped = items.map((item: Record<string, unknown>) => ({
              id: item.id,
              name: item.name,
              logo: item.logo,
              country: (item.country as Record<string, unknown>)?.name,
              venue: null,
              national: false,
              sport: 'basketball',
              season: '2024-2025',
              entityType: 'team' as const,
            }))
            results.teams.push(...mapped)
          })
        )
      }

      // Search players (football only)
      if ((!type || type === 'player') && s === 'football') {
        // Primary: search by player name directly
        tasks.push(
          proxyFetch('football', 'players', { search: query, season }).then((items) => {
            const mapped = items.map((item: Record<string, unknown>) => mapFootballPlayer(item, season))
            results.players.push(...mapped)
          })
        )

        // Fallback: if the query looks like a team name (or if user searches team name),
        // also try to find players by team — we try fetching teams matching query
        // and then get their players. This helps find "haziza maccabi haifa" → find team Maccabi Haifa → get players
        // We handle this by also searching teams and queuing a secondary player-by-team search
        // This runs as a separate task so it doesn't block the main player search
        tasks.push(
          proxyFetch('football', 'teams', { search: query }).then(async (teams) => {
            if (teams.length === 0) return
            // Take the first matching team and get its players
            const firstTeam = teams[0]?.team as Record<string, unknown>
            if (!firstTeam?.id) return
            const teamPlayers = await proxyFetch('football', 'players', {
              team: String(firstTeam.id),
              season,
            })
            const mapped = teamPlayers.map((item: Record<string, unknown>) => mapFootballPlayer(item, season))
            // Only add players not already in results
            const existingIds = new Set(results.players.map((p) => (p as { id: unknown }).id))
            const newPlayers = mapped.filter((p: { id: unknown }) => !existingIds.has(p.id))
            results.players.push(...newPlayers)
          })
        )
      }

      return tasks
    })
  )

  return NextResponse.json(results)
}
