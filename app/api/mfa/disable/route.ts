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

    const { code } = await request.json()
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: '6자리 인증 코드를 입력해주세요.' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data: mfa } = await adminClient
      .from('mfa_settings')
      .select('mfa_secret, mfa_enabled')
      .eq('user_id', user.id)
      .single()

    if (!mfa?.mfa_enabled || !mfa.mfa_secret) {
      return NextResponse.json({ error: 'MFA가 활성화되어 있지 않습니다.' }, { status: 400 })
    }

    if (!verifySync({ secret: mfa.mfa_secret, token: code }).valid) {
      return NextResponse.json({ error: '인증 코드가 올바르지 않습니다.' }, { status: 400 })
    }

    await adminClient.from('mfa_settings').update({
      mfa_enabled: false,
      mfa_secret: null,
      mfa_confirmed_at: null,
      backup_codes: null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)

    logSecurityEvent(adminClient, {
      eventType: 'mfa_disabled',
      userId: user.id,
      userEmail: user.email,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    })

    return NextResponse.json({ message: 'MFA가 비활성화되었습니다.' })
  } catch {
    return NextResponse.json({ error: 'MFA 비활성화 중 오류' }, { status: 500 })
  }
}
