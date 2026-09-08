import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ncsjgjftybxpxuixgumm.supabase.co'
const supabaseAnonKey = 'sb_publishable_rDws8DZYK-XL4SJTtvE5HA_rMcRmWhs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)