'use server'

// ============================================================================
// Compliance record server actions (employer side).
// SECURITY: caller resolved via getEmployerContext(); every record, employment
// and requirement is verified to belong to that employer before any write.
// Evidence paths are only accepted if they sit inside the folder this
// employer was allowed to upload to.
// ============================================================================

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptField, safeDecryptField } from '@/lib/encryption'
import { getEmployerContext, type EmployerContext } from '@/lib/entitlements'
import { computeExpiry, effectiveIntervalMonths } from '@/lib/compliance/engine'
import { parseUkDate } from '@/lib/compliance/csv-import'
import { writeAudit } from '@/lib/compliance/audit'
import {
  buildEvidencePath,
  createEvidenceUploadUrl,
  createEvidenceViewUrl,
  deleteEvidence,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MIME_TYPES,
  isPathInFolder,
} from '@/lib/compliance/evidence'
import type { RequirementType } from '@/lib/compliance/types'

export type ActionResult = { error?: string; success?: boolean; id?: string }

async function requireContext(): Promise<{ ctx: EmployerContext } | { error: string }> {
  const ctx = await getEmployerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.entitlements.compliance) return { error: 'Compliance features need the Comply plan.' }
  return { ctx }
}

function revalidateAll(employmentId?: string | null) {
  revalidatePath('/compliance')
  revalidatePath('/workforce')
  revalidatePath('/dashboard')
  if (employmentId) revalidatePath(`/workforce/${employmentId}`)
}

/** Loads an employer requirement + its type, verifying ownership. */
async function loadRequirement(employerId: string, employerRequirementId: string) {
  const adminClient = createAdminClient()
  const { data: req } = await adminClient
    .from('employer_requirements')
    .select('id, requirement_type_id, enabled, interval_months_override, reminder_lead_days')
    .eq('id', employerRequirementId)
    .eq('employer_id', employerId)
    .maybeSingle()
  if (!req) return null
  const { data: type } = await adminClient
    .from('compliance_requirement_types')
    .select('*')
    .eq('id', req.requirement_type_id)
    .maybeSingle()
  if (!type) return null
  return { req, type: type as RequirementType }
}

async function loadEmployment(employerId: string, employmentId: string) {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('employments')
    .select('id, employee_id, full_name, date_of_birth')
    .eq('id', employmentId)
    .eq('employer_id', employerId)
    .maybeSingle()
  return data
}

// ─── Evidence upload ─────────────────────────────────────────────────────────

export async function prepareEvidenceUpload(input: {
  employmentId: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
}): Promise<{ path: string; token: string } | { error: string }> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  if (!EVIDENCE_MIME_TYPES[input.mimeType]) return { error: 'Only PDF, JPG and PNG files are accepted.' }
  if (input.sizeBytes > EVIDENCE_MAX_BYTES) return { error: 'File must be under 10MB.' }
  if (input.employmentId) {
    const person = await loadEmployment(ctx.employerId, input.employmentId)
    if (!person) return { error: 'Person not found.' }
  }

  const path = buildEvidencePath(ctx.employerId, input.employmentId, input.fileName, input.mimeType)
  const signed = await createEvidenceUploadUrl(path)
  if ('error' in signed) return { error: signed.error }
  return { path, token: signed.token }
}

// ─── Create / renew a record ─────────────────────────────────────────────────

export interface SaveRecordInput {
  employmentId: string | null            // null = organisation-level
  employerRequirementId: string
  issuedAt?: string | null
  documentDate?: string | null           // document_date / event_based rules
  lastCheckedAt?: string | null          // status_check rule
  reference?: string | null
  attributes?: Record<string, unknown>
  documentPath?: string | null
  documentName?: string | null
  notes?: string | null
}

