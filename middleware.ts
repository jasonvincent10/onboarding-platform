import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require auth
const PUBLIC_ROUTES = [
  '/login',
  '/sign-up',
  '/forgot-password',
  '/',
  '/legal',
  '/join',
  '/employee-login',
  '/auth/callback',
  '/reset-password',
  '/team-invite',
]

// Routes that authenticated users can access regardless of auth state
// (i.e. don't redirect away from these even if logged in)
// /auth/callback and /reset-password must stay reachable even for an
// already-logged-in user, otherwise someone who clicks a password-reset
// link while still signed in gets bounced to /dashboard before the recovery
// code is exchanged, or before they can actually set the new password.
const ALWAYS_ACCESSIBLE = ['/join', '/employee-login', '/auth/callback', '/reset-password', '/team-invite']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — IMPORTANT: do not write logic between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/') || pathname.startsWith(r + '?')
  )

  const isAlwaysAccessible = ALWAYS_ACCESSIBLE.some(
    (r) => pathname === r || pathname.startsWith(r + '/') || pathname.startsWith(r + '?')
  )

  // If user is logged in and hits an auth page, send to dashboard
  // EXCEPT for always-accessible routes like /join (which need to run their own logic)
  if (user && isPublic && !isAlwaysAccessible) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  // If user is not logged in and hits a protected route, send to login.
  // Employee routes have their own login page -- sending them to the
  // employer /login instead would land them on the wrong sign-in form.
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = pathname.startsWith('/employee') ? '/employee-login' : '/login'
    loginUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/cron|api/webhooks).*)',
  ],
}