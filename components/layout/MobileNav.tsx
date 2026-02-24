'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Compass, Settings, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/browse', label: 'Browse', icon: Compass },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/discover', label: 'Discover', icon: Sparkles },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-2xl"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
    >
      <nav className="flex h-14">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== '/browse' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-primary rounded-full" />
              )}
              <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
