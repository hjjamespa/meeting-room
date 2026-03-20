'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'
import {
  DoorOpen,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
} from 'lucide-react'
import type { Room, ROOM_AMENITIES, RoomAmenity, SensorType } from '@/types/meeting-room'

const AMENITY_LABELS: Record<string, string> = {
  whiteboard: '화이트보드',
  tv: 'TV',
  video_conferencing: '화상회의',
  phone: '전화',
  projector: '프로젝터',
  webcam: '웹캠',
  microphone: '마이크',
  speaker: '스피커',
}

const ALL_AMENITIES: RoomAmenity[] = [
  'whiteboard', 'tv', 'video_conferencing', 'phone',
  'projector', 'webcam', 'microphone', 'speaker',
]

interface RoomForm {
  name: string
  floor: string
  building: string
  capacity: number
  outlook_email: string
  sensor_device_id: string
  sensor_type: SensorType
  amenities: string[]
  is_active: boolean
}

const emptyForm: RoomForm = {
  name: '',
  floor: '',
  building: '',
  capacity: 4,
  outlook_email: '',
  sensor_device_id: '',
  sensor_type: 'tuya',
  amenities: [],
  is_active: true,
}

export default function RoomsPage() {
  const { user } = useUser()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RoomForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  const loadRooms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rooms')
      if (res.ok) setRooms(await res.json())
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadRooms()
  }, [loadRooms])

  const floors = [...new Set(rooms.map((r) => r.floor))].sort()

  const filteredRooms = rooms.filter((room) => {
    if (floorFilter !== 'all' && room.floor !== floorFilter) return false
    if (search && !room.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const openCreateModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = (room: Room) => {
    setEditingId(room.id)
    setForm({
      name: room.name,
      floor: room.floor,
      building: room.building || '',
      capacity: room.capacity,
      outlook_email: room.outlook_email,
      sensor_device_id: room.sensor_device_id || '',
      sensor_type: room.sensor_type || 'tuya',
      amenities: room.amenities || [],
      is_active: room.is_active,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const url = editingId ? `/api/rooms?id=${editingId}` : '/api/rooms'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setModalOpen(false)
        await loadRooms()
      }
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        await loadRooms()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DoorOpen className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">회의실 관리</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRooms} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
          </button>
          {isAdmin && (
            <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> 회의실 추가
            </button>
          )}
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

      <p className="text-xs text-gray-400 mb-4">
        대량 등록이 필요한 경우 CSV 파일을 통한 일괄 등록을 지원합니다. 관리자에게 문의하세요.
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">층</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">수용인원</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Outlook 이메일</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">센서 ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
                {isAdmin && <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center"><RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" /><p className="mt-2 text-sm text-gray-500">회의실 목록을 불러오는 중...</p></td></tr>
              ) : filteredRooms.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">등록된 회의실이 없습니다.</td></tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{room.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{room.floor}층</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{room.capacity}명</td>
                    <td className="px-6 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{room.outlook_email}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{room.sensor_device_id || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {room.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditModal(room)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="수정">
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          {deleteConfirm === room.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(room.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">삭제</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">취소</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(room.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="삭제">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? '회의실 수정' : '회의실 추가'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">회의실 이름</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="예: 회의실 A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">층</label>
                  <input type="text" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="예: 3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수용인원</label>
                  <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">건물</label>
                <input type="text" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="예: 본관" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outlook 이메일</label>
                <input type="email" value={form.outlook_email} onChange={(e) => setForm({ ...form, outlook_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="room-a@company.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">센서 디바이스 ID</label>
                  <input type="text" value={form.sensor_device_id} onChange={(e) => setForm({ ...form, sensor_device_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">센서 타입</label>
                  <select value={form.sensor_type} onChange={(e) => setForm({ ...form, sensor_type: e.target.value as SensorType })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="tuya">Tuya</option>
                    <option value="manual">수동</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">편의시설</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_AMENITIES.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                        form.amenities.includes(amenity)
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {AMENITY_LABELS[amenity] || amenity}
                    </button>
                  ))}
                </div>
              </div>
              {editingId && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">활성 상태</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={`relative w-10 h-5 rounded-full transition ${form.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.floor} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? '저장 중...' : editingId ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