export async function saveRecord(input: SaveRecordInput): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const loaded = await loadRequirement(ctx.employerId, input.employerRequirementId)
  if (!loaded) return { error: 'Requirement not found.' }
  const { req, type } = loaded

  let dateOfBirth: string | null = null
  if (type.subject === 'person') {
    if (!input.employmentId) return { error: 'This requirement applies to a person.' }
    const person = await loadEmployment(ctx.employerId, input.employmentId)
    if (!person) return { error: 'Person not found.' }
    dateOfBirth = person.date_of_birth
    if (!dateOfBirth && person.employee_id) {
      const adminClient = createAdminClient()
      const { data: profile } = await adminClient.from('employee_profiles').select('date_of_birth').eq('id', person.employee_id).maybeSingle()
      dateOfBirth = profile?.date_of_birth ?? null
    }
  } else if (input.employmentId) {
    return { error: 'This requirement applies to the organisation, not a person.' }
  }

  const issuedAt = input.issuedAt ? parseUkDate(input.issuedAt) : null
  const documentDate = input.documentDate ? parseUkDate(input.documentDate) : null
  const lastCheckedAt = input.lastCheckedAt ? parseUkDate(input.lastCheckedAt) : null
  if (input.issuedAt && !issuedAt) return { error: 'Issue date is not a valid date.' }
  if (input.documentDate && !documentDate) return { error: 'Expiry date is not a valid date.' }
  if (input.lastCheckedAt && !lastCheckedAt) return { error: 'Check date is not a valid date.' }

  if (input.documentPath && !isPathInFolder(input.documentPath, ctx.employerId, input.employmentId)) {
    return { error: 'Evidence file does not belong to this record.' }
  }
  if (type.evidence_required && !input.documentPath && !input.reference) {
    return { error: 'Upload the evidence or enter the reference number.' }
  }

  const intervalMonths = effectiveIntervalMonths(type, req)
  const expiry = computeExpiry({
    rule: type.renewal_rule,
    issuedAt,
    documentDate,
    intervalMonths,
    dateOfBirth,
    lastCheckedAt,
  })
  if (expiry.note === 'needs_issue_date') return { error: 'Enter the date this was completed or issued.' }
  if (expiry.note === 'needs_document_date') return { error: 'Enter the expiry date shown on the document.' }
  if (expiry.note === 'needs_check_date') return { error: 'Enter the date the check was carried out.' }
  if (expiry.note === 'needs_date_of_birth') return { error: 'Add this person\'s date of birth first so the next medical can be calculated.' }
  if (expiry.note === 'needs_interval') return { error: 'Set a renewal interval for this requirement in Compliance settings.' }

  const adminClient = createAdminClient()

  // Find the current record so we can supersede it.
  let current = adminClient
    .from('compliance_records')
    .select('id')
    .eq('employer_id', ctx.employerId)
    .eq('employer_requirement_id', req.id)
    .eq('is_current', true)
  current = input.employmentId ? current.eq('employment_id', input.employmentId) : current.is('employment_id', null)
  const { data: previous } = await current.maybeSingle()

  const { data: inserted, error } = await adminClient
    .from('compliance_records')
    .insert({
      employer_id: ctx.employerId,
      employment_id: input.employmentId,
      employer_requirement_id: req.id,
      issued_at: issuedAt,
      expires_at: expiry.expiresAt,
      last_checked_at: lastCheckedAt ?? (type.renewal_rule === 'status_check' ? issuedAt : null),
      document_path: input.documentPath ?? null,
      document_name: input.documentName ?? null,
      reference_encrypted: input.reference?.trim() ? encryptField(input.reference.trim()) : null,
      attributes: { ...(input.attributes ?? {}), ...(input.notes ? { notes: input.notes } : {}) },
      verification_status: 'verified',
      verified_by: ctx.userId,
      verified_at: new Date().toISOString(),
      submitted_by: 'employer',
      created_by: ctx.userId,
      is_current: true,
    })
    .select('id')
    .single()
  if (error || !inserted) return { error: error?.message ?? 'Could not save the record.' }

  if (previous) {
    await adminClient
      .from('compliance_records')
      .update({ is_current: false, superseded_by: inserted.id })
      .eq('id', previous.id)
      .eq('employer_id', ctx.employerId)
  }

  await writeAudit({
    actorId: ctx.userId,
    actorType: 'employer',
    action: 'compliance_record_created',
    resourceType: 'compliance_records',
    resourceId: inserted.id,
    employerId: ctx.employerId,
    metadata: { requirement: type.code ?? type.name, employment_id: input.employmentId, expires_at: expiry.expiresAt, superseded: previous?.id ?? null },
  })

  revalidateAll(input.employmentId)
  return { success: true, id: inserted.id }
}

