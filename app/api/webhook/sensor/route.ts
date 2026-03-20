import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseWebhookPayload } from '@/lib/sensor-adapters'
import type { SensorAdapterType } from '@/lib/sensor-adapters'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''

// POST /api/webhook/sensor - Receive sensor webhook events
export async function POST(request: NextRequest) {
  // Validate webhook secret
  const headerSecret = request.headers.get('x-webhook-secret')
  if (!WEBHOOK_SECRET || headerSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Request body size limit (1MB)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const adminClient = createAdminClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Determine adapter type from query param or header
  const { searchParams } = new URL(request.url)
  const adapterType = (searchParams.get('adapter') || 'tuya') as SensorAdapterType

  try {
    const reading = parseWebhookPayload(adapterType, body)

    // Look up room by sensor device id
    const { data: room } = await adminClient
      .from('rooms')
      .select('id')
      .eq('sensor_device_id', reading.device_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!room) {
      return NextResponse.json(
        { error: `No active room found for device: ${reading.device_id}` },
        { status: 404 }
      )
    }

    // Insert occupancy event
    const { data: event, error } = await adminClient
      .from('occupancy_events')
      .insert({
        room_id: room.id,
        sensor_device_id: reading.device_id,
        is_occupied: reading.is_occupied,
        person_count: reading.person_count,
        raw_payload: reading.raw_payload,
        detected_at: reading.timestamp.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting occupancy event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log
    await adminClient.from('audit_log').insert({
      action: 'sensor_event_received',
      entity_type: 'occupancy_event',
      entity_id: event.id,
      actor: 'webhook',
      details: {
        room_id: room.id,
        device_id: reading.device_id,
        is_occupied: reading.is_occupied,
        adapter_type: adapterType,
      },
    })

    return NextResponse.json({ success: true, event_id: event.id })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 }
    )
  }
}
