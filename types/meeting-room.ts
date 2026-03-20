// =============================================================
// Meeting Room Management System - TypeScript Types
// =============================================================

// ----- Constants -----

export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  COMPLETED: 'completed',
} as const

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS]

export const SENSOR_TYPES = ['tuya', 'manual'] as const
export type SensorType = (typeof SENSOR_TYPES)[number]

export const DETECTION_METHODS = ['sensor', 'manual', 'checkin_timeout'] as const
export type DetectionMethod = (typeof DETECTION_METHODS)[number]

export const CANCELLED_BY_OPTIONS = ['system_noshow', 'user', 'admin'] as const
export type CancelledBy = (typeof CANCELLED_BY_OPTIONS)[number]

export const ROOM_AMENITIES = [
  'whiteboard',
  'tv',
  'video_conferencing',
  'phone',
  'projector',
  'webcam',
  'microphone',
  'speaker',
] as const
export type RoomAmenity = (typeof ROOM_AMENITIES)[number]

export const USER_ROLES = ['admin', 'viewer'] as const
export type UserRole = (typeof USER_ROLES)[number]

// ----- Database Row Types -----

export interface Room {
  id: string
  name: string
  floor: string
  building: string
  capacity: number
  outlook_email: string
  outlook_calendar_id: string | null
  sensor_device_id: string | null
  sensor_type: SensorType
  amenities: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  room_id: string
  outlook_event_id: string
  organizer_email: string
  organizer_name: string | null
  subject: string | null
  start_time: string
  end_time: string
  expected_attendees: number
  status: BookingStatus
  cancelled_by: CancelledBy | null
  cancelled_at: string | null
  synced_at: string
  created_at: string
  updated_at: string
}

export interface OccupancyEvent {
  id: string
  room_id: string
  sensor_device_id: string
  is_occupied: boolean
  person_count: number | null
  raw_payload: Record<string, unknown> | null
  detected_at: string
}

export interface NoshowIncident {
  id: string
  booking_id: string
  room_id: string
  organizer_email: string
  detection_method: DetectionMethod
  grace_period_minutes: number
  detected_at: string
  auto_cancelled: boolean
  notification_sent: boolean
  notification_sent_at: string | null
}

export interface DailyRoomStats {
  id: string
  room_id: string
  date: string
  total_bookings: number
  completed_bookings: number
  noshow_bookings: number
  cancelled_bookings: number
  booked_minutes: number
  occupied_minutes: number
  utilization_rate: number | null
  booking_rate: number | null
  ghost_booking_rate: number | null
  avg_occupancy: number | null
  peak_hour: number | null
}

export interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  actor: string
  details: Record<string, unknown>
  created_at: string
}

export interface Profile {
  id: string
  email: string | null
  name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface SystemSetting {
  id: string
  key: string
  value: string | null
  updated_at: string
}

// ----- Helper / Composite Types -----

export interface RoomWithOccupancy extends Room {
  current_occupancy: OccupancyEvent | null
}

export interface BookingWithRoom extends Booking {
  room: Room
}

export interface OccupancyReading {
  device_id: string
  is_occupied: boolean
  person_count: number | null
  raw_payload: Record<string, unknown>
  timestamp: Date
}

export interface RoomCreateInput {
  name: string
  floor: string
  building?: string
  capacity: number
  outlook_email: string
  outlook_calendar_id?: string
  sensor_device_id?: string
  sensor_type?: SensorType
  amenities?: string[]
}

export interface RoomUpdateInput {
  id: string
  name?: string
  floor?: string
  building?: string
  capacity?: number
  outlook_email?: string
  outlook_calendar_id?: string
  sensor_device_id?: string
  sensor_type?: SensorType
  amenities?: string[]
  is_active?: boolean
}

export interface BookingFilter {
  room_id?: string
  date?: string
  status?: BookingStatus
  organizer_email?: string
}

export interface UtilizationQuery {
  room_id?: string
  start_date: string
  end_date: string
}
