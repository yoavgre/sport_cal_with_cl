'use client'

import { useEffect, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import type { Follow } from '@/types/database'
import type { CalendarEvent } from '@/types/sports'
import { SPORT_COLORS } from '@/types/sports'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

interface CalendarViewProps {
  follows: Follow[]
}

function eventToInput(event: CalendarEvent): EventInput {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: SPORT_COLORS[event.sport] ?? '#6366f1',
    borderColor: SPORT_COLORS[event.sport] ?? '#6366f1',
    extendedProps: event,
  }
}

// Trigger background fixture sync once per browser session
const SYNC_SESSION_KEY = 'sportcal_synced_at'
async function triggerBackgroundSync() {
  const last = sessionStorage.getItem(SYNC_SESSION_KEY)
  if (last && Date.now() - Number(last) < 10 * 60 * 1000) return // debounce: 10 min
  sessionStorage.setItem(SYNC_SESSION_KEY, String(Date.now()))
  try {
    await fetch('/api/sync/fixtures', { method: 'POST', cache: 'no-store' })
  } catch { /* non-blocking */ }
}

export default function CalendarView({ follows }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle')

  const fetchEvents = useCallback(async () => {
    if (follows.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - 7)
      const toDate = new Date()
      toDate.setDate(toDate.getDate() + 60)

      const from = fromDate.toISOString().split('T')[0]
      const to = toDate.toISOString().split('T')[0]

      // Football season: year the season STARTS (before Aug → previous year)
      const now = new Date()
      const footballSeason = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1

      // Basketball season: "YYYY-YYYY" string format, pick most recent ended season
      // Free plan caps at 2024-2025 so we use that; this should auto-update when plan upgrades
      const basketballSeason = now.getMonth() >= 9
        ? `${now.getFullYear()}-${now.getFullYear() + 1}`
        : `${now.getFullYear() - 1}-${now.getFullYear()}`

      const teamFollows = follows.filter((f) => f.entity_type === 'team')
      const leagueFollows = follows.filter((f) => f.entity_type === 'league')

      const allEvents: CalendarEvent[] = []

      // Fetch football fixtures for followed teams
      const footballTeams = teamFollows.filter((f) => f.sport === 'football')
      const footballLeagues = leagueFollows.filter((f) => f.sport === 'football')

      for (const follow of footballTeams) {
        try {
          const res = await fetch(
            `/api/sports/football/fixtures?team=${follow.entity_id}&from=${from}&to=${to}&season=${footballSeason}`
          )
          if (res.ok) {
            const data = await res.json()
            allEvents.push(...mapFootballFixtures(data.response ?? [], 'football'))
          }
        } catch {}
      }

      for (const follow of footballLeagues) {
        try {
          const res = await fetch(
            `/api/sports/football/fixtures?league=${follow.entity_id}&from=${from}&to=${to}&season=${footballSeason}`
          )
          if (res.ok) {
            const data = await res.json()
            allEvents.push(...mapFootballFixtures(data.response ?? [], 'football'))
          }
        } catch {}
      }

      // Fetch basketball games for followed teams/leagues
      // Basketball API doesn't support from/to date range — fetch by season only
      // (season param returns all games for that season; we filter by date client-side)
      const basketballTeams = teamFollows.filter((f) => f.sport === 'basketball')
      const basketballLeagues = leagueFollows.filter((f) => f.sport === 'basketball')

      for (const follow of [...basketballTeams, ...basketballLeagues]) {
        try {
          const param = follow.entity_type === 'team' ? 'team' : 'league'
          const res = await fetch(
            `/api/sports/basketball/games?${param}=${follow.entity_id}&season=${encodeURIComponent(basketballSeason)}`
          )
          if (res.ok) {
            const data = await res.json()
            // Filter to our date window client-side
            const games = (data.response ?? []).filter((g: Record<string, unknown>) => {
              const d = g.date as string
              if (!d) return false
              return d >= from && d <= to
            })
            allEvents.push(...mapBasketballGames(games))
          }
        } catch {}
      }

      // Deduplicate by event id
      const unique = Array.from(new Map(allEvents.map((e) => [e.id, e])).values())
      setEvents(unique)
    } finally {
      setLoading(false)
    }
  }, [follows])

  useEffect(() => {
    // Trigger sync in background, then fetch events
    if (follows.length > 0) {
      setSyncStatus('syncing')
      triggerBackgroundSync().finally(() => setSyncStatus('done'))
    }
    fetchEvents()
  }, [fetchEvents, follows.length])

  const handleEventClick = (info: EventClickArg) => {
    const event = info.event.extendedProps as CalendarEvent
    setSelectedEvent(event)
    setSheetOpen(true)
  }

  const fcEvents = events.map(eventToInput)

  const handleManualRefresh = async () => {
    setSyncStatus('syncing')
    sessionStorage.removeItem(SYNC_SESSION_KEY) // force re-sync
    await triggerBackgroundSync()
    setSyncStatus('done')
    await fetchEvents()
  }

  return (
    <>
      <div className="fc-container">
        {/* Sync status bar */}
        {follows.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs text-muted-foreground">
              {syncStatus === 'syncing' && '⟳ Syncing fixtures…'}
              {syncStatus === 'done' && events.length > 0 && `${events.length} fixture${events.length !== 1 ? 's' : ''} loaded`}
              {syncStatus === 'done' && !loading && events.length === 0 && 'No fixtures found in the next 60 days'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={syncStatus === 'syncing' || loading}
              className="h-7 px-2 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading events…
          </div>
        )}
        {!loading && follows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-2xl mb-3">📅</p>
            <p className="font-medium">No followed teams or leagues yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Browse and follow teams or leagues to see their fixtures here
            </p>
          </div>
        )}
        {!loading && (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,listWeek',
            }}
            events={fcEvents}
            eventClick={handleEventClick}
            height="auto"
            nowIndicator
          />
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          {selectedEvent && (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8">{selectedEvent.title}</SheetTitle>
                <SheetDescription>
                  {selectedEvent.leagueName}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    style={{ backgroundColor: SPORT_COLORS[selectedEvent.sport] }}
                    className="text-white capitalize"
                  >
                    {selectedEvent.sport}
                  </Badge>
                  {selectedEvent.status && selectedEvent.status !== 'NS' && (
                    <Badge variant="secondary">{selectedEvent.status}</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {format(selectedEvent.start, 'EEEE, MMM d yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {format(selectedEvent.start, 'HH:mm')}
                    </span>
                  </div>
                  {selectedEvent.venue && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venue</span>
                      <span className="font-medium">{selectedEvent.venue}</span>
                    </div>
                  )}
                  {(selectedEvent.homeScore != null || selectedEvent.awayScore != null) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium text-lg">
                        {selectedEvent.homeScore} - {selectedEvent.awayScore}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

// Mapping helpers
function mapFootballFixtures(response: unknown[], sport: string): CalendarEvent[] {
  return response.map((item) => {
    const i = item as Record<string, unknown>
    const fixture = i.fixture as Record<string, unknown>
    const league = i.league as Record<string, unknown>
    const teams = i.teams as Record<string, unknown>
    const goals = i.goals as Record<string, unknown>
    const home = (teams?.home ?? {}) as Record<string, unknown>
    const away = (teams?.away ?? {}) as Record<string, unknown>
    const status = fixture.status as Record<string, unknown>

    const homeTeam = home.name as string ?? null
    const awayTeam = away.name as string ?? null
    const start = new Date(fixture.date as string)
    const end = new Date(start.getTime() + 105 * 60 * 1000)

    return {
      id: `football-${fixture.id}`,
      title: homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : 'Match',
      start,
      end,
      sport,
      leagueId: String(league?.id),
      venue: (fixture.venue as Record<string, unknown>)?.name as string ?? null,
      status: status?.short as string ?? null,
      homeTeam,
      awayTeam,
      homeScore: goals?.home as number ?? null,
      awayScore: goals?.away as number ?? null,
      leagueName: league?.name as string ?? null,
      leagueLogo: league?.logo as string ?? null,
    } as CalendarEvent
  })
}

function mapBasketballGames(response: unknown[]): CalendarEvent[] {
  return response.map((item) => {
    const i = item as Record<string, unknown>
    const teams = i.teams as Record<string, unknown>
    const scores = i.scores as Record<string, unknown>
    const league = i.league as Record<string, unknown>
    const status = i.status as Record<string, unknown>
    const home = (teams?.home ?? {}) as Record<string, unknown>
    const away = (teams?.away ?? {}) as Record<string, unknown>
    const homeScore = (scores?.home ?? {}) as Record<string, unknown>
    const awayScore = (scores?.away ?? {}) as Record<string, unknown>

    const homeTeam = home.name as string ?? null
    const awayTeam = away.name as string ?? null
    const start = new Date(i.date as string)
    const end = new Date(start.getTime() + 150 * 60 * 1000)

    return {
      id: `basketball-${i.id}`,
      title: homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : 'Game',
      start,
      end,
      sport: 'basketball',
      leagueId: String(league?.id),
      venue: null,
      status: status?.short as string ?? null,
      homeTeam,
      awayTeam,
      homeScore: homeScore?.total as number ?? null,
      awayScore: awayScore?.total as number ?? null,
      leagueName: league?.name as string ?? null,
      leagueLogo: league?.logo as string ?? null,
    } as CalendarEvent
  })
}

