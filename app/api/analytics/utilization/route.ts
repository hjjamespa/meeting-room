import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/analytics/utilization - Utilization stats by room/date range
export async function GET(request: NextRequest) {
  const auth = await requireAuth(['admin', 'viewer'])
  if (!auth.ok) return auth.response

  const { adminClient } = auth.data
  const { searchParams } = new URL(request.url)

  const roomId = searchParams.get('room_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date are required (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  let query = adminClient
    .from('daily_room_stats')
    .select('*, room:rooms(id, name, floor, building, capacity)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (roomId) {
    query = query.eq('room_id', roomId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate summary
  const stats = data || []
  const summary = {
    total_days: new Set(stats.map((s) => s.date)).size,
    total_bookings: stats.reduce((sum, s) => sum + (s.total_bookings || 0), 0),
    total_noshows: stats.reduce((sum, s) => sum + (s.noshow_bookings || 0), 0),
    avg_utilization:
      stats.length > 0
        ? stats.reduce((sum, s) => sum + (s.utilization_rate || 0), 0) / stats.length
        : 0,
    avg_booking_rate:
      stats.length > 0
        ? stats.reduce((sum, s) => sum + (s.booking_rate || 0), 0) / stats.length
        : 0,
    avg_ghost_rate:
      stats.length > 0
        ? stats.reduce((sum, s) => sum + (s.ghost_booking_rate || 0), 0) / stats.length
        : 0,
  }

  return NextResponse.json({ data: stats, summary })
}
