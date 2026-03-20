'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/api'
import { LogIn, Mail, Lock, AlertCircle, Calendar, Shield } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // MFA 상태
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaVerifying, setMfaVerifying] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 계정 잠금 상태 확인
    try {
      const lockRes = await fetch('/api/security-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'check_lockout', email }),
      })
      const lockData = await lockRes.json()
      if (lockData.locked) {
        setError(`계정이 일시 잠금되었습니다. ${lockData.remainingMinutes}분 후에 다시 시도해주세요.`)
        setLoading(false)
        return
      }
    } catch { /* 체크 실패 시 진행 */ }

    try {
      const data = await auth.login(email, password)

      fetch('/api/security-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'login_success', email, userId: data.user?.id }),
      }).catch(() => {})

      // MFA 필요 여부 확인
      try {
        const res = await fetch('/api/mfa/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user?.id }),
        })
        const { mfaRequired: needsMfa } = await res.json()
        if (needsMfa) {
          setMfaRequired(true)
          setLoading(false)
          return
        }
      } catch { /* MFA 체크 실패 시 그냥 진행 */ }

      router.push('/dashboard')
      router.refresh()
    } catch {
      try {
        const failRes = await fetch('/api/security-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'login_failed', email }),
        })
        const failData = await failRes.json()
        if (failData.locked) {
          setError(`로그인 시도 횟수 초과로 계정이 잠금되었습니다. ${failData.remainingMinutes}분 후에 다시 시도해주세요.`)
        } else {
          setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
        }
      } catch {
        setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
      }
    }
    setLoading(false)
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setMfaVerifying(true)
    setError(null)

    try {
      const res = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'MFA 인증에 실패했습니다.')
        setMfaVerifying(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('MFA 인증 중 오류가 발생했습니다.')
      setMfaVerifying(false)
    }
  }

  // MFA 인증 화면
  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">2단계 인증</h1>
              <p className="text-gray-500 mt-2">인증 앱의 6자리 코드를 입력하세요</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div>
                <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700 mb-1">인증 코드</label>
                <input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                  placeholder="6자리 코드 또는 백업 코드"
                  required
                  autoFocus
                  className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={mfaVerifying || mfaCode.length < 6}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mfaVerifying ? '인증 중...' : '인증하기'}
              </button>
            </form>
            <button
              onClick={() => { setMfaRequired(false); setMfaCode(''); setError(null); auth.logout() }}
              className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-700 transition"
            >
              다른 계정으로 로그인
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              인증 앱을 사용할 수 없는 경우 백업 코드를 입력하세요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">회의실 관리 시스템</h1>
            <p className="text-gray-500 mt-2">로그인하여 시작하세요</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            계정이 필요하신 경우 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    </div>
  )
}
