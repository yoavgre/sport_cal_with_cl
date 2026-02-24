import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { FollowButton } from '@/components/follow/FollowButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SPORTS } from '@/types/sports'

interface PageProps {
  params: Promise<{ sport: string; playerId: string }>
}

export default async function PlayerPage({ params }: PageProps) {
  const { sport, playerId } = await params
  const sportConfig = SPORTS.find((s) => s.id === sport)
  if (!sportConfig) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Football season = year season starts (before Aug → previous year)
  const now = new Date()
  const currentSeason = sport === 'football'
    ? (now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1)
    : now.getFullYear()

  const [playerRes] = await Promise.allSettled([
    fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/sports/${sport}/players?id=${playerId}&season=${currentSeason}`,
      { cache: 'no-store' }
    ),
  ])

  let playerName = 'Player'
  let playerPhoto = ''
  let playerNationality = ''
  let playerAge: number | null = null
  let playerPosition = ''
  let teamName = ''
  let teamLogo = ''
  let teamId: number | null = null
  let stats: Record<string, unknown> = {}

  if (playerRes.status === 'fulfilled' && playerRes.value.ok) {
    const data = await playerRes.value.json()
    const first = data.response?.[0]
    if (first) {
      const p = first.player as Record<string, unknown>
      const s = (first.statistics as Array<Record<string, unknown>>)?.[0]
      const team = s?.team as Record<string, unknown> | undefined
      playerName = p.name as string ?? 'Player'
      playerPhoto = p.photo as string ?? ''
      playerNationality = p.nationality as string ?? ''
      playerAge = p.age as number ?? null
      playerPosition = (s?.games as Record<string, unknown>)?.position as string ?? ''
      teamName = team?.name as string ?? ''
      teamLogo = team?.logo as string ?? ''
      teamId = team?.id as number ?? null

      if (s) {
        const games = s.games as Record<string, unknown>
        const goals = s.goals as Record<string, unknown>
        const passes = s.passes as Record<string, unknown>
        const tackles = s.tackles as Record<string, unknown>
        const shots = s.shots as Record<string, unknown>
        stats = {
          appearances: games?.appearences,
          minutes: games?.minutes,
          goals: goals?.total,
          assists: goals?.assists,
          passes: passes?.total,
          accuracy: passes?.accuracy,
          tackles: tackles?.total,
          shots: shots?.total,
          shotsOnTarget: shots?.on,
        }
      }
    }
  }

  const { data: followRow } = await supabase
    .from('follows')
    .select('id')
    .eq('user_id', user!.id)
    .eq('entity_type', 'player')
    .eq('entity_id', playerId)
    .maybeSingle()

  const statEntries = Object.entries(stats).filter(([, v]) => v != null)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          {playerPhoto && (
            <Image
              src={playerPhoto}
              alt={playerName}
              width={96}
              height={96}
              className="rounded-full object-cover border"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{playerName}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {playerNationality && <Badge variant="secondary">{playerNationality}</Badge>}
              {playerPosition && <Badge variant="outline">{playerPosition}</Badge>}
              {playerAge && <Badge variant="outline">Age {playerAge}</Badge>}
            </div>
            {teamName && (
              <div className="flex items-center gap-2 mt-2">
                {teamLogo && (
                  <Image src={teamLogo} alt={teamName} width={20} height={20} className="object-contain" />
                )}
                <span className="text-sm text-muted-foreground">{teamName}</span>
              </div>
            )}
          </div>
        </div>
        <FollowButton
          entityType="player"
          entityId={playerId}
          entityName={playerName}
          sport={sport}
          entityMetadata={{
            photo_url: playerPhoto,
            team_name: teamName,
            team_logo: teamLogo,
            team_id: teamId,
            logo_url: playerPhoto,
          }}
          initialFollowed={!!followRow}
        />
      </div>

      {statEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Season Statistics ({currentSeason})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {statEntries.map(([key, value]) => (
                <div key={key} className="text-center">
                  <p className="text-2xl font-bold">{String(value)}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
