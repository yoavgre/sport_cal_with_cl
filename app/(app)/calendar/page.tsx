import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/calendar/CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: follows } = await supabase
    .from('follows')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Fixtures from your followed teams and leagues
        </p>
      </div>
      <CalendarView follows={follows ?? []} />
    </div>
  )
}
