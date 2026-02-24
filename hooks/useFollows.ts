'use client'

import { useState, useEffect, useCallback } from 'react'

interface Follow {
  entity_type: string
  entity_id: string
}

export function useFollows() {
  const [follows, setFollows] = useState<Follow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/follows')
      if (res.ok) {
        const json = await res.json()
        // GET /api/follows returns { data: [...] }
        setFollows(json.data ?? [])
      }
    } catch {}
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Set of "entityType-entityId" for fast lookup
  const followedIds = new Set(follows.map((f) => `${f.entity_type}-${f.entity_id}`))

  return { follows, followedIds, loading, refresh }
}
