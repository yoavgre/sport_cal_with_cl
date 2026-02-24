/**
 * Synthetic placeholder fixtures for major tournament knockout rounds.
 *
 * The sports API (api-sports.io) only publishes knockout fixtures once
 * the teams are known — sometimes days before the game. This file provides
 * officially-scheduled date/time slots for each round so users can see
 * "UEFA Champions League – Final" in their calendar months in advance.
 *
 * Placeholder fixture_ids are prefixed with "ph_" so they can be
 * distinguished from real API fixtures and cleaned up once real data arrives.
 *
 * Official sources:
 *   FIFA 2026 WC: https://www.fifa.com/en/tournaments/mens/worldcup/articles/2026-fifa-world-cup-match-schedule
 *   UEFA UCL 2025-26: https://www.uefa.com/uefachampionsleague/
 */

const WC_LOGO = 'https://media.api-sports.io/football/leagues/1.png'
const UCL_LOGO = 'https://media.api-sports.io/football/leagues/2.png'

// Shape matches what the sync route pushes to fixturesToUpsert
export interface PlaceholderRow {
  sport: string
  fixture_id: string
  league_id: string
  season: string
  home_team_id: null
  away_team_id: null
  home_team_name: null
  away_team_name: null
  home_team_logo: null
  away_team_logo: null
  league_name: string
  league_logo: string | null
  start_time: string
  end_time: null
  status: string
  venue: string | null
  round: string
  home_score: null
  away_score: null
  player_ids: string[]
  tournament_id: null
  raw_data: Record<string, unknown>
  ttl_seconds: number
}

function makePlaceholder(
  id: string,
  leagueId: string,
  season: string,
  leagueName: string,
  leagueLogo: string | null,
  round: string,
  dateIso: string,       // e.g. "2026-07-19T22:00:00+00:00"
  venue?: string | null
): PlaceholderRow {
  return {
    sport: 'football',
    fixture_id: `ph_${id}`,
    league_id: leagueId,
    season,
    home_team_id: null,
    away_team_id: null,
    home_team_name: null,
    away_team_name: null,
    home_team_logo: null,
    away_team_logo: null,
    league_name: leagueName,
    league_logo: leagueLogo,
    start_time: dateIso,
    end_time: null,
    status: 'NS',
    venue: venue ?? null,
    round,
    home_score: null,
    away_score: null,
    player_ids: [],
    tournament_id: null,
    raw_data: {
      fixture: {
        id: `ph_${id}`,
        date: dateIso,
        status: { short: 'NS', long: 'Not Started' },
        venue: { name: venue ?? 'TBD', city: null },
        periods: { first: null, second: null },
        referee: null,
      },
      league: {
        id: Number(leagueId),
        name: leagueName,
        logo: leagueLogo ?? '',
        country: 'World',
        season: Number(season),
        round,
      },
      teams: {
        home: { id: null, name: 'TBD', logo: null, winner: null },
        away: { id: null, name: 'TBD', logo: null, winner: null },
      },
      goals: { home: null, away: null },
      score: {},
    },
    ttl_seconds: 21600, // 6h — re-check regularly so real fixtures replace us
  }
}

// ─────────────────────────────────────────────────────────────
//  FIFA WORLD CUP 2026   (league_id = "1", season = "2026")
//  Venue: USA / Canada / Mexico
//  All times UTC — 22:00 UTC = 18:00 ET (typical prime slot)
// ─────────────────────────────────────────────────────────────
const WC = 'FIFA World Cup'
const WC_FINAL_VENUE = 'MetLife Stadium, East Rutherford'