// ─── Review employee-submitted evidence ──────────────────────────────────────

export async function verifyRecord(recordId: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { data: updated, error } = await adminClient
    .from('compliance_records')
    .update({ verification_status: 'verified', verified_by: ctx.userId, verified_at: new Date().toISOString(), reviewer_notes: null })
    .eq('id', recordId)
    .eq('employer_id', ctx.employerId)
    .select('id, employment_id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'Record not found.' }

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_record_verified', resourceType: 'compliance_records', resourceId: recordId, employerId: ctx.employerId })
  revalidateAll(updated[0].employment_id)
  return { success: true }
}

export async function rejectRecord(recordId: string, note: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate
  if (!note?.trim()) return { error: 'Tell the person what needs to change.' }

  const adminClient = createAdminClient()
  const { data: updated, error } = await adminClient
    .from('compliance_records')
    .update({ verification_status: 'rejected', verified_by: ctx.userId, verified_at: new Date().toISOString(), reviewer_notes: note.trim() })
    .eq('id', recordId)
    .eq('employer_id', ctx.employerId)
    .select('id, employment_id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'Record not found.' }

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_record_rejected', resourceType: 'compliance_records', resourceId: recordId, employerId: ctx.employerId, metadata: { note: note.trim() } })
  revalidateAll(updated[0].employment_id)
  return { success: true }
}

// ─── Exemptions ──────────────────────────────────────────────────────────────

export async function setExemption(input: { employmentId: string | null; employerRequirementId: string; reason: string }): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate
  if (!input.reason?.trim()) return { error: 'Give a reason for the exemption.' }

  const loaded = await loadRequirement(ctx.employerId, input.employerRequirementId)
  if (!loaded) return { error: 'Requirement not found.' }
  if (input.employmentId && !(await loadEmployment(ctx.employerId, input.employmentId))) return { error: 'Person not found.' }

  const adminClient = createAdminClient()
  let current = adminClient
    .from('compliance_records')
    .select('id')
    .eq('employer_id', ctx.employerId)
    .eq('employer_requirement_id', input.employerRequirementId)
    .eq('is_current', true)
  current = input.employmentId ? current.eq('employment_id', input.employmentId) : current.is('employment_id', null)
  const { data: existing } = await current.maybeSingle()

  if (existing) {
    await adminClient
      .from('compliance_records')
      .update({ is_exempt: true, exempt_reason: input.reason.trim() })
      .eq('id', existing.id)
      .eq('employer_id', ctx.employerId)
  } else {
    const { error } = await adminClient.from('compliance_records').insert({
      employer_id: ctx.employerId,
      employment_id: input.employmentId,
      employer_requirement_id: input.employerRequirementId,
      is_exempt: true,
      exempt_reason: input.reason.trim(),
      verification_status: 'verified',
      verified_by: ctx.userId,
      verified_at: new Date().toISOString(),
      submitted_by: 'employer',
      created_by: ctx.userId,
    })
    if (error) return { error: error.message }
  }

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_record_exempted', resourceType: 'employer_requirements', resourceId: input.employerRequirementId, employerId: ctx.employerId, metadata: { employment_id: input.employmentId, reason: input.reason.trim() } })
  revalidateAll(input.employmentId)
  return { success: true }
}

export async function clearExemption(recordId: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { data: rec } = await adminClient
    .from('compliance_records')
    .select('id, employment_id, issued_at, expires_at, document_path')
    .eq('id', recordId)
    .eq('employer_id', ctx.employerId)
    .maybeSingle()
  if (!rec) return { error: 'Record not found.' }

  // An exemption-only row (no dates, no evidence) is just deleted; a real
  // record with an exemption flag is un-flagged.
  if (!rec.issued_at && !rec.expires_at && !rec.document_path) {
    await adminClient.from('compliance_records').delete().eq('id', recordId).eq('employer_id', ctx.employerId)
  } else {
    await adminClient.from('compliance_records').update({ is_exempt: false, exempt_reason: null }).eq('id', recordId).eq('employer_id', ctx.employerId)
  }

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_record_exempted', resourceType: 'compliance_records', resourceId: recordId, employerId: ctx.employerId, metadata: { cleared: true } })
  revalidateAll(rec.employment_id)
  return { success: true }
}

// ─── Delete a record ─────────────────────────────────────────────────────────

export async function deleteRecord(recordId: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { data: rec } = await adminClient
    .from('compliance_records')
    .select('id, employment_id, employer_requirement_id, document_path, is_current')
    .eq('id', recordId)
    .eq('employer_id', ctx.employerId)
    .maybeSingle()
  if (!rec) return { error: 'Record not found.' }

  const { error } = await adminClient.from('compliance_records').delete().eq('id', recordId).eq('employer_id', ctx.employerId)
  if (error) return { error: error.message }
  if (rec.document_path) await deleteEvidence(rec.document_path)

  // If we deleted the current record, promote the most recent previous one.
  if (rec.is_current) {
    let prev = adminClient
      .from('compliance_records')
      .select('id')
      .eq('employer_id', ctx.employerId)
      .eq('employer_requirement_id', rec.employer_requirement_id)
      .order('created_at', { ascending: false })
      .limit(1)
    prev = rec.employment_id ? prev.eq('employment_id', rec.employment_id) : prev.is('employment_id', null)
    const { data: previous } = await prev.maybeSingle()
    if (previous) {
      await adminClient.from('compliance_records').update({ is_current: true, superseded_by: null }).eq('id', previous.id)
    }
  }

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_record_deleted', resourceType: 'compliance_records', resourceId: recordId, employerId: ctx.employerId })
  revalidateAll(rec.employment_id)
  return { success: true }
}

// ─── View evidence / reference ───────────────────────────────────────────────

export async function getEvidenceUrl(recordId: string): Promise<{ url?: string; reference?: string | null; error?: string }> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { data: rec } = await adminClient
    .from('compliance_records')
    .select('id, document_path, reference_encrypted, employment_id')
    .eq('id', recordId)
    .eq('employer_id', ctx.employerId)
    .maybeSingle()
  if (!rec) return { error: 'Record not found.' }

  const url = rec.document_path ? await createEvidenceViewUrl(rec.document_path) : undefined
  const reference = safeDecryptField(rec.reference_encrypted)

  await writeAudit({ actorId: ctx.userId, actorType: 'employer', action: 'compliance_evidence_viewed', resourceType: 'compliance_records', resourceId: recordId, employerId: ctx.employerId, metadata: { employment_id: rec.employment_id } })
  return { url: url ?? undefined, reference }
}

