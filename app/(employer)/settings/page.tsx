import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CompanyProfileForm from './CompanyProfileForm'

export default async function GeneralSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user!.id)
    .maybeSingle()

  const adminClient = createAdminClient()
  const { data: employer } = member?.employer_id
    ? await adminClient
        .from('employer_accounts')
        .select('company_name, company_number')
        .eq('id', member.employer_id)
        .maybeSingle()
    : { data: null }

  return (
    <CompanyProfileForm
      companyName={employer?.company_name ?? ''}
      companyNumber={employer?.company_number ?? ''}
    />
  )
}
