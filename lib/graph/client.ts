// =============================================================
// Microsoft Graph API Client - Client Credentials Flow
// =============================================================

const TENANT_ID = process.env.AZURE_TENANT_ID || ''
const CLIENT_ID = process.env.AZURE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || ''
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`

// ----- Token Cache -----

let cachedAccessToken: string | null = null
let tokenExpiresAt = 0

/**
 * Get an access token using client_credentials flow with caching
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && now < tokenExpiresAt - 60_000) {
    return cachedAccessToken
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get Graph access token: ${res.status} ${text}`)
  }

  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedAccessToken = json.access_token
  tokenExpiresAt = now + json.expires_in * 1000

  return cachedAccessToken
}

// ----- Graph Request Helper -----

export async function graphRequest<T = unknown>(
  path: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options
  const token = await getAccessToken()

  const res = await fetch(`${GRAPH_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  // 204 No Content (e.g. cancel event)
  if (res.status === 204) {
    return undefined as T
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph API error: ${res.status} ${text}`)
  }

  return (await res.json()) as T
}
