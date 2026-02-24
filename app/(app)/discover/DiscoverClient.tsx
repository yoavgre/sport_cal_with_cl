'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FollowButton } from '@/components/follow/FollowButton'
import { useFollows } from '@/hooks/useFollows'
import { Sparkles, TrendingUp, Star, Users } from 'lucide-react'
import type { SuggestedEntity } from '@/app/api/suggestions/route'

interface Suggestions {
  collaborative: SuggestedEntity[]
  trending: SuggestedEntity[]
  featured: SuggestedEntity[]
}

export default function DiscoverClient() {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [loading, setLoading] = useState(true)
  const { followedIds, refresh: refreshFollows } = useFollows()

  useEffect(() => {
    fetch('/api/suggestions')
      .then((r) => r.json())
      .then(setSuggestions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-5 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-3 mt-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const hasCollaborative = (suggestions?.collaborative ?? []).length > 0
  const hasTrending = (suggestions?.trending ?? []).length > 0
  const hasFeatured = (suggestions?.featured ?? []).length > 0

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <div className="mb-7 pt-2">
        <div className="flex items-center gap-2.5 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Personalized suggestions based on what fans like you follow
        </p>
      </div>

      {/* Collaborative filtering section */}
      {hasCollaborative && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-1 px-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
            <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Fans like you also follow
            </h2>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
            {suggestions!.collaborative.map((item) => (
              <SuggestionRow
                key={`cf-${item.entity_type}-${item.entity_id}`}
                item={item}
                followedIds={followedIds}
                onFollowChange={refreshFollows}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending section */}
      {hasTrending && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-1 px-1">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
            <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Trending on Sport Cal
            </h2>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
            {suggestions!.trending.map((item) => (
              <SuggestionRow
                key={`tr-${item.entity_type}-${item.entity_id}`}
                item={item}
                followedIds={followedIds}
                onFollowChange={refreshFollows}
              />
            ))}
          </div>
        </section>
      )}

      {/* Featured / curated section */}
      {hasFeatured && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-1 px-1">
            <Star className="h-3.5 w-3.5 text-muted-foreground/60" />
            <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Must-follow competitions
            </h2>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-card divide-y divide-white/[0.04] overflow-hidden">
            {suggestions!.featured.map((item) => (
              <SuggestionRow
                key={`ft-${item.entity_type}-${item.entity_id}`}
                item={item}
                followedIds={followedIds}
                onFollowChange={refreshFollows}
              />
            ))}
          </div>
        </section>
      )}

      {!hasCollaborative && !hasTrending && !hasFeatured && (
        <div className="text-center text-muted-foreground py-16">
          <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-15" />
          <p className="font-medium text-foreground/70">No suggestions yet</p>
          <p className="text-sm mt-1 opacity-50">
            Follow some teams or leagues to get personalized recommendations
          </p>
        </div>
      )}
    </div>
  )
}

function entityHref(item: SuggestedEntity): string {
  const season = (item.entity_metadata?.season as string) ?? ''
  const seasonParam = season ? `?season=${season}` : ''
  if (item.entity_type === 'league') return `/browse/${item.sport}/${item.entity_id}${seasonParam}`
  if (item.entity_type === 'team') return `/browse/${item.sport}/teams/${item.entity_id}${seasonParam}`
  if (item.entity_type === 'player') return `/browse/${item.sport}/players/${item.entity_id}${seasonParam}`
  return `/browse/${item.sport}`
}

function SuggestionRow({
  item,
  followedIds,
  onFollowChange,
}: {
  item: SuggestedEntity
  followedIds: Set<string>
  onFollowChange: () => void
}) {
  const logo = (item.entity_metadata?.logo_url as string) ?? (item.entity_metadata?.photo_url as string) ?? ''
  const isFollowed = followedIds.has(`${item.entity_type}-${item.entity_id}`)

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
      <Link href={entityHref(item)} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={item.entity_name} className="w-full h-full object-contain p-0.5" />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              {item.entity_name?.[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{item.entity_name}</p>
          <p className="text-xs text-muted-foreground truncate">{item.reason}</p>
        </div>
        <span className="text-base shrink-0 mr-1">
          {item.sport === 'football' ? '⚽' : item.sport === 'basketball' ? '🏀' : item.sport}
        </span>
      </Link>
      <div className="flex-shrink-0">
        <FollowButton
          entityType={item.entity_type as 'league' | 'team' | 'player'}
          entityId={item.entity_id}
          entityName={item.entity_name}
          sport={item.sport}
          entityMetadata={item.entity_metadata}
          initialFollowed={isFollowed}
          onFollowChange={onFollowChange}
          size="sm"
        />
      </div>
    </div>
  )
}
