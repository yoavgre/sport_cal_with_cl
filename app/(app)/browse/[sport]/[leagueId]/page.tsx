import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FollowButton } from '@/components/follow/FollowButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SPORTS } from '@/types/sports'
import type { Team, Fixture } from '@/types/sports'
import { format } from 'date-fns'

interface PageProps {
  params: Promise<{ sport: string; leagueId: string }>
  searchParams: Promise<{ season?: string }>
}

function getCurrentSeason(sport: string): string {
  const now = new Date()
  if (sport === 'football') {
    return now.getMonth() >= 7 ? String(now.getFullYear()) : String(now.getFullYear() - 1)
  }
  const year = now.getFullYear()
  return now.getMonth() >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function parseTeams(items: Record<string, unknown>[], sport: string): Team[] {
  return items.map((item) => {
    if (sport === 'football') {
      const team = item.team as Record<string, unknown>
      const venue = item.venue as Record<string, unknown>
      return {
        id: team?.id as number,
        name: team?.name as string,
        logo: team?.logo as string ?? '',
        country: team?.country as string ?? null,
        founded: team?.founded as number ?? null,
        venue: venue?.name as string ?? null,
      } as Team
    }
    // Basketball: flat
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

function parseFixtures(items: Record<string, unknown>[], sport: string, leagueId: string): Fixture[] {
  return items.map((item) => {
    if (sport === 'football') {
      const fixture = item.fixture as Record<string, unknown>
      const league = item.league as Record<string, unknown>
      const teams = item.teams as Record<string, unknown>
      const goals = item.goals as Record<string, unknown>
      const home = teams?.home as Record<string, unknown>
      const away = teams?.away as Record<string, unknown>
      const status = fixture?.status as Record<string, unknown>
      return {
        id: fixture?.id as number,
        sport,
        leagueId: league?.id as number ?? Number(leagueId),
        leagueName: league?.name as string,
        leagueLogo: league?.logo as string,
        season: String(league?.season ?? ''),
        homeTeam: home ? { id: home.id as number, name: home.name as string, logo: home.logo as string } : null,
        awayTeam: away ? { id: away.id as number, name: away.name as string, logo: away.logo as string } : null,
        startTime: fixture?.date as string,
        endTime: null,
        status: status?.short as string ?? null,
        venue: (fixture?.venue as Record<string, unknown>)?.name as string ?? null,
        round: league?.round as string ?? null,
        homeScore: goals?.home as number ?? null,
        awayScore: goals?.away as number ?? null,
      } as Fixture
    }
    // Basketball
    const teams = item.teams as Record<string, unknown>
    const scores = item.scores as Record<string, unknown>
    const league = item.league as Record<string, unknown>
    const status = item.status as Record<string, unknown>
    const home = teams?.home as Record<string, unknown>
    const away = teams?.away as Record<string, unknown>
    const homeScore = scores?.home as Record<string, unknown>
    const awayScore = scores?.away as Record<string, unknown>
    return {
      id: item.id as number,
      sport,
      leagueId: league?.id as number ?? Number(leagueId),
      leagueName: league?.name as string,
      leagueLogo: league?.logo as string,
      season: String(item.season ?? ''),
      homeTeam: home ? { id: home.id as number, name: home.name as string, logo: home.logo as string } : null,
      awayTeam: away ? { id: away.id as number, name: away.name as string, logo: away.logo as string } : null,
      startTime: item.date as string,
      endTime: null,
      status: status?.short as string ?? null,
      venue: null,
      round: null,
      homeScore: homeScore?.total as number ?? null,
      awayScore: awayScore?.total as number ?? null,
    } as Fixture
  })
}

const FINISHED_STATUSES = ['FT', 'FIN', 'AOT', 'AET', 'PEN']
const LIVE_STATUSES = ['1H', '2H', 'ET', 'P', 'HT', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'OT']

function FixtureRow({ fixture }: { fixture: Fixture }) {
  const isFinished = fixture.status && FINISHED_STATUSES.includes(fixture.status)
  const isLive = fixture.status && LIVE_STATUSES.includes(fixture.status)
  const hasScore = isFinished || isLive
  const homeName = fixture.homeTeam?.name || null
  const awayName = fixture.awayTeam?.name || null
  const isTeamsKnown = !!homeName && !!awayName && homeName !== 'TBD' && awayName !== 'TBD'

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
      {/* Date/time column */}
      <div className="w-14 shrink-0 text-right">
        {isLive ? (
          <div className="flex items-center justify-end gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-bold text-red-400">{fixture.status}</span>
          </div>
        ) : isFinished ? (
          <span className="text-[11px] font-medium text-muted-foreground/60 uppercase">FT</span>
        ) : fixture.startTime ? (
          <div>
            <div className="text-[11px] text-muted-foreground/60">{format(new Date(fixture.startTime), 'MMM d')}</div>
            <div className="text-xs font-semibold text-muted-foreground">{format(new Date(fixture.startTime), 'HH:mm')}</div>
          </div>
        ) : null}
      </div>

      {/* Match */}
      <div className="flex-1 min-w-0">
        {isTeamsKnown ? (
          <>
            {/* Home team */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 shrink-0">
                {fixture.homeTeam?.logo && (
                  <Image src={fixture.homeTeam.logo} alt={homeName!} width={20} height={20} className="object-contain" />
                )}
              </div>
              <span className={`text-sm truncate ${isFinished && (fixture.homeScore ?? 0) > (fixture.awayScore ?? 0) ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                {homeName}
              </span>
              {hasScore && (
                <span className={`ml-auto text-sm font-bold shrink-0 ${isFinished && (fixture.homeScore ?? 0) > (fixture.awayScore ?? 0) ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {fixture.homeScore ?? 0}
                </span>
              )}
            </div>
            {/* Away team */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 shrink-0">
                {fixture.awayTeam?.logo && (
                  <Image src={fixture.awayTeam.logo} alt={awayName!} width={20} height={20} className="object-contain" />
                )}
              </div>
              <span className={`text-sm truncate ${isFinished && (fixture.awayScore ?? 0) > (fixture.homeScore ?? 0) ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                {awayName}
              </span>
              {hasScore && (
                <span className={`ml-auto text-sm font-bold shrink-0 ${isFinished && (fixture.awayScore ?? 0) > (fixture.homeScore ?? 0) ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {fixture.awayScore ?? 0}
                </span>
              )}
            </div>
          </>
        ) : (
          /* TBD fixture — teams not yet decided (knockout stage placeholder) */
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground/90 truncate">
                {fixture.round ?? 'TBD vs TBD'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Teams to be determined</p>
            </div>
          </div>
        )}
        {isTeamsKnown && fixture.round && (
          <p className="text-[10px] text-muted-foreground/50 mt-1 truncate">{fixture.round}</p>
        )}
      </div>
    </div>
  )
}

export default async function LeaguePage({ params, searchParams }: PageProps) {
  const { sport, leagueId } = await params
  const { season: seasonParam } = await searchParams
  const sportConfig = SPORTS.find((s) => s.id === sport)
  if (!sportConfig) notFound()

  const season = seasonParam ?? getCurrentSeason(sport)
  const seasonEncoded = encodeURIComponent(season)
  const fixturesEndpoint = sport === 'basketball' ? 'games' : 'fixtures'
  // Fetch upcoming + recent fixtures for this season.
  // For football we get upcoming (next=20) AND last 5 to show recent results too
  const upcomingQuery = sport === 'football'
    ? `league=${leagueId}&season=${seasonEncoded}&next=20`
    : `league=${leagueId}&season=${seasonEncoded}`
  const recentQuery = sport === 'football'
    ? `league=${leagueId}&season=${seasonEncoded}&last=5`
    : null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [leagueInfoRes, teamsRes, fixturesRes, recentRes] = await Promise.allSettled([
    // Always fetch league info directly so we always have name + logo
    fetch(`${appUrl}/api/sports/${sport}/leagues?id=${leagueId}`, { cache: 'no-store' }),
    fetch(`${appUrl}/api/sports/${sport}/teams?league=${leagueId}&season=${seasonEncoded}`, { cache: 'no-store' }),
    fetch(`${appUrl}/api/sports/${sport}/${fixturesEndpoint}?${upcomingQuery}`, { cache: 'no-store' }),
    ...(recentQuery ? [fetch(`${appUrl}/api/sports/${sport}/${fixturesEndpoint}?${recentQuery}`, { cache: 'no-store' })] : []),
  ])

  let teams: Team[] = []
  let fixtures: Fixture[] = []
  let recentFixtures: Fixture[] = []
  let leagueName = `League ${leagueId}`
  let leagueLogo = ''
  let leagueCountry = ''

  // Parse league info first (most reliable name/logo source)
  if (leagueInfoRes.status === 'fulfilled' && leagueInfoRes.value.ok) {
    const data = await leagueInfoRes.value.json()
    const first = data.response?.[0]
    if (first) {
      if (sport === 'football') {
        leagueName = (first.league as Record<string, unknown>)?.name as string ?? leagueName
        leagueLogo = (first.league as Record<string, unknown>)?.logo as string ?? ''
        leagueCountry = (first.country as Record<string, unknown>)?.name as string ?? ''
      } else {
        leagueName = first.name as string ?? leagueName
        leagueLogo = first.logo as string ?? ''
        leagueCountry = (first.country as Record<string, unknown>)?.name as string ?? ''
      }
    }
  }

  if (teamsRes.status === 'fulfilled' && teamsRes.value.ok) {
    const data = await teamsRes.value.json()
    teams = parseTeams(data.response ?? [], sport).sort((a, b) => a.name.localeCompare(b.name))
  }

  if (fixturesRes.status === 'fulfilled' && fixturesRes.value.ok) {
    const data = await fixturesRes.value.json()
    fixtures = parseFixtures(data.response ?? [], sport, leagueId)
    const first = fixtures[0]
    // Only override from fixtures if league info fetch failed
    if (!leagueName || leagueName === `League ${leagueId}`) {
      if (first?.leagueName) leagueName = first.leagueName
      if (first?.leagueLogo) leagueLogo = first.leagueLogo
    }
  }

  // Recent fixtures (last 5) — helps when no upcoming fixtures exist (e.g. between windows)
  if (recentRes && recentRes.status === 'fulfilled' && recentRes.value.ok) {
    const data = await recentRes.value.json()
    const parsed = parseFixtures(data.response ?? [], sport, leagueId)
    // Sort by date descending (most recent first)
    recentFixtures = parsed.sort((a, b) =>
      new Date(b.startTime ?? 0).getTime() - new Date(a.startTime ?? 0).getTime()
    )
    if (!leagueName || leagueName === `League ${leagueId}`) {
      const first = recentFixtures[0]
      if (first?.leagueName) leagueName = first.leagueName
      if (first?.leagueLogo) leagueLogo = first.leagueLogo
    }
  }

  const { data: followRow } = await supabase
    .from('follows').select('id')
    .eq('user_id', user!.id)
    .eq('entity_type', 'league')
    .eq('entity_id', leagueId)
    .maybeSingle()

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero header */}
      <div className="relative overflow-hidden px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 70%)' }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {leagueLogo ? (
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden p-1">
                <Image src={leagueLogo} alt={leagueName} width={56} height={56} className="object-contain" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-3xl shrink-0">🏆</div>
            )}
            <div>
              <h1 className="text-xl font-bold leading-tight">{leagueName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                {sportConfig.icon} {sport}{leagueCountry ? ` · ${leagueCountry}` : ''} · {season}
              </p>
            </div>
          </div>
          <FollowButton
            entityType="league"
            entityId={leagueId}
            entityName={leagueName}
            sport={sport}
            entityMetadata={{ logo_url: leagueLogo, country: leagueCountry, season }}
            initialFollowed={!!followRow}
          />
        </div>
      </div>

      <div className="p-5">
        <Tabs defaultValue="fixtures">
          <TabsList className="mb-5 bg-white/5">
            <TabsTrigger value="fixtures">
              Fixtures
              {(fixtures.length + recentFixtures.length) > 0 && (
                <span className="ml-1.5 text-[10px] bg-white/10 rounded-full px-1.5 py-0.5">
                  {fixtures.length + recentFixtures.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="teams">
              Teams
              {teams.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-white/10 rounded-full px-1.5 py-0.5">
                  {teams.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fixtures">
            {fixtures.length === 0 && recentFixtures.length === 0 ? (
              <p className="text-muted-foreground text-center py-16">No fixtures found for this season.</p>
            ) : (
              <div className="space-y-5">
                {fixtures.length > 0 && (
                  <section>
                    {recentFixtures.length > 0 && (
                      <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1 px-4">
                        Upcoming
                      </h3>
                    )}
                    <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
                      {fixtures.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} />)}
                    </div>
                  </section>
                )}
                {recentFixtures.length > 0 && (
                  <section>
                    <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1 px-4">
                      Recent Results
                    </h3>
                    <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
                      {recentFixtures.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} />)}
                    </div>
                  </section>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="teams">
            {teams.length === 0 ? (
              <p className="text-muted-foreground text-center py-16">No teams found.</p>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
                {teams.map((team) => (
                  <Link key={team.id} href={`/browse/${sport}/teams/${team.id}?season=${season}`} className="block">
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                        {team.logo ? (
                          <Image src={team.logo} alt={team.name} width={32} height={32} className="object-contain p-0.5" />
                        ) : (
                          <span className="text-sm">🏟️</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{team.name}</p>
                        {team.country && <p className="text-xs text-muted-foreground">{team.country}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
