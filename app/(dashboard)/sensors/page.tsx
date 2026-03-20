'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'
import {
  Wifi,
  RefreshCw,
  ExternalLink,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react'
import type { Room } from '@/types/meeting-room'

interface SensorInfo {
  room: Room
  lastEventTime: string | null
  isOnline: boolean
}

export default function SensorsPage() {
  const { user } = useUser()
  const [sensors, setSensors] = useState<SensorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [tuyaClientId, setTuyaClientId] = useState('')
  const [tuyaClientSecret, setTuyaClientSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [savingTuya, setSavingTuya] = useState(false)
  const [tuyaSaved, setTuyaSaved] = useState(false)

  const isAdmin = user?.role === 'admin'

  const loadSensors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rooms')
      if (res.ok) {
        const rooms: Room[] = await res.json()
        const sensorRooms = rooms.filter((r) => r.sensor_device_id)

        // Fetch latest occupancy for each room
        const occRes = await fetch('/api/occupancy/latest')
        const occData = occRes.ok ? await occRes.json() : { occupancy: {} }

        const infos: SensorInfo[] = sensorRooms.map((room) => {
          const occ = occData.occupancy?.[room.id]
          const lastTime = occ?.detected_at || null
          const isOnline = lastTime
            ? (Date.now() - new Date(lastTime).getTime()) < 15 * 60 * 1000
            : false
          return { room, lastEventTime: lastTime, isOnline }
        })
        setSensors(infos)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  const loadTuyaSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const settings = await res.json()
        const list = Array.isArray(settings) ? settings : []
        const clientId = list.find((s: { key: string }) => s.key === 'tuya_client_id')
        const clientSecret = list.find((s: { key: string }) => s.key === 'tuya_client_secret')
        if (clientId?.value) setTuyaClientId(clientId.value)
        if (clientSecret?.value) setTuyaClientSecret(clientSecret.value)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    void loadSensors()
    if (isAdmin) void loadTuyaSettings()
  }, [loadSensors, loadTuyaSettings, isAdmin])

  const handleSaveTuya = async () => {
    setSavingTuya(true)
    setTuyaSaved(false)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'tuya_client_id', value: tuyaClientId }),
      })
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'tuya_client_secret', value: tuyaClientSecret }),
      })
      setTuyaSaved(true)
      setTimeout(() => setTuyaSaved(false), 3000)
    } catch (err) {
      console.error(err)
    }
    setSavingTuya(false)
  }

  const handlePingSensor = async (deviceId: string) => {
    alert(`센서 ${deviceId}에 핑 요청을 전송합니다. (Tuya API 연동 필요)`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wifi className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">센서 관리</h1>
        </div>
        <button onClick={loadSensors} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
        </button>
      </div>

      {/* Sensor Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">회의실</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">센서 디바이스 ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">센서 타입</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">마지막 이벤트</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
                {isAdmin && <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center"><RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" /><p className="mt-2 text-sm text-gray-500">센서 상태를 확인하는 중...</p></td></tr>
              ) : sensors.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">연결된 센서가 없습니다.</td></tr>
              ) : (
                sensors.map((s) => (
                  <tr key={s.room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{s.room.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 font-mono text-xs">{s.room.sensor_device_id}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{s.room.sensor_type}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {s.lastEventTime ? new Date(s.lastEventTime).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`text-sm ${s.isOnline ? 'text-green-700' : 'text-red-700'}`}>
                          {s.isOnline ? '온라인' : '오프라인'}
                        </span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handlePingSensor(s.room.sensor_device_id!)}
                          className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                        >
                          핑 테스트
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tuya Console Link */}
      <div className="mb-6">
        <a
          href="https://iot.tuya.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <ExternalLink className="w-4 h-4" />
          Tuya 개발자 콘솔 열기
        </a>
      </div>

      {/* Tuya API Credentials */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tuya API 설정</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input
                type="text"
                value={tuyaClientId}
                onChange={(e) => setTuyaClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Tuya Client ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={tuyaClientSecret}
                  onChange={(e) => setTuyaClientSecret(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Tuya Client Secret"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">암호화되어 저장됩니다.</p>
            </div>
            <button
              onClick={handleSaveTuya}
              disabled={savingTuya}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingTuya ? '저장 중...' : tuyaSaved ? '저장 완료!' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
