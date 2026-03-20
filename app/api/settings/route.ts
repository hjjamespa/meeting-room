import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption'

// 암호화 대상 키 목록
const ENCRYPTED_KEYS = ['smtp_pass', 'graph_client_secret', 'tuya_client_secret', 'webhook_secret']

// GET /api/settings - Get system settings
export async function GET() {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data

  const { data, error } = await adminClient
    .from('system_settings')
    .select('*')
    .order('key')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 암호화된 키는 마스킹해서 반환
  const settings = (data || []).map((s) => {
    if (ENCRYPTED_KEYS.includes(s.key) && s.value) {
      try {
        const decrypted = decrypt(s.value)
        return { ...s, value: maskApiKey(decrypted), is_set: true }
      } catch {
        // 암호화되지 않은 평문이 저장된 경우 (마이그레이션 전)
        return { ...s, value: maskApiKey(s.value), is_set: true }
      }
    }
    return { ...s, is_set: !!s.value }
  })

  return NextResponse.json(settings)
}

// PATCH /api/settings - Update system settings (admin only)
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const body = await request.json()

  // Whitelist of allowed setting keys
  const ALLOWED_KEYS = [
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from',
    'graph_client_id', 'graph_client_secret', 'graph_tenant_id',
    'tuya_client_id', 'tuya_client_secret', 'tuya_device_ids',
    'noshow_grace_period_minutes', 'noshow_auto_cancel_enabled',
    'ip_restriction_enabled', 'sync_interval_minutes',
    'notification_enabled', 'notification_email', 'webhook_secret',
  ]

  // body should be { key: value, key2: value2, ... }
  const allEntries = Object.entries(body) as [string, string][]
  const entries = allEntries.filter(([key]) => ALLOWED_KEYS.includes(key))

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 })
  }

  const results: Record<string, boolean> = {}

  for (const [key, value] of entries) {
    // 암호화 대상이면 암호화해서 저장
    const storedValue = ENCRYPTED_KEYS.includes(key) ? encrypt(String(value).trim()) : String(value).trim()

    const { error } = await adminClient
      .from('system_settings')
      .upsert(
        { key, value: storedValue, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

    results[key] = !error
    if (error) {
      console.error(`Error updating setting ${key}:`, error)
    }
  }

  // Audit log
  await adminClient.from('audit_log').insert({
    action: 'settings_updated',
    entity_type: 'system_settings',
    actor: auth.data.user.email || 'admin',
    details: { keys: Object.keys(body) },
  })

  return NextResponse.json({ success: true, results })
}
