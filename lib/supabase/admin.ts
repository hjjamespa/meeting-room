import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | undefined

export function createAdminClient() {
  if (!adminClient) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
    }

    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return adminClient
}
