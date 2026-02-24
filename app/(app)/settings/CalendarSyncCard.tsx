'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface CalendarSyncCardProps {
  httpsUrl: string
  webcalUrl: string
}

export function CalendarSyncCard({ httpsUrl, webcalUrl }: CalendarSyncCardProps) {
  const [copied, setCopied] = useState<'https' | 'webcal' | null>(null)

  const copy = async (url: string, type: 'https' | 'webcal') => {
    await navigator.clipboard.writeText(url)
    setCopied(type)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Sync</CardTitle>
        <CardDescription>
          Subscribe to your sport calendar so events automatically appear in Apple Calendar or Google Calendar.
          The URL updates live as you follow or unfollow teams.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Apple Calendar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍎</span>
            <Label className="text-base font-semibold">Apple Calendar</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Click the button below or open the webcal:// URL in Safari. Choose &quot;Subscribe&quot; when prompted.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={webcalUrl} className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copy(webcalUrl, 'webcal')}
            >
              {copied === 'webcal' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            variant="outline"
            asChild
            className="w-full sm:w-auto"
          >
            <a href={webcalUrl}>Open in Apple Calendar</a>
          </Button>
        </div>

        <div className="border-t" />

        {/* Google Calendar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <Label className="text-base font-semibold">Google Calendar</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            In Google Calendar, click <strong>+ Other calendars</strong> → <strong>From URL</strong>, then paste this link:
          </p>
          <div className="flex gap-2">
            <Input readOnly value={httpsUrl} className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copy(httpsUrl, 'https')}
            >
              {copied === 'https' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            variant="outline"
            asChild
            className="w-full sm:w-auto"
          >
            <a
              href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Add to Google Calendar
            </a>
          </Button>
        </div>

        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <strong>Keep this URL private.</strong> Anyone with this link can view your sport calendar.
          If you need to reset it, contact support.
        </div>
      </CardContent>
    </Card>
  )
}
