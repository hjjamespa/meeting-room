// =============================================================
// Analytics - Daily Room Statistics Aggregation
// =============================================================

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Calculate and upsert daily statistics for all active rooms
 */
export async function calculateDailyStats(
  adminClient: SupabaseClient,
  date: string // YYYY-MM-DD
): Promise<{ rooms_processed: number }> {
  const dayStart = `${date}T00:00:00+09:00` // KST
  const dayEnd = `${date}T23:59:59+09:00`

  // Total available minutes per day (business hours: 08:00 - 20:00 = 720 min)
  const BUSINESS_MINUTES = 720

  // Get all active rooms
  const { data: rooms, error: roomsError } = await adminClient
    .from('rooms')
    .select('id')
    .eq('is_active', true)

  if (roomsError) {
    console.error('Error fetching rooms for analytics:', roomsError)
    throw roomsError
  }

  if (!rooms || rooms.length === 0) return { rooms_processed: 0 }

  for (const room of rooms) {
    // Fetch bookings for this room on this date
    const { data: bookings } = await adminClient
      .from('bookings')
      .select('id, status, start_time, end_time')
      .eq('room_id', room.id)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)

    const allBookings = bookings || []

    const totalBookings = allBookings.length
    const completedBookings = allBookings.filter((b) => b.status === 'completed').length
    const noshowBookings = allBookings.filter((b) => b.status === 'no_show').length
    const cancelledBookings = allBookings.filter((b) => b.status === 'cancelled').length

    // Calculate booked minutes
    let bookedMinutes = 0
    for (const b of allBookings) {
      if (b.status !== 'cancelled') {
        const start = new Date(b.start_time).getTime()
        const end = new Date(b.end_time).getTime()
        bookedMinutes += Math.round((end - start) / 60_000)
      }
    }

    // Calculate occupied minutes from occupancy events
    const { data: occupancyEvents } = await adminClient
      .from('occupancy_events')
      .select('is_occupied, detected_at')
      .eq('room_id', room.id)
      .gte('detected_at', dayStart)
      .lte('detected_at', dayEnd)
      .order('detected_at', { ascending: true })

    let occupiedMinutes = 0
    const events = occupancyEvents || []

    if (events.length > 0) {
      let lastOccupiedAt: Date | null = null

      for (const evt of events) {
        if (evt.is_occupied && !lastOccupiedAt) {
          lastOccupiedAt = new Date(evt.detected_at)
        } else if (!evt.is_occupied && lastOccupiedAt) {
          const end = new Date(evt.detected_at)
          occupiedMinutes += Math.round((end.getTime() - lastOccupiedAt.getTime()) / 60_000)
          lastOccupiedAt = null
        }
      }

      // If still occupied at end of day
      if (lastOccupiedAt) {
        const endOfDay = new Date(`${date}T20:00:00+09:00`)
        occupiedMinutes += Math.round(
          (endOfDay.getTime() - lastOccupiedAt.getTime()) / 60_000
        )
      }
    }

    // Calculate rates
    const utilizationRate = BUSINESS_MINUTES > 0
      ? Math.round((occupiedMinutes / BUSINESS_MINUTES) * 10000) / 10000
      : null
    const bookingRate = BUSINESS_MINUTES > 0
      ? Math.round((bookedMinutes / BUSINESS_MINUTES) * 10000) / 10000
      : null
    const ghostBookingRate = totalBookings > 0
      ? Math.round((noshowBookings / totalBookings) * 10000) / 10000
      : null

    // Calculate average occupancy (person count)
    const { data: avgData } = await adminClient
      .from('occupancy_events')
      .select('person_count')
      .eq('room_id', room.id)
      .eq('is_occupied', true)
      .gte('detected_at', dayStart)
      .lte('detected_at', dayEnd)
      .not('person_count', 'is', null)

    const avgOccupancy = avgData && avgData.length > 0
      ? avgData.reduce((sum, e) => sum + (e.person_count || 0), 0) / avgData.length
      : null

    // Find peak hour by counting occupied events per hour
    let peakHour: number | null = null
    if (events.length > 0) {
      const hourCounts: Record<number, number> = {}
      for (const evt of events) {
        if (evt.is_occupied) {
          const hour = new Date(evt.detected_at).getHours()
          hourCounts[hour] = (hourCounts[hour] || 0) + 1
        }
      }
      let maxCount = 0
      for (const [hour, count] of Object.entries(hourCounts)) {
        if (count > maxCount) {
          maxCount = count
          peakHour = parseInt(hour, 10)
        }
      }
    }

    // Upsert into daily_room_stats
    await adminClient.from('daily_room_stats').upsert(
      {
        room_id: room.id,
        date,
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        noshow_bookings: noshowBookings,
        cancelled_bookings: cancelledBookings,
        booked_minutes: bookedMinutes,
        occupied_minutes: occupiedMinutes,
        utilization_rate: utilizationRate,
        booking_rate: bookingRate,
        ghost_booking_rate: ghostBookingRate,
        avg_occupancy: avgOccupancy,
        peak_hour: peakHour,
      },
      { onConflict: 'room_id,date' }
    )
  }

  return { rooms_processed: rooms.length }
}
