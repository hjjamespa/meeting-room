import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkNoshows } from '@/lib/noshow-detection'

const CRON_SECRET = process.env.CRON_SECRET || ''

// GET /api/cron/check-noshows - Run no-show detection
export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  try {
    // Check system settings for grace period and auto-cancel config
    const { data: settings } = await adminClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['noshow_grace_period_minutes', 'noshow_auto_cancel_enabled'])

    let gracePeriodMinutes = 10
    let autoCancelEnabled = true

    if (settings) {
      for (const s of settings) {
        if (s.key === 'noshow_grace_period_minutes' && s.value) {
          gracePeriodMinutes = parseInt(s.value, 10) || 10
        }
        if (s.key === 'noshow_auto_cancel_enabled' && s.value) {
          autoCancelEnabled = s.value === 'true'
        }
      }
    }

    const result = await checkNoshows(adminClient, {
      gracePeriodMinutes,
      autoCancelEnabled,
    })

    return NextResponse.json({
      success: true,
      ...result,
      config: { gracePeriodMinutes, autoCancelEnabled },
    })
  } catch (err) {
    console.error('Check noshows cron error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
