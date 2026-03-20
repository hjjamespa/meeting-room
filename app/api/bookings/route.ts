import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/bookings - List bookings with filters
export async function GET(request: NextRequest) {
  const auth = await requireAuth(['admin', 'viewer'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const { searchParams } = new URL(request.url)

  const roomId = searchParams.get('room_id')
  const date = searchParams.get('date')
  const status = searchParams.get('status')
  const organizerEmail = searchParams.get('organizer_email')
  const limit = parseInt(searchParams.get('limit') || '100', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  let query = adminClient
    .from('bookings')
    .select('*, room:rooms(id, name, floor, building)', { count: 'exact' })
    .order('start_time', { ascending: false })
    .range(offset, offset + limit - 1)

  if (roomId) {
    query = query.eq('room_id', roomId)
  }

  if (date) {
    // Filter bookings for a specific date (KST)
    const dayStart = `${date}T00:00:00+09:00`
    const dayEnd = `${date}T23:59:59+09:00`
    query = query.gte('start_time', dayStart).lte('start_time', dayEnd)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (organizerEmail) {
    query = query.eq('organizer_email', organizerEmail)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Viewer role: mask subject field
  const isViewer = auth.data.profile.role === 'viewer'
  const maskedData = isViewer
    ? (data || []).map((b: Record<string, unknown>) => ({
        ...b,
        subject: b.subject
          ? String(b.subject).substring(0, 2) + '***'
          : b.subject,
      }))
    : data

  return NextResponse.json({ data: maskedData, total: count })
}
