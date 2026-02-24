import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FollowButton } from '@/components/follow/FollowButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SPORTS } from '@/types/sports'
import type { Fixture, Player } from '@/types/sports'
import { format } from 'date-fns'

interface PageProps {
  params: Promise<{ sport: string; teamId: string }>
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

      <div className="flex-1 min-w-0">
        {isTeamsKnown ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 shrink-0">
                {fixture.homeTeam?.logo && (
                  <Image src={fixture.homeTeam.logo} alt={homeName!} width={20} height={20} className="object-contain" />
                )}
              </div>
              <span className={`text-sm truncate ${isFinished && (fixture.homeScore ?? 0) > (fixture.awayScore ?? 0) ? 'font-semibold' : 'text-foreground/80'}`}>
                {homeName}
              </span>
              {hasScore && (
                <span className={`ml-auto text-sm font-bold shrink-0 ${isFinished && (fixture.homeScore ?? 0) > (fixture.awayScore ?? 0) ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {fixture.homeScore ?? 0}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 shrink-0">
                {fixture.awayTeam?.logo && (
                  <Image src={fixture.awayTeam.logo} alt={awayName!} width={20} height={20} className="object-contain" />
                )}
              </div>
              <span className={`text-sm truncate ${isFinished && (fixture.awayScore ?? 0) > (fixture.homeScore ?? 0) ? 'font-semibold' : 'text-foreground/80'}`}>
                {awayName}
              </span>
              {hasScore && (
                <span className={`ml-auto text-sm font-bold shrink-0 ${isFinished && (fixture.awayScore ?? 0) > (fixture.homeScore ?? 0) ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {fixture.awayScore ?? 0}
                </span>
              )}
            </div>
            {fixture.leagueName && (
              <p className="text-[10px] text-muted-foreground/50 mt-1 truncate">{fixture.leagueName}</p>
            )}
          </>
        ) : (
          /* TBD fixture — knockout stage placeholder */
          <div>
            <p className="text-sm font-medium text-foreground/90 truncate">
              {fixture.round ?? 'Fixture TBD'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {fixture.leagueName ?? ''}{fixture.leagueName && ' · '}Teams to be determined
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function TeamPage({ params, searchParams }: PageProps) {
  const { sport, teamId } = await params
  const { season: seasonParam } = await searchParams
  const sportConfig = SPORTS.find((s) => s.id === sport)
  if (!sportConfig) notFound()

  const season = seasonParam ?? getCurrentSeason(sport)
  const seasonEncoded = encodeURIComponent(season)
  const fixturesEndpoint = sport === 'basketball' ? 'games' : 'fixtures'
  const fixturesQuery = sport === 'football'
    ? `team=${teamId}&season=${seasonEncoded}&next=10`
    : `team=${teamId}&season=${seasonEncoded}`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [teamRes, fixturesRes, playersRes] = await Promise.allSettled([
    fetch(`${appUrl}/api/sports/${sport}/teams?id=${teamId}`, { cache: 'no-store' }),
    fetch(`${appUrl}/api/sports/${sport}/${fixturesEndpoint}?${fixturesQuery}`, { cache: 'no-store' }),
    fetch(`${appUrl}/api/sports/${sport}/players?team=${teamId}&season=${seasonEncoded}`, { cache: 'no-store' }),
  ])

  let teamName = 'Team'
  let teamLogo = ''
  let teamCountry = ''
  let teamVenue = ''
  let fixtures: Fixture[] = []
  let players: Player[] = []

  if (teamRes.status === 'fulfilled' && teamRes.value.ok) {
    const data = await teamRes.value.json()
    const first = data.response?.[0]
    if (first) {
      if (sport === 'football') {
        const t = first.team as Record<string, unknown>
        const v = first.venue as Record<string, unknown>
        teamName = t?.name as string ?? 'Team'
        teamLogo = t?.logo as string ?? ''
        teamCountry = t?.country as string ?? ''
        teamVenue = v?.name as string ?? ''
      } else {
        // Basketball: flat
        teamName = first.name as string ?? 'Team'
        teamLogo = first.logo as string ?? ''
        teamCountry = (first.country as Record<string, unknown>)?.name as string ?? ''
      }
    }
  }

  if (fixturesRes.status === 'fulfilled' && fixturesRes.value.ok) {
    const data = await fixturesRes.value.json()
    fixtures = (data.response ?? []).map((item: Record<string, unknown>) => {
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
          leagueId: league?.id as number,
          leagueName: league?.name as string,
          leagueLogo: league?.logo as string,
          season: String(league?.season ?? season),
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
        leagueId: league?.id as number,
        leagueName: league?.name as string,
        leagueLogo: league?.logo as string,
        season: String(item.season ?? season),
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

  if (playersRes.status === 'fulfilled' && playersRes.value.ok) {
    const data = await playersRes.value.json()
    players = (data.response ?? []).slice(0, 50).map((item: Record<string, unknown>) => {
      if (sport === 'football') {
        const player = item.player as Record<string, unknown>
        const stats = (item.statistics as Array<Record<string, unknown>>)?.[0]
        return {
          id: player?.id as number,
          name: player?.name as string,
          photo: player?.photo as string ?? '',
          nationality: player?.nationality as string ?? null,
          position: (stats?.games as Record<string, unknown>)?.position as string ?? null,
          age: player?.age as number ?? null,
          teamId: Number(teamId),
          teamName,
        } as Player
      }
      // Basketball
      return {
        id: item.id as number,
        name: item.name as string,
        photo: item.photo as string ?? '',
        nationality: (item.country as Record<string, unknown>)?.name as string ?? null,
        position: item.position as string ?? null,
        age: null,
        teamId: Number(teamId),
        teamName,
      } as Player
    })
  }

  const { data: followRow } = await supabase
    .from('follows').select('id')
    .eq('user_id', user!.id)
    .eq('entity_type', 'team')
    .eq('entity_id', teamId)
    .maybeSingle()

  // Fetch which players the user already follows (for correct Follow button state)
  const playerIds = players.map((p) => String(p.id))
  const { data: followedPlayers } = playerIds.length > 0
    ? await supabase
        .from('follows')
        .select('entity_id')
        .eq('user_id', user!.id)
        .eq('entity_type', 'player')
        .in('entity_id', playerIds)
    : { data: [] }
  const followedPlayerIds = new Set((followedPlayers ?? []).map((f) => f.entity_id))

  // Group players by position
  const positionOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']
  const playersByPosition: Record<string, Player[]> = {}
  for (const player of players) {
    const pos = player.position ?? 'Other'
    if (!playersByPosition[pos]) playersByPosition[pos] = []
    playersByPosition[pos].push(player)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero header */}
      <div className="relative overflow-hidden px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 70%)' }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {teamLogo ? (
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden p-1">
                <Image src={teamLogo} alt={teamName} width={56} height={56} className="object-contain" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-3xl shrink-0">🏟️</div>
            )}
            <div>
              <h1 className="text-xl font-bold leading-tight">{teamName}</h1>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {teamCountry && (
                  <span className="text-sm text-muted-foreground">{teamCountry}</span>
                )}
                {teamVenue && (
                  <span className="text-sm text-muted-foreground opacity-60">· {teamVenue}</span>
                )}
              </div>
            </div>
          </div>
          <FollowButton
            entityType="team"
            entityId={teamId}
            entityName={teamName}
            sport={sport}
            entityMetadata={{ logo_url: teamLogo, country: teamCountry, season }}
            initialFollowed={!!followRow}
          />
        </div>
      </div>

      <div className="p-5">
        <Tabs defaultValue="fixtures">
          <TabsList className="mb-5 bg-white/5">
            <TabsTrigger value="fixtures">
              Fixtures
              {fixtures.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-white/10 rounded-full px-1.5 py-0.5">{fixtures.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="squad">
              Squad
              {players.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-white/10 rounded-full px-1.5 py-0.5">{players.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fixtures">
            {fixtures.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No upcoming fixtures found.</p>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
                {fixtures.map((fixture) => (
                  <FixtureRow key={fixture.id} fixture={fixture} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="squad">
            {players.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No squad data available.</p>
            ) : (
              <div className="space-y-5">
                {positionOrder.map((pos) => {
                  const posPlayers = playersByPosition[pos]
                  if (!posPlayers?.length) return null
                  return (
                    <section key={pos}>
                      <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1 px-1">
                        {pos}s · {posPlayers.length}
                      </h3>
                      <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
                        {posPlayers.map((player) => (
                          <div key={player.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                            <Link href={`/browse/${sport}/players/${player.id}?season=${season}`} className="flex items-center gap-3 flex-1 min-w-0">
                              {player.photo ? (
                                <Image src={player.photo} alt={player.name} width={34} height={34} className="rounded-full object-cover shrink-0 bg-white/5" />
                              ) : (
                                <div className="w-[34px] h-[34px] rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-muted-foreground">{player.name?.[0]}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{player.name}</p>
                                {player.nationality && (
                                  <p className="text-xs text-muted-foreground truncate">{player.nationality}</p>
                                )}
                              </div>
                            </Link>
                            <FollowButton
                              entityType="player"
                              entityId={String(player.id)}
                              entityName={player.name}
                              sport={sport}
                              entityMetadata={{
                                photo_url: player.photo ?? '',
                                team_name: teamName,
                                team_logo: teamLogo,
                                team_id: Number(teamId),
                              }}
                              initialFollowed={followedPlayerIds.has(String(player.id))}
                              size="sm"
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                })}
                {/* Other positions not in the standard list */}
                {Object.entries(playersByPosition)
                  .filter(([pos]) => !positionOrder.includes(pos))
                  .map(([pos, posPlayers]) => (
                    <section key={pos}>
                      <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1 px-1">
                        {pos} · {posPlayers.length}
                      </h3>
                      <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
                        {posPlayers.map((player) => (
                          <div key={player.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                            <Link href={`/browse/${sport}/players/${player.id}?season=${season}`} className="flex items-center gap-3 flex-1 min-w-0">
                              {player.photo ? (
                                <Image src={player.photo} alt={player.name} width={34} height={34} className="rounded-full object-cover shrink-0 bg-white/5" />
                              ) : (
                                <div className="w-[34px] h-[34px] rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-muted-foreground">{player.name?.[0]}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{player.name}</p>
                                {player.nationality && (
                                  <p className="text-xs text-muted-foreground truncate">{player.nationality}</p>
                                )}
                              </div>
                            </Link>
                            <FollowButton
                              entityType="player"
                              entityId={String(player.id)}
                              entityName={player.name}
                              sport={sport}
                              entityMetadata={{
                                photo_url: player.photo ?? '',
                                team_name: teamName,
                                team_logo: teamLogo,
                                team_id: Number(teamId),
                              }}
                              initialFollowed={followedPlayerIds.has(String(player.id))}
                              size="sm"
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
