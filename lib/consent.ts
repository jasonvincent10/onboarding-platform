import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// The seven data categories from the schema enum.
// Keep this in sync with the data_category enum in Supabase.
export const DATA_CATEGORIES = [
  'personal_info',
  'ni_number',
  'bank_details',
  'emergency_contacts',
  'right_to_work',
  'documents',
  'policy_acknowledgements',
] as const

export type DataCategory = (typeof DATA_CATEGORIES)[number]

// Plain-English labels and descriptions shown to the employee on the
// consent screen. Wording matters here — this is the GDPR lawful basis
// the employee is agreeing to.
export const CATEGORY_INFO: Record<DataCategory, { label: string; description: string }> = {
  personal_info: {
    label: 'Personal information',
    description: 'Your name, date of birth, address and phone number.',
  },
  ni_number: {
    label: 'National Insurance number',
    description: 'Required by your employer to report your earnings to HMRC.',
  },
  bank_details: {
    label: 'Bank details',
    description: 'Your sort code and account number, used to pay your salary.',
  },
  emergency_contacts: {
    label: 'Emergency contacts',
    description: 'People your employer can contact in an emergency at work.',
  },
  right_to_work: {
    label: 'Right to work documents',
    description: 'Passport, BRP or share code your employer must check by law.',
  },
  documents: {
    label: 'Other documents',
    description: 'Any other documents your onboarding requires (e.g. P45, qualifications).',
  },
  policy_acknowledgements: {
    label: 'Policy acknowledgements',
    description: 'Records of company policies you have read and agreed to.',
  },
}

export interface ConsentStatus {
  data_category: DataCategory
  latest_action: 'granted' | 'withdrawn'
  latest_at: string
  onboarding_id: string | null
}

/**
 * Returns the required data categories for an onboarding by reading the
 * checklist items. Only categories actually used by this onboarding need
 * consent — we don't ask for bank_details consent if no item needs it.
 */
export async function getRequiredCategories(onboardingId: string): Promise<DataCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('checklist_items')
    .select('data_category')
    .eq('onboarding_id', onboardingId)

  if (error || !data) return []

  const set = new Set<DataCategory>()
  for (const row of data) {
    if (row.data_category && DATA_CATEGORIES.includes(row.data_category as DataCategory)) {
      set.add(row.data_category as DataCategory)
    }
  }
  return Array.from(set)
}

/**
 * Latest consent action per category for one (employee, employer) pair.
 * Calls the get_consent_status_for_employer SQL function from migration 003.
 */
export async function getConsentStatus(
  employeeId: string,
  employerId: string
): Promise<ConsentStatus[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_consent_status_for_employer', {
    p_employee_id: employeeId,
    p_employer_id: employerId,
  })

  if (error || !data) return []
  return data as ConsentStatus[]
}

/**
 * True if the employee has an active (latest = granted) consent for this
 * category with this employer. Mirror of the SQL has_active_consent().
 */
export async function hasActiveConsent(
  employeeId: string,
  employerId: string,
  category: DataCategory
): Promise<boolean> {
  const status = await getConsentStatus(employeeId, employerId)
  const row = status.find((s) => s.data_category === category)
  return row?.latest_action === 'granted'
}

/**
 * Insert a granted consent row. Append-only — never UPDATE.
 * Uses adminClient because consent_records RLS allows employee INSERT
 * for their own rows, but we want this to be callable from server actions
 * regardless of which client is in scope.
 */
export async function grantConsent(
  employeeId: string,
  employerId: string,
  category: DataCategory,
  onboardingId: string | null
): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  const { error } = await admin.from('consent_records').insert({
    employee_id: employeeId,
    employer_id: employerId,
    data_category: category,
    action: 'granted',
    onboarding_id: onboardingId,
  })
  if (error) return { error: error.message }
  return { error: null }
}

/**
 * Insert a withdrawn consent row. Append-only — the previous granted row
 * is left in place for the audit trail.
 */
export async function withdrawConsent(
  employeeId: string,
  employerId: string,
  category: DataCategory
): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  const { error } = await admin.from('consent_records').insert({
    employee_id: employeeId,
    employer_id: employerId,
    data_category: category,
    action: 'withdrawn',
    onboarding_id: null,
  })
  if (error) return { error: error.message }
  return { error: null }
}