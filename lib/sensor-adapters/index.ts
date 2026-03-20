import type { OccupancyReading } from '@/types/meeting-room'
import {
  parseWebhookPayload as tuyaParseWebhook,
  getDeviceStatus as tuyaGetDeviceStatus,
  type TuyaDeviceStatus,
} from './tuya'

// ----- Adapter Types -----

export type SensorAdapterType = 'tuya' | 'manual'

interface SensorStatus {
  is_occupied: boolean
  person_count: number | null
}

// ----- Registry -----

/**
 * Parse an incoming webhook payload based on sensor adapter type
 */
export function parseWebhookPayload(
  adapterType: SensorAdapterType,
  body: Record<string, unknown>
): OccupancyReading {
  switch (adapterType) {
    case 'tuya':
      return tuyaParseWebhook(body)

    case 'manual':
      // Manual adapter: payload is already in normalized form
      return {
        device_id: String(body.device_id || ''),
        is_occupied: Boolean(body.is_occupied),
        person_count:
          typeof body.person_count === 'number' ? body.person_count : null,
        raw_payload: body,
        timestamp: body.timestamp ? new Date(String(body.timestamp)) : new Date(),
      }

    default:
      throw new Error(`Unknown sensor adapter type: ${adapterType}`)
  }
}

/**
 * Poll sensor status for a specific device
 */
export async function pollSensorStatus(
  adapterType: SensorAdapterType,
  deviceId: string
): Promise<SensorStatus> {
  switch (adapterType) {
    case 'tuya': {
      const status: TuyaDeviceStatus = await tuyaGetDeviceStatus(deviceId)
      return {
        is_occupied: status.is_occupied,
        person_count: status.person_count,
      }
    }

    case 'manual':
      // Manual sensors cannot be polled
      throw new Error('Manual sensors do not support polling')

    default:
      throw new Error(`Unknown sensor adapter type: ${adapterType}`)
  }
}
