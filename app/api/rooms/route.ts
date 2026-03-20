import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/rooms - List rooms with current occupancy status
export async function GET() {
  const auth = await requireAuth(['admin', 'viewer'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data

  // Fetch all active rooms
  const { data: rooms, error } = await adminClient
    .from('rooms')
    .select('*')
    .eq('is_active', true)
    .order('building')
    .order('floor')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch latest occupancy event per room
  const roomIds = (rooms || []).map((r) => r.id)

  const roomsWithOccupancy = await Promise.all(
    (rooms || []).map(async (room) => {
      const { data: latestOccupancy } = await adminClient
        .from('occupancy_events')
        .select('*')
        .eq('room_id', room.id)
        .order('detected_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return { ...room, current_occupancy: latestOccupancy || null }
    })
  )

  return NextResponse.json(roomsWithOccupancy)
}

// POST /api/rooms - Create room (admin only)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const body = await request.json()

  const { data, error } = await adminClient
    .from('rooms')
    .insert({
      name: body.name,
      floor: body.floor,
      building: body.building || 'HQ',
      capacity: body.capacity,
      outlook_email: body.outlook_email,
      outlook_calendar_id: body.outlook_calendar_id || null,
      sensor_device_id: body.sensor_device_id || null,
      sensor_type: body.sensor_type || 'tuya',
      amenities: body.amenities || [],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await adminClient.from('audit_log').insert({
    action: 'room_created',
    entity_type: 'room',
    entity_id: data.id,
    actor: auth.data.user.email || 'admin',
    details: { name: body.name },
  })

  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/rooms - Update room (admin only)
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ error: 'Room id is required' }, { status: 400 })
  }

  const ALLOWED_FIELDS = ['name', 'floor', 'building', 'capacity', 'outlook_email', 'outlook_calendar_id', 'sensor_device_id', 'sensor_type', 'amenities', 'is_active']
  const { id, ...rawUpdates } = body
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in rawUpdates) updates[key] = rawUpdates[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await adminClient.from('audit_log').insert({
    action: 'room_updated',
    entity_type: 'room',
    entity_id: id,
    actor: auth.data.user.email || 'admin',
    details: updates,
  })

  return NextResponse.json(data)
}

// DELETE /api/rooms - Delete room (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Room id is required' }, { status: 400 })
  }

  // Soft delete by setting is_active to false
  const { error } = await adminClient
    .from('rooms')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await adminClient.from('audit_log').insert({
    action: 'room_deleted',
    entity_type: 'room',
    entity_id: id,
    actor: auth.data.user.email || 'admin',
  })

  return NextResponse.json({ success: true })
}
