import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { entity_type, entity_id, entity_name, sport, entity_metadata } = body

  if (!entity_type || !entity_id || !entity_name || !sport) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase.from('follows').upsert(
    {
      user_id: user.id,
      entity_type,
      entity_id: String(entity_id),
      entity_name,
      sport,
      entity_metadata: entity_metadata ?? {},
    },
    { onConflict: 'user_id,entity_type,entity_id' }
  )

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ data }, { status: 201 })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { entity_type, entity_id } = body

  if (!entity_type || !entity_id) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('user_id', user.id)
    .eq('entity_type', entity_type)
    .eq('entity_id', String(entity_id))

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return new Response(null, { status: 204 })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('follows')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ data })
}
