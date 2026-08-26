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

  // Accepting a specific invite -- let /join's own role checks (which
  // already explicitly reject an employer session here) handle it.
  if (token) {
    redirect(`/join?token=${token}`)
  }

  // Plain sign-in, no token: this form authenticates any valid Supabase
  // account, so route to wherever this one actually belongs -- mirrors
  // the same logic on the employer /login form, so either page works
  // for either role instead of erroring on "the wrong one."
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('employee_profiles')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (profile) {
    redirect('/employee/dashboard')
  }

  const { data: member } = await adminClient
    .from('employer_members')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (member) {
    redirect('/dashboard')
  }

  await supabase.auth.signOut()
  return { error: "We couldn't find an account set up for this login. Please contact support." }
}