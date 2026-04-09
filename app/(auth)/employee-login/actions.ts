'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUpEmployee(
  formData: FormData
): Promise<{ error?: string } | never> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const token = formData.get('token') as string

  if (!token) redirect('/auth/login?error=invalid_invite' as any)

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'An account with this email already exists. Sign in instead.' }
    }
    return { error: error.message }
  }

  redirect(`/join?token=${token}`)
}

export async function loginEmployee(
  formData: FormData
): Promise<{ error?: string } | never> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const token = formData.get('token') as string

  if (!token) redirect('/auth/login?error=invalid_invite' as any)

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Incorrect email or password.' }
  }

  redirect(`/join?token=${token}`)
}