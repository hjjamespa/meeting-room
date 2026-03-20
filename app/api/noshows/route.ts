import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/noshows - List no-show incidents with filters
export async function GET(request: NextRequest) {
  const auth = await requireAuth(['admin', 'viewer'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const { searchParams } = new URL(request.url)

  const roomId = searchParams.get('room_id')
  const organizerEmail = searchParams.get('organizer_email')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = parseInt(searchParams.get('limit') || '100', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  let query = adminClient
    .from('noshow_incidents')
    .select(
      '*, booking:bookings(id, subject, start_time, end_time), room:rooms(id, name, floor)',
      { count: 'exact' }
    )
    .order('detected_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (roomId) {
    query = query.eq('room_id', roomId)
  }

  if (organizerEmail) {
    query = query.eq('organizer_email', organizerEmail)
  }

  if (startDate) {
    query = query.gte('detected_at', `${startDate}T00:00:00+09:00`)
  }

  if (endDate) {
    query = query.lte('detected_at', `${endDate}T23:59:59+09:00`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count })
}
