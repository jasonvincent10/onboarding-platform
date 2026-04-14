import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRequiredCategories, getConsentStatus, CATEGORY_INFO } from '@/lib/consent'
import ConsentGateForm from './ConsentGateForm'

interface ConsentPageProps {
  params: Promise<{ id: string }>
}

export default async function ConsentPage({ params }: ConsentPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/employee-login')

  const { data: onboarding, error } = await supabase
    .from('onboarding_instances')
    .select('id, role_title, employer_id, employer_accounts(company_name)')
    .eq('id', id)
    .single()
  if (error || !onboarding) notFound()

  const required = await getRequiredCategories(id)

  // If somehow there are no required categories (empty checklist),
  // skip straight to the checklist — nothing to consent to.
  if (required.length === 0) {
    redirect(`/employee/onboarding/${id}`)
  }

  // If consent already exists for every required category, skip the gate.
  // This handles the case where the employee navigates back here after
  // already granting consent.
  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (profile) {
    const status = await getConsentStatus(profile.id, onboarding.employer_id)
    const grantedCategories = new Set(
      status.filter((s) => s.latest_action === 'granted').map((s) => s.data_category)
    )
    const allGranted = required.every((c) => grantedCategories.has(c))
    if (allGranted) {
      redirect(`/employee/onboarding/${id}`)
    }
  }

  const companyName =
    (onboarding.employer_accounts as any)?.company_name ?? 'your new employer'

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">
        Sharing your information with {companyName}
      </h1>
      <p className="mt-3 text-gray-600">
        Before you start your onboarding, please confirm what information
        you&apos;re happy to share with {companyName}. You can withdraw any of
        these permissions later from your account settings.
      </p>

      <ConsentGateForm
        onboardingId={id}
        categories={required.map((c) => ({
          key: c,
          label: CATEGORY_INFO[c].label,
          description: CATEGORY_INFO[c].description,
        }))}
      />

      <p className="mt-6 text-xs text-gray-500">
        Your data is processed under UK GDPR. {companyName} is the data
        controller for this onboarding. You have the right to withdraw consent
        at any time, request a copy of your data, or ask for it to be deleted.
      </p>
    </div>
  )
}