import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isStrongPassword } from '@/lib/validation'

export async function POST(request: Request) {
  const { currentPassword, newPassword } = await request.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' }, { status: 400 })
  }

  const passwordCheck = isStrongPassword(newPassword)
  if (!passwordCheck.valid) {
    return NextResponse.json({ error: passwordCheck.message }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // 현재 비밀번호 확인
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
