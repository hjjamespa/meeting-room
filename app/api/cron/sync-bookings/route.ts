import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchBookings } from '@/lib/graph/rooms'

const CRON_SECRET = process.env.CRON_SECRET || ''

// GET /api/cron/sync-bookings - Sync bookings from Graph API for all rooms
export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const now = new Date()
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() // 24h ago
  const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ahead

  try {
    // Get all active rooms
    const { data: rooms, error: roomsError } = await adminClient
      .from('rooms')
      .select('id, outlook_email, outlook_calendar_id')
      .eq('is_active', true)

    if (roomsError) throw roomsError
    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ message: 'No active rooms found', synced: 0 })
    }

    let totalSynced = 0
    const errors: string[] = []

    for (const room of rooms) {
      try {
        const events = await fetchBookings(room.outlook_email, startTime, endTime)

        for (const event of events) {
          // Upsert booking by outlook_event_id
          const bookingData = {
            room_id: room.id,
            outlook_event_id: event.id,
            organizer_email: event.organizer.emailAddress.address,
            organizer_name: event.organizer.emailAddress.name,
            subject: event.subject,
            start_time: event.start.dateTime,
            end_time: event.end.dateTime,
            expected_attendees: event.attendees?.length || 1,
            status: event.isCancelled ? 'cancelled' : 'confirmed',
            synced_at: now.toISOString(),
          }

          const { error: upsertError } = await adminClient
            .from('bookings')
            .upsert(bookingData, { onConflict: 'outlook_event_id' })

          if (upsertError) {
            console.error(`Error upserting booking ${event.id}:`, upsertError)
          } else {
            totalSynced++
          }
        }
      } catch (err) {
        const msg = `Room ${room.outlook_email}: ${err instanceof Error ? err.message : 'Unknown error'}`
        console.error(msg)
        errors.push(msg)
      }
    }

    // Audit log
    await adminClient.from('audit_log').insert({
      action: 'bookings_synced',
      entity_type: 'booking',
      actor: 'cron',
      details: {
        rooms_count: rooms.length,
        synced_count: totalSynced,
        errors_count: errors.length,
      },
    })

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      rooms: rooms.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('Sync bookings cron error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
