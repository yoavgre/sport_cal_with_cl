'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FollowButton } from '@/components/follow/FollowButton'
import { Search, Loader2 } from 'lucide-react'
import { useFollows } from '@/hooks/useFollows'

interface SearchResult {
  id: number | string
  name: string
  logo?: string
  photo?: string
  type?: string
  country?: string
  flag?: string
  venue?: string
  nationality?: string
  age?: number
  position?: string
  teamName?: string
  teamLogo?: string
  teamId?: number
  national?: boolean
  sport: string
  season: string
  entityType: 'league' | 'team' | 'player'
}

interface SearchResults {
  leagues: SearchResult[]
  teams: SearchResult[]
  players: SearchResult[]
}

export default function SearchClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResults>({ leagues: [], teams: [], players: [] })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const { followedIds, refresh: refreshFollows } = useFollows()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery) params.set('q', debouncedQuery)
    router.replace(`/search${debouncedQuery ? `?${params}` : ''}`, { scroll: false })
  }, [debouncedQuery, router])

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults({ leagues: [], teams: [], players: [] })
      return
    }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => setResults(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  const allCount = results.leagues.length + results.teams.length + results.players.length
  const tabs = [
    { id: 'all', label: 'All', count: allCount },
    { id: 'leagues', label: 'Leagues', count: results.leagues.length },
    { id: 'teams', label: 'Teams', count: results.teams.length },
    { id: 'players', label: 'Players', count: results.players.length },
  ]

  const showLeagues = activeTab === 'all' || activeTab === 'leagues'
  const showTeams = activeTab === 'all' || activeTab === 'teams'
  const showPlayers = activeTab === 'all' || activeTab === 'players'

  return (
    <div className="p-5 max-w-3xl mx-auto">
      {/* Search input */}
      <div className="relative mb-5 pt-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search leagues, teams, players…"
          className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {debouncedQuery.length >= 2 && (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="bg-white/5">
              {tabs.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                  {t.count > 0 && (
                    <span className="ml-1.5 text-[10px] bg-white/10 rounded-full px-1.5 py-0.5">{t.count}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {!loading && allCount === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {showLeagues && results.leagues.length > 0 && (
            <section className="mb-4">
              <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1 px-4">Leagues</h2>
              <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
                {results.leagues.map((item) => (
                  <ResultRow
                    key={`league-${item.sport}-${item.id}`}
                    item={item}
                    href={`/browse/${item.sport}/${item.id}?season=${item.season}`}
                    followedIds={followedIds}
                    onFollowChange={refreshFollows}
                  />
                ))}
              </div>
            </section>
          )}

          {showTeams && results.teams.length > 0 && (
            <section className="mb-4">
              <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1 px-4">Teams</h2>
              <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
                {results.teams.map((item) => (
                  <ResultRow
                    key={`team-${item.sport}-${item.id}`}
                    item={item}
                    href={`/browse/${item.sport}/teams/${item.id}?season=${item.season}`}
                    followedIds={followedIds}
                    onFollowChange={refreshFollows}
                  />
                ))}
              </div>
            </section>
          )}

          {showPlayers && results.players.length > 0 && (
            <section className="mb-4">
              <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1 px-4">Players</h2>
              <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
                {results.players.map((item) => (
                  <ResultRow
                    key={`player-${item.sport}-${item.id}`}
                    item={item}
                    href={`/browse/${item.sport}/players/${item.id}?season=${item.season}`}
                    followedIds={followedIds}
                    onFollowChange={refreshFollows}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {debouncedQuery.length < 2 && (
        <div className="text-center text-muted-foreground py-16">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-15" />
          <p className="font-medium text-foreground/70">Search for a league, team, or player</p>
          <p className="text-sm mt-1 opacity-50">Try &ldquo;Arsenal&rdquo;, &ldquo;Premier League&rdquo;, or &ldquo;Messi&rdquo;</p>
        </div>
      )}
    </div>
  )
}

function ResultRow({
  item,
  href,
  followedIds,
  onFollowChange,
}: {
  item: SearchResult
  href: string
  followedIds: Set<string>
  onFollowChange: () => void
}) {
  const image = item.logo ?? item.photo
  const subtitleParts = [
    item.national ? '🌍 National Team' : item.country,
    item.entityType !== 'team' && item.type ? item.type : null,
    item.position,
    item.teamName ? `${item.teamName}` : null,
  ].filter(Boolean)
  const subtitle = subtitleParts.join(' · ')
  const isFollowed = followedIds.has(`${item.entityType}-${item.id}`)

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
      <Link href={href} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={item.name} className="w-full h-full object-contain p-0.5" />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              {item.name?.[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate text-sm">{item.name}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <span className="text-base shrink-0 mr-1">
          {item.sport === 'football' ? '⚽' : '🏀'}
        </span>
      </Link>
      <div className="flex-shrink-0">
        <FollowButton
          entityType={item.entityType}
          entityId={String(item.id)}
          entityName={item.name}
          sport={item.sport}
          entityMetadata={{
            logo_url: item.logo ?? item.photo ?? '',
            country: item.country ?? '',
            ...(item.entityType === 'player' && {
              photo_url: item.photo,
              team_name: item.teamName,
              team_logo: item.teamLogo,
              team_id: item.teamId,
            }),
          }}
          initialFollowed={isFollowed}
          onFollowChange={onFollowChange}
          size="sm"
        />
      </div>
    </div>
  )
}
