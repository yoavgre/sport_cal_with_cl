const BASE_URLS: Record<string, string> = {
  football: 'https://v3.football.api-sports.io',
  basketball: 'https://v1.basketball.api-sports.io',
}

export async function fetchApiSports(
  sport: string,
  endpoint: string,
  params: Record<string, string> = {}
) {
  const baseUrl = BASE_URLS[sport]
  if (!baseUrl) throw new Error(`Unknown sport: ${sport}`)

  const url = new URL(`${baseUrl}/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': process.env.API_SPORTS_KEY!,
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`API-Sports error: ${res.status} for ${url.toString()}`)
  }

  return res.json()
}

export const SPORT_BASE_URLS = BASE_URLS
