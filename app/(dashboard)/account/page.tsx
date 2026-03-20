'use client'

import { useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { User, Lock, Eye, EyeOff, Save, RefreshCw } from 'lucide-react'

export default function AccountPage() {
  const { user } = useUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: data.error || '비밀번호 변경에 실패했습니다.' })
      }
    } catch {
      setMessage({ type: 'error', text: '서버 오류가 발생했습니다.' })
    }
    setSaving(false)
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="mt-3 text-sm text-gray-500">계정 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <User className="w-7 h-7 text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-900">내 계정</h1>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* 계정 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            계정 정보
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-20">이름</span>
              <span className="text-sm text-gray-900">{user.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-20">이메일</span>
              <span className="text-sm text-gray-900">{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-20">역할</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                {user.role === 'admin' ? '관리자' : '일반 사용자'}
              </span>
            </div>
          </div>
        </div>

        {/* 비밀번호 변경 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-yellow-500" />
            비밀번호 변경
          </h2>

          {message && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="현재 비밀번호를 입력하세요"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="새 비밀번호 (8자 이상, 영문+숫자)"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">영문자와 숫자를 포함하여 8자 이상</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
