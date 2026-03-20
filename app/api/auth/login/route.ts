import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { checkAccountLockout, recordLoginFailure, clearLoginFailures, logSecurityEvent } from '@/lib/security-log'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: '이메일과 비밀번호를 입력해주세요.' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const userAgent = request.headers.get('user-agent') || ''

  // C2: Server-side account lockout check BEFORE authentication
  const lockoutStatus = await checkAccountLockout(adminClient, email)
  if (lockoutStatus.locked) {
    return NextResponse.json(
      { error: `계정이 잠겼습니다. ${lockoutStatus.remainingMinutes}분 후에 다시 시도해주세요.` },
      { status: 429 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Record failed login attempt server-side
    const failureResult = await recordLoginFailure(adminClient, email, ipAddress, userAgent)
    if (failureResult.locked) {
      return NextResponse.json(
        { error: `로그인 실패 횟수를 초과하여 계정이 잠겼습니다. ${failureResult.remainingMinutes}분 후에 다시 시도해주세요.` },
        { status: 429 }
      )
    }
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  // Clear failed login attempts on success
  await clearLoginFailures(adminClient, email)
  logSecurityEvent(adminClient, {
    eventType: 'login_success',
    userId: data.user?.id,
    userEmail: email,
    ipAddress,
    userAgent,
  })

  // M2: Don't return session tokens in response body
  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  })
}
