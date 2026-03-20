import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET() {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data

  try {
    const [{ data: ips }, { data: setting }] = await Promise.all([
      adminClient.from('ip_whitelist').select('id, ip_address, description, created_at').order('created_at'),
      adminClient.from('system_settings').select('value').eq('key', 'ip_restriction_enabled').single(),
    ])

    return NextResponse.json({ enabled: setting?.value === 'true', ips: ips || [] })
  } catch {
    return NextResponse.json({ error: 'IP 목록 조회 실패' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const { ip_address, description } = await request.json()

  if (!ip_address || typeof ip_address !== 'string') {
    return NextResponse.json({ error: 'IP 주소를 입력해주세요.' }, { status: 400 })
  }

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
  if (!ipv4Regex.test(ip_address.trim())) {
    return NextResponse.json({ error: '올바른 IPv4 형식이 아닙니다. (예: 192.168.0.1 또는 192.168.0.0/24)' }, { status: 400 })
  }

  const { data: existing } = await adminClient.from('ip_whitelist').select('id').eq('ip_address', ip_address.trim()).single()
  if (existing) {
    return NextResponse.json({ error: '이미 등록된 IP 주소입니다.' }, { status: 400 })
  }

  const { error } = await adminClient.from('ip_whitelist').insert({
    ip_address: ip_address.trim(),
    description: description?.trim() || null,
    created_by: auth.data.user.id,
  })
  if (error) {
    return NextResponse.json({ error: 'IP 등록 실패' }, { status: 500 })
  }

  await adminClient.from('audit_log').insert({
    action: 'ip_whitelist_added',
    entity_type: 'ip_whitelist',
    actor: auth.data.user.email || 'admin',
    details: { ip_address: ip_address.trim(), description: description?.trim() || null },
  })

  return NextResponse.json({ message: 'IP가 등록되었습니다.' })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const { enabled } = await request.json()

  await adminClient.from('system_settings').upsert(
    { key: 'ip_restriction_enabled', value: String(enabled), updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )

  await adminClient.from('audit_log').insert({
    action: 'ip_restriction_toggled',
    entity_type: 'system_settings',
    actor: auth.data.user.email || 'admin',
    details: { enabled },
  })

  return NextResponse.json({ message: `IP 접근제한이 ${enabled ? '활성화' : '비활성화'}되었습니다.` })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'ID 필요' }, { status: 400 })
  }

  // Get IP before deleting for audit log
  const { data: ipRecord } = await adminClient.from('ip_whitelist').select('ip_address').eq('id', id).single()

  await adminClient.from('ip_whitelist').delete().eq('id', id)

  await adminClient.from('audit_log').insert({
    action: 'ip_whitelist_removed',
    entity_type: 'ip_whitelist',
    actor: auth.data.user.email || 'admin',
    details: { id, ip_address: ipRecord?.ip_address },
  })

  return NextResponse.json({ message: 'IP가 삭제되었습니다.' })
}
