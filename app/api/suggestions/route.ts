/**
 * GET /api/suggestions
 *
 * Returns personalized suggestions for the authenticated user using:
 *   1. Collaborative filtering: "users who follow what you follow also follow X"
 *   2. Popular/trending: entities followed by the most users overall
 *   3. Curated highlights: always-relevant big competitions
 *
 * Returns: {
 *   collaborative: SuggestedEntity[]   // CF-based
 *   trending: SuggestedEntity[]        // global most-followed
 *   featured: SuggestedEntity[]        // curated big events
 * }
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface SuggestedEntity {
  entity_type: string
  entity_id: string
  entity_name: string
  sport: string
  entity_metadata: Record<string, unknown>
  score: number           // relevance score (higher = more relevant)
  reason: string          // human-readable reason
  follower_count?: number
}

// Curated always-interesting events (league IDs in our system)
// Logo URLs from api-sports CDN (stable)
const FEATURED_LEAGUES = [
  { entity_id: '2',   entity_name: 'UEFA Champions League',      sport: 'football',    reason: 'The biggest club competition in the world',              logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { entity_id: '1',   entity_name: 'FIFA World Cup',              sport: 'football',    reason: 'The most watched sporting event on earth',              logo: 'https://media.api-sports.io/football/leagues/1.png' },
  { entity_id: '4',   entity_name: 'UEFA European Championship',  sport: 'football',    reason: 'Top national teams battle for the EURO title',          logo: 'https://media.api-sports.io/football/leagues/4.png' },
  { entity_id: '3',   entity_name: 'UEFA Europa League',          sport: 'football',    reason: 'Second-tier European club football',                    logo: 'https://media.api-sports.io/football/leagues/3.png' },
  { entity_id: '5',   entity_name: 'UEFA Nations League',         sport: 'football',    reason: 'National team football throughout the year',            logo: 'https://media.api-sports.io/football/leagues/5.png' },
  { entity_id: '39',  entity_name: 'Premier League',              sport: 'football',    reason: 'Most watched domestic league worldwide',                logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { entity_id: '140', entity_name: 'La Liga',                     sport: 'football',    reason: "Spain's top flight — home of Real Madrid and Barcelona", logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { entity_id: '135', entity_name: 'Serie A',                     sport: 'football',    reason: "Italy's top flight — tactical football at its finest",  logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { entity_id: '12',  entity_name: 'NBA',                         sport: 'basketball',  reason: 'The premier basketball league in the world',            logo: 'https://media.api-sports.io/basketball/leagues/12.png' },
  { entity_id: '120', entity_name: 'EuroLeague',                  sport: 'basketball',  reason: 'Top European club basketball',                          logo: 'https://media.api-sports.io/basketball/leagues/120.png' },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()

  // 1. Load this user's follows
  const { data: myFollows } = await supabase
    .from('follows')
    .select('entity_type, entity_id, sport, entity_name, entity_metadata')

  const myFollowedKeys = new Set((myFollows ?? []).map((f) => `${f.entity_type}:${f.entity_id}`))
  const myEntityIds = (myFollows ?? []).map((f) => f.entity_id)

  // 2. Collaborative filtering:
  //    Find other users who share ≥1 followed entity with me,
  //    then find what THEY follow that I don't.
  const collaborativeMap = new Map<string, { entity: Record<string, unknown>; score: number; sharedCount: number }>()

  if (myEntityIds.length > 0) {
    // Find users who follow at least one of the same entities
    const { data: similarUserFollows } = await svc
      .from('follows')
      .select('user_id, entity_type, entity_id, entity_name, sport, entity_metadata')
      .in('entity_id', myEntityIds)
      .neq('user_id', user.id)
      .limit(500) // cap to avoid huge queries

    if (similarUserFollows && similarUserFollows.length > 0) {
      // Count how many shared entities each user has
      const userSharedCount = new Map<string, number>()
      for (const f of similarUserFollows) {
        const key = `${f.entity_type}:${f.entity_id}`
        if (myFollowedKeys.has(key)) {
          userSharedCount.set(f.user_id, (userSharedCount.get(f.user_id) ?? 0) + 1)
        }
      }

      // Get ALL follows from similar users (weighted by shared count)
      const similarUserIds = [...userSharedCount.keys()].slice(0, 50) // top 50 similar users
      if (similarUserIds.length > 0) {
        const { data: theirFollows } = await svc
          .from('follows')
          .select('user_id, entity_type, entity_id, entity_name, sport, entity_metadata')
          .in('user_id', similarUserIds)
          .limit(1000)

        for (const f of theirFollows ?? []) {
          const key = `${f.entity_type}:${f.entity_id}`
          if (myFollowedKeys.has(key)) continue // already following
          const shared = userSharedCount.get(f.user_id) ?? 1
          const existing = collaborativeMap.get(key)
          if (existing) {
            existing.score += shared
            existing.sharedCount++
          } else {
            collaborativeMap.set(key, {
              entity: f as Record<string, unknown>,
              score: shared,
              sharedCount: 1,
            })
          }
        }
      }
    }
  }

  // Sort collaborative suggestions by score, take top 10
  const collaborative: SuggestedEntity[] = [...collaborativeMap.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10)
    .map(([, { entity, score, sharedCount }]) => ({
      entity_type: entity.entity_type as string,
      entity_id: entity.entity_id as string,
      entity_name: entity.entity_name as string,
      sport: entity.sport as string,
      entity_metadata: (entity.entity_metadata ?? {}) as Record<string, unknown>,
      score,
      reason: `${sharedCount} fan${sharedCount > 1 ? 's' : ''} like you also follow this`,
    }))

  // 3. Trending: entities with the most followers globally, excluding what user already follows
  const { data: allFollowCounts } = await svc
    .from('follows')
    .select('entity_type, entity_id, entity_name, sport, entity_metadata')
    .limit(2000)

  const trendingMap = new Map<string, { entity: Record<string, unknown>; count: number }>()
  for (const f of allFollowCounts ?? []) {
    const key = `${f.entity_type}:${f.entity_id}`
    if (myFollowedKeys.has(key)) continue
    const existing = trendingMap.get(key)
    if (existing) {
      existing.count++
    } else {
      trendingMap.set(key, { entity: f as Record<string, unknown>, count: 1 })
    }
  }

  const trending: SuggestedEntity[] = [...trendingMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([, { entity, count }]) => ({
      entity_type: entity.entity_type as string,
      entity_id: entity.entity_id as string,
      entity_name: entity.entity_name as string,
      sport: entity.sport as string,
      entity_metadata: (entity.entity_metadata ?? {}) as Record<string, unknown>,
      score: count,
      reason: `Followed by ${count} Sport Cal user${count > 1 ? 's' : ''}`,
      follower_count: count,
    }))

  // 4. Featured curated events (always shown, filtered to not-already-following)
  const featured: SuggestedEntity[] = FEATURED_LEAGUES
    .filter((f) => !myFollowedKeys.has(`league:${f.entity_id}`))
    .map((f) => ({
      entity_type: 'league',
      entity_id: f.entity_id,
      entity_name: f.entity_name,
      sport: f.sport,
      entity_metadata: { logo_url: f.logo },
      score: 100,
      reason: f.reason,
    }))

  return NextResponse.json({ collaborative, trending, featured })
}
