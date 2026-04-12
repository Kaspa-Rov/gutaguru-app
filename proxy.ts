import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Start with a response that forwards the incoming request (including cookies)
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Step 1: write cookies onto the request so subsequent server reads see them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Step 2: create a fresh response carrying the updated request
          supabaseResponse = NextResponse.next({ request })
          // Step 3: write the same cookies onto the response so the browser stores them
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() (not getSession()) — getUser() validates the JWT against
  // Supabase servers, which is required to trigger a token refresh when expired.
  // Do NOT remove this call; it is what keeps sessions alive across navigations.
  const { data: { user } } = await supabase.auth.getUser()

  // Guard: /admin routes require an authenticated session.
  // The role check (admin vs. subscriber) happens inside app/admin/layout.tsx —
  // per Next.js docs, proxy should not be the sole auth layer.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Forward the response. If setAll ran above, supabaseResponse carries refreshed
  // session cookies. If not, it forwards the original request unchanged.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (Next.js build assets)
     * - _next/image   (Next.js image optimisation)
     * - favicon.ico
     * - Static file extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
