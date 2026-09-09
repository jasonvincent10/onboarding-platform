// lib/compliance/onboarding-sync.ts
// Turns approved onboarding checklist items into compliance records, so a
// certificate collected from a new starter is tracked from then on instead of
// being re-entered by hand.
//
// WHEN THIS RUNS
//   After an employer approves a checklist item. An employment row only
//   exists once the onboarding reaches 'complete' (created by the trigger in
//   migration 009), so this no-ops harmlessly until then and does the real
//   work on the approval that completes the onboarding. It is safe to call on
//   every approval and safe to call repeatedly.
//
// DATES, AND WHY MOST RECORDS LAND AS PENDING
//   Onboarding collects a document, not a renewal schedule. The one date we
//   can trust is an expiry the employee typed off the document itself. Where
//   that exists we use it. Where it does not, we deliberately do NOT guess an
//   issue date, because assuming a CSCS card was issued the day it was
//   approved could show a card as valid for five years when it expires next
//   month. A compliance tool that quietly says "valid" when it does not know
//   is worse than one that asks. Those records are created as pending with a
//   note, so they surface in the employer's action queue.

import { createAdminClient } from '@/lib/supabase/admin'
import { computeExpiry } from './engine'
import { writeAudit } from './audit'
import type { RequirementType } from './types'

/** What an onboarding-sourced record should claim about its dates. */
export interface RecordDates {
  issuedAt: string | null
  expiresAt: string | null
  /** True when we do not know enough to state a due date, so a human must confirm. */
  pending: boolean
  note: string | null
}

/**
 * Decides the dates for a compliance record created from an approved
 * onboarding item. Pure, so the rules below are testable.
 *
 * The governing principle: never invent a date that makes something look
 * valid. An expiry the employee copied off the document is trustworthy. An
 * issue date guessed from the approval date is not, because a card approved
 * today might expire next month, and a compliance tool that says "valid"
 * when it is guessing is worse than one that asks.
 */
export function decideRecordDates(
  rule: RequirementType['renewal_rule'],
  documentExpiry: string | null,
  dateOfBirth: string | null,
  today: string
): RecordDates {
  if (documentExpiry) {
    return { issuedAt: null, expiresAt: documentExpiry, pending: false, note: null }
  }

  if (rule === 'no_expiry') {
    return { issuedAt: today, expiresAt: computeExpiry({ rule: 'no_expiry' }).expiresAt, pending: false, note: null }
  }

  if (rule === 'age_based' && !dateOfBirth) {
    return {
      issuedAt: null,
      expiresAt: null,
      pending: true,
      note: 'Collected during onboarding. Add a date of birth to this person so the next medical can be worked out.',
    }
  }

  return {
    issuedAt: null,
    expiresAt: null,
    pending: true,
    note:
      rule === 'status_check'
        ? 'Collected during onboarding. Confirm the date this was last checked so the next check can be scheduled.'
        : 'Collected during onboarding. Confirm the date this was issued so the renewal date can be worked out.',
  }
}

export interface SyncResult {
  created: number
  skipped: number
  errors: string[]
}

interface SyncContext {
  onboardingId: string
  employerId: string
  actorUserId: string
}

