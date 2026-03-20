'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { DailyRoomStats, Room } from '@/types/meeting-room'

type Period = 'week' | 'month' | 'quarter'

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DailyRoomStats[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')

  const getDateRange = useCallback((p: Period) => {
    const end = new Date()
    const start = new Date()
    if (p === 'week') start.setDate(end.getDate() - 7)
    else if (p === 'month') start.setDate(end.getDate() - 30)
    else start.setDate(end.getDate() - 90)
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { start_date, end_date } = getDateRange(period)
      const [statsRes, roomsRes] = await Promise.all([
        fetch(`/api/analytics/utilization?start_date=${start_date}&end_date=${end_date}`),
        fetch('/api/rooms'),
      ])
      if (statsRes.ok) {
        const json = await statsRes.json()
        setStats(Array.isArray(json) ? json : json.data || [])
      }
      if (roomsRes.ok) {
        const json = await roomsRes.json()
        setRooms(Array.isArray(json) ? json : json.data || [])
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [period, getDateRange])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const getRoomName = (roomId: string) => rooms.find((r) => r.id === roomId)?.name || roomId

  // Overall utilization
  const avgUtilization = stats.length > 0
    ? Math.round(stats.reduce((sum, s) => sum + (s.utilization_rate || 0), 0) / stats.length * 100)
    : 0

  // Room-by-room utilization (horizontal bar)
  const roomUtilMap: Record<string, { total: number; count: number }> = {}
  stats.forEach((s) => {
    if (!roomUtilMap[s.room_id]) roomUtilMap[s.room_id] = { total: 0, count: 0 }
    roomUtilMap[s.room_id].total += (s.utilization_rate || 0)
    roomUtilMap[s.room_id].count += 1
  })
  const roomUtilData = Object.entries(roomUtilMap)
    .map(([id, { total, count }]) => ({
      name: getRoomName(id),
      이용률: Math.round((total / count) * 100),
    }))
    .sort((a, b) => b.이용률 - a.이용률)

  // Ghost booking rate trend
  const dateMap: Record<string, { ghostTotal: number; count: number; utilTotal: number }> = {}
  stats.forEach((s) => {
    if (!dateMap[s.date]) dateMap[s.date] = { ghostTotal: 0, count: 0, utilTotal: 0 }
    dateMap[s.date].ghostTotal += (s.ghost_booking_rate || 0)
    dateMap[s.date].utilTotal += (s.utilization_rate || 0)
    dateMap[s.date].count += 1
  })
  const trendData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { ghostTotal, count, utilTotal }]) => ({
      date: date.slice(5),
      고스트예약률: Math.round((ghostTotal / count) * 100),
      이용률: Math.round((utilTotal / count) * 100),
    }))

  // Time-of-day heatmap (aggregate peak hours)
  const hourCounts: Record<number, number> = {}
  stats.forEach((s) => {
    if (s.peak_hour != null) {
      hourCounts[s.peak_hour] = (hourCounts[s.peak_hour] || 0) + 1
    }
  })
  const maxHourCount = Math.max(...Object.values(hourCounts), 1)
  const heatmapHours = Array.from({ length: 13 }, (_, i) => i + 8) // 8AM - 8PM

  // Top underutilized and overbooked rooms
  const underutilized = [...roomUtilData].sort((a, b) => a.이용률 - b.이용률).slice(0, 5)
  const overbooked = [...roomUtilData].sort((a, b) => b.이용률 - a.이용률).slice(0, 5)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">이용률 분석</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([['week', '주간'], ['month', '월간'], ['quarter', '분기']] as [Period, string][]).map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  period === p ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="mt-3 text-sm text-gray-500">이용률 데이터를 분석하는 중...</p>
        </div>
      ) : (
        <>
          {/* Overall Rate */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <p className="text-sm text-gray-500 mb-1">전체 평균 이용률</p>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-bold text-gray-900">{avgUtilization}%</p>
              {avgUtilization > 50 ? (
                <TrendingUp className="w-6 h-6 text-green-500 mb-2" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-500 mb-2" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Room-by-room utilization */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">회의실별 이용률</h2>
              {roomUtilData.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">데이터가 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, roomUtilData.length * 28)}>
                  <BarChart data={roomUtilData} layout="vertical" margin={{ left: 80 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="이용률" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Ghost Booking + Utilization Trend */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">이용률 / 고스트 예약률 추이</h2>
              {trendData.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">데이터가 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="이용률" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="고스트예약률" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time-of-day heatmap */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">시간대별 피크 빈도</h2>
              <div className="grid grid-cols-13 gap-1">
                {heatmapHours.map((hour) => {
                  const count = hourCounts[hour] || 0
                  const intensity = count / maxHourCount
                  const bg = intensity === 0
                    ? 'bg-gray-100'
                    : intensity < 0.33
                      ? 'bg-blue-200'
                      : intensity < 0.66
                        ? 'bg-blue-400'
                        : 'bg-blue-600'
                  return (
                    <div key={hour} className="text-center">
                      <div className={`w-full aspect-square rounded ${bg}`} title={`${hour}시: ${count}회`} />
                      <p className="text-[10px] text-gray-400 mt-0.5">{hour}</p>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                <span>낮음</span>
                <div className="flex gap-0.5">
                  <div className="w-4 h-3 bg-gray-100 rounded" />
                  <div className="w-4 h-3 bg-blue-200 rounded" />
                  <div className="w-4 h-3 bg-blue-400 rounded" />
                  <div className="w-4 h-3 bg-blue-600 rounded" />
                </div>
                <span>높음</span>
              </div>
            </div>

            {/* Top underutilized rooms */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <TrendingDown className="w-5 h-5 text-red-500 inline mr-2" />
                이용률 하위 회의실
              </h2>
              {underutilized.length === 0 ? (
                <p className="text-sm text-gray-400 text-center">데이터 없음</p>
              ) : (
                <div className="space-y-3">
                  {underutilized.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{r.name}</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${r.이용률}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{r.이용률}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top overbooked rooms */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500 inline mr-2" />
                이용률 상위 회의실
              </h2>
              {overbooked.length === 0 ? (
                <p className="text-sm text-gray-400 text-center">데이터 없음</p>
              ) : (
                <div className="space-y-3">
                  {overbooked.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{r.name}</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${r.이용률}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{r.이용률}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
