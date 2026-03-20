import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSecret, generateURI, verify as otplibVerify } from 'otplib'
import QRCode from 'qrcode'
import { logSecurityEvent } from '@/lib/security-log'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: existing } = await adminClient
      .from('mfa_settings')
      .select('mfa_enabled')
      .eq('user_id', user.id)
      .single()

    if (existing?.mfa_enabled) {
      return NextResponse.json({ error: '이미 MFA가 활성화되어 있습니다.' }, { status: 400 })
    }

    const secret = generateSecret()
    const otpauthUrl = generateURI({ issuer: '회의실관리', label: user.email || user.id, secret })
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

    const backupCodes: string[] = []
    for (let i = 0; i < 8; i++) {
      backupCodes.push(
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        Math.random().toString(36).substring(2, 6).toUpperCase()
      )
    }

    await adminClient.from('mfa_settings').upsert({
      user_id: user.id,
      mfa_secret: secret,
      mfa_enabled: false,
      backup_codes: backupCodes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    logSecurityEvent(adminClient, {
      eventType: 'mfa_setup',
      userId: user.id,
      userEmail: user.email,
    })

    return NextResponse.json({ qrCode: qrCodeDataUrl, secret, backupCodes })
  } catch {
    return NextResponse.json({ error: 'MFA 설정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
