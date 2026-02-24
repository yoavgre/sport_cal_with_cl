import { Suspense } from 'react'
import DiscoverClient from './DiscoverClient'

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Loading suggestions…</div>}>
      <DiscoverClient />
    </Suspense>
  )
}
