import { createBrowserClient } from '@supabase/ssr'

/**
 * Returns a Supabase client for use in Client Components.
 *
 * Uses createBrowserClient from @supabase/ssr — this is critical:
 * it stores the auth session in COOKIES (not localStorage), so that
 * server components, API routes, and the proxy can all read the session.
 *
 * Always call this as a function — never store as a module-level singleton,
 * as Next.js App Router can execute modules in both server and client contexts.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
