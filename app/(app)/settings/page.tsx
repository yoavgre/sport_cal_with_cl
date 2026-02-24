import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { CalendarSyncCard } from './CalendarSyncCard'
import { format } from 'date-fns'

const CHANGE_TYPE_LABELS: Record<string, { label: string; dot: string }> = {
  reschedule: { label: 'Rescheduled', dot: 'bg-yellow-500' },
  postpone: { label: 'Postponed', dot: 'bg-orange-500' },
  cancel: { label: 'Cancelled', dot: 'bg-red-500' },
  score_update: { label: 'Score update', dot: 'bg-blue-500' },
  status_change: { label: 'Status changed', dot: 'bg-purple-500' },
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const serviceClient = createServiceClient()

  // Get or create a calendar token for this user
  let { data: tokenRow } = await serviceClient
    .from('calendar_tokens')
    .select('token')
    .eq('user_id', user!.id)
    .single()

  if (!tokenRow) {
    const { data } = await serviceClient
      .from('calendar_tokens')
      .insert({ user_id: user!.id })
      .select('token')
      .single()
    tokenRow = data
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const httpsUrl = `${appUrl}/api/calendar/${tokenRow?.token}.ics`
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, 'webcal://')

  // Recent fixture changes relevant to this user's follows
  const { data: follows } = await supabase.from('follows').select('entity_id, entity_name, entity_type')
  const followedEntityIds = new Set((follows ?? []).map((f) => f.entity_id))
  void followedEntityIds // used for future filtering

  const { data: recentChanges } = await serviceClient
    .from('fixture_changes')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(10)

  const { count: cachedCount } = await serviceClient
    .from('cached_fixtures')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-5">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your preferences and calendar sync</p>
      </div>

      <CalendarSyncCard httpsUrl={httpsUrl} webcalUrl={webcalUrl} />

      {/* Fixture Sync Status */}
      <div className="rounded-2xl border border-white/[0.06] bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h2 className="font-semibold">Fixture Sync</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fixtures auto-sync when you open the calendar. Rescheduled or cancelled games are detected automatically.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cached fixtures</span>
            <span className="font-medium tabular-nums">{cachedCount ?? 0} stored</span>
          </div>
          <Separator className="bg-white/[0.06]" />
          {(recentChanges ?? []).length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-3">Recent fixture changes</p>
              <div className="space-y-1">
                {(recentChanges ?? []).map((change) => {
                  const meta = CHANGE_TYPE_LABELS[change.change_type] ?? { label: change.change_type, dot: 'bg-gray-500' }
                  const oldVal = change.old_value as Record<string, unknown>
                  const newVal = change.new_value as Record<string, unknown>
                  return (
                    <div key={change.id} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                      <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">{meta.label}</span>
                          <span className="text-xs text-muted-foreground font-mono opacity-60">{change.sport}/{change.fixture_id}</span>
                        </div>
                        {change.change_type === 'reschedule' && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {oldVal.start_time ? format(new Date(oldVal.start_time as string), 'MMM d HH:mm') : '?'}
                            {' → '}
                            {newVal.start_time ? format(new Date(newVal.start_time as string), 'MMM d HH:mm') : '?'}
                          </p>
                        )}
                        {change.change_type === 'score_update' && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {String(oldVal.home_score ?? '?')}-{String(oldVal.away_score ?? '?')} → {String(newVal.home_score ?? '?')}-{String(newVal.away_score ?? '?')}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                          {format(new Date(change.detected_at as string), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No fixture changes detected yet. Changes appear here when a match is rescheduled, postponed, or cancelled.
            </p>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-white/[0.06] bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h2 className="font-semibold">How fixture sync works</h2>
        </div>
        <div className="px-5 py-4 text-sm text-muted-foreground space-y-2">
          <p>• <strong className="text-foreground/70">Auto-refresh:</strong> Each time you open the calendar, Sport Cal silently re-fetches fixtures for all your followed teams and leagues.</p>
          <p>• <strong className="text-foreground/70">TTL-aware:</strong> Completed games are cached for 24 h; today&apos;s games refresh every 5 min; upcoming games every 1–6 h.</p>
          <p>• <strong className="text-foreground/70">Change detection:</strong> If a game is rescheduled by more than 5 minutes, postponed, or cancelled, it&apos;s logged and will be reflected in your calendar on next sync.</p>
          <p>• <strong className="text-foreground/70">Unplanned fixtures:</strong> Knockout-stage games (e.g. Champions League semis) appear automatically once the draw is made and the API publishes them — you don&apos;t need to do anything if you follow the league.</p>
        </div>
      </div>

      {/* Account */}
      <div className="rounded-2xl border border-white/[0.06] bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h2 className="font-semibold">Account</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm">{user?.email}</p>
          </div>
          <Separator className="bg-white/[0.06]" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">User ID</p>
            <p className="text-xs font-mono text-muted-foreground break-all">{user?.id}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
