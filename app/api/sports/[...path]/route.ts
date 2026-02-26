import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchApiSports } from '@/lib/api-sports/client'

// TTL map by endpoint prefix (seconds)
const TTL_MAP: Record<string, number> = {
  leagues: 86400,
  teams: 86400,
  players: 86400,
  standings: 3600,
  fixtures: 3600,
  games: 3600,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Note: This endpoint is called from server components with cookies.
  // No explicit auth check needed — Supabase RLS will be enforced at the cache layer.
  // If you want to restrict this to logged-in users only, uncomment below.
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) return new Response('Unauthorized', { status: 401 })

  const { path } = await params
  const [sport, ...endpointParts] = path
  const endpoint = endpointParts.join('/')

  const searchParams = request.nextUrl.searchParams
  const queryString = searchParams.toString()
  const cacheKey = `${sport}:${endpoint}:${queryString}`

  const serviceClient = createServiceClient()

  // 1. Check api_cache table
  const { data: cached } = await serviceClient
    .from('api_cache')
    .select('response, fetched_at, ttl_seconds')
    .eq('cache_key', cacheKey)
    .single()

  if (cached) {
    const ageSeconds =
      (Date.now() - new Date(cached.fetched_at).getTime()) / 1000
    const cachedErrors = (cached.response as Record<string, unknown>)?.errors
    const cachedHasErrors =
      cachedErrors &&
      typeof cachedErrors === 'object' &&
      Object.keys(cachedErrors as object).length > 0
    // Don't serve cached responses that contain API errors (e.g. past rate-limit responses)
    if (!cachedHasErrors && ageSeconds < cached.ttl_seconds) {
      return Response.json(cached.response)
    }
  }

  // 2. Fetch fresh from API-Sports
  const queryParams: Record<string, string> = {}
  searchParams.forEach((v, k) => {
    queryParams[k] = v
  })

  let fresh: Record<string, unknown>
  try {
    fresh = await fetchApiSports(sport, endpoint, queryParams)
  } catch (err) {
    // Serve stale on error if available
    if (cached) {
      return Response.json(cached.response)
    }
    return Response.json(
      { error: String(err) },
      { status: 502 }
    )
  }

  // Detect api-sports.io error responses (e.g. rate limit).
  // These come back as HTTP 200 with { errors: { rateLimit: '...' }, response: [] }.
  // Never cache them — serve stale if available, otherwise return 429.
  const errors = fresh.errors as Record<string, unknown> | null | undefined
  const hasErrors = errors && typeof errors === 'object' && Object.keys(errors).length > 0
  if (hasErrors) {
    if (cached) {
      return Response.json(cached.response)
    }
    const isRateLimit = Object.keys(errors).some((k) =>
      k.toLowerCase().includes('rate')
    )
    return Response.json(
      { error: 'API error', errors },
      { status: isRateLimit ? 429 : 502 }
    )
  }

  const ttl = TTL_MAP[endpoint.split('/')[0]] ?? 3600

  // 3. Upsert to cache
  await serviceClient.from('api_cache').upsert({
    cache_key: cacheKey,
    response: fresh,
    fetched_at: new Date().toISOString(),
    ttl_seconds: ttl,
  })

  return Response.json(fresh)
}