const WC_2026: PlaceholderRow[] = [
  // Round of 32 — June 28 – July 3 (16 games)
  makePlaceholder('wc2026_r32_01', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-06-28T20:00:00+00:00'),
  makePlaceholder('wc2026_r32_02', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-06-28T23:00:00+00:00'),
  makePlaceholder('wc2026_r32_03', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-06-29T20:00:00+00:00'),
  makePlaceholder('wc2026_r32_04', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-06-29T23:00:00+00:00'),
  makePlaceholder('wc2026_r32_05', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-06-30T20:00:00+00:00'),
  makePlaceholder('wc2026_r32_06', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-06-30T23:00:00+00:00'),
  makePlaceholder('wc2026_r32_07', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-01T20:00:00+00:00'),
  makePlaceholder('wc2026_r32_08', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-01T23:00:00+00:00'),
  makePlaceholder('wc2026_r32_09', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-02T20:00:00+00:00'),
  makePlaceholder('wc2026_r32_10', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-02T23:00:00+00:00'),
  makePlaceholder('wc2026_r32_11', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-03T20:00:00+00:00'),
  makePlaceholder('wc2026_r32_12', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-03T23:00:00+00:00'),
  makePlaceholder('wc2026_r32_13', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-04T20:00:00+00:00'),
  makePlaceholder('wc2026_r32_14', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-04T23:00:00+00:00'),
  makePlaceholder('wc2026_r32_15', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-05T20:00:00+00:00'),
  makePlaceholder('wc2026_r32_16', '1', '2026', WC, WC_LOGO, 'Round of 32', '2026-07-05T23:00:00+00:00'),

  // Round of 16 — July 6–9 (8 games)
  makePlaceholder('wc2026_r16_1', '1', '2026', WC, WC_LOGO, 'Round of 16', '2026-07-06T22:00:00+00:00'),
  makePlaceholder('wc2026_r16_2', '1', '2026', WC, WC_LOGO, 'Round of 16', '2026-07-07T22:00:00+00:00'),
  makePlaceholder('wc2026_r16_3', '1', '2026', WC, WC_LOGO, 'Round of 16', '2026-07-07T02:00:00+00:00'),
  makePlaceholder('wc2026_r16_4', '1', '2026', WC, WC_LOGO, 'Round of 16', '2026-07-08T22:00:00+00:00'),
  makePlaceholder('wc2026_r16_5', '1', '2026', WC, WC_LOGO, 'Round of 16', '2026-07-08T02:00:00+00:00'),
  makePlaceholder('wc2026_r16_6', '1', '2026', WC, WC_LOGO, 'Round of 16', '2026-07-09T22:00:00+00:00'),
  makePlaceholder('wc2026_r16_7', '1', '2026', WC, WC_LOGO, 'Round of 16', '2026-07-09T02:00:00+00:00'),
  makePlaceholder('wc2026_r16_8', '1', '2026', WC, WC_LOGO, 'Round of 16', '2026-07-10T02:00:00+00:00'),

  // Quarter-Finals — July 11–14 (4 games)
  makePlaceholder('wc2026_qf_1', '1', '2026', WC, WC_LOGO, 'Quarter-finals', '2026-07-11T22:00:00+00:00'),
  makePlaceholder('wc2026_qf_2', '1', '2026', WC, WC_LOGO, 'Quarter-finals', '2026-07-12T22:00:00+00:00'),
  makePlaceholder('wc2026_qf_3', '1', '2026', WC, WC_LOGO, 'Quarter-finals', '2026-07-13T22:00:00+00:00'),
  makePlaceholder('wc2026_qf_4', '1', '2026', WC, WC_LOGO, 'Quarter-finals', '2026-07-14T22:00:00+00:00'),

  // Semi-Finals — July 15–16 (2 games)
  makePlaceholder('wc2026_sf_1', '1', '2026', WC, WC_LOGO, 'Semi-finals', '2026-07-15T22:00:00+00:00'),
  makePlaceholder('wc2026_sf_2', '1', '2026', WC, WC_LOGO, 'Semi-finals', '2026-07-16T22:00:00+00:00'),

  // 3rd Place Final — July 18
  makePlaceholder('wc2026_3rd', '1', '2026', WC, WC_LOGO, '3rd Place Final', '2026-07-18T22:00:00+00:00'),

  // THE FINAL — July 19, 2026 at MetLife Stadium
  makePlaceholder('wc2026_final', '1', '2026', WC, WC_LOGO, 'Final', '2026-07-19T22:00:00+00:00', WC_FINAL_VENUE),
]

// ─────────────────────────────────────────────────────────────
//  UEFA CHAMPIONS LEAGUE 2025–26   (league_id = "2", season = "2025")
//  The API already has: qualifying + league stage (Sep–Jan) + Round of 32 (Feb)
//  Missing: Round of 16 onwards
//  Times: 19:00 or 21:00 UTC (20:00/22:00 CET)
//  Final: May 30, 2026 — Allianz Arena, Munich
// ─────────────────────────────────────────────────────────────
const UCL = 'UEFA Champions League'
const UCL_FINAL_VENUE = 'Allianz Arena, Munich'

const UCL_2526: PlaceholderRow[] = [
  // Round of 16 — 1st legs: March 10–11
  makePlaceholder('ucl2526_r16_f1', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-10T19:00:00+00:00'),
  makePlaceholder('ucl2526_r16_f2', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-10T21:00:00+00:00'),
  makePlaceholder('ucl2526_r16_f3', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-10T19:00:00+00:00'),
  makePlaceholder('ucl2526_r16_f4', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-10T21:00:00+00:00'),
  makePlaceholder('ucl2526_r16_f5', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-11T19:00:00+00:00'),
  makePlaceholder('ucl2526_r16_f6', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-11T21:00:00+00:00'),
  makePlaceholder('ucl2526_r16_f7', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-11T19:00:00+00:00'),
  makePlaceholder('ucl2526_r16_f8', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-11T21:00:00+00:00'),

  // Round of 16 — 2nd legs: March 17–18
  makePlaceholder('ucl2526_r16_s1', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-17T19:00:00+00:00'),
  makePlaceholder('ucl2526_r16_s2', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-17T21:00:00+00:00'),
  makePlaceholder('ucl2526_r16_s3', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-17T19:00:00+00:00'),
  makePlaceholder('ucl2526_r16_s4', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-17T21:00:00+00:00'),
  makePlaceholder('ucl2526_r16_s5', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-18T19:00:00+00:00'),
  makePlaceholder('ucl2526_r16_s6', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-18T21:00:00+00:00'),
  makePlaceholder('ucl2526_r16_s7', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-18T19:00:00+00:00'),
  makePlaceholder('ucl2526_r16_s8', '2', '2025', UCL, UCL_LOGO, 'Round of 16', '2026-03-18T21:00:00+00:00'),

  // Quarter-Finals — 1st legs: April 7–8
  makePlaceholder('ucl2526_qf_f1', '2', '2025', UCL, UCL_LOGO, 'Quarter-Finals', '2026-04-07T19:00:00+00:00'),
  makePlaceholder('ucl2526_qf_f2', '2', '2025', UCL, UCL_LOGO, 'Quarter-Finals', '2026-04-07T21:00:00+00:00'),
  makePlaceholder('ucl2526_qf_f3', '2', '2025', UCL, UCL_LOGO, 'Quarter-Finals', '2026-04-08T19:00:00+00:00'),
  makePlaceholder('ucl2526_qf_f4', '2', '2025', UCL, UCL_LOGO, 'Quarter-Finals', '2026-04-08T21:00:00+00:00'),

  // Quarter-Finals — 2nd legs: April 14–15
  makePlaceholder('ucl2526_qf_s1', '2', '2025', UCL, UCL_LOGO, 'Quarter-Finals', '2026-04-14T19:00:00+00:00'),
  makePlaceholder('ucl2526_qf_s2', '2', '2025', UCL, UCL_LOGO, 'Quarter-Finals', '2026-04-14T21:00:00+00:00'),
  makePlaceholder('ucl2526_qf_s3', '2', '2025', UCL, UCL_LOGO, 'Quarter-Finals', '2026-04-15T19:00:00+00:00'),
  makePlaceholder('ucl2526_qf_s4', '2', '2025', UCL, UCL_LOGO, 'Quarter-Finals', '2026-04-15T21:00:00+00:00'),

  // Semi-Finals — 1st legs: April 28–29
  makePlaceholder('ucl2526_sf_f1', '2', '2025', UCL, UCL_LOGO, 'Semi-Finals', '2026-04-28T19:00:00+00:00'),
  makePlaceholder('ucl2526_sf_f2', '2', '2025', UCL, UCL_LOGO, 'Semi-Finals', '2026-04-29T19:00:00+00:00'),

  // Semi-Finals — 2nd legs: May 5–6
  makePlaceholder('ucl2526_sf_s1', '2', '2025', UCL, UCL_LOGO, 'Semi-Finals', '2026-05-05T19:00:00+00:00'),
  makePlaceholder('ucl2526_sf_s2', '2', '2025', UCL, UCL_LOGO, 'Semi-Finals', '2026-05-06T19:00:00+00:00'),

  // THE FINAL — May 30, 2026 at Allianz Arena, Munich
  makePlaceholder('ucl2526_final', '2', '2025', UCL, UCL_LOGO, 'Final', '2026-05-30T20:00:00+00:00', UCL_FINAL_VENUE),
]

/**
 * Map key: `${leagueId}:${season}`
 * Value: array of placeholder fixtures for rounds not yet in the API
 */
export const TOURNAMENT_PLACEHOLDER_MAP: Record<string, PlaceholderRow[]> = {
  '1:2026': WC_2026,
  '2:2025': UCL_2526,
}
