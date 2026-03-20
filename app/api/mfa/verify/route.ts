import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySync } from 'otplib'
import { logSecurityEvent } from '@/lib/security-log'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const { code, isSetup } = await request.json()

    if (!code || typeof code !== 'string' || code.length < 6) {
      return NextResponse.json({ error: '6자리 인증 코드를 입력해주세요.' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data: mfa } = await adminClient
      .from('mfa_settings')
      .select('mfa_secret, mfa_enabled, backup_codes')
      .eq('user_id', user.id)
      .single()

    if (!mfa?.mfa_secret) {
      return NextResponse.json({ error: 'MFA 설정을 먼저 진행해주세요.' }, { status: 400 })
    }

    const isValidTotp = verifySync({ secret: mfa.mfa_secret, token: code }).valid
    let isValidBackup = false
    let updatedBackupCodes = mfa.backup_codes || []

    if (!isValidTotp && mfa.backup_codes?.includes(code)) {
      isValidBackup = true
      updatedBackupCodes = mfa.backup_codes.filter((c: string) => c !== code)
    }

    if (!isValidTotp && !isValidBackup) {
      logSecurityEvent(adminClient, {
        eventType: 'mfa_verify_failed',
        userId: user.id,
        userEmail: user.email,
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: '인증 코드가 올바르지 않습니다.' }, { status: 400 })
    }

    logSecurityEvent(adminClient, {
      eventType: 'mfa_verify_success',
      userId: user.id,
      userEmail: user.email,
      ipAddress,
      userAgent,
      details: { method: isValidBackup ? 'backup_code' : 'totp', isSetup: !!isSetup },
    })

    if (isSetup && !mfa.mfa_enabled) {
      await adminClient.from('mfa_settings').update({
        mfa_enabled: true,
        mfa_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id)
      return NextResponse.json({ verified: true, message: 'MFA가 활성화되었습니다.' })
    }

    if (isValidBackup) {
      await adminClient.from('mfa_settings').update({
        backup_codes: updatedBackupCodes,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id)
    }

    return NextResponse.json({ verified: true })
  } catch {
    return NextResponse.json({ error: 'MFA 인증 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
