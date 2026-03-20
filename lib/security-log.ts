import type { SupabaseClient } from '@supabase/supabase-js'

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'password_changed'
  | 'ip_blocked'
  | 'rate_limited'
  | 'account_locked'
  | 'account_unlocked'
  | 'mfa_setup'
  | 'mfa_verify_success'
  | 'mfa_verify_failed'
  | 'mfa_disabled'

export type Severity = 'info' | 'warning' | 'critical'

export interface SecurityLogParams {
  eventType: SecurityEventType
  userId?: string
  userEmail?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, unknown>
  severity?: Severity
}

const SEVERITY_MAP: Record<SecurityEventType, Severity> = {
  login_success: 'info',
  login_failed: 'warning',
  password_changed: 'info',
  ip_blocked: 'critical',
  rate_limited: 'warning',
  account_locked: 'critical',
  account_unlocked: 'info',
  mfa_setup: 'info',
  mfa_verify_success: 'info',
  mfa_verify_failed: 'warning',
  mfa_disabled: 'warning',
}

export function logSecurityEvent(adminClient: SupabaseClient, params: SecurityLogParams): void {
  adminClient.from('security_logs').insert({
    event_type: params.eventType,
    user_id: params.userId ?? null,
    user_email: params.userEmail ?? null,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    details: params.details ?? {},
    severity: params.severity ?? SEVERITY_MAP[params.eventType] ?? 'info',
  }).then(({ error }) => {
    if (error) {
      console.error('Failed to insert security log:', error.message, {
        eventType: params.eventType,
        userEmail: params.userEmail,
      })
    }
  })
}

const LOGIN_FAIL_THRESHOLD = 5
const LOCKOUT_DURATION_MIN = 15

export async function recordLoginFailure(
  adminClient: SupabaseClient,
  email: string,
  ipAddress: string,
  userAgent: string
): Promise<{ locked: boolean; remainingMinutes: number }> {
  const { data: lockout } = await adminClient
    .from('account_lockouts')
    .select('*')
    .eq('user_email', email)
    .single()

  const now = new Date()

  if (lockout) {
    if (new Date(lockout.locked_until) > now) {
      const remaining = Math.ceil((new Date(lockout.locked_until).getTime() - now.getTime()) / 60000)
      return { locked: true, remainingMinutes: remaining }
    }

    const newAttempts = (lockout.failed_attempts || 0) + 1
    if (newAttempts >= LOGIN_FAIL_THRESHOLD) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MIN * 60000)
      await adminClient.from('account_lockouts').update({
        failed_attempts: newAttempts,
        locked_until: lockedUntil.toISOString(),
        last_failed_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq('user_email', email)

      logSecurityEvent(adminClient, {
        eventType: 'account_locked',
        userEmail: email,
        ipAddress,
        userAgent,
        severity: 'critical',
        details: { failed_attempts: newAttempts, locked_minutes: LOCKOUT_DURATION_MIN },
      })
      return { locked: true, remainingMinutes: LOCKOUT_DURATION_MIN }
    }

    await adminClient.from('account_lockouts').update({
      failed_attempts: newAttempts,
      last_failed_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq('user_email', email)
  } else {
    await adminClient.from('account_lockouts').insert({
      user_email: email,
      failed_attempts: 1,
      locked_until: now.toISOString(),
      last_failed_at: now.toISOString(),
    })
  }

  logSecurityEvent(adminClient, {
    eventType: 'login_failed',
    userEmail: email,
    ipAddress,
    userAgent,
    details: { reason: 'invalid_credentials' },
  })

  return { locked: false, remainingMinutes: 0 }
}

export async function clearLoginFailures(adminClient: SupabaseClient, email: string): Promise<void> {
  await adminClient.from('account_lockouts')
    .update({ failed_attempts: 0, locked_until: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_email', email)
}

export async function checkAccountLockout(
  adminClient: SupabaseClient,
  email: string
): Promise<{ locked: boolean; remainingMinutes: number }> {
  const { data: lockout } = await adminClient
    .from('account_lockouts')
    .select('locked_until')
    .eq('user_email', email)
    .single()

  if (!lockout) return { locked: false, remainingMinutes: 0 }
  const now = new Date()
  if (new Date(lockout.locked_until) > now) {
    const remaining = Math.ceil((new Date(lockout.locked_until).getTime() - now.getTime()) / 60000)
    return { locked: true, remainingMinutes: remaining }
  }
  return { locked: false, remainingMinutes: 0 }
}
