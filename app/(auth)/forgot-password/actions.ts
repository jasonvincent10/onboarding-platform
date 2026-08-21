'use server'

import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export type ForgotPasswordState = {
  error?: string
  success?: boolean
}

export async function requestPasswordReset(
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  // Throttle per email address so this endpoint can't be used to spam one
  // inbox with reset links (it's unauthenticated by design).
  const limited = rateLimit(`password-reset:${email}`, 3, 15 * 60_000)
  if (!limited.allowed) {
    return {
      error: 'Too many reset requests for this address. Please wait a few minutes and try again.',
    }
  }

  const supabase = await createClient()

  // Supabase does not error on an unknown email for this call (by design,
  // to avoid leaking which addresses have accounts), so we always report
  // success regardless of outcome.
  //
  // IMPORTANT: no query string on this redirectTo. Supabase's Redirect URLs
  // allow-list entries here are exact strings (no wildcard), and GoTrue
  // rejects anything that isn't an identical match -- appending ?next=...
  // silently fails validation and falls back to Site URL instead of erroring,
  // which is a very confusing failure mode to debug from the outside. The
  // callback route defaults to /reset-password on its own, so no query
  // string is needed here.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })

  return { success: true }
}
