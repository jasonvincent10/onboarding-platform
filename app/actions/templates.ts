'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemType = 'document_upload' | 'form' | 'acknowledgement'
export type DataCategory =
  | 'personal_info'
  | 'ni_number'
  | 'bank_details'
  | 'emergency_contacts'
  | 'right_to_work'
  | 'documents'
  | 'policy_acknowledgements'

export interface TemplateItem {
  id: string
  template_id: string
  item_name: string
  description: string | null
  item_type: ItemType
  data_category: DataCategory
  form_field_key: string | null
  sort_order: number
  deadline_days_before_start: number
}

export interface Template {
  id: string
  employer_id: string
  template_name: string
  role_type: string | null
  is_default: boolean
  created_at: string
  template_items?: TemplateItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getEmployerId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data: member, error } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user.id)
    .single()
  if (error || !member) throw new Error('No employer account found')
  return member.employer_id
}

// ─── Template Actions ─────────────────────────────────────────────────────────

export async function getTemplates(): Promise<Template[]> {
  const supabase = await createClient()
  const employerId = await getEmployerId()

  const { data, error } = await supabase
    .from('onboarding_templates')
    .select('*, template_items(count)')
    .eq('employer_id', employerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTemplateWithItems(
  templateId: string
): Promise<Template | null> {
  const supabase = await createClient()
  const employerId = await getEmployerId()

  const { data, error } = await supabase
    .from('onboarding_templates')
    .select('*, template_items(*)')
    .eq('id', templateId)
    .eq('employer_id', employerId)
    .single()

  if (error) return null

  // Sort items by sort_order client-side for reliability
  if (data?.template_items) {
    data.template_items.sort(
      (a: TemplateItem, b: TemplateItem) => a.sort_order - b.sort_order
    )
  }
  return data
}

export async function createTemplate(formData: FormData) {
  const supabase = await createClient()
  const employerId = await getEmployerId()

  const templateName = formData.get('template_name') as string
  const roleType = formData.get('role_type') as string

  if (!templateName?.trim()) throw new Error('Template name is required')

  const { data, error } = await supabase
    .from('onboarding_templates')
    .insert({
      employer_id: employerId,
      template_name: templateName.trim(),
      role_type: roleType?.trim() || null,
      is_default: false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/templates')
  redirect(`/templates/${data.id}/edit`)
}

export async function updateTemplate(
  templateId: string,
  values: { template_name: string; role_type?: string }
) {
  const supabase = await createClient()
  const employerId = await getEmployerId()

  const { error } = await supabase
    .from('onboarding_templates')
    .update({
      template_name: values.template_name.trim(),
      role_type: values.role_type?.trim() || null,
    })
    .eq('id', templateId)
    .eq('employer_id', employerId)

  if (error) throw new Error(error.message)
  revalidatePath(`/templates/${templateId}/edit`)
  revalidatePath('/templates')
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient()
  const employerId = await getEmployerId()

  const { error } = await supabase
    .from('onboarding_templates')
    .delete()
    .eq('id', templateId)
    .eq('employer_id', employerId)

  if (error) throw new Error(error.message)
  revalidatePath('/templates')
  redirect('/templates')
}

// ─── Template Item Actions ────────────────────────────────────────────────────

export async function addTemplateItem(
  templateId: string,
  values: {
    item_name: string
    description?: string
    item_type: ItemType
    data_category: DataCategory
    deadline_days_before_start: number
  }
): Promise<TemplateItem> {
  const supabase = await createClient()
  const employerId = await getEmployerId()

  // Verify template belongs to this employer
  const { data: template, error: templateError } = await supabase
    .from('onboarding_templates')
    .select('id')
    .eq('id', templateId)
    .eq('employer_id', employerId)
    .single()

  if (templateError || !template)
    throw new Error('Template not found or access denied')

  // Get current max sort_order
  const { data: existingItems } = await supabase
    .from('template_items')
    .select('sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder =
    existingItems && existingItems.length > 0
      ? existingItems[0].sort_order + 1
      : 0

  const { data, error } = await supabase
    .from('template_items')
    .insert({
      template_id: templateId,
      item_name: values.item_name.trim(),
      description: values.description?.trim() || null,
      item_type: values.item_type,
      data_category: values.data_category,
      deadline_days_before_start: values.deadline_days_before_start,
      sort_order: nextSortOrder,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/templates/${templateId}/edit`)
  return data
}

export async function updateTemplateItem(
  itemId: string,
  templateId: string,
  values: {
    item_name: string
    description?: string
    item_type: ItemType
    data_category: DataCategory
    deadline_days_before_start: number
  }
) {
  const supabase = await createClient()
  const employerId = await getEmployerId()

  // Verify ownership via join
  const { data: template } = await supabase
    .from('onboarding_templates')
    .select('id')
    .eq('id', templateId)
    .eq('employer_id', employerId)
    .single()

  if (!template) throw new Error('Access denied')

  const { error } = await supabase
    .from('template_items')
    .update({
      item_name: values.item_name.trim(),
      description: values.description?.trim() || null,
      item_type: values.item_type,
      data_category: values.data_category,
      deadline_days_before_start: values.deadline_days_before_start,
    })
    .eq('id', itemId)
    .eq('template_id', templateId)

  if (error) throw new Error(error.message)
  revalidatePath(`/templates/${templateId}/edit`)
}

export async function deleteTemplateItem(itemId: string, templateId: string) {
  const supabase = await createClient()
  const employerId = await getEmployerId()

  const { data: template } = await supabase
    .from('onboarding_templates')
    .select('id')
    .eq('id', templateId)
    .eq('employer_id', employerId)
    .single()

  if (!template) throw new Error('Access denied')

  const { error } = await supabase
    .from('template_items')
    .delete()
    .eq('id', itemId)
    .eq('template_id', templateId)

  if (error) throw new Error(error.message)
  revalidatePath(`/templates/${templateId}/edit`)
}

export async function reorderTemplateItems(
  templateId: string,
  orderedIds: string[]
) {
  const supabase = await createClient()
  const employerId = await getEmployerId()

  const { data: template } = await supabase
    .from('onboarding_templates')
    .select('id')
    .eq('id', templateId)
    .eq('employer_id', employerId)
    .single()

  if (!template) throw new Error('Access denied')

  // Update sort_order for each item
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('template_items')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('template_id', templateId)
  )

  await Promise.all(updates)
  revalidatePath(`/templates/${templateId}/edit`)
}
