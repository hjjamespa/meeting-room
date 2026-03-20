'use client'

import Link from 'next/link'
import {
  Users,
  Clock,
  Tv,
  Phone,
  Video,
  Monitor,
  Mic,
  Speaker,
  PenTool,
  Camera,
} from 'lucide-react'
import type { Room, OccupancyEvent, Booking } from '@/types/meeting-room'

interface RoomStatusCardProps {
  room: Room
  occupancy: OccupancyEvent | null
  currentBooking: Booking | null
  nextBooking: Booking | null
}

const amenityIcons: Record<string, React.ElementType> = {
  whiteboard: PenTool,
  tv: Tv,
  video_conferencing: Video,
  phone: Phone,
  projector: Monitor,
  webcam: Camera,
  microphone: Mic,
  speaker: Speaker,
}

function getStatus(
  room: Room,
  occupancy: OccupancyEvent | null,
  currentBooking: Booking | null,
  nextBooking: Booking | null
): { label: string; color: string; bgColor: string; borderColor: string } {
  if (!room.is_active) {
    return { label: '비활성', color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
  }
  if (occupancy?.is_occupied || currentBooking) {
    return { label: '사용 중', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
  }
  if (nextBooking) {
    const startTime = new Date(nextBooking.start_time)
    const diff = (startTime.getTime() - Date.now()) / 60000
    if (diff <= 30 && diff > 0) {
      return { label: '예약됨', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' }
    }
  }
  return { label: '비어 있음', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
}

function getTimeRemaining(booking: Booking): string {
  const end = new Date(booking.end_time)
  const diff = Math.max(0, Math.floor((end.getTime() - Date.now()) / 60000))
  if (diff === 0) return '곧 종료'
  if (diff < 60) return `${diff}분 남음`
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  return `${hours}시간 ${mins}분 남음`
}

export default function RoomStatusCard({ room, occupancy, currentBooking, nextBooking }: RoomStatusCardProps) {
  const status = getStatus(room, occupancy, currentBooking, nextBooking)

  return (
    <Link href={`/dashboard/${room.id}`}>
      <div className={`rounded-xl border-2 ${status.borderColor} ${status.bgColor} p-4 hover:shadow-md transition cursor-pointer h-full`}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{room.name}</h3>
            <p className="text-xs text-gray-500">{room.floor}층</p>
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color} ${status.bgColor}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <Users className="w-3.5 h-3.5" />
          <span>{room.capacity}명</span>
        </div>

        {currentBooking && (
          <div className="mt-2 pt-2 border-t border-gray-200/50">
            <p className="text-xs font-medium text-gray-700 truncate">
              {currentBooking.subject || '(제목 없음)'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {currentBooking.organizer_name || currentBooking.organizer_email}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{getTimeRemaining(currentBooking)}</span>
            </div>
          </div>
        )}

        {!currentBooking && nextBooking && status.label === '예약됨' && (
          <div className="mt-2 pt-2 border-t border-gray-200/50">
            <p className="text-xs text-gray-500">
              다음: {new Date(nextBooking.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {room.amenities && room.amenities.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {room.amenities.slice(0, 4).map((amenity) => {
              const Icon = amenityIcons[amenity]
              return Icon ? (
                <div key={amenity} className="w-5 h-5 bg-white rounded flex items-center justify-center" title={amenity}>
                  <Icon className="w-3 h-3 text-gray-400" />
                </div>
              ) : null
            })}
            {room.amenities.length > 4 && (
              <span className="text-xs text-gray-400">+{room.amenities.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
