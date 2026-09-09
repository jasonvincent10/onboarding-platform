// lib/compliance/queries.ts
// Server-only loaders that assemble the compliance picture for an employer.
// All reads use adminClient (RLS bypassed), so every function takes an
// employerId that the caller has ALREADY verified via getEmployerContext().
// Nothing here is exported to the client; pages pass plain data down.

import { createAdminClient } from '@/lib/supabase/admin'
import {
  deriveStatus,
  effectiveIntervalMonths,
  requirementApplies,
  worstStatus,
  countStatuses,
  type StatusCounts,
} from './engine'
import type {
  ComplianceRecord,
  ComplianceStatus,
  EmployerRequirement,
  Employment,
  HoursLogEntry,
  RequirementType,
  RoleGroup,
} from './types'

// ─── Raw loaders ─────────────────────────────────────────────────────────────

export async function loadLibrary(employerId: string): Promise<RequirementType[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('compliance_requirement_types')
    .select('*')
    .or(`employer_id.is.null,employer_id.eq.${employerId}`)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  return (data ?? []) as RequirementType[]
}

export async function loadRoleGroups(employerId: string): Promise<RoleGroup[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('role_groups')
    .select('id, name')
    .eq('employer_id', employerId)
    .order('name', { ascending: true })
  return (data ?? []) as RoleGroup[]
}

export async function loadEmployerRequirements(employerId: string): Promise<EmployerRequirement[]> {
  const adminClient = createAdminClient()
  const { data: reqs } = await adminClient
    .from('employer_requirements')
    .select('id, employer_id, requirement_type_id, enabled, interval_months_override, reminder_lead_days, applies_to')
    .eq('employer_id', employerId)
  const list = (reqs ?? []) as EmployerRequirement[]
  if (list.length === 0) return []

  const { data: links } = await adminClient
    .from('employer_requirement_role_groups')
    .select('employer_requirement_id, role_group_id')
    .in('employer_requirement_id', list.map((r) => r.id))

  const byReq = new Map<string, string[]>()
  for (const l of links ?? []) {
    const arr = byReq.get(l.employer_requirement_id) ?? []
    arr.push(l.role_group_id)
    byReq.set(l.employer_requirement_id, arr)
  }
  return list.map((r) => ({ ...r, role_group_ids: byReq.get(r.id) ?? [] }))
}

export async function loadEmployments(
  employerId: string,
  options: { status?: 'active' | 'leaver' | 'all'; ids?: string[] } = {}
): Promise<Employment[]> {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('employments')
    .select('id, employer_id, employee_id, source_onboarding_id, full_name, email, job_title, department, date_of_birth, start_date, end_date, status, invited_at, created_at')
    .eq('employer_id', employerId)
    .order('full_name', { ascending: true })
  const status = options.status ?? 'active'
  if (status !== 'all') query = query.eq('status', status)
  if (options.ids) query = query.in('id', options.ids)
  const { data } = await query
  const list = (data ?? []) as Employment[]
  if (list.length === 0) return []

  // Role groups
  const { data: links } = await adminClient
    .from('employment_role_groups')
    .select('employment_id, role_group_id')
    .in('employment_id', list.map((e) => e.id))
  const groupsByEmployment = new Map<string, string[]>()
  for (const l of links ?? []) {
    const arr = groupsByEmployment.get(l.employment_id) ?? []
    arr.push(l.role_group_id)
    groupsByEmployment.set(l.employment_id, arr)
  }

  // Date of birth fallback from the employee's own profile (needed for the
  // age-based driver medical rule when the employer did not enter one).
  const missingDob = list.filter((e) => !e.date_of_birth && e.employee_id).map((e) => e.employee_id as string)
  const dobByProfile = new Map<string, string>()
  if (missingDob.length > 0) {
    const { data: profiles } = await adminClient
      .from('employee_profiles')
      .select('id, date_of_birth')
      .in('id', missingDob)
    for (const p of profiles ?? []) if (p.date_of_birth) dobByProfile.set(p.id, p.date_of_birth)
  }

  return list.map((e) => ({
    ...e,
    date_of_birth: e.date_of_birth ?? (e.employee_id ? dobByProfile.get(e.employee_id) ?? null : null),
    role_group_ids: groupsByEmployment.get(e.id) ?? [],
  }))
}

export async function loadCurrentRecords(employerId: string, employmentIds?: string[]): Promise<ComplianceRecord[]> {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('compliance_records')
    .select('id, employer_id, employment_id, employer_requirement_id, issued_at, expires_at, last_checked_at, document_path, document_name, attributes, verification_status, verified_by, verified_at, reviewer_notes, is_exempt, exempt_reason, is_current, superseded_by, submitted_by, created_at')
    .eq('employer_id', employerId)
    .eq('is_current', true)
  if (employmentIds) query = query.in('employment_id', employmentIds)
  const { data } = await query
  return (data ?? []) as ComplianceRecord[]
}

