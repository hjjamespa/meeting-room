import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

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

  return NextResponse.json(data)
}

// PATCH /api/settings - Update system settings (admin only)
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const body = await request.json()

  // body should be { key: value, key2: value2, ... }
  const entries = Object.entries(body) as [string, string][]

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No settings provided' }, { status: 400 })
  }

  const results: Record<string, boolean> = {}

  for (const [key, value] of entries) {
    const { error } = await adminClient
      .from('system_settings')
      .upsert(
        { key, value: String(value), updated_at: new Date().toISOString() },
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
