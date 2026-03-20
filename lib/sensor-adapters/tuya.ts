import crypto from 'crypto'
import type { OccupancyReading } from '@/types/meeting-room'

const TUYA_BASE_URL = process.env.TUYA_API_BASE_URL || 'https://openapi.tuyaus.com'
const CLIENT_ID = process.env.TUYA_CLIENT_ID || ''
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || ''

// ----- Token Management -----

interface TuyaToken {
  access_token: string
  expire_time: number
  refresh_token: string
}

let cachedToken: TuyaToken | null = null
let tokenExpiresAt = 0

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken.access_token
  }

  const timestamp = now.toString()
  const signStr = CLIENT_ID + timestamp
  const sign = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(signStr)
    .digest('hex')
    .toUpperCase()

  const res = await fetch(`${TUYA_BASE_URL}/v1.0/token?grant_type=1`, {
    method: 'GET',
    headers: {
      client_id: CLIENT_ID,
      sign,
      t: timestamp,
      sign_method: 'HMAC-SHA256',
    },
  })

  const json = await res.json()
  if (!json.success) {
    throw new Error(`Tuya token error: ${json.msg}`)
  }

  cachedToken = json.result as TuyaToken
  tokenExpiresAt = now + cachedToken.expire_time * 1000
  return cachedToken.access_token
}

// ----- Signed Request -----

async function signedRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  const token = await getAccessToken()
  const timestamp = Date.now().toString()
  const bodyStr = body ? JSON.stringify(body) : ''

  // Tuya API v2.0 signing: client_id + token + t + stringToSign
  const contentHash = crypto.createHash('sha256').update(bodyStr).digest('hex')
  const stringToSign = [method.toUpperCase(), contentHash, '', path].join('\n')
  const signStr = CLIENT_ID + token + timestamp + stringToSign
  const sign = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(signStr)
    .digest('hex')
    .toUpperCase()

  const headers: Record<string, string> = {
    client_id: CLIENT_ID,
    access_token: token,
    sign,
    t: timestamp,
    sign_method: 'HMAC-SHA256',
    'Content-Type': 'application/json',
  }

  const res = await fetch(`${TUYA_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json()
  if (!json.success) {
    throw new Error(`Tuya API error: ${json.msg} (code: ${json.code})`)
  }
  return json.result
}

// ----- Public API -----

export interface TuyaDeviceStatus {
  is_occupied: boolean
  person_count: number | null
}

/**
 * Poll a Tuya human presence sensor for current status
 */
export async function getDeviceStatus(deviceId: string): Promise<TuyaDeviceStatus> {
  const result = (await signedRequest('GET', `/v1.0/devices/${deviceId}/status`)) as Array<{
    code: string
    value: unknown
  }>

  let isOccupied = false
  let personCount: number | null = null

  for (const dp of result) {
    // Common Tuya human presence sensor data points
    if (dp.code === 'presence_state' || dp.code === 'pir') {
      isOccupied = dp.value === 'presence' || dp.value === true || dp.value === '1'
    }
    if (dp.code === 'person_count' || dp.code === 'people_num') {
      personCount = typeof dp.value === 'number' ? dp.value : parseInt(String(dp.value), 10) || null
      if (personCount !== null && personCount > 0) {
        isOccupied = true
      }
    }
  }

  return { is_occupied: isOccupied, person_count: personCount }
}

/**
 * Parse incoming Tuya webhook payload into a normalized OccupancyReading
 */
export function parseWebhookPayload(body: Record<string, unknown>): OccupancyReading {
  const data = body as {
    devId?: string
    status?: Array<{ code: string; value: unknown }>
    t?: number
  }

  const deviceId = data.devId || ''
  const statuses = data.status || []

  let isOccupied = false
  let personCount: number | null = null

  for (const dp of statuses) {
    if (dp.code === 'presence_state' || dp.code === 'pir') {
      isOccupied = dp.value === 'presence' || dp.value === true || dp.value === '1'
    }
    if (dp.code === 'person_count' || dp.code === 'people_num') {
      personCount = typeof dp.value === 'number' ? dp.value : parseInt(String(dp.value), 10) || null
      if (personCount !== null && personCount > 0) {
        isOccupied = true
      }
    }
  }

  return {
    device_id: deviceId,
    is_occupied: isOccupied,
    person_count: personCount,
    raw_payload: body,
    timestamp: data.t ? new Date(data.t) : new Date(),
  }
}
