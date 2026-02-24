/**
 * football-data.org supplementary client
 *
 * Used to fetch tournament knockout-stage fixture SLOTS that api-sports.io
 * doesn't publish until teams are confirmed (days before the game).
 * football-data.org publishes the full bracket immediately after the draw,
 * with homeTeam/awayTeam as null for unconfirmed spots.
 *
 * Free tier covers: WC, UCL, La Liga, EPL, Bundesliga, etc.
 *   → https://www.football-data.org/coverage
 *
 * Registration (email only, instant, free forever):
 *   → https://www.football-data.org/client/register
 *
 * Add FOOTBALL_DATA_API_KEY to .env.local to enable.
 * If absent, the feature is silently disabled (no TBD fixtures shown).
 */

const FD_BASE = 'https://api.football-data.org/v4'
const FD_API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? ''

/**
 * Maps our api-sports.io league IDs → football-data.org competition codes.
 * Add entries here to support more tournaments automatically.
 */
const LEAGUE_TO_FD_CODE: Record<string, string> = {
  '1': 'WC',  // FIFA World Cup
  '2': 'CL',  // UEFA Champions League
  '4': 'EC',  // UEFA European Championship
  '3': 'EL',  // UEFA Europa League
}

/**
 * Maps football-data.org stage codes → round names stored in cached_fixtures.
 * These must match the round strings produced by parseFootballFixture() so that
 * the covered-round cleanup logic correctly detects when real fixtures arrive.
 */
export const FD_STAGE_TO_ROUND: Record<string, string> = {
  ROUND_OF_32:    'Round of 32',
  ROUND_OF_16:    'Round of 16',
  QUARTER_FINALS: 'Quarter-finals',
  SEMI_FINALS:    'Semi-finals',
  THIRD_PLACE:    '3rd Place Final',
  FINAL:          'Final',
}

export interface FDPlaceholderRow {
  sport:           string
  fixture_id:      string       // prefixed "fdo_<fd_match_id>"
  league_id:       string
  season:          string
  home_team_id:    null
  away_team_id:    null
  home_team_name:  null
  away_team_name:  null
  home_team_logo:  null
  away_team_logo:  null
  league_name:     string
  league_logo:     string | null
  start_time:      string
  end_time:        null
  status:          string
  venue:           null
  round:           string
  home_score:      null
  away_score:      null
  player_ids:      string[]
  tournament_id:   null
  raw_data:        Record<string, unknown>
  ttl_seconds:     number
}

/** Returns true if football-data.org coverage + API key are configured for this league. */
export function isFDSupportedLeague(leagueId: string): boolean {
  return leagueId in LEAGUE_TO_FD_CODE && Boolean(FD_API_KEY)
}

/**
 * Fetches future TBD knockout fixture slots from football-data.org.
 *
 * Only returns fixtures where at least one team is not yet determined
 * (homeTeam.id or awayTeam.id is null) AND the match is still scheduled.
 *
 * Returns [] when:
 *   - FOOTBALL_DATA_API_KEY is not set
 *   - The league has no football-data.org mapping
 *   - The API request fails
 */
export async function fetchFDTBDKnockoutFixtures(
  leagueId: string,
  season: string,
): Promise<FDPlaceholderRow[]> {
  const fdCode = LEAGUE_TO_FD_CODE[leagueId]
  if (!fdCode || !FD_API_KEY) return []

  // football-data.org uses only the starting year as the season value:
  //   WC 2026       → season=2026
  //   UCL 2025-26   → season=2025  (use starting year)
  const fdSeason = season.includes('-') ? season.split('-')[0] : season

  try {
    const res = await fetch(
      `${FD_BASE}/competitions/${fdCode}/matches?season=${fdSeason}`,
      {
        headers: { 'X-Auth-Token': FD_API_KEY },
        cache: 'no-store',
      },
    )
    if (!res.ok) {
      console.warn(`[football-data] ${fdCode} season=${fdSeason} → HTTP ${res.status}`)
      return []
    }

    const data = await res.json()
    const competition = data.competition as Record<string, unknown> | undefined
    const matches = (data.matches ?? []) as Record<string, unknown>[]

    return matches
      .filter((m) => {
        // Only handle rounds we care about (knockout stage)
        const roundName = FD_STAGE_TO_ROUND[(m.stage as string) ?? '']
        if (!roundName) return false

        // Only TBD fixtures (at least one team unknown)
        const homeId = (m.homeTeam as Record<string, unknown> | null)?.id
        const awayId = (m.awayTeam as Record<string, unknown> | null)?.id
        if (homeId && awayId) return false  // Both teams known — let api-sports handle it

        // Must be a future scheduled match
        const status = (m.status as string) ?? ''
        return status === 'SCHEDULED' || status === 'TIMED'
      })
      .map((m) => ({
        sport:          'football',
        fixture_id:     `fdo_${m.id as string | number}`,
        league_id:      leagueId,
        season,
        home_team_id:   null,
        away_team_id:   null,
        home_team_name: null,
        away_team_name: null,
        home_team_logo: null,
        away_team_logo: null,
        league_name:    (competition?.name as string) ?? '',
        league_logo:    `https://media.api-sports.io/football/leagues/${leagueId}.png`,
        start_time:     m.utcDate as string,
        end_time:       null,
        status:         'NS',
        venue:          null,
        round:          FD_STAGE_TO_ROUND[(m.stage as string)] ?? '',
        home_score:     null,
        away_score:     null,
        player_ids:     [] as string[],
        tournament_id:  null,
        raw_data:       m,
        ttl_seconds:    21600, // 6h refresh — ensures we catch when teams get confirmed
      }))
  } catch (err) {
    console.warn('[football-data] fetch failed:', err instanceof Error ? err.message : err)
    return []
  }
}
