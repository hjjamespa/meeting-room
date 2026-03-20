interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL = 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetTime) rateLimitMap.delete(key)
  })
  if (rateLimitMap.size > 10000) {
    const entries = Array.from(rateLimitMap.entries())
    entries.sort((a, b) => a[1].resetTime - b[1].resetTime)
    entries.slice(0, entries.length - 5000).forEach(([key]) => rateLimitMap.delete(key))
  }
}

interface RateLimitConfig {
  limit: number
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup()
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowSeconds * 1000 })
    return { allowed: true, remaining: config.limit - 1, resetIn: config.windowSeconds }
  }

  entry.count++
  const resetIn = Math.ceil((entry.resetTime - now) / 1000)
  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetIn }
  }
  return { allowed: true, remaining: config.limit - entry.count, resetIn }
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  '/login': { limit: 10, windowSeconds: 60 },
  '/api/auth/login': { limit: 5, windowSeconds: 60 },
  '/api/auth': { limit: 10, windowSeconds: 60 },
  '/api/users': { limit: 20, windowSeconds: 60 },
  '/api/rooms': { limit: 30, windowSeconds: 60 },
  '/api/reservations': { limit: 60, windowSeconds: 60 },
  '/api/webhook': { limit: 120, windowSeconds: 60 },
  '/api/settings': { limit: 20, windowSeconds: 60 },
  '/api/ip-restriction': { limit: 20, windowSeconds: 60 },
  '/api': { limit: 60, windowSeconds: 60 },
}

export function getConfigForPath(pathname: string): RateLimitConfig | null {
  if (pathname.startsWith('/api/webhook')) return RATE_LIMIT_CONFIGS['/api/webhook']
  if (pathname === '/api/auth/login') return RATE_LIMIT_CONFIGS['/api/auth/login']
  if (pathname.startsWith('/api/auth')) return RATE_LIMIT_CONFIGS['/api/auth']
  if (pathname.startsWith('/api/reservations')) return RATE_LIMIT_CONFIGS['/api/reservations']
  if (pathname.startsWith('/api/rooms')) return RATE_LIMIT_CONFIGS['/api/rooms']
  if (pathname.startsWith('/api/users')) return RATE_LIMIT_CONFIGS['/api/users']
  if (pathname.startsWith('/api/settings')) return RATE_LIMIT_CONFIGS['/api/settings']
  if (pathname.startsWith('/api/ip-restriction')) return RATE_LIMIT_CONFIGS['/api/ip-restriction']
  if (pathname.startsWith('/api/')) return RATE_LIMIT_CONFIGS['/api']
  if (pathname === '/login') return RATE_LIMIT_CONFIGS['/login']
  return null
}
