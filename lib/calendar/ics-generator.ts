import ical, { ICalCalendarMethod, ICalEventStatus } from 'ical-generator'
import { addMinutes } from 'date-fns'
import type { CachedFixture } from '@/types/database'

const SPORT_DURATIONS: Record<string, number> = {
  football: 105,
  basketball: 150,
  tennis: 180,
}

function buildSummary(fixture: CachedFixture): string {
  const raw = fixture.raw_data

  if (fixture.sport === 'football') {
    const teams = raw.teams as Record<string, unknown>
    const home = (teams?.home as Record<string, unknown>)?.name as string ?? ''
    const away = (teams?.away as Record<string, unknown>)?.name as string ?? ''
    if (home && away) return `⚽ ${home} vs ${away}`
  } else if (fixture.sport === 'basketball') {
    const teams = raw.teams as Record<string, unknown>
    const home = (teams?.home as Record<string, unknown>)?.name as string ?? ''
    const away = (teams?.away as Record<string, unknown>)?.name as string ?? ''
    if (home && away) return `🏀 ${home} vs ${away}`
  } else if (fixture.sport === 'tennis') {
    const players = raw.players as Array<Record<string, unknown>> | undefined
    const p1 = (players?.[0]?.player as Record<string, unknown>)?.name as string ?? ''
    const p2 = (players?.[1]?.player as Record<string, unknown>)?.name as string ?? ''
    if (p1 && p2) return `🎾 ${p1} vs ${p2}`
  }

  const league = (raw.league as Record<string, unknown>)?.name as string ?? ''
  return league || 'Match'
}

function buildDescription(fixture: CachedFixture): string {
  const raw = fixture.raw_data
  const parts: string[] = []

  const leagueName = (raw.league as Record<string, unknown>)?.name as string
  if (leagueName) parts.push(`League: ${leagueName}`)
  if (fixture.venue) parts.push(`Venue: ${fixture.venue}`)
  if (fixture.round) parts.push(`Round: ${fixture.round}`)
  if (fixture.status && fixture.status !== 'NS') parts.push(`Status: ${fixture.status}`)

  return parts.join('\n')
}

export function generateICS(
  fixtures: CachedFixture[],
  calendarName = 'My Sport Calendar'
): string {
  const cal = ical({
    name: calendarName,
    prodId: {
      company: 'SportCal',
      product: 'sport-calendar',
      language: 'EN',
    },
    method: ICalCalendarMethod.PUBLISH,
    ttl: 300,
  })

  for (const fixture of fixtures) {
    const startDate = new Date(fixture.start_time)
    const endDate = fixture.end_time
      ? new Date(fixture.end_time)
      : addMinutes(startDate, SPORT_DURATIONS[fixture.sport] ?? 120)

    const isFinished = fixture.status === 'FT' || fixture.status === 'AET' || fixture.status === 'PEN'

    cal.createEvent({
      id: `${fixture.sport}-${fixture.fixture_id}@sportcal`,
      start: startDate,
      end: endDate,
      summary: buildSummary(fixture),
      description: buildDescription(fixture),
      location: fixture.venue ?? undefined,
      status: isFinished ? ICalEventStatus.CONFIRMED : ICalEventStatus.TENTATIVE,
    })
  }

  return cal.toString()
}
