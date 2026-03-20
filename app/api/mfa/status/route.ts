import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: mfa } = await adminClient
      .from('mfa_settings')
      .select('mfa_enabled, mfa_confirmed_at, backup_codes')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      mfaEnabled: mfa?.mfa_enabled ?? false,
      confirmedAt: mfa?.mfa_confirmed_at ?? null,
      backupCodesRemaining: mfa?.backup_codes?.length ?? 0,
    })
  } catch {
    return NextResponse.json({ error: 'MFA 상태 조회 중 오류' }, { status: 500 })
  }
}
