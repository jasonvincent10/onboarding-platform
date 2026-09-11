'use server'

// ============================================================================
// Compliance settings: which requirements this employer enforces, with what
// interval, for whom. Also custom requirement types and role groups.
// SECURITY: every write is scoped by the verified employer_id.
// ============================================================================

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmployerContext, type EmployerContext } from '@/lib/entitlements'
import { writeAudit } from '@/lib/compliance/audit'
import { DEFAULT_LEAD_DAYS, type RenewalRule, type RequirementCategory } from '@/lib/compliance/types'

export type ActionResult = { error?: string; success?: boolean; id?: string }

async function requireContext(): Promise<{ ctx: EmployerContext } | { error: string }> {
  const ctx = await getEmployerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.entitlements.compliance) return { error: 'Compliance features need the Comply plan.' }
  return { ctx }
}

function revalidateSettings() {
  revalidatePath('/compliance/settings')
  revalidatePath('/compliance')
  revalidatePath('/workforce')
  revalidatePath('/dashboard')
}

/** A type is usable by this employer if it is a system row or their own custom row. */
async function typeIsVisible(employerId: string, typeId: string): Promise<boolean> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('compliance_requirement_types')
    .select('id, employer_id')
    .eq('id', typeId)
    .maybeSingle()
  return !!data && (data.employer_id === null || data.employer_id === employerId)
}

// ─── Enable / disable ────────────────────────────────────────────────────────

export async function setRequirementEnabled(typeId: string, enabled: boolean): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate
  if (!(await typeIsVisible(ctx.employerId, typeId))) return { error: 'Requirement not found.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('employer_requirements')
    .upsert({ employer_id: ctx.employerId, requirement_type_id: typeId, enabled }, { onConflict: 'employer_id,requirement_type_id' })
  if (error) return { error: error.message }

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_requirement_updated', resourceType: 'compliance_requirement_types', resourceId: typeId, employerId: ctx.employerId, metadata: { enabled } })
  revalidateSettings()
  return { success: true }
}

/** Enables every library requirement tagged with the sector (person and organisation). */
export async function enableSectorDefaults(sector: string): Promise<ActionResult & { enabled?: number }> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { data: types } = await adminClient
    .from('compliance_requirement_types')
    .select('id')
    .is('employer_id', null)
    .eq('is_active', true)
    .contains('sectors', [sector])
  if (!types || types.length === 0) return { error: 'No requirements found for that sector.' }

  const { error } = await adminClient
    .from('employer_requirements')
    .upsert(types.map((t) => ({ employer_id: ctx.employerId, requirement_type_id: t.id, enabled: true })), { onConflict: 'employer_id,requirement_type_id' })
  if (error) return { error: error.message }

  await adminClient.from('employer_accounts').update({ sector: sector === 'cross_sector' ? 'other' : sector }).eq('id', ctx.employerId)

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_requirement_updated', resourceType: 'employer_requirements', resourceId: null, employerId: ctx.employerId, metadata: { sector_defaults: sector, count: types.length } })
  revalidateSettings()
  return { success: true, enabled: types.length }
}

export async function saveSector(sector: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate
  const allowed = ['care', 'construction', 'hospitality', 'logistics', 'security', 'corporate', 'other']
  if (!allowed.includes(sector)) return { error: 'Unknown sector.' }
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('employer_accounts').update({ sector }).eq('id', ctx.employerId)
  if (error) return { error: error.message }
  revalidateSettings()
  return { success: true }
}

// ─── Per-requirement configuration ───────────────────────────────────────────

export async function updateRequirementConfig(
  typeId: string,
  values: { intervalMonthsOverride: number | null; reminderLeadDays: number[]; appliesTo: 'all' | 'role_groups'; roleGroupIds: string[] }
): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate
  if (!(await typeIsVisible(ctx.employerId, typeId))) return { error: 'Requirement not found.' }

  const interval = values.intervalMonthsOverride
  if (interval !== null && !(Number.isInteger(interval) && interval >= 1 && interval <= 120)) {
    return { error: 'Renewal interval must be between 1 and 120 months.' }
  }
  const leads = Array.from(new Set(values.reminderLeadDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 365))).sort((a, b) => b - a)
  const leadDays = leads.length > 0 ? leads : DEFAULT_LEAD_DAYS

  const adminClient = createAdminClient()
  const { data: row, error } = await adminClient
    .from('employer_requirements')
    .upsert(
      {
        employer_id: ctx.employerId,
        requirement_type_id: typeId,
        interval_months_override: interval,
        reminder_lead_days: leadDays,
        applies_to: values.appliesTo,
      },
      { onConflict: 'employer_id,requirement_type_id' }
    )
    .select('id')
    .single()
  if (error || !row) return { error: error?.message ?? 'Could not save.' }

  // Replace role-group links (only this employer's groups).
  await adminClient.from('employer_requirement_role_groups').delete().eq('employer_requirement_id', row.id)
  if (values.appliesTo === 'role_groups' && values.roleGroupIds.length > 0) {
    const { data: valid } = await adminClient.from('role_groups').select('id').eq('employer_id', ctx.employerId).in('id', values.roleGroupIds)
    if (valid && valid.length > 0) {
      await adminClient.from('employer_requirement_role_groups').insert(valid.map((g) => ({ employer_requirement_id: row.id, role_group_id: g.id })))
    }
  }

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_requirement_updated', resourceType: 'compliance_requirement_types', resourceId: typeId, employerId: ctx.employerId, metadata: { interval, leadDays, appliesTo: values.appliesTo } })
  revalidateSettings()
  return { success: true }
}

