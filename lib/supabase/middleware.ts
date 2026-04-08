import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Called by middleware.ts on every request.
 * Refreshes expired sessions and redirects unauthenticated users.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not remove this call
  const { data: { user } } = await supabase.auth.getUser()

  // Define protected route prefixes
  const protectedPaths = ['/employer', '/employee']
  const authPaths = ['/auth/login', '/auth/signup']

  const isProtected = protectedPaths.some(p =>
    request.nextUrl.pathname.startsWith(p)
  )
  const isAuthPage = authPaths.some(p =>
    request.nextUrl.pathname.startsWith(p)
  )

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    // We don't know employer vs employee at middleware level — redirect to a
    // lightweight router page that checks the user's role and redirects them.
    url.pathname = '/auth/redirect'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
