'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { EntityType } from '@/types/database'

interface FollowButtonProps {
  entityType: EntityType
  entityId: string | number
  entityName: string
  sport: string
  entityMetadata?: Record<string, unknown>
  initialFollowed: boolean
  size?: 'default' | 'sm' | 'lg'
  onFollowChange?: () => void
}

export function FollowButton({
  entityType,
  entityId,
  entityName,
  sport,
  entityMetadata,
  initialFollowed,
  size = 'default',
  onFollowChange,
}: FollowButtonProps) {
  const [isFollowed, setIsFollowed] = useState(initialFollowed)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const toggle = () => {
    const previousState = isFollowed
    setIsFollowed(!isFollowed)

    startTransition(async () => {
      const res = await fetch('/api/follows', {
        method: isFollowed ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: String(entityId),
          entity_name: entityName,
          sport,
          entity_metadata: entityMetadata ?? {},
        }),
      })

      if (!res.ok) {
        setIsFollowed(previousState)
        toast.error('Failed to update. Please try again.')
      } else {
        if (!previousState) {
          toast.success(`Following ${entityName}`)
        } else {
          toast(`Unfollowed ${entityName}`)
        }
        // Refresh the server layout so the sidebar following list updates
        router.refresh()
        onFollowChange?.()
      }
    })
  }

  return (
    <Button
      variant={isFollowed ? 'default' : 'outline'}
      size={size}
      onClick={toggle}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isFollowed ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      {isFollowed ? 'Following' : 'Follow'}
    </Button>
  )
}
