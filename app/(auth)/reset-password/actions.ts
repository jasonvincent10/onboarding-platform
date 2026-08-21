'use server'

import { createClient } from '@/lib/supabase/server'

export type ResetPasswordState = {
  error?: string
  success?: boolean
}

export async function updatePassword(formData: FormData): Promise<ResetPasswordState> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const supabase = await createClient()

  // The recovery session is established by /auth/callback before this page
  // ever renders (see ../../../auth/callback/route.ts). If it's missing or
  // has expired, updateUser below will fail with a clear "not authenticated"
  // style error, but we check explicitly first for a cleaner message.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your reset link has expired. Please request a new one.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
