import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { SPORTS } from '@/types/sports'
import type { League } from '@/types/sports'

interface PageProps {
  params: Promise<{ sport: string }>
}

// Curated popular league IDs per sport (including Israeli leagues)
const TOP_LEAGUE_IDS: Record<string, number[]> = {
  football: [
    // Domestic leagues
    39, 140, 135, 78, 61, 383, 382, 45, 143, 94, 88,
    // PL  LaLiga SerieA Bund  L1  IL-top IL-2nd  FA  CdlR PPO  ERE
    // International / National team competitions
    2, 3, 848, 1, 4, 5, 6, 9, 10, 32,
    // UCL UEL  CL  WC EURO UNL AFCON CopAm Friendly WCQ-EUR
  ],
  basketball: [12, 120, 117, 118, 119, 116, 114, 51],
  //            NBA Euro EuroC EuroCup BSL Liga Adri IL-Super
}

// Football league groups for display
const FOOTBALL_LEAGUE_GROUPS: Record<string, number[]> = {
  'Top Domestic Leagues': [39, 140, 135, 78, 61, 383, 382, 45, 143, 94, 88],
  'National Teams & International': [2, 3, 848, 1, 4, 5, 6, 9, 10, 32],
}

// Football season string: "2024" = 2024/25 season
// Basketball season string: "2024-2025"
function getCurrentSeason(sport: string): string {
  const now = new Date()
  if (sport === 'football') {
    const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    return String(year)
  }
  // Basketball: current season spans two years; season starts ~Oct
  const year = now.getFullYear()
  if (now.getMonth() >= 9) {
    // Oct or later: current season is year/year+1
    return `${year}-${year + 1}`
  }
  // Before Oct: still in the previous season
  return `${year - 1}-${year}`
}

// Pick the most recently ended basketball season (avoids future seasons with no data)
function pickBestBasketballSeason(seasons: Array<Record<string, unknown>>): string {
  if (!seasons?.length) return getCurrentSeason('basketball')
  const now = new Date()
  // Sort by end date descending; pick the most recently ended (or still ongoing) season
  const sorted = [...seasons]
    .filter((s) => s.end)
    .sort((a, b) => new Date(b.end as string).getTime() - new Date(a.end as string).getTime())
  // Prefer a season whose end date is in the past (already has data) over a future one
  const ended = sorted.find((s) => new Date(s.end as string) < now)
  const best = ended ?? sorted[0]
  return String(best?.season ?? getCurrentSeason('basketball'))
}

function parseLeagues(items: Record<string, unknown>[], sport: string): League[] {
  return items.map((item) => {
    if (sport === 'football') {
      const league = item.league as Record<string, unknown>
      const country = item.country as Record<string, unknown>
      const seasons = item.seasons as Array<Record<string, unknown>>
      const currentSeason = seasons?.find((s) => s.current) ?? seasons?.[seasons.length - 1]
      return {
        id: league?.id as number,
        name: league?.name as string,
        type: league?.type as string ?? 'League',
        logo: league?.logo as string ?? '',
        country: country?.name as string ?? '',
        countryCode: country?.code as string ?? null,
        flag: country?.flag as string ?? null,
        season: String(currentSeason?.year ?? getCurrentSeason(sport)),
      } as League
    } else {
      // Basketball: flat at top level, season can be "2024-2025" or integer like 2024
      const country = item.country as Record<string, unknown>
      const seasons = item.seasons as Array<Record<string, unknown>>
      return {
        id: item.id as number,
        name: item.name as string,
        type: item.type as string ?? 'League',
        logo: item.logo as string ?? '',
        country: country?.name as string ?? '',
        countryCode: country?.code as string ?? null,
        flag: country?.flag as string ?? null,
        season: pickBestBasketballSeason(seasons),
      } as League
    }
  })
}

function LeagueCard({ league, sport }: { league: League; sport: string }) {
  return (
    <Link href={`/browse/${sport}/${league.id}?season=${league.season}`} className="group block">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent hover:border-white/[0.07] hover:bg-white/[0.04] transition-all duration-150 cursor-pointer">
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
          {league.logo ? (
            <Image
              src={league.logo}
              alt={league.name}
              width={32}
              height={32}
              className="object-contain p-0.5"
            />
          ) : (
            <span className="text-lg">🏆</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{league.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {league.flag && (
              <Image
                src={league.flag}
                alt={league.country}
                width={14}
                height={10}
                className="rounded-[2px] object-cover shrink-0"
              />
            )}
            <span className="text-xs text-muted-foreground truncate">{league.country}</span>
          </div>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0 opacity-60">
          {league.type}
        </span>
      </div>
    </Link>
  )
}

export default async function SportPage({ params }: PageProps) {
  const { sport } = await params
  const sportConfig = SPORTS.find((s) => s.id === sport)
  if (!sportConfig) notFound()

  // Football uses `current=true` to get active leagues.
  // Basketball: fetch all leagues (no season filter) — each item has a `seasons` array
  // from which we pick the latest. Filtering by season can return 0 results if the
  // upcoming season isn't populated yet in the API.
  const leagueQuery = sport === 'football' ? `current=true` : ``

  let leagues: League[] = []
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/sports/${sport}/leagues?${leagueQuery}`,
      { cache: 'no-store' }
    )
    if (res.ok) {
      const data = await res.json()
      const allLeagues = parseLeagues(data.response ?? [], sport)
      const topIds = TOP_LEAGUE_IDS[sport]
      leagues = topIds
        ? allLeagues
            .filter((l) => topIds.includes(l.id))
            .sort((a, b) => topIds.indexOf(a.id) - topIds.indexOf(b.id))
        : allLeagues.slice(0, 24)
    }
  } catch {
    // Will show empty state
  }

  // Build grouped view for football, flat for others
  const leagueGroups: Array<{ title: string; items: League[] }> = []
  if (sport === 'football' && leagues.length > 0) {
    for (const [groupTitle, groupIds] of Object.entries(FOOTBALL_LEAGUE_GROUPS)) {
      const groupLeagues = leagues.filter((l) => groupIds.includes(l.id))
      if (groupLeagues.length > 0) {
        leagueGroups.push({ title: groupTitle, items: groupLeagues })
      }
    }
  }

  return (
    <div className="p-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 pt-2">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl leading-none">{sportConfig.icon}</span>
          <h1 className="text-2xl font-bold tracking-tight">{sportConfig.label}</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-12">
          Select a league to explore teams and fixtures
        </p>
      </div>

      {leagues.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">
          No leagues found. Check your API key is active.
        </p>
      ) : leagueGroups.length > 0 ? (
        // Football: grouped view
        <div className="space-y-6">
          {leagueGroups.map((group) => (
            <section key={group.title}>
              <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-1 px-4">
                {group.title}
              </h2>
              <div className="rounded-2xl border border-white/[0.06] bg-card overflow-hidden divide-y divide-white/[0.04]">
                {group.items.map((league) => (
                  <LeagueCard key={league.id} league={league} sport={sport} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        // Basketball: flat grouped card
        <div className="rounded-2xl border border-white/[0.06] bg-card overflow-hidden divide-y divide-white/[0.04]">
          {leagues.map((league) => (
            <LeagueCard key={league.id} league={league} sport={sport} />
          ))}
        </div>
      )}
    </div>
  )
}
