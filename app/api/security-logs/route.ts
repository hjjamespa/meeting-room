import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(['admin'])
  if (!auth.ok) return auth.response
  const { adminClient } = auth.data

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100') || 100, 500)
  const offset = Math.max(parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0, 0)

  const { data, error } = await adminClient
    .from('security_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
