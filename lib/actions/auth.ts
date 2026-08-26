'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

// Admin client that bypasses RLS — only used server-side for post-signup writes
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const fullName = formData.get('fullName') as string
  const companyName = formData.get('companyName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, user_type: 'employer' },
    },
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Sign up failed. Please try again.' }
  }

  const userId = authData.user.id

  const { data: employerAccount, error: employerError } = await admin
    .from('employer_accounts')
    .insert({
      company_name: companyName,
      subscription_status: 'trial',
      onboardings_used: 0,
    })
    .select('id')
    .single()

  if (employerError || !employerAccount) {
    return { error: employerError?.message ?? 'Failed to create employer account.' }
  }

  const { error: memberError } = await admin.from('employer_members').insert({
    employer_id: employerAccount.id,
    user_id: userId,
    role: 'owner',
    full_name: fullName,
    email,
  })

  if (memberError) {
    return { error: memberError.message }
  }

  await admin.rpc('create_default_template', { p_employer_id: employerAccount.id })

  redirect('/dashboard')
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Invalid email or password. Please try again.' }
  }

  // This form authenticates ANY valid Supabase account, including an
  // employee's -- Supabase auth doesn't know about our employer/employee
  // role split. Rather than reject a login that used "the wrong page,"
  // route to wherever this account actually belongs -- one login form
  // should work regardless of which one someone lands on.
  const adminClient = createAdminClient()
  const { data: member } = await adminClient
    .from('employer_members')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (member) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  const { data: profile } = await adminClient
    .from('employee_profiles')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (profile) {
    revalidatePath('/', 'layout')
    redirect('/employee/dashboard')
  }

  // Neither role found -- a genuinely orphaned account (e.g. signup was
  // interrupted before either row was created). Don't leave them signed
  // in with nowhere to go.
  await supabase.auth.signOut()
  return { error: 'We couldn\'t find an account set up for this login. Please contact support.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}