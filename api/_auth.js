import { createClient } from '@supabase/supabase-js';

let cachedSupabaseClient = null;

function getSupabaseServerClient() {
  if (cachedSupabaseClient) return cachedSupabaseClient;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  cachedSupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedSupabaseClient;
}

/**
 * Ekstrak token Bearer dari header Authorization request.
 */
export function extractBearerToken(req) {
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization || '';
  if (typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Verifikasi token JWT Supabase via supabase.auth.getUser(token).
 * Mengembalikan { user, token } jika valid, atau { error, status } jika gagal.
 */
export async function verifySupabaseAuth(req) {
  const token = extractBearerToken(req);
  if (!token) {
    return { user: null, token: null, status: 401, error: 'Unauthorized: Bearer token diperlukan.' };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { user: null, token: null, status: 500, error: 'Server auth configuration error: SUPABASE_URL/KEY belum diatur.' };
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, token: null, status: 401, error: 'Unauthorized: Token sesi Supabase tidak valid atau kedaluwarsa.' };
    }
    return { user: data.user, token, status: 200, error: null };
  } catch (err) {
    return { user: null, token: null, status: 401, error: `Unauthorized: ${err?.message || 'Gagal memverifikasi sesi.'}` };
  }
}

/**
 * Helper guard siap-pakai untuk Serverless Handler (/api/*).
 * Mengembalikan object user jika terautentikasi, atau langsung mengirim response HTTP 401/500 dan mengembalikan null.
 */
export async function requireSupabaseAuth(req, res) {
  const result = await verifySupabaseAuth(req);
  if (!result.user) {
    res.status(result.status || 401).json({
      success: false,
      error: result.error || 'Unauthorized',
    });
    return null;
  }
  return result.user;
}
