'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'
import { User, Lock, Eye, EyeOff, Save, RefreshCw, Shield, ShieldCheck, ShieldOff, QrCode, Key, AlertCircle } from 'lucide-react'

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

        {/* 2단계 인증 (MFA) */}
        <MfaSection />
      </div>
    </div>
  )
}

function MfaSection() {
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [setupData, setSetupData] = useState<{ qrCodeUrl: string; secret: string; backupCodes: string[] } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [mfaMessage, setMfaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [processing, setProcessing] = useState(false)

  const loadMfaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/mfa/status')
      const data = await res.json()
      setMfaEnabled(data.mfaEnabled)
      setBackupCodesRemaining(data.backupCodesRemaining ?? 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMfaStatus()
  }, [loadMfaStatus])

  const handleSetup = async () => {
    setMfaMessage(null)
    setProcessing(true)
    try {
      const res = await fetch('/api/mfa/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setMfaMessage({ type: 'error', text: data.error || 'MFA 설정에 실패했습니다.' })
        return
      }
      setSetupData(data)
    } catch {
      setMfaMessage({ type: 'error', text: 'MFA 설정 시작에 실패했습니다.' })
    } finally {
      setProcessing(false)
    }
  }

  const handleVerify = async () => {
    if (verifyCode.length < 6) return
    setMfaMessage(null)
    setProcessing(true)
    try {
      const res = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMfaMessage({ type: 'error', text: data.error || '인증에 실패했습니다.' })
        return
      }
      setMfaMessage({ type: 'success', text: '2단계 인증이 활성화되었습니다!' })
      setSetupData(null)
      setVerifyCode('')
      loadMfaStatus()
    } catch {
      setMfaMessage({ type: 'error', text: '인증 확인에 실패했습니다.' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDisable = async () => {
    setMfaMessage(null)
    setProcessing(true)
    try {
      const res = await fetch('/api/mfa/disable', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setMfaMessage({ type: 'error', text: data.error || '비활성화에 실패했습니다.' })
        return
      }
      setMfaMessage({ type: 'success', text: '2단계 인증이 비활성화되었습니다.' })
      setShowDisableConfirm(false)
      loadMfaStatus()
    } catch {
      setMfaMessage({ type: 'error', text: '비활성화에 실패했습니다.' })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Shield className="w-5 h-5 text-green-500" />
        2단계 인증 (MFA)
      </h2>
      <p className="text-sm text-gray-500 mb-4">TOTP 기반 2단계 인증으로 계정을 보호합니다.</p>

      {mfaMessage && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          mfaMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {mfaMessage.text}
        </div>
      )}

      {mfaEnabled ? (
        /* MFA 활성화 상태 */
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              2단계 인증 활성화됨
            </span>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Key className="w-3.5 h-3.5" />
              백업 코드 {backupCodesRemaining}개 남음
            </span>
          </div>

          {showDisableConfirm ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                2단계 인증을 비활성화하면 계정 보안이 약해집니다. 계속하시겠습니까?
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDisable}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <ShieldOff className="w-4 h-4" />
                  {processing ? '처리 중...' : '비활성화 확인'}
                </button>
                <button
                  onClick={() => setShowDisableConfirm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDisableConfirm(true)}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700"
            >
              <ShieldOff className="w-4 h-4" />
              2단계 인증 비활성화
            </button>
          )}
        </div>
      ) : setupData ? (
        /* QR 코드 + 인증 코드 입력 화면 */
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              Google Authenticator 또는 Microsoft Authenticator 앱으로 QR 코드를 스캔하세요.
            </p>
            <div className="inline-flex items-center justify-center p-3 bg-white border border-gray-200 rounded-xl">
              <img src={setupData.qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              QR 코드를 스캔할 수 없는 경우, 아래 키를 직접 입력하세요:
            </p>
            <code className="block text-sm font-mono text-gray-800 bg-white px-3 py-2 rounded border border-gray-200 select-all break-all">
              {setupData.secret}
            </code>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">인증 코드 확인</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6자리 코드 입력"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center tracking-widest focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleVerify}
                disabled={verifyCode.length < 6 || processing}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {processing ? '확인 중...' : '인증 확인'}
              </button>
            </div>
          </div>

          {/* 백업 코드 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              백업 코드 (안전하게 보관하세요)
            </p>
            <p className="text-xs text-yellow-700 mb-3">
              인증 앱에 접근할 수 없을 때 아래 코드로 로그인할 수 있습니다. 각 코드는 한 번만 사용 가능합니다.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {setupData.backupCodes.map((code, i) => (
                <code key={i} className="text-xs bg-white px-2 py-1.5 rounded border border-yellow-200 text-center font-mono text-yellow-900">
                  {code}
                </code>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setSetupData(null); setVerifyCode(''); setMfaMessage(null) }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            취소
          </button>
        </div>
      ) : (
        /* MFA 비활성화 상태 - 설정 시작 버튼 */
        <button
          onClick={handleSetup}
          disabled={processing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Shield className="w-4 h-4" />
          {processing ? '설정 중...' : '2단계 인증 활성화'}
        </button>
      )}
    </div>
  )
}
