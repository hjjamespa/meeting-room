import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { isValidEmail, isValidString, isValidUUID, isStrongPassword, sanitizeInput } from '@/lib/validation'

export async function GET() {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response
  const { adminClient } = auth.data

  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Users GET error:', error)
    return NextResponse.json({ error: '사용자 목록 조회에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response
  const { adminClient } = auth.data

  const body = await request.json()
  const { action } = body

  if (action === 'create') {
    if (!isValidEmail(body.email) || !isValidString(body.name, 50)) {
      return NextResponse.json({ error: '유효한 이메일과 이름이 필요합니다.' }, { status: 400 })
    }

    const passwordCheck = isStrongPassword(body.password || '')
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.message }, { status: 400 })
    }

    const role = body.role === 'admin' ? 'admin' : 'viewer'

    // Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    })
    if (authError) {
      console.error('Users create auth error:', authError)
      return NextResponse.json({ error: '사용자 생성에 실패했습니다.' }, { status: 500 })
    }

    // profiles에 추가
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authData.user.id,
      email: body.email,
      name: sanitizeInput(body.name),
      role,
    })
    if (profileError) {
      console.error('Users create profile error:', profileError)
      return NextResponse.json({ error: '프로필 생성에 실패했습니다.' }, { status: 500 })
    }

    await adminClient.from('audit_log').insert({
      action: 'user_created',
      entity_type: 'user',
      entity_id: authData.user.id,
      actor: auth.data.user.email || 'admin',
      details: { email: body.email, name: sanitizeInput(body.name), role },
    })

    return NextResponse.json({ success: true, userId: authData.user.id }, { status: 201 })
  }

  if (action === 'update_role') {
    if (!isValidUUID(body.userId)) {
      return NextResponse.json({ error: '유효하지 않은 사용자 ID입니다.' }, { status: 400 })
    }
    // L4: Prevent admin from changing their own role
    if (body.userId === auth.data.user.id) {
      return NextResponse.json({ error: '자신의 역할은 변경할 수 없습니다.' }, { status: 400 })
    }
    const role = body.role === 'admin' ? 'admin' : 'viewer'
    const { error } = await adminClient.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', body.userId)
    if (error) {
      console.error('Users update_role error:', error)
      return NextResponse.json({ error: '역할 변경에 실패했습니다.' }, { status: 500 })
    }

    await adminClient.from('audit_log').insert({
      action: 'user_role_changed',
      entity_type: 'user',
      entity_id: body.userId,
      actor: auth.data.user.email || 'admin',
      details: { new_role: role },
    })

    return NextResponse.json({ success: true })
  }

  if (action === 'reset_password') {
    if (!isValidUUID(body.userId)) {
      return NextResponse.json({ error: '유효하지 않은 사용자 ID입니다.' }, { status: 400 })
    }
    const passwordCheck = isStrongPassword(body.newPassword || '')
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.message }, { status: 400 })
    }
    const { error } = await adminClient.auth.admin.updateUserById(body.userId, { password: body.newPassword })
    if (error) {
      console.error('Users reset_password error:', error)
      return NextResponse.json({ error: '비밀번호 변경에 실패했습니다.' }, { status: 500 })
    }

    await adminClient.from('audit_log').insert({
      action: 'user_password_reset',
      entity_type: 'user',
      entity_id: body.userId,
      actor: auth.data.user.email || 'admin',
    })

    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    if (!isValidUUID(body.userId)) {
      return NextResponse.json({ error: '유효하지 않은 사용자 ID입니다.' }, { status: 400 })
    }
    // L4: Prevent admin from deleting themselves
    if (body.userId === auth.data.user.id) {
      return NextResponse.json({ error: '자신의 계정은 삭제할 수 없습니다.' }, { status: 400 })
    }
    // Get user info before deleting for audit log
    const { data: deletedProfile } = await adminClient.from('profiles').select('email, name').eq('id', body.userId).single()

    await adminClient.from('profiles').delete().eq('id', body.userId)
    const { error } = await adminClient.auth.admin.deleteUser(body.userId)
    if (error) {
      console.error('Users delete error:', error)
      return NextResponse.json({ error: '사용자 삭제에 실패했습니다.' }, { status: 500 })
    }

    await adminClient.from('audit_log').insert({
      action: 'user_deleted',
      entity_type: 'user',
      entity_id: body.userId,
      actor: auth.data.user.email || 'admin',
      details: { deleted_email: deletedProfile?.email, deleted_name: deletedProfile?.name },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: '알 수 없는 액션입니다.' }, { status: 400 })
}
