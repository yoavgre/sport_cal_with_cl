'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Calendar, Compass, Settings, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Follow } from '@/types/database'
import { SPORTS } from '@/types/sports'

interface SidebarProps {
  follows: Follow[]
}

const NAV_ITEMS = [
  { href: '/browse',    label: 'Browse',   icon: Compass },
  { href: '/discover',  label: 'Discover', icon: Sparkles },
  { href: '/calendar',  label: 'Calendar', icon: Calendar },
  { href: '/settings',  label: 'Settings', icon: Settings },
]

export function Sidebar({ follows }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const followsBySport = SPORTS.reduce(
    (acc, sport) => {
      acc[sport.id] = follows.filter((f) => f.sport === sport.id)
      return acc
    },
    {} as Record<string, Follow[]>
  )

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <span className="text-lg leading-none">⚽</span>
        </div>
        <span className="font-bold text-base tracking-tight text-foreground">Sport Cal</span>
      </div>

      {/* Search button */}
      <div className="px-3 pb-2">
        <button
          onClick={() => router.push('/search')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground bg-white/5 hover:bg-white/[0.08] hover:text-foreground transition-colors"
        >
          <Search className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Search…</span>
          <kbd className="ml-auto text-[10px] bg-white/[0.08] border border-white/10 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-1 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/browse' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/[0.08] text-foreground border-l-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
              style={isActive ? { paddingLeft: '10px' } : undefined}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Following list */}
      {follows.length > 0 && (
        <div className="flex-1 overflow-y-auto mt-4 px-3 pb-4">
          <div className="border-t border-sidebar-border pt-4">
            <p className="px-3 mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
              Following
            </p>

            {SPORTS.map((sport) => {
              const sportFollows = followsBySport[sport.id]
              if (!sportFollows?.length) return null
              return (
                <div key={sport.id} className="mb-4">
                  <p className="px-3 mb-1.5 text-[10px] font-medium text-muted-foreground/70 flex items-center gap-1.5">
                    <span className="text-xs">{sport.icon}</span>
                    <span className="uppercase tracking-[0.08em]">{sport.label}</span>
                  </p>
                  {sportFollows.slice(0, 6).map((follow) => {
                    const logoUrl = follow.entity_metadata?.logo_url as string | undefined
                    const browseHref =
                      follow.entity_type === 'team'
                        ? `/browse/${follow.sport}/teams/${follow.entity_id}`
                        : follow.entity_type === 'player'
                          ? `/browse/${follow.sport}/players/${follow.entity_id}`
                          : follow.entity_type === 'league'
                            ? `/browse/${follow.sport}/${follow.entity_id}`
                            : `/browse/${follow.sport}`

                    return (
                      <Link
                        key={follow.id}
                        href={browseHref}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoUrl}
                            alt={follow.entity_name}
                            className="h-5 w-5 rounded-full object-contain bg-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {follow.entity_name[0]}
                          </div>
                        )}
                        <span className="truncate text-[13px]">{follow.entity_name}</span>
                      </Link>
                    )
                  })}
                  {sportFollows.length > 6 && (
                    <p className="px-3 pt-0.5 text-[11px] text-muted-foreground/60">
                      +{sportFollows.length - 6} more
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {follows.length === 0 && <div className="flex-1" />}
    </div>
  )
}
