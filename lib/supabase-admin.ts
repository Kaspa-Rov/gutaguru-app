import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses Row Level Security.
 *
 * ONLY call this from server-side code (Server Components, API route handlers).
 * Never import this file from a Client Component or expose the key to the browser.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (Supabase Dashboard → Project Settings → API → service_role secret)
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local.'
    )
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
