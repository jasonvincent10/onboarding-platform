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
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  })

  return { success: true }
}
