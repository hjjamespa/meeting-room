import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ mfaRequired: false })

    const adminClient = createAdminClient()
    const { data: mfa } = await adminClient
      .from('mfa_settings')
      .select('mfa_enabled')
      .eq('user_id', userId)
      .single()

    return NextResponse.json({ mfaRequired: mfa?.mfa_enabled ?? false })
  } catch {
    return NextResponse.json({ mfaRequired: false })
  }
}
