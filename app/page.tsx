import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-sm">🏆</div>
            <span className="text-sm tracking-tight">Sport Cal</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 px-5 text-center">
        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[100px]"
            style={{ background: 'oklch(0.62 0.22 264)' }} />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live fixture data · Auto calendar sync
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
            Never miss<br />
            <span style={{ color: 'oklch(0.72 0.2 264)' }}>a game.</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Follow your favourite teams, leagues, and players. Get all their fixtures
            synced directly to Apple or Google Calendar — automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="h-12 px-8 text-base font-semibold">
              <Link href="/signup">Start for free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base border-white/10 hover:border-white/20 hover:bg-white/5">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>

          {/* Sport pills */}
          <div className="flex justify-center gap-3 mt-10 flex-wrap">
            {[
              { icon: '⚽', name: 'Soccer', color: 'oklch(0.73 0.2 142)' },
              { icon: '🏀', name: 'Basketball', color: 'oklch(0.74 0.17 46)' },
            ].map((s) => (
              <div key={s.name}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-sm"
              >
                <span>{s.icon}</span>
                <span className="text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-5 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12 tracking-tight">
            Three steps to never miss a kickoff
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                step: '01',
                title: 'Browse & Follow',
                description: 'Explore leagues, teams, and players. Hit Follow on anything you want to track.',
                icon: '🔍',
              },
              {
                step: '02',
                title: 'See your calendar',
                description: 'Your in-app calendar instantly shows upcoming fixtures for everything you follow.',
                icon: '📅',
              },
              {
                step: '03',
                title: 'Sync everywhere',
                description: 'One URL, works with Apple Calendar, Google Calendar — everywhere.',
                icon: '🔄',
              },
            ].map((item) => (
              <div key={item.step}
                className="relative rounded-2xl border border-white/[0.07] bg-card p-6 overflow-hidden"
              >
                <div className="absolute top-4 right-5 text-4xl font-black text-white/[0.04] select-none leading-none">
                  {item.step}
                </div>
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calendar compat */}
      <section className="py-16 px-5 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-2">Works with your calendar app</h2>
          <p className="text-muted-foreground text-sm mb-8">One subscribe URL. No app installs. Updates automatically.</p>
          <div className="flex justify-center gap-12">
            {[
              { icon: '🍎', name: 'Apple Calendar' },
              { icon: '📅', name: 'Google Calendar' },
            ].map((app) => (
              <div key={app.name} className="text-center">
                <div className="text-5xl mb-2">{app.icon}</div>
                <p className="text-sm font-medium text-muted-foreground">{app.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 text-center border-t border-white/[0.06]">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">Ready to never miss a game?</h2>
        <p className="text-muted-foreground mb-8">Free to get started. No credit card required.</p>
        <Button size="lg" asChild className="h-12 px-8 text-base font-semibold">
          <Link href="/signup">Create your account →</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 px-5 text-center text-xs text-muted-foreground/50">
        © {new Date().getFullYear()} Sport Cal. All rights reserved.
      </footer>
    </div>
  )
}
