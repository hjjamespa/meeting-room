'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  RefreshCw,
  Users,
  Clock,
} from 'lucide-react'
import type { Booking, Room } from '@/types/meeting-room'

const statusConfig: Record<string, { color: string; label: string }> = {
  confirmed: { color: 'bg-blue-100 text-blue-700', label: '확정' },
  completed: { color: 'bg-green-100 text-green-700', label: '완료' },
  no_show: { color: 'bg-yellow-100 text-yellow-700', label: 'No-show' },
  cancelled: { color: 'bg-gray-100 text-gray-600', label: '취소' },
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<(Booking & { room?: Room })[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [roomFilter, setRoomFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { date }
      if (roomFilter !== 'all') params.room_id = roomFilter
      if (statusFilter !== 'all') params.status = statusFilter

      const qs = new URLSearchParams(params).toString()
      const [bookingsRes, roomsRes] = await Promise.all([
        fetch(`/api/bookings?${qs}`),
        fetch('/api/rooms'),
      ])
      if (bookingsRes.ok) {
        const json = await bookingsRes.json()
        setBookings(Array.isArray(json) ? json : json.data || [])
      }
      if (roomsRes.ok) {
        const json = await roomsRes.json()
        setRooms(Array.isArray(json) ? json : json.data || [])
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [date, roomFilter, statusFilter])

  useEffect(() => {
    void loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  const getRoomName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId)
    return room?.name || roomId
  }

  const getDuration = (start: string, end: string) => {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000
    if (diff < 60) return `${diff}분`
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">예약 현황</h1>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">전체 회의실</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">전체 상태</option>
          <option value="confirmed">확정</option>
          <option value="completed">완료</option>
          <option value="no_show">No-show</option>
          <option value="cancelled">취소</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">시간</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">회의실</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">주최자</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">제목</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">참석자</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">시간</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center"><RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" /><p className="mt-2 text-sm text-gray-500">예약 정보를 불러오는 중...</p></td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                  <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  해당 날짜에 예약이 없습니다.
                </td></tr>
              ) : (
                bookings.map((b) => {
                  const cfg = statusConfig[b.status] || { color: 'bg-gray-100 text-gray-600', label: b.status }
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(b.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          -{new Date(b.end_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{getRoomName(b.room_id)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{b.organizer_name || b.organizer_email}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 hidden lg:table-cell truncate max-w-[200px]">{b.subject || '-'}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {b.expected_attendees}명
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell">
                        {getDuration(b.start_time, b.end_time)}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
