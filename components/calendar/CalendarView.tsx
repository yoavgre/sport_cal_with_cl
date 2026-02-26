'use client'

import { useEffect, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventInput, EventContentArg } from '@fullcalendar/core'
import type { Follow, CachedFixture } from '@/types/database'
import type { CalendarEvent } from '@/types/sports'
import { SPORT_COLORS } from '@/types/sports'
import { fixtureToCalendarEvent } from '@/lib/calendar/fixture-to-event'
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
      // Read from cached_fixtures via our events API — no season or date-range
      // restrictions here; sync already populated all upcoming fixtures.
      const res = await fetch('/api/calendar/events')
      if (!res.ok) throw new Error('Failed to fetch events')

      const fixtures: CachedFixture[] = await res.json()

      // Map CachedFixture → CalendarEvent using the shared helper
      const calEvents = fixtures
        .map((f) => {
          try {
            return fixtureToCalendarEvent(f)
          } catch {
            return null
          }
        })
        .filter((e): e is CalendarEvent => e !== null)

      // Deduplicate by event id
      const unique = Array.from(new Map(calEvents.map((e) => [e.id, e])).values())
      setEvents(unique)
    } catch (err) {
      console.error('[CalendarView] fetchEvents error:', err)
    } finally {
      setLoading(false)
    }
  }, [follows])

  useEffect(() => {
    if (follows.length > 0) {
      setSyncStatus('syncing')
      triggerBackgroundSync().finally(() => {
        setSyncStatus('done')
        fetchEvents()
      })
    } else {
      fetchEvents()
    }
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
              {syncStatus === 'done' && !loading && events.length === 0 && 'No upcoming fixtures found'}
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
            scrollTime="09:00:00"
            slotMinTime="07:00:00"
            slotMaxTime="26:00:00"
            eventContent={(arg: EventContentArg) => {
              if (arg.view.type !== 'listWeek') return true
              const ev = arg.event.extendedProps as CalendarEvent
              return (
                <div className="flex items-center gap-2 min-w-0 flex-1 py-0.5">
                  {ev.leagueLogo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.leagueLogo} alt="" className="w-4 h-4 object-contain flex-shrink-0 opacity-60" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{arg.event.title}</div>
                    {ev.leagueName && (
                      <div className="text-xs text-muted-foreground truncate">{ev.leagueName}</div>
                    )}
                  </div>
                </div>
              )
            }}
          />
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          {selectedEvent && (
            <>
              <SheetHeader>
                <SheetTitle className="sr-only">{selectedEvent.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                {/* Team matchup with logos */}
                {selectedEvent.homeTeam && selectedEvent.awayTeam ? (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      {selectedEvent.homeTeamLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedEvent.homeTeamLogo} alt={selectedEvent.homeTeam} className="w-14 h-14 object-contain" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold text-muted-foreground">
                          {selectedEvent.homeTeam[0]}
                        </div>
                      )}
                      <span className="text-sm font-medium text-center leading-tight">{selectedEvent.homeTeam}</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0">
                      {selectedEvent.homeScore != null && selectedEvent.awayScore != null ? (
                        <span className="text-3xl font-bold tabular-nums">{selectedEvent.homeScore} – {selectedEvent.awayScore}</span>
                      ) : (
                        <span className="text-base font-semibold text-muted-foreground">vs</span>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2 flex-1">
                      {selectedEvent.awayTeamLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedEvent.awayTeamLogo} alt={selectedEvent.awayTeam} className="w-14 h-14 object-contain" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold text-muted-foreground">
                          {selectedEvent.awayTeam[0]}
                        </div>
                      )}
                      <span className="text-sm font-medium text-center leading-tight">{selectedEvent.awayTeam}</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <p className="font-semibold text-lg">{selectedEvent.title}</p>
                    {selectedEvent.leagueName && (
                      <p className="text-sm text-muted-foreground mt-0.5">{selectedEvent.leagueName}</p>
                    )}
                  </div>
                )}

                {/* Badges */}
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
                  {selectedEvent.leagueName && selectedEvent.homeTeam && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Competition</span>
                      <span className="font-medium">{selectedEvent.leagueName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {format(selectedEvent.start, 'EEE, MMM d yyyy')}
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
                      <span className="font-medium text-right max-w-[60%]">{selectedEvent.venue}</span>
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
