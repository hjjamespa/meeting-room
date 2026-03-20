import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, getConfigForPath } from '@/lib/rate-limit'
import { createClient } from '@supabase/supabase-js'

function applyExtraSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('Origin-Agent-Cluster', '?1')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  return response
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('cf-connecting-ip') ||
         request.headers.get('x-real-ip') ||
         'unknown'
}

function logSecurityEventFromMiddleware(
  ipAddress: string,
  userAgent: string,
  eventType: string,
  details: Record<string, unknown>
) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  admin.from('security_logs').insert({
    event_type: eventType,
    ip_address: ipAddress,
    user_agent: userAgent,
    details,
    severity: eventType === 'ip_blocked' ? 'critical' : 'warning',
  }).then(({ error }) => {
    if (error) {
      console.error('Failed to insert security log from middleware:', error.message)
    }
  })
}

// IP 제한 캐시 (1분)
let ipRestrictionCache: { enabled: boolean; ips: string[]; fetchedAt: number } | null = null
const IP_CACHE_TTL = 60_000

async function checkIpRestriction(ip: string): Promise<boolean> {
  const now = Date.now()
  if (ipRestrictionCache && now - ipRestrictionCache.fetchedAt < IP_CACHE_TTL) {
    if (!ipRestrictionCache.enabled) return true
    return ipRestrictionCache.ips.includes(ip)
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) return true

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const [{ data: setting }, { data: ips }] = await Promise.all([
      admin.from('system_settings').select('value').eq('key', 'ip_restriction_enabled').single(),
      admin.from('ip_whitelist').select('ip_address'),
    ])

    const enabled = setting?.value === 'true'
    const ipList = (ips || []).map((r: { ip_address: string }) => r.ip_address)
    ipRestrictionCache = { enabled, ips: ipList, fetchedAt: now }

    if (!enabled) return true
    return ipList.includes(ip)
  } catch {
    return true
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const ip = getClientIp(request)

  // Rate Limit 체크
  const rateLimitConfig = getConfigForPath(pathname)
  if (rateLimitConfig) {
    const key = `${ip}:${pathname}`
    const result = checkRateLimit(key, rateLimitConfig)

    if (!result.allowed) {
      logSecurityEventFromMiddleware(ip, request.headers.get('user-agent') || '', 'rate_limited', {
        pathname,
        limit: rateLimitConfig.limit,
        resetIn: result.resetIn,
      })
      const response = NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.resetIn),
            'X-RateLimit-Limit': String(rateLimitConfig.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetIn),
          }
        }
      )
      return applyExtraSecurityHeaders(response)
    }
  }

  // IP 접근제한 체크 (로그인/인증/정적 리소스 제외)
  if (!pathname.startsWith('/login') && !pathname.startsWith('/auth') &&
      !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/cron') &&
      !pathname.startsWith('/api/webhook') && !pathname.startsWith('/_next')) {
    const ipAllowed = await checkIpRestriction(ip)
    if (!ipAllowed) {
      logSecurityEventFromMiddleware(ip, request.headers.get('user-agent') || '', 'ip_blocked', { pathname })
      const response = NextResponse.json(
        { error: '허용되지 않은 IP 주소입니다.' },
        { status: 403 }
      )
      return applyExtraSecurityHeaders(response)
    }
  }

  const response = await updateSession(request)
  return applyExtraSecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
