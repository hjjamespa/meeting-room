import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/occupancy/latest - Latest occupancy per room (for dashboard real-time view)
export async function GET() {
  const auth = await requireAuth(['admin', 'viewer'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data

  // Get all active rooms
  const { data: rooms, error: roomsError } = await adminClient
    .from('rooms')
    .select('id, name, floor, building, capacity, sensor_device_id, sensor_type')
    .eq('is_active', true)
    .order('name')

  if (roomsError) {
    return NextResponse.json({ error: roomsError.message }, { status: 500 })
  }

  // Fetch latest occupancy event per room
  const results = await Promise.all(
    (rooms || []).map(async (room) => {
      const { data: latest } = await adminClient
        .from('occupancy_events')
        .select('id, is_occupied, person_count, detected_at')
        .eq('room_id', room.id)
        .order('detected_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return {
        room_id: room.id,
        room_name: room.name,
        floor: room.floor,
        building: room.building,
        capacity: room.capacity,
        is_occupied: latest?.is_occupied ?? false,
        person_count: latest?.person_count ?? null,
        last_detected_at: latest?.detected_at ?? null,
      }
    })
  )

  return NextResponse.json(results)
}
