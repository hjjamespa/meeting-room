async function handleResponse(res: Response) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

async function get(url: string) {
  return handleResponse(await fetch(url))
}

async function post(url: string, body?: unknown) {
  return handleResponse(await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }))
}

async function patch(url: string, body?: unknown) {
  return handleResponse(await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }))
}

async function del(url: string) {
  return handleResponse(await fetch(url, { method: 'DELETE' }))
}

export const auth = {
  login: (email: string, password: string) => post('/api/auth/login', { email, password }),
  logout: () => post('/api/auth/logout'),
  getUser: () => get('/api/auth/user'),
}

export const rooms = {
  getAll: () => get('/api/rooms'),
  create: (data: Record<string, unknown>) => post('/api/rooms', data),
  update: (id: string, data: Record<string, unknown>) => patch('/api/rooms', { id, ...data }),
  delete: (id: string) => del(`/api/rooms?id=${id}`),
}

export const bookings = {
  getAll: (params?: { date?: string; room_id?: string; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return get(`/api/bookings${qs}`)
  },
}

export const occupancy = {
  getLatest: () => get('/api/occupancy/latest'),
  getByRoom: (roomId: string) => get(`/api/occupancy?room_id=${roomId}`),
}

export const noshows = {
  getAll: (params?: { start_date?: string; end_date?: string; room_id?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return get(`/api/noshows${qs}`)
  },
}

export const analytics = {
  getUtilization: (params: { start_date: string; end_date: string; room_id?: string }) => {
    const qs = '?' + new URLSearchParams(params as Record<string, string>).toString()
    return get(`/api/analytics/utilization${qs}`)
  },
}

export const settings = {
  getAll: () => get('/api/settings'),
  update: (key: string, value: string) => patch('/api/settings', { [key]: value }),
}
