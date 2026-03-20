'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Clock,
  UserX,
  Activity,
  DoorOpen,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Room, OccupancyEvent, Booking, NoshowIncident, DailyRoomStats } from '@/types/meeting-room'

interface RoomDetailData {
  room: Room
  currentOccupancy: OccupancyEvent | null
  todayBookings: Booking[]
  recentEvents: OccupancyEvent[]
  recentNoshows: NoshowIncident[]
  weeklyStats: DailyRoomStats[]
}

export default function RoomDetailPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [data, setData] = useState<RoomDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [roomRes, occRes, bookingsRes, noshowsRes, statsRes] = await Promise.all([
        fetch(`/api/rooms?id=${roomId}`),
        fetch(`/api/occupancy?room_id=${roomId}&limit=20`),
        fetch(`/api/bookings?room_id=${roomId}&date=${new Date().toISOString().split('T')[0]}`),
        fetch(`/api/noshows?room_id=${roomId}&limit=5`),
        fetch(`/api/analytics/utilization?room_id=${roomId}&start_date=${getWeekAgo()}&end_date=${getToday()}`),
      ])

      const roomJson = roomRes.ok ? await roomRes.json() : null
      const occJson = occRes.ok ? await occRes.json() : []
      const bookingsJson = bookingsRes.ok ? await bookingsRes.json() : []
      const noshowsJson = noshowsRes.ok ? await noshowsRes.json() : []
      const statsJson = statsRes.ok ? await statsRes.json() : []

      const room = roomJson
      const occData = Array.isArray(occJson) ? occJson : occJson.data || []
      const bookings = Array.isArray(bookingsJson) ? bookingsJson : bookingsJson.data || []
      const noshows = Array.isArray(noshowsJson) ? noshowsJson : noshowsJson.data || []
      const stats = Array.isArray(statsJson) ? statsJson : statsJson.data || []

      setData({
        room: Array.isArray(room) ? room[0] : room,
        currentOccupancy: Array.isArray(occData) && occData.length > 0 ? occData[0] : null,
        todayBookings: Array.isArray(bookings) ? bookings : [],
        recentEvents: Array.isArray(occData) ? occData : [],
        recentNoshows: Array.isArray(noshows) ? noshows : [],
        weeklyStats: Array.isArray(stats) ? stats : [],
      })
    } catch (err) {
      console.error('Failed to load room detail:', err)
    }
    setLoading(false)
  }, [roomId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!data?.room) {
    return (
      <div className="text-center py-20">
        <DoorOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">회의실을 찾을 수 없습니다.</p>
        <Link href="/dashboard" className="text-blue-500 text-sm mt-2 inline-block">대시보드로 돌아가기</Link>
      </div>
    )
  }

  const { room, currentOccupancy, todayBookings, recentEvents, recentNoshows, weeklyStats } = data
  const isOccupied = currentOccupancy?.is_occupied ?? false

  const chartData = weeklyStats.map((s) => ({
    date: s.date.slice(5),
    이용률: Math.round((s.utilization_rate || 0) * 100),
  }))

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
          <p className="text-sm text-gray-500">{room.floor}층 | 수용: {room.capacity}명</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> 새로고침
        </button>
      </div>

      {/* Current Status */}
      <div className={`rounded-xl border-2 p-6 mb-6 ${isOccupied ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isOccupied ? 'bg-red-100' : 'bg-green-100'}`}>
            <Activity className={`w-8 h-8 ${isOccupied ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${isOccupied ? 'text-red-700' : 'text-green-700'}`}>
              {isOccupied ? '사용 중' : '비어 있음'}
            </p>
            {currentOccupancy && (
              <p className="text-sm text-gray-600">
                마지막 감지: {new Date(currentOccupancy.detected_at).toLocaleTimeString('ko-KR')}
                {currentOccupancy.person_count != null && ` | ${currentOccupancy.person_count}명 감지`}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Bookings Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            오늘 예약 현황
          </h2>
          {todayBookings.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">오늘 예약이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {/* Timeline Bar */}
              <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden mb-4">
                {todayBookings.map((b) => {
                  const dayStart = new Date()
                  dayStart.setHours(8, 0, 0, 0)
                  const dayEnd = new Date()
                  dayEnd.setHours(20, 0, 0, 0)
                  const totalMinutes = (dayEnd.getTime() - dayStart.getTime()) / 60000
                  const start = Math.max(0, (new Date(b.start_time).getTime() - dayStart.getTime()) / 60000)
                  const end = Math.min(totalMinutes, (new Date(b.end_time).getTime() - dayStart.getTime()) / 60000)
                  const left = (start / totalMinutes) * 100
                  const width = ((end - start) / totalMinutes) * 100
                  const statusColor = b.status === 'no_show' ? 'bg-yellow-400' : b.status === 'cancelled' ? 'bg-gray-300' : 'bg-blue-400'
                  return (
                    <div
                      key={b.id}
                      className={`absolute top-1 bottom-1 rounded ${statusColor}`}
                      style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                      title={`${b.subject || '(제목 없음)'} ${new Date(b.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}-${new Date(b.end_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                    />
                  )
                })}
                <div className="absolute top-0 bottom-0 flex justify-between w-full px-1 items-end">
                  {[8, 10, 12, 14, 16, 18, 20].map((h) => (
                    <span key={h} className="text-[10px] text-gray-400">{h}</span>
                  ))}
                </div>
              </div>
              {/* Booking List */}
              {todayBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-sm">
                  <div className="text-xs text-gray-500 w-24 shrink-0">
                    {new Date(b.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    -{new Date(b.end_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{b.subject || '(제목 없음)'}</p>
                    <p className="text-xs text-gray-500 truncate">{b.organizer_name || b.organizer_email}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7-day Utilization */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">7일간 이용률</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">데이터가 없습니다.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="이용률" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Occupancy Events */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            최근 점유 이벤트
          </h2>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">이벤트가 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentEvents.map((evt) => (
                <div key={evt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-sm">
                  <div className={`w-2 h-2 rounded-full ${evt.is_occupied ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span className="text-gray-600">
                    {new Date(evt.detected_at).toLocaleString('ko-KR')}
                  </span>
                  <span className="text-gray-800 font-medium">
                    {evt.is_occupied ? '점유 시작' : '점유 해제'}
                  </span>
                  {evt.person_count != null && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />{evt.person_count}명
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent No-shows */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserX className="w-5 h-5 text-yellow-500" />
            최근 No-show
          </h2>
          {recentNoshows.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No-show 기록이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recentNoshows.map((ns) => (
                <div key={ns.id} className="p-2 rounded-lg hover:bg-gray-50 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{ns.organizer_email}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(ns.detected_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">유예: {ns.grace_period_minutes}분</span>
                    {ns.auto_cancelled && <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">자동취소</span>}
                    {ns.notification_sent && <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">알림발송</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    confirmed: { color: 'bg-blue-100 text-blue-700', label: '확정' },
    completed: { color: 'bg-green-100 text-green-700', label: '완료' },
    no_show: { color: 'bg-yellow-100 text-yellow-700', label: 'No-show' },
    cancelled: { color: 'bg-gray-100 text-gray-600', label: '취소' },
  }
  const cfg = config[status] || { color: 'bg-gray-100 text-gray-600', label: status }
  return <span className={`px-2 py-0.5 text-xs rounded-full ${cfg.color}`}>{cfg.label}</span>
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getWeekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}