export async function loadRecordHistory(employerId: string, employmentId: string | null, employerRequirementId: string): Promise<ComplianceRecord[]> {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('compliance_records')
    .select('id, employer_id, employment_id, employer_requirement_id, issued_at, expires_at, last_checked_at, document_path, document_name, attributes, verification_status, verified_by, verified_at, reviewer_notes, is_exempt, exempt_reason, is_current, superseded_by, submitted_by, created_at')
    .eq('employer_id', employerId)
    .eq('employer_requirement_id', employerRequirementId)
    .order('created_at', { ascending: false })
  query = employmentId ? query.eq('employment_id', employmentId) : query.is('employment_id', null)
  const { data } = await query
  return (data ?? []) as ComplianceRecord[]
}

// ─── Assembled view ──────────────────────────────────────────────────────────

export interface RequirementCell {
  requirement: EmployerRequirement
  type: RequirementType
  record: ComplianceRecord | null
  status: ComplianceStatus
  daysUntil: number | null
  intervalMonths: number | null
}

export interface PersonCompliance {
  employment: Employment
  cells: RequirementCell[]
  counts: StatusCounts
  worst: ComplianceStatus | null
}

export interface ComplianceOverview {
  people: PersonCompliance[]
  organisation: RequirementCell[]
  /** Enabled person-level requirements, in library order (matrix columns). */
  personRequirements: { requirement: EmployerRequirement; type: RequirementType }[]
  roleGroups: RoleGroup[]
  totals: StatusCounts & { people: number; atRisk: number; workBlockingExpired: number }
}

/**
 * Builds the whole matrix for an employer: every active person crossed with
 * every enabled requirement that applies to them, plus organisation-level
 * requirements. Status is derived on the fly.
 */
export async function buildComplianceOverview(employerId: string, today = new Date()): Promise<ComplianceOverview> {
  const [library, requirements, roleGroups, employments, records] = await Promise.all([
    loadLibrary(employerId),
    loadEmployerRequirements(employerId),
    loadRoleGroups(employerId),
    loadEmployments(employerId, { status: 'active' }),
    loadCurrentRecords(employerId),
  ])

  const typeById = new Map(library.map((t) => [t.id, t]))
  const enabled = requirements
    .filter((r) => r.enabled && typeById.has(r.requirement_type_id))
    .map((r) => ({ requirement: r, type: typeById.get(r.requirement_type_id)! }))
    .sort((a, b) => a.type.sort_order - b.type.sort_order || a.type.name.localeCompare(b.type.name))

  const personRequirements = enabled.filter((e) => e.type.subject === 'person')
  const orgRequirements = enabled.filter((e) => e.type.subject === 'organisation')

  const recordKey = (employmentId: string | null, reqId: string) => `${employmentId ?? 'org'}:${reqId}`
  const recordByKey = new Map<string, ComplianceRecord>()
  for (const rec of records) recordByKey.set(recordKey(rec.employment_id, rec.employer_requirement_id), rec)

  const buildCell = (employmentId: string | null, entry: { requirement: EmployerRequirement; type: RequirementType }): RequirementCell => {
    const record = recordByKey.get(recordKey(employmentId, entry.requirement.id)) ?? null
    const derived = deriveStatus(record, { today, leadDays: entry.requirement.reminder_lead_days, rule: entry.type.renewal_rule })
    return {
      requirement: entry.requirement,
      type: entry.type,
      record,
      status: derived.status,
      daysUntil: derived.daysUntil,
      intervalMonths: effectiveIntervalMonths(entry.type, entry.requirement),
    }
  }

  const people: PersonCompliance[] = employments.map((employment) => {
    const cells = personRequirements
      .filter((entry) => requirementApplies(entry.requirement, employment.role_group_ids))
      .map((entry) => buildCell(employment.id, entry))
    const statuses = cells.map((c) => c.status)
    return { employment, cells, counts: countStatuses(statuses), worst: worstStatus(statuses) }
  })

  const organisation = orgRequirements.map((entry) => buildCell(null, entry))

  const all = [...people.flatMap((p) => p.cells), ...organisation]
  const totals = countStatuses(all.map((c) => c.status))
  const atRisk = people.filter((p) => p.worst === 'expired' || p.worst === 'missing' || p.worst === 'rejected').length
  const workBlockingExpired = all.filter((c) => c.type.work_blocking && (c.status === 'expired' || c.status === 'missing')).length

  return {
    people,
    organisation,
    personRequirements,
    roleGroups,
    totals: { ...totals, people: employments.length, atRisk, workBlockingExpired },
  }
}

