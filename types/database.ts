export type EntityType = 'sport' | 'league' | 'team' | 'player' | 'tournament'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Follow {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  entity_name: string
  sport: string
  entity_metadata: Record<string, unknown>
  created_at: string
}

export interface CalendarToken {
  id: string
  user_id: string
  token: string
  created_at: string
  rotated_at: string | null
}

export interface CachedFixture {
  id: string
  sport: string
  fixture_id: string
  league_id: string
  season: string
  home_team_id: string | null
  away_team_id: string | null
  home_team_name: string | null
  away_team_name: string | null
  home_team_logo: string | null
  away_team_logo: string | null
  league_name: string | null
  league_logo: string | null
  home_score: number | null
  away_score: number | null
  player_ids: string[]
  tournament_id: string | null
  start_time: string
  end_time: string | null
  status: string | null
  venue: string | null
  round: string | null
  raw_data: Record<string, unknown>
  fetched_at: string
  ttl_seconds: number
}

export interface ApiCache {
  cache_key: string
  response: Record<string, unknown>
  fetched_at: string
  ttl_seconds: number
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      follows: {
        Row: Follow
        Insert: Omit<Follow, 'id' | 'created_at'>
        Update: Partial<Omit<Follow, 'id' | 'user_id' | 'created_at'>>
      }
      calendar_tokens: {
        Row: CalendarToken
        Insert: Omit<CalendarToken, 'id' | 'created_at' | 'rotated_at'> & { token?: string }
        Update: Partial<Pick<CalendarToken, 'token' | 'rotated_at'>>
      }
      cached_fixtures: {
        Row: CachedFixture
        Insert: Omit<CachedFixture, 'id'>
        Update: Partial<Omit<CachedFixture, 'id'>>
      }
      api_cache: {
        Row: ApiCache
        Insert: ApiCache
        Update: Partial<ApiCache>
      }
    }
  }
}
