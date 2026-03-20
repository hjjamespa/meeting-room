'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  UserX,
  RefreshCw,
  Download,
  CalendarDays,
} from 'lucide-react'
import type { NoshowIncident, Room } from '@/types/meeting-room'

export default function NoshowsPage() {
  const [noshows, setNoshows] = useState<NoshowIncident[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [roomFilter, setRoomFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { start_date: startDate, end_date: endDate }
      if (roomFilter !== 'all') params.room_id = roomFilter
      const qs = new URLSearchParams(params).toString()

      const [noshowRes, roomsRes] = await Promise.all([
        fetch(`/api/noshows?${qs}`),
        fetch('/api/rooms'),
      ])
      if (noshowRes.ok) setNoshows(await noshowRes.json())
      if (roomsRes.ok) setRooms(await roomsRes.json())
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [startDate, endDate, roomFilter])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const getRoomName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId)
    return room?.name || roomId
  }

  // Summary stats
  const totalNoshows = noshows.length
  const roomCounts: Record<string, number> = {}
  const organizerCounts: Record<string, number> = {}
  noshows.forEach((ns) => {
    roomCounts[ns.room_id] = (roomCounts[ns.room_id] || 0) + 1
    organizerCounts[ns.organizer_email] = (organizerCounts[ns.organizer_email] || 0) + 1
  })
  const topRooms = Object.entries(roomCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const topOrganizers = Object.entries(organizerCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const detectionMethodLabel: Record<string, string> = {
    sensor: '센서 감지',
    manual: '수동 확인',
    checkin_timeout: '체크인 타임아웃',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserX className="w-7 h-7 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">No-show 이력</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500" title="내보내기 (준비 중)">
            <Download className="w-4 h-4" /> 내보내기
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">기간 내 No-show</p>
          <p className="text-3xl font-bold text-gray-900">{totalNoshows}건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-2">No-show 빈도 상위 회의실</p>
          {topRooms.length === 0 ? (
            <p className="text-sm text-gray-400">데이터 없음</p>
          ) : (
            <div className="space-y-1">
              {topRooms.map(([id, count]) => (
                <div key={id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{getRoomName(id)}</span>
                  <span className="text-gray-500 font-medium">{count}건</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-2">No-show 빈도 상위 주최자</p>
          {topOrganizers.length === 0 ? (
            <p className="text-sm text-gray-400">데이터 없음</p>
          ) : (
            <div className="space-y-1">
              {topOrganizers.map(([email, count]) => (
                <div key={email} className="flex justify-between text-sm">
                  <span className="text-gray-700 truncate mr-2">{email}</span>
                  <span className="text-gray-500 font-medium shrink-0">{count}건</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">감지 시간</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">회의실</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">주최자</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">감지 방법</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">유예시간</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">자동취소</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">알림</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center"><RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" /></td></tr>
              ) : noshows.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                  <UserX className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  No-show 기록이 없습니다.
                </td></tr>
              ) : (
                noshows.map((ns) => (
                  <tr key={ns.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-600">{new Date(ns.detected_at).toLocaleString('ko-KR')}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{getRoomName(ns.room_id)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{ns.organizer_email}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {detectionMethodLabel[ns.detection_method] || ns.detection_method}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell">{ns.grace_period_minutes}분</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${ns.auto_cancelled ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {ns.auto_cancelled ? '자동취소' : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${ns.notification_sent ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {ns.notification_sent ? '발송' : '미발송'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
