import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/encryption'

let _transporter: nodemailer.Transporter | null = null
let _fromEmail: string | null = null
let _lastFetchedAt = 0
const CACHE_TTL = 5 * 60 * 1000 // 5분 캐시

interface SmtpConfig {
  user: string
  pass: string
  fromEmail: string
}

/**
 * DB(system_settings) 또는 환경변수에서 SMTP 설정을 가져옴
 */
async function fetchSmtpConfig(): Promise<SmtpConfig> {
  // 환경변수 우선
  const envUser = process.env.SMTP_USER
  const envPass = process.env.SMTP_PASS
  const envFrom = process.env.SMTP_FROM_EMAIL

  if (envUser && envPass) {
    return { user: envUser, pass: envPass, fromEmail: envFrom || envUser }
  }

  // DB에서 조회
  const adminClient = createAdminClient()
  const { data: settings } = await adminClient
    .from('system_settings')
    .select('key, value')
    .in('key', ['smtp_user', 'smtp_pass', 'smtp_from_email'])

  let user = ''
  let pass = ''
  let fromEmail = ''

  if (settings) {
    for (const s of settings) {
      if (s.key === 'smtp_user' && s.value) user = s.value
      if (s.key === 'smtp_pass' && s.value) {
        try { pass = decrypt(s.value) } catch { console.error('Failed to decrypt smtp_pass') }
      }
      if (s.key === 'smtp_from_email' && s.value) fromEmail = s.value
    }
  }

  return { user, pass, fromEmail: fromEmail || user }
}

/**
 * Nodemailer transporter + 발신 이메일 반환 (캐시 적용)
 */
export async function getMailClient(): Promise<{ transporter: nodemailer.Transporter; fromEmail: string }> {
  const now = Date.now()
  if (_transporter && _fromEmail && now - _lastFetchedAt < CACHE_TTL) {
    return { transporter: _transporter, fromEmail: _fromEmail }
  }

  const config = await fetchSmtpConfig()
  if (!config.user || !config.pass) {
    throw new Error('SMTP 설정이 되어있지 않습니다. 설정 페이지에서 Gmail 계정과 앱 비밀번호를 입력하세요.')
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
  _fromEmail = config.fromEmail
  _lastFetchedAt = now

  return { transporter: _transporter, fromEmail: _fromEmail }
}

/**
 * 이메일 발송 헬퍼
 */
export async function sendEmail(options: { to: string | string[]; subject: string; html: string }) {
  const { transporter, fromEmail } = await getMailClient()
  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to

  await transporter.sendMail({
    from: `SupremaMR 회의실 관리 <${fromEmail}>`,
    to,
    subject: options.subject,
    html: options.html,
  })
}
