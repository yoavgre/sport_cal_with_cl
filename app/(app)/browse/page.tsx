import Link from 'next/link'
import { SPORTS } from '@/types/sports'

const SPORT_ACCENT_COLORS: Record<string, string> = {
  football: 'oklch(0.73 0.2 142)',
  basketball: 'oklch(0.74 0.17 46)',
}

const SPORT_GRADIENT_FROM: Record<string, string> = {
  football: 'oklch(0.22 0.07 142)',
  basketball: 'oklch(0.22 0.07 46)',
}

export default function BrowsePage() {
  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="mb-8 pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Browse</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose a sport to explore leagues and teams
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SPORTS.map((sport) => (
          <Link key={sport.id} href={`/browse/${sport.id}`} className="group block">
            <div
              className="relative overflow-hidden rounded-2xl border border-white/[0.07] transition-all duration-300 hover:border-white/15 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${SPORT_GRADIENT_FROM[sport.id] ?? 'oklch(0.14 0.006 265)'}, oklch(0.14 0.006 265))`,
              }}
            >
              {/* Corner glow */}
              <div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
                style={{ background: SPORT_ACCENT_COLORS[sport.id] ?? sport.color, opacity: 0.15 }}
              />

              <div className="relative p-6">
                <div className="text-6xl mb-4 select-none leading-none">{sport.icon}</div>
                <h2 className="text-xl font-bold mb-1.5">{sport.label}</h2>
                <p className="text-sm text-muted-foreground leading-snug">
                  {sport.description}
                </p>
                <div
                  className="h-0.5 w-10 rounded-full mt-5 opacity-80"
                  style={{ backgroundColor: SPORT_ACCENT_COLORS[sport.id] ?? sport.color }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
