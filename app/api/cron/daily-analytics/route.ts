import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateDailyStats } from '@/lib/analytics'

const CRON_SECRET = process.env.CRON_SECRET || ''

// GET /api/cron/daily-analytics - Nightly aggregation of room statistics
export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  try {
    // Calculate stats for yesterday (KST)
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const yesterday = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000)
    const dateStr = yesterday.toISOString().split('T')[0]

    const result = await calculateDailyStats(adminClient, dateStr)

    // Audit log
    await adminClient.from('audit_log').insert({
      action: 'daily_analytics_calculated',
      entity_type: 'daily_room_stats',
      actor: 'cron',
      details: {
        date: dateStr,
        rooms_processed: result.rooms_processed,
      },
    })

    return NextResponse.json({
      success: true,
      date: dateStr,
      ...result,
    })
  } catch (err) {
    console.error('Daily analytics cron error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
