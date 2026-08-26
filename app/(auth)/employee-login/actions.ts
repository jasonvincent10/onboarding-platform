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

  if (!token) redirect('/login?error=invalid_invite')

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

  // Unlike signUpEmployee, a token is NOT required here -- a returning
  // employee visiting /employee-login directly (no invite link) should be
  // able to sign in and land on their dashboard, not be forced through an
  // invite flow. Signup stays invite-gated since there's nothing for a
  // brand-new account to attach to without one.
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Incorrect email or password.' }
  }

  // Mirror of the guard on the employer /login form: this authenticates
  // any valid Supabase account, so if an employer mistakes this for their
  // own login page, don't send them into an employee dashboard with no
  // profile behind it.
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('employee_profiles')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!profile) {
    await supabase.auth.signOut()
    return {
      error: "This account isn't registered as an employee. If you're an employer, sign in at /login instead.",
    }
  }

  redirect(token ? `/join?token=${token}` : '/employee/dashboard')
}