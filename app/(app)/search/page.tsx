import { Suspense } from 'react'
import SearchClient from './SearchClient'

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Loading…</div>}>
      <SearchClient />
    </Suspense>
  )
}
