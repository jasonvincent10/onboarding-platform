'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type UpdateCompanyState = {
  error?: string
  success?: boolean
}

export async function updateCompanyProfile(
  _prev: UpdateCompanyState | null,
  formData: FormData
): Promise<UpdateCompanyState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Not an employer account' }

  const companyName = (formData.get('company_name') as string)?.trim()
  const companyNumber = (formData.get('company_number') as string)?.trim()

  if (!companyName) return { error: 'Company name is required.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('employer_accounts')
    .update({
      company_name: companyName,
      company_number: companyNumber || null,
    })
    .eq('id', member.employer_id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