// ─── Custom requirement types ────────────────────────────────────────────────

export interface CustomTypeInput {
  name: string
  description?: string
  category: RequirementCategory
  subject: 'person' | 'organisation'
  renewalRule: RenewalRule
  intervalMonths: number | null
  workBlocking: boolean
  evidenceRequired: boolean
  referenceLabel?: string
}

const CATEGORIES: RequirementCategory[] = ['training', 'licence', 'check', 'registration', 'medical', 'screening', 'hr_event']
const RULES: RenewalRule[] = ['fixed_interval', 'employer_interval', 'document_date', 'no_expiry', 'age_based', 'status_check', 'event_based']

function validateCustom(input: CustomTypeInput): string | null {
  if (!input.name?.trim()) return 'Give the requirement a name.'
  if (!CATEGORIES.includes(input.category)) return 'Choose a category.'
  if (!RULES.includes(input.renewalRule)) return 'Choose how it renews.'
  const needsInterval = ['fixed_interval', 'employer_interval', 'status_check'].includes(input.renewalRule)
  if (needsInterval && !(input.intervalMonths && input.intervalMonths >= 1 && input.intervalMonths <= 120)) return 'Set a renewal interval in months (1 to 120).'
  return null
}

export async function createCustomRequirement(input: CustomTypeInput): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate
  const invalid = validateCustom(input)
  if (invalid) return { error: invalid }

  const needsInterval = ['fixed_interval', 'employer_interval', 'status_check'].includes(input.renewalRule)
  const adminClient = createAdminClient()
  const { data: type, error } = await adminClient
    .from('compliance_requirement_types')
    .insert({
      employer_id: ctx.employerId,
      code: null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      sectors: ['custom'],
      subject: input.subject,
      renewal_rule: input.renewalRule,
      default_interval_months: needsInterval ? input.intervalMonths : null,
      interval_locked: false,
      work_blocking: input.workBlocking,
      evidence_required: input.evidenceRequired,
      reference_label: input.referenceLabel?.trim() || null,
      sort_order: 900,
    })
    .select('id')
    .single()
  if (error || !type) return { error: error?.message ?? 'Could not create the requirement.' }

  await adminClient
    .from('employer_requirements')
    .upsert({ employer_id: ctx.employerId, requirement_type_id: type.id, enabled: true }, { onConflict: 'employer_id,requirement_type_id' })

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_requirement_updated', resourceType: 'compliance_requirement_types', resourceId: type.id, employerId: ctx.employerId, metadata: { custom: true, name: input.name.trim() } })
  revalidateSettings()
  return { success: true, id: type.id }
}

export async function updateCustomRequirement(typeId: string, input: CustomTypeInput): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate
  const invalid = validateCustom(input)
  if (invalid) return { error: invalid }

  const needsInterval = ['fixed_interval', 'employer_interval', 'status_check'].includes(input.renewalRule)
  const adminClient = createAdminClient()
  const { data: updated, error } = await adminClient
    .from('compliance_requirement_types')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      subject: input.subject,
      renewal_rule: input.renewalRule,
      default_interval_months: needsInterval ? input.intervalMonths : null,
      work_blocking: input.workBlocking,
      evidence_required: input.evidenceRequired,
      reference_label: input.referenceLabel?.trim() || null,
    })
    .eq('id', typeId)
    .eq('employer_id', ctx.employerId)
    .select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'Custom requirement not found.' }

  revalidateSettings()
  return { success: true }
}

export async function deleteCustomRequirement(typeId: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { data: deleted, error } = await adminClient
    .from('compliance_requirement_types')
    .delete()
    .eq('id', typeId)
    .eq('employer_id', ctx.employerId)   // system rows have NULL employer_id and cannot match
    .select('id')
  if (error) return { error: error.message }
  if (!deleted || deleted.length === 0) return { error: 'Custom requirement not found.' }

  revalidateSettings()
  return { success: true }
}

// ─── Role groups ─────────────────────────────────────────────────────────────

export async function createRoleGroup(name: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate
  const clean = name?.trim()
  if (!clean) return { error: 'Enter a group name.' }
  if (clean.length > 60) return { error: 'Keep group names under 60 characters.' }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('role_groups')
    .insert({ employer_id: ctx.employerId, name: clean })
    .select('id')
    .single()
  if (error) return { error: error.message.includes('duplicate') ? 'A group with that name already exists.' : error.message }

  revalidateSettings()
  return { success: true, id: data?.id }
}

export async function deleteRoleGroup(roleGroupId: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { data: deleted, error } = await adminClient
    .from('role_groups')
    .delete()
    .eq('id', roleGroupId)
    .eq('employer_id', ctx.employerId)
    .select('id')
  if (error) return { error: error.message }
  if (!deleted || deleted.length === 0) return { error: 'Group not found.' }

  revalidateSettings()
  return { success: true }
}
