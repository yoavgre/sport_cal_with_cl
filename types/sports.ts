export interface Sport {
  id: string
  label: string
  icon: string
  description: string
  color: string
}

export interface League {
  id: number
  name: string
  type: string
  logo: string
  country: string
  countryCode: string | null
  flag: string | null
  season: string  // football: "2024", basketball: "2024-2025"
}

export interface Team {
  id: number
  name: string
  logo: string
  country: string | null
  founded: number | null
  venue: string | null
}

export interface Player {
  id: number
  name: string
  photo: string
  nationality: string | null
  position: string | null
  age: number | null
  teamId: number | null
  teamName: string | null
}

export interface Fixture {
  id: number
  sport: string
  leagueId: number
  leagueName: string
  leagueLogo: string
  season: string
  homeTeam: { id: number; name: string; logo: string } | null
  awayTeam: { id: number; name: string; logo: string } | null
  startTime: string
  endTime: string | null
  status: string
  venue: string | null
  round: string | null
  homeScore: number | null
  awayScore: number | null
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  sport: string
  leagueId: string
  venue: string | null
  status: string | null
  homeTeam: string | null
  awayTeam: string | null
  homeScore: number | null
  awayScore: number | null
  leagueName: string | null
  leagueLogo: string | null
}

export const SPORTS: Sport[] = [
  {
    id: 'football',
    label: 'Soccer',
    icon: '⚽',
    description: 'Premier League, La Liga, Champions League & more',
    color: '#22c55e',
  },
  {
    id: 'basketball',
    label: 'Basketball',
    icon: '🏀',
    description: 'NBA, EuroLeague, FIBA World Cup & more',
    color: '#f97316',
  },
]

export const SPORT_COLORS: Record<string, string> = {
  football: '#22c55e',
  basketball: '#f97316',
}