export async function syncComplianceFromOnboarding(ctx: SyncContext): Promise<SyncResult> {
  const result: SyncResult = { created: 0, skipped: 0, errors: [] }
  const adminClient = createAdminClient()

  // The caller has already verified the employer owns this onboarding, but
  // scope the read by employer_id anyway rather than trusting that.
  const { data: onboarding } = await adminClient
    .from('onboarding_instances')
    .select('id, employer_id, employee_id, invitee_name, start_date')
    .eq('id', ctx.onboardingId)
    .eq('employer_id', ctx.employerId)
    .maybeSingle()
  if (!onboarding?.employee_id) return result

  // No employment yet means the onboarding is still in progress. Nothing to
  // attach records to, so leave it for the approval that completes it.
  const { data: employment } = await adminClient
    .from('employments')
    .select('id, date_of_birth')
    .eq('employer_id', ctx.employerId)
    .eq('employee_id', onboarding.employee_id)
    .eq('status', 'active')
    .maybeSingle()
  if (!employment) return result

  const { data: items } = await adminClient
    .from('checklist_items')
    .select('id, item_name, status, compliance_requirement_type_id, document_upload_id')
    .eq('onboarding_id', ctx.onboardingId)
    .eq('status', 'approved')
    .not('compliance_requirement_type_id', 'is', null)
  if (!items || items.length === 0) return result

  const typeIds = [...new Set(items.map((i) => i.compliance_requirement_type_id as string))]
  const { data: typeRows } = await adminClient
    .from('compliance_requirement_types')
    .select('*')
    .in('id', typeIds)
  const typeById = new Map((typeRows ?? []).map((t) => [t.id, t as RequirementType]))

  // Linking a requirement in a template is the employer saying they track it,
  // so make sure the requirement is switched on. Without this the record would
  // exist but never appear, since every view filters on enabled requirements.
  const { error: enableError } = await adminClient
    .from('employer_requirements')
    .upsert(
      typeIds.filter((id) => typeById.has(id)).map((id) => ({ employer_id: ctx.employerId, requirement_type_id: id, enabled: true })),
      { onConflict: 'employer_id,requirement_type_id', ignoreDuplicates: true }
    )
  if (enableError) result.errors.push(`enabling requirements: ${enableError.message}`)

  const { data: requirements } = await adminClient
    .from('employer_requirements')
    .select('id, requirement_type_id, interval_months_override')
    .eq('employer_id', ctx.employerId)
    .in('requirement_type_id', typeIds)
  const reqByType = new Map((requirements ?? []).map((r) => [r.requirement_type_id, r]))

  // Anything already tracked is left alone. A renewal recorded properly later
  // must never be overwritten by a re-approval of the original onboarding item.
  const { data: existing } = await adminClient
    .from('compliance_records')
    .select('employer_requirement_id')
    .eq('employer_id', ctx.employerId)
    .eq('employment_id', employment.id)
    .eq('is_current', true)
  const alreadyTracked = new Set((existing ?? []).map((r) => r.employer_requirement_id))

  const docIds = items.map((i) => i.document_upload_id).filter((x): x is string => !!x)
  const { data: docs } = docIds.length > 0
    ? await adminClient.from('document_uploads').select('id, document_name, expiry_date').in('id', docIds)
    : { data: [] }
  const docById = new Map((docs ?? []).map((d) => [d.id, d]))

  const today = new Date().toISOString().slice(0, 10)

  for (const item of items) {
    const type = typeById.get(item.compliance_requirement_type_id as string)
    const requirement = reqByType.get(item.compliance_requirement_type_id as string)
    if (!type || !requirement) {
      result.skipped++
      continue
    }
    if (alreadyTracked.has(requirement.id)) {
      result.skipped++
      continue
    }

    const doc = item.document_upload_id ? docById.get(item.document_upload_id) : null
    const documentExpiry = doc?.expiry_date ?? null

    const { issuedAt, expiresAt, pending, note } = decideRecordDates(
      type.renewal_rule,
      documentExpiry,
      employment.date_of_birth ?? null,
      today
    )

    const { data: inserted, error } = await adminClient
      .from('compliance_records')
      .insert({
        employer_id: ctx.employerId,
        employment_id: employment.id,
        employer_requirement_id: requirement.id,
        issued_at: issuedAt,
        expires_at: expiresAt,
        last_checked_at: null,
        document_path: null,
        document_name: doc?.document_name ?? null,
        attributes: {
          source: 'onboarding',
          onboarding_id: ctx.onboardingId,
          checklist_item: item.item_name,
          ...(doc ? { evidence_held_in_onboarding: true } : {}),
        },
        verification_status: pending ? 'pending' : 'verified',
        verified_by: pending ? null : ctx.actorUserId,
        verified_at: pending ? null : new Date().toISOString(),
        reviewer_notes: note,
        submitted_by: 'employer',
        created_by: ctx.actorUserId,
        is_current: true,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      result.errors.push(`${item.item_name}: ${error?.message ?? 'insert failed'}`)
      continue
    }

    alreadyTracked.add(requirement.id)
    result.created++

    await writeAudit({
      actorId: ctx.actorUserId,
      actorType: 'employer',
      action: 'compliance_record_from_onboarding',
      resourceType: 'compliance_records',
      resourceId: inserted.id,
      employerId: ctx.employerId,
      metadata: {
        onboarding_id: ctx.onboardingId,
        requirement: type.code ?? type.name,
        expires_at: expiresAt,
        needs_dates: pending,
      },
    })
  }

  return result
}

/** Requirement types an employer can link a template item to. */
export async function loadLinkableRequirements(employerId: string): Promise<Pick<RequirementType, 'id' | 'name' | 'category' | 'subject' | 'sectors'>[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('compliance_requirement_types')
    .select('id, name, category, subject, sectors')
    .or(`employer_id.is.null,employer_id.eq.${employerId}`)
    .eq('is_active', true)
    .eq('subject', 'person')
    .order('sort_order', { ascending: true })
  return (data ?? []) as Pick<RequirementType, 'id' | 'name' | 'category' | 'subject' | 'sectors'>[]
}
