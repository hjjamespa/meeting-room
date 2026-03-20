import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AllowedRole = 'admin' | 'viewer'

interface AuthResult {
  user: { id: string; email?: string }
  profile: { role: string; email: string | null; name: string | null }
  adminClient: SupabaseClient
}

type AuthResponse =
  | { ok: true; data: AuthResult }
  | { ok: false; response: NextResponse }

export async function requireAuth(
  allowedRoles: AllowedRole[] = ['admin']
): Promise<AuthResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }),
    }
  }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, email, name')
    .eq('id', user.id)
    .single()

  if (!profile || !allowedRoles.includes(profile.role as AllowedRole)) {
    return {
      ok: false,
      response: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }),
    }
  }

  return {
    ok: true,
    data: { user: { id: user.id, email: user.email }, profile, adminClient },
  }
}

export function jsonWithCache(data: unknown, options?: { maxAge?: number; status?: number }) {
  const { maxAge = 30, status = 200 } = options || {}
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': `private, max-age=${maxAge}, stale-while-revalidate=60` },
  })
}
