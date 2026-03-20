// =============================================================
// Graph API - Room Resources & Bookings
// =============================================================

import { graphRequest } from './client'

// ----- Types -----

interface GraphRoom {
  id: string
  displayName: string
  emailAddress: string
  capacity: number
  building: string
  floorNumber: number
}

interface GraphEvent {
  id: string
  subject: string
  organizer: {
    emailAddress: { name: string; address: string }
  }
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees: Array<{
    emailAddress: { name: string; address: string }
    type: string
  }>
  isCancelled: boolean
}

interface GraphListResponse<T> {
  value: T[]
  '@odata.nextLink'?: string
}

// ----- Room Resources -----

/**
 * List all room resources from Microsoft 365
 */
export async function listRoomResources(): Promise<GraphRoom[]> {
  const result = await graphRequest<GraphListResponse<GraphRoom>>(
    '/places/microsoft.graph.room'
  )
  return result.value
}

// ----- Bookings -----

/**
 * Fetch calendar events for a room mailbox within a time range
 */
export async function fetchBookings(
  roomEmail: string,
  startTime: string,
  endTime: string
): Promise<GraphEvent[]> {
  const params = new URLSearchParams({
    startDateTime: startTime,
    endDateTime: endTime,
    $select: 'id,subject,organizer,start,end,attendees,isCancelled',
    $top: '100',
  })

  const result = await graphRequest<GraphListResponse<GraphEvent>>(
    `/users/${encodeURIComponent(roomEmail)}/calendarView?${params.toString()}`
  )

  return result.value
}

/**
 * Cancel a booking event on a room calendar
 */
export async function cancelBooking(
  roomEmail: string,
  eventId: string,
  comment: string
): Promise<void> {
  await graphRequest(
    `/users/${encodeURIComponent(roomEmail)}/events/${eventId}/cancel`,
    {
      method: 'POST',
      body: { comment },
    }
  )
}