/** The cells for one person, with the same derivation as the overview. */
export async function buildPersonCompliance(employerId: string, employmentId: string, today = new Date()): Promise<PersonCompliance | null> {
  const [library, requirements, employments, records] = await Promise.all([
    loadLibrary(employerId),
    loadEmployerRequirements(employerId),
    loadEmployments(employerId, { status: 'all', ids: [employmentId] }),
    loadCurrentRecords(employerId, [employmentId]),
  ])
  const employment = employments[0]
  if (!employment) return null

  const typeById = new Map(library.map((t) => [t.id, t]))
  const recordByReq = new Map(records.map((r) => [r.employer_requirement_id, r]))

  const cells: RequirementCell[] = requirements
    .filter((r) => r.enabled && typeById.get(r.requirement_type_id)?.subject === 'person')
    .filter((r) => requirementApplies(r, employment.role_group_ids))
    .map((requirement) => {
      const type = typeById.get(requirement.requirement_type_id)!
      const record = recordByReq.get(requirement.id) ?? null
      const derived = deriveStatus(record, { today, leadDays: requirement.reminder_lead_days, rule: type.renewal_rule })
      return { requirement, type, record, status: derived.status, daysUntil: derived.daysUntil, intervalMonths: effectiveIntervalMonths(type, requirement) }
    })
    .sort((a, b) => a.type.sort_order - b.type.sort_order)

  const statuses = cells.map((c) => c.status)
  return { employment, cells, counts: countStatuses(statuses), worst: worstStatus(statuses) }
}

// ─── Driver CPC hours ────────────────────────────────────────────────────────

export async function loadHoursLog(employerId: string, recordIds: string[]): Promise<Record<string, HoursLogEntry[]>> {
  if (recordIds.length === 0) return {}
  const adminClient = createAdminClient()
  // Scope by employer through the records table so a foreign record id returns nothing.
  const { data: owned } = await adminClient
    .from('compliance_records')
    .select('id')
    .eq('employer_id', employerId)
    .in('id', recordIds)
  const ownedIds = (owned ?? []).map((r) => r.id)
  if (ownedIds.length === 0) return {}
  const { data } = await adminClient
    .from('compliance_hours_log')
    .select('id, record_id, course_name, hours, completed_on, provider, document_path')
    .in('record_id', ownedIds)
    .order('completed_on', { ascending: false })
  const byRecord: Record<string, HoursLogEntry[]> = {}
  for (const row of (data ?? []) as HoursLogEntry[]) {
    ;(byRecord[row.record_id] ??= []).push({ ...row, hours: Number(row.hours) })
  }
  return byRecord
}

// ─── Employee view ───────────────────────────────────────────────────────────

export interface EmployeeEmployerView {
  employment: Employment
  companyName: string
  cells: RequirementCell[]
  counts: StatusCounts
}

/**
 * Everything one employee can see about their own compliance, across every
 * active employment linked to their profile. employeeProfileId must come
 * from the caller's session (never a param).
 */
export async function buildEmployeeCompliance(employeeProfileId: string, today = new Date()): Promise<EmployeeEmployerView[]> {
  const adminClient = createAdminClient()
  const { data: employmentRows } = await adminClient
    .from('employments')
    .select('id, employer_id, employee_id, source_onboarding_id, full_name, email, job_title, department, date_of_birth, start_date, end_date, status, invited_at, created_at')
    .eq('employee_id', employeeProfileId)
    .eq('status', 'active')
  const employments = (employmentRows ?? []) as Employment[]
  if (employments.length === 0) return []

  const views: EmployeeEmployerView[] = []
  for (const base of employments) {
    const [employmentList, library, requirements, records, account] = await Promise.all([
      loadEmployments(base.employer_id, { status: 'active', ids: [base.id] }),
      loadLibrary(base.employer_id),
      loadEmployerRequirements(base.employer_id),
      loadCurrentRecords(base.employer_id, [base.id]),
      adminClient.from('employer_accounts').select('company_name').eq('id', base.employer_id).maybeSingle(),
    ])
    const employment = employmentList[0] ?? base
    const typeById = new Map(library.map((t) => [t.id, t]))
    const recordByReq = new Map(records.map((r) => [r.employer_requirement_id, r]))
    const cells: RequirementCell[] = requirements
      .filter((r) => r.enabled && typeById.get(r.requirement_type_id)?.subject === 'person')
      .filter((r) => requirementApplies(r, employment.role_group_ids))
      .map((requirement) => {
        const type = typeById.get(requirement.requirement_type_id)!
        const record = recordByReq.get(requirement.id) ?? null
        const derived = deriveStatus(record, { today, leadDays: requirement.reminder_lead_days, rule: type.renewal_rule })
        return { requirement, type, record, status: derived.status, daysUntil: derived.daysUntil, intervalMonths: effectiveIntervalMonths(type, requirement) }
      })
      .sort((a, b) => a.type.sort_order - b.type.sort_order)
    views.push({
      employment,
      companyName: account.data?.company_name ?? 'Your employer',
      cells,
      counts: countStatuses(cells.map((c) => c.status)),
    })
  }
  return views
}
