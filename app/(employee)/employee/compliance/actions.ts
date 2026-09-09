'use server'

// ============================================================================
// Employee self-service compliance actions.
// SECURITY: identity comes from the session. The employment must be linked to
// the caller's own employee profile before any read or write. Employee
// uploads are created as PENDING and only count once an employer member
// verifies them.
// ============================================================================

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptField } from '@/lib/encryption'
import { computeExpiry, effectiveIntervalMonths } from '@/lib/compliance/engine'
import { parseUkDate } from '@/lib/compliance/csv-import'
import { writeAudit } from '@/lib/compliance/audit'
import {
  buildEvidencePath,
  createEvidenceUploadUrl,
  createEvidenceViewUrl,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MIME_TYPES,
  isPathInFolder,
} from '@/lib/compliance/evidence'
import type { RequirementType } from '@/lib/compliance/types'

export type ActionResult = { error?: string; success?: boolean; id?: string }

async function getMyEmployment(employmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('employee_profiles').select('id, date_of_birth').eq('user_id', user.id).maybeSingle()
  if (!profile) return null
  const { data: employment } = await adminClient
    .from('employments')
    .select('id, employer_id, employee_id, date_of_birth, full_name, status')
    .eq('id', employmentId)
    .eq('employee_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!employment) return null
  return { user, profile, employment }
}

export async function prepareMyEvidenceUpload(input: { employmentId: string; fileName: string; mimeType: string; sizeBytes: number }): Promise<{ path: string; token: string } | { error: string }> {
  const me = await getMyEmployment(input.employmentId)
  if (!me) return { error: 'Not authorised' }
  if (!EVIDENCE_MIME_TYPES[input.mimeType]) return { error: 'Only PDF, JPG and PNG files are accepted.' }
  if (input.sizeBytes > EVIDENCE_MAX_BYTES) return { error: 'File must be under 10MB.' }

  const path = buildEvidencePath(me.employment.employer_id, me.employment.id, input.fileName, input.mimeType)
  const signed = await createEvidenceUploadUrl(path)
  if ('error' in signed) return { error: signed.error }
  return { path, token: signed.token }
}

export interface SubmitEvidenceInput {
  employmentId: string
  employerRequirementId: string
  issuedAt?: string | null
  documentDate?: string | null
  reference?: string | null
  attributes?: Record<string, unknown>
  documentPath?: string | null
  documentName?: string | null
}

export async function submitMyEvidence(input: SubmitEvidenceInput): Promise<ActionResult> {
  const me = await getMyEmployment(input.employmentId)
  if (!me) return { error: 'Not authorised' }
  const { employment, profile, user } = me
  const adminClient = createAdminClient()

  const { data: req } = await adminClient
    .from('employer_requirements')
    .select('id, requirement_type_id, enabled, interval_months_override, reminder_lead_days')
    .eq('id', input.employerRequirementId)
    .eq('employer_id', employment.employer_id)
    .eq('enabled', true)
    .maybeSingle()
  if (!req) return { error: 'Requirement not found.' }
  const { data: typeRow } = await adminClient.from('compliance_requirement_types').select('*').eq('id', req.requirement_type_id).maybeSingle()
  if (!typeRow) return { error: 'Requirement not found.' }
  const type = typeRow as RequirementType
  if (type.subject !== 'person') return { error: 'This requirement is not something you upload.' }

  const issuedAt = input.issuedAt ? parseUkDate(input.issuedAt) : null
  const documentDate = input.documentDate ? parseUkDate(input.documentDate) : null
  if (input.issuedAt && !issuedAt) return { error: 'Issue date is not a valid date.' }
  if (input.documentDate && !documentDate) return { error: 'Expiry date is not a valid date.' }
  if (input.documentPath && !isPathInFolder(input.documentPath, employment.employer_id, employment.id)) return { error: 'Evidence file does not belong to this record.' }
  if (type.evidence_required && !input.documentPath && !input.reference) return { error: 'Upload the document or enter the reference number.' }

  const expiry = computeExpiry({
    rule: type.renewal_rule,
    issuedAt,
    documentDate,
    intervalMonths: effectiveIntervalMonths(type, req),
    dateOfBirth: employment.date_of_birth ?? profile.date_of_birth ?? null,
    lastCheckedAt: type.renewal_rule === 'status_check' ? issuedAt : null,
  })
  if (expiry.note === 'needs_issue_date' || expiry.note === 'needs_check_date') return { error: 'Enter the date this was completed or issued.' }
  if (expiry.note === 'needs_document_date') return { error: 'Enter the expiry date shown on the document.' }
  if (expiry.note === 'needs_date_of_birth') return { error: 'Your date of birth is needed to work out the next due date. Ask your employer to add it.' }
  if (expiry.note === 'needs_interval') return { error: 'Your employer has not set a renewal interval for this yet.' }

  const { data: previous } = await adminClient
    .from('compliance_records')
    .select('id')
    .eq('employer_id', employment.employer_id)
    .eq('employment_id', employment.id)
    .eq('employer_requirement_id', req.id)
    .eq('is_current', true)
    .maybeSingle()

  const { data: inserted, error } = await adminClient
    .from('compliance_records')
    .insert({
      employer_id: employment.employer_id,
      employment_id: employment.id,
      employer_requirement_id: req.id,
      issued_at: issuedAt,
      expires_at: expiry.expiresAt,
      last_checked_at: type.renewal_rule === 'status_check' ? issuedAt : null,
      document_path: input.documentPath ?? null,
      document_name: input.documentName ?? null,
      reference_encrypted: input.reference?.trim() ? encryptField(input.reference.trim()) : null,
      attributes: input.attributes ?? {},
      verification_status: 'pending',
      submitted_by: 'employee',
      created_by: user.id,
      is_current: true,
    })
    .select('id')
    .single()
  if (error || !inserted) return { error: error?.message ?? 'Could not save.' }

  if (previous) {
    await adminClient.from('compliance_records').update({ is_current: false, superseded_by: inserted.id }).eq('id', previous.id)
  }

  await writeAudit({
    actorId: user.id,
    actorType: 'employee',
    action: 'compliance_record_created',
    resourceType: 'compliance_records',
    resourceId: inserted.id,
    employerId: employment.employer_id,
    employeeId: profile.id,
    metadata: { requirement: type.code ?? type.name, submitted_by: 'employee' },
  })

  revalidatePath('/employee/compliance')
  revalidatePath('/compliance')
  revalidatePath(`/workforce/${employment.id}`)
  return { success: true, id: inserted.id }
}

export async function getMyEvidenceUrl(recordId: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('employee_profiles').select('id').eq('user_id', user.id).maybeSingle()
  if (!profile) return { error: 'Not authorised' }

  const { data: rec } = await adminClient.from('compliance_records').select('id, employment_id, document_path').eq('id', recordId).maybeSingle()
  if (!rec || !rec.employment_id || !rec.document_path) return { error: 'No document on this record.' }
  const { data: employment } = await adminClient.from('employments').select('id').eq('id', rec.employment_id).eq('employee_id', profile.id).maybeSingle()
  if (!employment) return { error: 'Not authorised' }

  const url = await createEvidenceViewUrl(rec.document_path)
  return url ? { url } : { error: 'Could not open the document.' }
}