// ─── Driver CPC hours ────────────────────────────────────────────────────────

export async function addHoursEntry(recordId: string, input: { courseName: string; hours: number; completedOn: string; provider?: string | null }): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const completedOn = parseUkDate(input.completedOn)
  if (!input.courseName?.trim()) return { error: 'Enter the course name.' }
  if (!(input.hours > 0 && input.hours <= 35)) return { error: 'Hours must be between 0.5 and 35.' }
  if (!completedOn) return { error: 'Completion date is not valid.' }

  const adminClient = createAdminClient()
  const { data: rec } = await adminClient
    .from('compliance_records')
    .select('id, employment_id')
    .eq('id', recordId)
    .eq('employer_id', ctx.employerId)
    .maybeSingle()
  if (!rec) return { error: 'Record not found.' }

  const { error } = await adminClient.from('compliance_hours_log').insert({
    record_id: recordId,
    course_name: input.courseName.trim(),
    hours: input.hours,
    completed_on: completedOn,
    provider: input.provider?.trim() || null,
  })
  if (error) return { error: error.message }

  revalidateAll(rec.employment_id)
  return { success: true }
}

export async function deleteHoursEntry(entryId: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { data: entry } = await adminClient.from('compliance_hours_log').select('id, record_id').eq('id', entryId).maybeSingle()
  if (!entry) return { error: 'Entry not found.' }
  const { data: rec } = await adminClient.from('compliance_records').select('id, employment_id').eq('id', entry.record_id).eq('employer_id', ctx.employerId).maybeSingle()
  if (!rec) return { error: 'Entry not found.' }

  await adminClient.from('compliance_hours_log').delete().eq('id', entryId)
  revalidateAll(rec.employment_id)
  return { success: true }
}
