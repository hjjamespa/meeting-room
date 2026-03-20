// =============================================================
// No-Show Detection Logic
// =============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { cancelBooking } from '@/lib/graph/rooms'
import { sendEmail } from '@/lib/mail-client'

interface NoshowCheckOptions {
  gracePeriodMinutes?: number
  autoCancelEnabled?: boolean
}

/**
 * Check for no-show bookings:
 * - Find confirmed bookings where start_time + grace_period < now
 * - Check occupancy_events for the room during the grace period
 * - If no occupied events found: mark as no_show, optionally auto-cancel
 * - Log to noshow_incidents and audit_log
 * - Send notification email
 */
export async function checkNoshows(
  adminClient: SupabaseClient,
  options: NoshowCheckOptions = {}
): Promise<{ processed: number; noshows: number }> {
  const { gracePeriodMinutes = 10, autoCancelEnabled = true } = options

  const now = new Date()
  const graceThreshold = new Date(now.getTime() - gracePeriodMinutes * 60 * 1000)

  // Find confirmed bookings that started more than grace_period ago
  // but not too far in the past (within 1 hour)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const { data: bookings, error: bookingsError } = await adminClient
    .from('bookings')
    .select('*, room:rooms(*)')
    .eq('status', 'confirmed')
    .lte('start_time', graceThreshold.toISOString())
    .gte('start_time', oneHourAgo.toISOString())

  if (bookingsError) {
    console.error('Error fetching bookings for noshow check:', bookingsError)
    throw bookingsError
  }

  if (!bookings || bookings.length === 0) {
    return { processed: 0, noshows: 0 }
  }

  let noshowCount = 0

  for (const booking of bookings) {
    // Check if already processed as noshow
    const { data: existingIncident } = await adminClient
      .from('noshow_incidents')
      .select('id')
      .eq('booking_id', booking.id)
      .maybeSingle()

    if (existingIncident) continue

    // Check occupancy events during the grace period window
    const bookingStart = new Date(booking.start_time)
    const graceEnd = new Date(bookingStart.getTime() + gracePeriodMinutes * 60 * 1000)

    const { data: occupancyEvents } = await adminClient
      .from('occupancy_events')
      .select('id, is_occupied')
      .eq('room_id', booking.room_id)
      .gte('detected_at', bookingStart.toISOString())
      .lte('detected_at', graceEnd.toISOString())
      .eq('is_occupied', true)
      .limit(1)

    const wasOccupied = occupancyEvents && occupancyEvents.length > 0

    if (wasOccupied) {
      // Room was occupied, mark booking as completed
      await adminClient
        .from('bookings')
        .update({ status: 'completed', updated_at: now.toISOString() })
        .eq('id', booking.id)
      continue
    }

    // No-show detected
    noshowCount++

    // Mark booking as no_show
    await adminClient
      .from('bookings')
      .update({
        status: 'no_show',
        cancelled_by: 'system_noshow',
        cancelled_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', booking.id)

    // Auto-cancel via Graph API if enabled
    let autoCancelled = false
    if (autoCancelEnabled && booking.room?.outlook_email) {
      try {
        await cancelBooking(
          booking.room.outlook_email,
          booking.outlook_event_id,
          'Automatically cancelled due to no-show detection. The room was not occupied within the grace period.'
        )
        autoCancelled = true
      } catch (err) {
        console.error(`Failed to cancel event ${booking.outlook_event_id} via Graph:`, err)
      }
    }

    // Insert noshow incident
    await adminClient.from('noshow_incidents').insert({
      booking_id: booking.id,
      room_id: booking.room_id,
      organizer_email: booking.organizer_email,
      detection_method: 'sensor',
      grace_period_minutes: gracePeriodMinutes,
      detected_at: now.toISOString(),
      auto_cancelled: autoCancelled,
      notification_sent: false,
    })

    // Send notification email
    try {
      const roomName = booking.room?.name || 'Unknown Room'
      const startTime = new Date(booking.start_time).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
      })

      await sendEmail({
        to: booking.organizer_email,
        subject: `[Meeting Room] No-show detected - ${roomName}`,
        html: `
          <h3>No-Show Detection Notice</h3>
          <p>Your booking was detected as a no-show and has been ${autoCancelled ? 'automatically cancelled' : 'marked as no-show'}.</p>
          <ul>
            <li><strong>Room:</strong> ${roomName}</li>
            <li><strong>Start Time:</strong> ${startTime}</li>
            <li><strong>Grace Period:</strong> ${gracePeriodMinutes} minutes</li>
          </ul>
          <p>If this was a mistake, please rebook the room.</p>
        `,
      })

      // Update notification status
      await adminClient
        .from('noshow_incidents')
        .update({
          notification_sent: true,
          notification_sent_at: now.toISOString(),
        })
        .eq('booking_id', booking.id)
    } catch (err) {
      console.error(`Failed to send noshow notification to ${booking.organizer_email}:`, err)
    }

    // Audit log
    await adminClient.from('audit_log').insert({
      action: 'noshow_detected',
      entity_type: 'booking',
      entity_id: booking.id,
      actor: 'system',
      details: {
        room_id: booking.room_id,
        organizer_email: booking.organizer_email,
        grace_period_minutes: gracePeriodMinutes,
        auto_cancelled: autoCancelled,
      },
    })
  }

  return { processed: bookings.length, noshows: noshowCount }
}
