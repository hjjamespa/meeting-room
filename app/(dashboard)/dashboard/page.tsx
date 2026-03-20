'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, LayoutDashboard, DoorOpen, Users, UserX, Search } from 'lucide-react'
import RoomStatusCard from '@/components/RoomStatusCard'
import type { Room, OccupancyEvent, Booking } from '@/types/meeting-room'

interface OccupancyData {
  rooms: Room[]
  occupancy: Record<string, OccupancyEvent>
  currentBookings: Record<string, Booking>
  nextBookings: Record<string, Booking>
  stats: {
    total: number
    occupied: number
    available: number
    noshowsToday: number
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<OccupancyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [floorFilter, setFloorFilter] = useState<string>('all')

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/occupancy/latest')
      if (res.ok) {
        const json = await res.json()
        // API may return a plain array or the expected OccupancyData object
        if (Array.isArray(json)) {
          // Convert flat array of room occupancy records into OccupancyData shape
          const rooms: Room[] = json.map((r: Record<string, unknown>) => ({
            id: r.room_id as string,
            name: r.room_name as string,
            floor: r.floor as string,
            building: r.building as string,
            capacity: r.capacity as number,
          })) as Room[]
          const occupancy: Record<string, OccupancyEvent> = {}
          json.forEach((r: Record<string, unknown>) => {
            occupancy[r.room_id as string] = {
              id: r.room_id as string,
              room_id: r.room_id as string,
              is_occupied: r.is_occupied as boolean,
              person_count: r.person_count as number | null,
              detected_at: r.last_detected_at as string,
            } as OccupancyEvent
          })
          const occupied = json.filter((r: Record<string, unknown>) => r.is_occupied).length
          setData({
            rooms,
            occupancy,
            currentBookings: {},
            nextBookings: {},
            stats: {
              total: json.length,
              occupied,
              available: json.length - occupied,
              noshowsToday: 0,
            },
          })
        } else {
          setData(json)
        }
      }
    } catch (err) {
      console.error('Failed to load occupancy data:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [loadData])

  const rooms = data?.rooms || []
  const floors = [...new Set(rooms.map((r) => r.floor))].sort()

  const filteredRooms = rooms.filter((room) => {
    if (floorFilter !== 'all' && room.floor !== floorFilter) return false
    if (search && !room.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = data?.stats || { total: 0, occupied: 0, available: 0, noshowsToday: 0 }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">전체 회의실</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.occupied}</p>
              <p className="text-xs text-gray-500">사용 중</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
              <p className="text-xs text-gray-500">이용 가능</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <UserX className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.noshowsToday}</p>
              <p className="text-xs text-gray-500">오늘 No-show</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="회의실 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={floorFilter}
          onChange={(e) => setFloorFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">전체 층</option>
          {floors.map((f) => (
            <option key={f} value={f}>{f}층</option>
          ))}
        </select>
      </div>

      {/* Room Grid */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-20">
          <DoorOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">표시할 회의실이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredRooms.map((room) => (
            <RoomStatusCard
              key={room.id}
              room={room}
              occupancy={data?.occupancy[room.id] || null}
              currentBooking={data?.currentBookings[room.id] || null}
              nextBooking={data?.nextBookings[room.id] || null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
