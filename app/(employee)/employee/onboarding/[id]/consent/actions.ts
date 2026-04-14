'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  grantConsent,
  withdrawConsent,
  type DataCategory,
  DATA_CATEGORIES,
} from '@/lib/consent'

/**
 * Grant consent for one or more data categories on an onboarding.
 * Authorization: the caller must be the employee linked to the onboarding.
 */
export async function grantConsentsForOnboarding(
  onboardingId: string,
  categories: DataCategory[]
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  // Validate every category against the enum to refuse junk input
  for (const c of categories) {
    if (!DATA_CATEGORIES.includes(c)) return { error: 'invalid_category' }
  }

  const admin = createAdminClient()

  // Resolve the caller's employee_id and confirm they own this onboarding
  const { data: profile } = await admin
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return { error: 'no_profile' }

  const { data: onboarding } = await admin
    .from('onboarding_instances')
    .select('id, employee_id, employer_id')
    .eq('id', onboardingId)
    .single()
  if (!onboarding) return { error: 'not_found' }
  if (onboarding.employee_id !== profile.id) return { error: 'not_authorized' }

  // Insert one consent row per category. We do these sequentially rather
  // than in a single insert so a downstream failure on row N still leaves
  // rows 1..N-1 recorded — the audit trail is the source of truth.
  for (const category of categories) {
    const result = await grantConsent(profile.id, onboarding.employer_id, category, onboardingId)
    if (result.error) return { error: result.error }
  }

  revalidatePath(`/employee/onboarding/${onboardingId}`)
  return { error: null }
}

/**
 * Withdraw consent for a single category. Used by the standing
 * /employee/consents management page.
 */
export async function withdrawConsentForEmployer(
  employerId: string,
  category: DataCategory
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  if (!DATA_CATEGORIES.includes(category)) return { error: 'invalid_category' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return { error: 'no_profile' }

  const result = await withdrawConsent(profile.id, employerId, category)
  if (result.error) return { error: result.error }

  revalidatePath('/employee/consents')
  return { error: null }
}