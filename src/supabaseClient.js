import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ncsjgjftybxpxuixgumm.supabase.co'
const supabaseAnonKey = 'sb_publishable_rDws8DZYK-XL4SJTtvE5HA_rMcRmWhs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Ambil header Authorization Bearer dari sesi Supabase aktif untuk panggilan /api/* terproteksi.
 */
export async function getSupabaseAuthHeaders(extraHeaders = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (token) {
      return { ...extraHeaders, Authorization: `Bearer ${token}` }
    }
  } catch (err) {
    console.warn('[Auth] Gagal mengambil sesi Supabase:', err?.message || err)
  }
  return { ...extraHeaders }
}
