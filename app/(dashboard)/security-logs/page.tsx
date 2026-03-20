'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { ShieldAlert, RefreshCw } from 'lucide-react'

interface SecurityLog {
  id: string
  event_type: string
  user_email: string | null
  ip_address: string | null
  severity: string
  details: Record<string, unknown>
  created_at: string
}

const severityConfig: Record<string, { color: string; label: string; desc: string }> = {
  info: { color: 'bg-blue-100 text-blue-700', label: '정보', desc: '정상적인 활동 기록 (로그인 성공, 설정 변경 등)' },
  warning: { color: 'bg-yellow-100 text-yellow-700', label: '경고', desc: '주의가 필요한 이벤트 (로그인 실패, 요청 제한 등)' },
  critical: { color: 'bg-red-100 text-red-700', label: '심각', desc: '즉시 조치가 필요한 보안 위협 (계정 잠금, IP 차단 등)' },
}

const eventTypeLabels: Record<string, string> = {
  login_success: '로그인 성공',
  login_failed: '로그인 실패',
  password_changed: '비밀번호 변경',
  ip_blocked: 'IP 차단',
  rate_limited: '요청 제한',
  account_locked: '계정 잠금',
  account_unlocked: '계정 잠금 해제',
  settings_changed: '설정 변경',
  room_created: '회의실 생성',
  room_updated: '회의실 수정',
  room_deleted: '회의실 삭제',
  noshow_detected: 'No-show 감지',
  booking_cancelled: '예약 취소',
}

export default function SecurityLogsPage() {
  const { user } = useUser()
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/security-logs?limit=200')
      if (res.ok) setLogs(await res.json())
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { void loadLogs() }, [])

  if (user?.role !== 'admin') {
    return <div className="text-center py-20 text-gray-500">관리자 권한이 필요합니다.</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">보안 로그</h1>
        </div>
        <button onClick={loadLogs} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 px-1">
        {Object.entries(severityConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs rounded-full ${cfg.color}`}>{cfg.label}</span>
            <span className="text-xs text-gray-500">{cfg.desc}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">시간</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">이벤트</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">사용자</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">IP</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">심각도</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center"><RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" /><p className="mt-2 text-sm text-gray-500">보안 로그를 불러오는 중...</p></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">보안 로그가 없습니다.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-600">{new Date(log.created_at).toLocaleString('ko-KR')}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{eventTypeLabels[log.event_type] || log.event_type}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{log.user_email || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 font-mono">{log.ip_address || '-'}</td>
                    <td className="px-6 py-3">
                      {(() => {
                        const cfg = severityConfig[log.severity]
                        return (
                          <span className={`px-2 py-1 text-xs rounded-full cursor-help ${cfg?.color || 'bg-gray-100 text-gray-700'}`} title={cfg?.desc || log.severity}>
                            {cfg?.label || log.severity}
                          </span>
                        )
                      })()}
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
