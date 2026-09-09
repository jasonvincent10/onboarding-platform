// app/api/export/compliance/route.ts
// CSV export of compliance records, for auditors (CQC, EHO, DVSA) and for
// pushing confirmed data into HR, payroll or rostering systems.
//
// GET /api/export/compliance                       every active person, current records
// GET /api/export/compliance?employmentId=<uuid>   one person (any status)
// GET /api/export/compliance?verifiedOnly=1        only verified, non-exempt records
// GET /api/export/compliance?includeLeavers=1      add leavers
//
// One row per person per applicable requirement, plus organisation rows.
// Reference numbers are decrypted here because the employer is the data
// controller for these records; the export is audit-logged.

import { getEmployerContext } from '@/lib/entitlements'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeDecryptField } from '@/lib/encryption'
import { buildComplianceOverview, buildPersonCompliance, loadEmployments, type RequirementCell } from '@/lib/compliance/queries'
import { STATUS_META } from '@/lib/compliance/types'
import { toCsv, csvResponse } from '@/lib/csv'
import { writeAudit } from '@/lib/compliance/audit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const ctx = await getEmployerContext()
  if (!ctx) return new Response('Not authenticated', { status: 401 })
  if (!ctx.entitlements.compliance) return new Response('Compliance export needs the Comply plan', { status: 403 })

  const url = new URL(request.url)
  const employmentId = url.searchParams.get('employmentId')
  const verifiedOnly = url.searchParams.get('verifiedOnly') === '1'
  const includeLeavers = url.searchParams.get('includeLeavers') === '1'

  const adminClient = createAdminClient()

  type Row = { person: { id: string; full_name: string; email: string | null; job_title: string | null; department: string | null; status: string } | null; cell: RequirementCell }
  const rows: Row[] = []

  if (employmentId) {
    const person = await buildPersonCompliance(ctx.employerId, employmentId)
    if (!person) return new Response('Person not found', { status: 404 })
    for (const cell of person.cells) rows.push({ person: person.employment, cell })
  } else {
    const overview = await buildComplianceOverview(ctx.employerId)
    for (const p of overview.people) for (const cell of p.cells) rows.push({ person: p.employment, cell })
    for (const cell of overview.organisation) rows.push({ person: null, cell })
    if (includeLeavers) {
      const leavers = await loadEmployments(ctx.employerId, { status: 'leaver' })
      for (const l of leavers) {
        const pc = await buildPersonCompliance(ctx.employerId, l.id)
        if (pc) for (const cell of pc.cells) rows.push({ person: pc.employment, cell })
      }
    }
  }

  const filtered = verifiedOnly
    ? rows.filter((r) => r.cell.record && r.cell.record.verification_status === 'verified' && !r.cell.record.is_exempt)
    : rows

  // Decrypt references in one pass.
  const recordIds = filtered.map((r) => r.cell.record?.id).filter((x): x is string => !!x)
  const referenceById = new Map<string, string | null>()
  if (recordIds.length > 0) {
    const { data } = await adminClient.from('compliance_records').select('id, reference_encrypted').eq('employer_id', ctx.employerId).in('id', recordIds)
    for (const r of data ?? []) referenceById.set(r.id, safeDecryptField(r.reference_encrypted))
  }

  const headers = [
    'person_name',
    'person_email',
    'job_title',
    'department',
    'employment_status',
    'requirement',
    'requirement_code',
    'category',
    'required_to_work',
    'status',
    'issued_at',
    'expires_at',
    'last_checked_at',
    'days_until_expiry',
    'verification_status',
    'verified_at',
    'submitted_by',
    'reference_number',
    'attributes',
    'evidence_attached',
    'exempt_reason',
    'reviewer_notes',
  ]

  const data: unknown[][] = filtered.map(({ person, cell }) => {
    const rec = cell.record
    const attrs = rec?.attributes ? Object.entries(rec.attributes).map(([k, v]) => `${k}=${String(v)}`).join('; ') : ''
    return [
      person ? person.full_name : 'Organisation',
      person?.email ?? '',
      person?.job_title ?? '',
      person?.department ?? '',
      person?.status ?? '',
      cell.type.name,
      cell.type.code ?? '',
      cell.type.category,
      cell.type.work_blocking ? 'yes' : 'no',
      STATUS_META[cell.status].label,
      rec?.issued_at ?? '',
      rec?.expires_at ?? '',
      rec?.last_checked_at ?? '',
      cell.daysUntil ?? '',
      rec?.verification_status ?? '',
      rec?.verified_at ?? '',
      rec?.submitted_by ?? '',
      rec ? referenceById.get(rec.id) ?? '' : '',
      attrs,
      rec?.document_path ? 'yes' : 'no',
      rec?.exempt_reason ?? '',
      rec?.reviewer_notes ?? '',
    ]
  })

  await writeAudit({
    actorId: ctx.userId,
    actorType: 'employer',
    action: 'data_exported',
    resourceType: 'compliance_records',
    resourceId: employmentId,
    employerId: ctx.employerId,
    metadata: { export_type: 'compliance_csv', row_count: data.length, verified_only: verifiedOnly, include_leavers: includeLeavers },
  })

  const stamp = new Date().toISOString().slice(0, 10)
  const name = employmentId ? `compliance-${filtered[0]?.person?.full_name?.replace(/[^a-z0-9]+/gi, '-').toLowerCase() ?? 'person'}-${stamp}.csv` : `compliance-export-${stamp}.csv`
  return csvResponse(toCsv(headers, data), name)
}
