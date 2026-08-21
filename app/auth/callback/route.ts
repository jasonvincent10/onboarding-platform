// Handles Supabase email-link redirects (password recovery today; also the
// right place for magic-link/OAuth callbacks if those are added later).
// Supabase's hosted verify endpoint redirects here with a PKCE `code` after
// the user clicks the link in their email; we exchange it for a session and
// forward on to `next`.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Password recovery is the only flow that lands here today, so that's the
  // default. A `next` override still works if it's ever needed, but note
  // Supabase's Redirect URLs allow-list here has no wildcard, so the
  // redirectTo passed to Supabase must never carry a query string -- see the
  // comment in app/(auth)/forgot-password/actions.ts.
  const next = searchParams.get('next') ?? '/reset-password'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Common cause: the link was opened in a different browser/device than the
  // one the reset was requested from, so the PKCE code verifier cookie isn't
  // present. Send the user back to request a fresh link rather than showing
  // a raw error.
  return NextResponse.redirect(`${origin}/forgot-password?error=link_expired`)
}
