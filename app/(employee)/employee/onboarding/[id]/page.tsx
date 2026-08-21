import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ChecklistView from './ChecklistView'

interface ChecklistPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ welcomed?: string }>
}

export default async function ChecklistPage({ params, searchParams }: ChecklistPageProps) {
  const { id } = await params
  const { welcomed } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/employee-login')

  const { data: onboarding, error } = await supabase
    .from('onboarding_instances')
    .select('id, role_title, start_date, status, readiness_pct, invitee_name, employer_id')
    .eq('id', id)
    .maybeSingle()

  if (error || !onboarding) notFound()

  const adminClient = createAdminClient()
  const { data: employerAccount } = await adminClient
    .from('employer_accounts')
    .select('company_name')
    .eq('id', onboarding.employer_id)
    .maybeSingle()
  const companyName = employerAccount?.company_name ?? 'Your employer'

  const { getRequiredCategories, getConsentStatus } = await import('@/lib/consent')
  const requiredCategories = await getRequiredCategories(id)
  if (requiredCategories.length > 0) {
    const { data: profile } = await supabase
      .from('employee_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profile) {
      const status = await getConsentStatus(profile.id, onboarding.employer_id)
      const granted = new Set(
        status.filter((s) => s.latest_action === 'granted').map((s) => s.data_category)
      )
      const missing = requiredCategories.filter((c) => !granted.has(c))
      if (missing.length > 0) {
        redirect(`/employee/onboarding/${id}/consent`)
      }
    }
  }

  const { data: items } = await supabase
    .from('checklist_items')
    .select(`
      id,
      item_name,
      item_type,
      data_category,
      status,
      deadline,
      was_pre_populated,
      reviewer_notes,
      acknowledged_at,
      document_upload_id
    `)
    .eq('onboarding_id', id)
    .order('id')

  return (
    <ChecklistView
      onboarding={{
        id: onboarding.id,
        roleTitle: onboarding.role_title,
        startDate: onboarding.start_date,
        status: onboarding.status,
        readinessPct: onboarding.readiness_pct ?? 0,
        inviteeName: onboarding.invitee_name,
        companyName: companyName,
      }}
      items={items ?? []}
      welcomed={welcomed === 'true'}
    />
  )
}