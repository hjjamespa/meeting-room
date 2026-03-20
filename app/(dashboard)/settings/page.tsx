'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'
import {
  Settings,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  Shield,
  Mail,
  Cloud,
  Wifi,
  Clock,
  Copy,
  RotateCw,
} from 'lucide-react'

interface SettingValue {
  key: string
  value: string
  saved: boolean
  saving: boolean
}

export default function SettingsPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  // Microsoft Graph
  const [graphTenantId, setGraphTenantId] = useState('')
  const [graphClientId, setGraphClientId] = useState('')
  const [graphClientSecret, setGraphClientSecret] = useState('')
  const [graphSaving, setGraphSaving] = useState(false)
  const [graphSaved, setGraphSaved] = useState(false)

  // Tuya
  const [tuyaClientId, setTuyaClientId] = useState('')
  const [tuyaClientSecret, setTuyaClientSecret] = useState('')
  const [tuyaSaving, setTuyaSaving] = useState(false)
  const [tuyaSaved, setTuyaSaved] = useState(false)

  // No-show
  const [gracePeriod, setGracePeriod] = useState('10')
  const [autoCancelEnabled, setAutoCancelEnabled] = useState(true)
  const [noshowSaving, setNoshowSaving] = useState(false)
  const [noshowSaved, setNoshowSaved] = useState(false)

  // Email (Gmail SMTP)
  const [smtpEmail, setSmtpEmail] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)

  // Webhook
  const [webhookSecret, setWebhookSecret] = useState('')
  const [webhookCopied, setWebhookCopied] = useState(false)

  const isAdmin = user?.role === 'admin'

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const settings = await res.json()
        const list = Array.isArray(settings) ? settings : []
        const get = (key: string) => list.find((s: { key: string; value: string }) => s.key === key)?.value || ''

        setGraphTenantId(get('graph_tenant_id'))
        setGraphClientId(get('graph_client_id'))
        setGraphClientSecret(get('graph_client_secret'))
        setTuyaClientId(get('tuya_client_id'))
        setTuyaClientSecret(get('tuya_client_secret'))
        setGracePeriod(get('noshow_grace_period_minutes') || '10')
        setAutoCancelEnabled(get('noshow_auto_cancel_enabled') !== 'false')
        setSmtpEmail(get('smtp_email'))
        setSmtpPassword(get('smtp_password'))
        setWebhookSecret(get('webhook_secret'))
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const saveSetting = async (key: string, value: string) => {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  }

  const handleSaveGraph = async () => {
    setGraphSaving(true)
    setGraphSaved(false)
    try {
      await saveSetting('graph_tenant_id', graphTenantId)
      await saveSetting('graph_client_id', graphClientId)
      await saveSetting('graph_client_secret', graphClientSecret)
      setGraphSaved(true)
      setTimeout(() => setGraphSaved(false), 3000)
    } catch (err) { console.error(err) }
    setGraphSaving(false)
  }

  const handleSaveTuya = async () => {
    setTuyaSaving(true)
    setTuyaSaved(false)
    try {
      await saveSetting('tuya_client_id', tuyaClientId)
      await saveSetting('tuya_client_secret', tuyaClientSecret)
      setTuyaSaved(true)
      setTimeout(() => setTuyaSaved(false), 3000)
    } catch (err) { console.error(err) }
    setTuyaSaving(false)
  }

  const handleSaveNoshow = async () => {
    setNoshowSaving(true)
    setNoshowSaved(false)
    try {
      await saveSetting('noshow_grace_period_minutes', gracePeriod)
      await saveSetting('noshow_auto_cancel_enabled', String(autoCancelEnabled))
      setNoshowSaved(true)
      setTimeout(() => setNoshowSaved(false), 3000)
    } catch (err) { console.error(err) }
    setNoshowSaving(false)
  }

  const handleSaveEmail = async () => {
    setEmailSaving(true)
    setEmailSaved(false)
    try {
      await saveSetting('smtp_email', smtpEmail)
      await saveSetting('smtp_password', smtpPassword)
      setEmailSaved(true)
      setTimeout(() => setEmailSaved(false), 3000)
    } catch (err) { console.error(err) }
    setEmailSaving(false)
  }

  const handleRegenerateWebhook = async () => {
    const newSecret = crypto.randomUUID()
    try {
      await saveSetting('webhook_secret', newSecret)
      setWebhookSecret(newSecret)
    } catch (err) { console.error(err) }
  }

  const copyWebhookSecret = () => {
    navigator.clipboard.writeText(webhookSecret)
    setWebhookCopied(true)
    setTimeout(() => setWebhookCopied(false), 2000)
  }

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (!isAdmin) {
    return <div className="text-center py-20 text-gray-500">관리자 권한이 필요합니다.</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-7 h-7 text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Microsoft Graph */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            Microsoft Graph API
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
              <input type="text" value={graphTenantId} onChange={(e) => setGraphTenantId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input type="text" value={graphClientId} onChange={(e) => setGraphClientId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
              <div className="relative">
                <input type={showSecrets['graph'] ? 'text' : 'password'} value={graphClientSecret} onChange={(e) => setGraphClientSecret(e.target.value)} className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => toggleSecret('graph')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                  {showSecrets['graph'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">암호화되어 저장됩니다.</p>
            </div>
            <button onClick={handleSaveGraph} disabled={graphSaving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {graphSaving ? '저장 중...' : graphSaved ? '저장 완료!' : '저장'}
            </button>
          </div>
        </div>

        {/* Tuya API */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-green-500" />
            Tuya API
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input type="text" value={tuyaClientId} onChange={(e) => setTuyaClientId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
              <div className="relative">
                <input type={showSecrets['tuya'] ? 'text' : 'password'} value={tuyaClientSecret} onChange={(e) => setTuyaClientSecret(e.target.value)} className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => toggleSecret('tuya')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                  {showSecrets['tuya'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">암호화되어 저장됩니다.</p>
            </div>
            <button onClick={handleSaveTuya} disabled={tuyaSaving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {tuyaSaving ? '저장 중...' : tuyaSaved ? '저장 완료!' : '저장'}
            </button>
          </div>
        </div>

        {/* No-show Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            No-show 설정
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유예 시간 (분)</label>
              <input type="number" min={1} max={60} value={gracePeriod} onChange={(e) => setGracePeriod(e.target.value)} className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">예약 시작 후 이 시간 내에 점유가 감지되지 않으면 No-show로 처리됩니다.</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">자동 취소</label>
              <button
                type="button"
                onClick={() => setAutoCancelEnabled(!autoCancelEnabled)}
                className={`relative w-10 h-5 rounded-full transition ${autoCancelEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoCancelEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-gray-500">{autoCancelEnabled ? '활성' : '비활성'}</span>
            </div>
            <button onClick={handleSaveNoshow} disabled={noshowSaving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {noshowSaving ? '저장 중...' : noshowSaved ? '저장 완료!' : '저장'}
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-red-500" />
            이메일 설정 (Gmail SMTP)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 이메일</label>
              <input type="email" value={smtpEmail} onChange={(e) => setSmtpEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="example@gmail.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">앱 비밀번호</label>
              <div className="relative">
                <input type={showSecrets['smtp'] ? 'text' : 'password'} value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Google 앱 비밀번호" />
                <button onClick={() => toggleSecret('smtp')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                  {showSecrets['smtp'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">암호화되어 저장됩니다.</p>
            </div>
            <button onClick={handleSaveEmail} disabled={emailSaving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {emailSaving ? '저장 중...' : emailSaved ? '저장 완료!' : '저장'}
            </button>
          </div>
        </div>

        {/* Webhook Secret */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            Webhook Secret
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookSecret || '(생성되지 않음)'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-mono text-xs"
              />
              <button onClick={copyWebhookSecret} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" title="복사">
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {webhookCopied && <p className="text-xs text-green-600">클립보드에 복사되었습니다.</p>}
            <button onClick={handleRegenerateWebhook} className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              <RotateCw className="w-4 h-4" />
              새로 생성
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
