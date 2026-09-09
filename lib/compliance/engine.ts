// lib/compliance/engine.ts
// The renewal engine. Pure functions only: no Supabase, no Date.now() unless
// injected, so every rule is unit-testable (see engine.test.ts).
//
// Dates are ISO 'YYYY-MM-DD' strings at the boundary and UTC Date objects
// internally, so a record does not shift by a day depending on the server's
// timezone.

import {
  DCPC_HOURS_REQUIRED,
  DEFAULT_LEAD_DAYS,
  type ComplianceRecord,
  type ComplianceStatus,
  type EmployerRequirement,
  type RenewalRule,
  type RequirementType,
} from './types'

// ─── Date helpers ────────────────────────────────────────────────────────────

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return Number.isNaN(d.getTime()) ? null : d
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Add calendar months, clamping the day to the target month's length (31 Jan + 1 = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth()
  const day = date.getUTCDate()
  const target = new Date(Date.UTC(y, m + months, 1))
  const daysInTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, daysInTarget))
  return target
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12)
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/** Full years between two dates (age at a given date). */
export function yearsBetween(dob: Date, at: Date): number {
  let years = at.getUTCFullYear() - dob.getUTCFullYear()
  const beforeBirthday =
    at.getUTCMonth() < dob.getUTCMonth() ||
    (at.getUTCMonth() === dob.getUTCMonth() && at.getUTCDate() < dob.getUTCDate())
  if (beforeBirthday) years -= 1
  return years
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b
}

// ─── Interval resolution ─────────────────────────────────────────────────────

/**
 * The renewal interval actually in force: the employer's override when the
 * type allows one, otherwise the library default.
 */
export function effectiveIntervalMonths(
  type: Pick<RequirementType, 'renewal_rule' | 'default_interval_months' | 'interval_locked'>,
  requirement: Pick<EmployerRequirement, 'interval_months_override'> | null | undefined
): number | null {
  if (!type.interval_locked && requirement?.interval_months_override) {
    return requirement.interval_months_override
  }
  return type.default_interval_months ?? null
}

// ─── Expiry computation ──────────────────────────────────────────────────────

export interface ExpiryInput {
  rule: RenewalRule
  /** Completion / issue date. Used by interval and age-based rules. */
  issuedAt?: string | null
  /** The date printed on the document, or the event end date. */
  documentDate?: string | null
  intervalMonths?: number | null
  dateOfBirth?: string | null
  /** For status_check: the date the last status check was performed. */
  lastCheckedAt?: string | null
}

export interface ExpiryResult {
  expiresAt: string | null
  /** Why no expiry could be computed, for the UI to prompt for missing data. */
  note?: 'needs_issue_date' | 'needs_document_date' | 'needs_date_of_birth' | 'needs_check_date' | 'needs_interval'
}

/**
 * The single function that turns a renewal rule plus the facts on a record
 * into the next due date. Each rule is documented next to its branch.
 */
export function computeExpiry(input: ExpiryInput): ExpiryResult {
  switch (input.rule) {
    case 'no_expiry':
      return { expiresAt: null }

    case 'document_date':
    case 'event_based': {
      const d = parseDate(input.documentDate)
      return d ? { expiresAt: toISODate(d) } : { expiresAt: null, note: 'needs_document_date' }
    }

    case 'fixed_interval':
    case 'employer_interval': {
      const issued = parseDate(input.issuedAt)
      if (!issued) return { expiresAt: null, note: 'needs_issue_date' }
      if (!input.intervalMonths) return { expiresAt: null, note: 'needs_interval' }
      return { expiresAt: toISODate(addMonths(issued, input.intervalMonths)) }
    }

    case 'status_check': {
      const checked = parseDate(input.lastCheckedAt) ?? parseDate(input.issuedAt)
      if (!checked) return { expiresAt: null, note: 'needs_check_date' }
      if (!input.intervalMonths) return { expiresAt: null, note: 'needs_interval' }
      return { expiresAt: toISODate(addMonths(checked, input.intervalMonths)) }
    }

    case 'age_based': {
      // DVLA vocational (D4) medical: first at 45, then every 5 years until
      // 65, then annually. If the driver was under 45 at the medical, the
      // next one is due on their 45th birthday.
      const issued = parseDate(input.issuedAt)
      if (!issued) return { expiresAt: null, note: 'needs_issue_date' }
      const dob = parseDate(input.dateOfBirth)
      if (!dob) return { expiresAt: null, note: 'needs_date_of_birth' }
      const age = yearsBetween(dob, issued)
      if (age < 45) return { expiresAt: toISODate(addYears(dob, 45)) }
      if (age < 65) return { expiresAt: toISODate(minDate(addYears(issued, 5), addYears(dob, 65))) }
      return { expiresAt: toISODate(addYears(issued, 1)) }
    }
  }
}

// ─── Status derivation ───────────────────────────────────────────────────────

export interface DerivedStatus {
  status: ComplianceStatus
  /** Days until expiry (negative when expired), null when there is no expiry. */
  daysUntil: number | null
}

export function maxLeadDays(leadDays: number[] | null | undefined): number {
  const list = leadDays && leadDays.length > 0 ? leadDays : DEFAULT_LEAD_DAYS
  return Math.max(...list)
}

/**
 * Derives the status of one requirement for one person from the current
 * record (if any). Never stored; always recomputed from expires_at + today,
 * so it cannot drift.
 */
export function deriveStatus(
  record: Pick<ComplianceRecord, 'expires_at' | 'verification_status' | 'is_exempt'> | null | undefined,
  options: { today: Date; leadDays?: number[] | null; rule?: RenewalRule }
): DerivedStatus {
  if (!record) return { status: 'missing', daysUntil: null }
  if (record.is_exempt) return { status: 'exempt', daysUntil: null }
  if (record.verification_status === 'rejected') return { status: 'rejected', daysUntil: null }

  const expires = parseDate(record.expires_at)
  const daysUntil = expires ? daysBetween(startOfDay(options.today), expires) : null

  if (record.verification_status === 'pending') return { status: 'awaiting_review', daysUntil }
  if (daysUntil === null) return { status: 'valid', daysUntil: null }
  if (daysUntil < 0) return { status: 'expired', daysUntil }
  if (daysUntil <= maxLeadDays(options.leadDays)) return { status: 'expiring', daysUntil }
  return { status: 'valid', daysUntil }
}

export function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// ─── Applicability ───────────────────────────────────────────────────────────

/** Does this requirement apply to a person with these role groups? */
export function requirementApplies(
  requirement: Pick<EmployerRequirement, 'enabled' | 'applies_to' | 'role_group_ids'>,
  employmentRoleGroupIds: string[] | null | undefined
): boolean {
  if (!requirement.enabled) return false
  if (requirement.applies_to === 'all') return true
  const groups = requirement.role_group_ids ?? []
  if (groups.length === 0) return false
  const mine = new Set(employmentRoleGroupIds ?? [])
  return groups.some((g) => mine.has(g))
}

// ─── Driver CPC hours ────────────────────────────────────────────────────────

export interface DcpcSummary {
  cycleStart: string | null
  cycleEnd: string | null
  hoursLogged: number
  hoursRemaining: number
  /** True when the driver is inside the last 12 months with hours still owed. */
  warning: boolean
}

/**
 * 35 hours of periodic training must be completed inside each 5-year DQC
 * cycle. The cycle is the five years ending on the card's expiry date.
 */
export function dcpcHoursSummary(
  entries: { hours: number; completed_on: string }[],
  expiresAt: string | null,
  today: Date
): DcpcSummary {
  const end = parseDate(expiresAt)
  if (!end) {
    const total = entries.reduce((sum, e) => sum + Number(e.hours || 0), 0)
    return { cycleStart: null, cycleEnd: null, hoursLogged: total, hoursRemaining: Math.max(0, DCPC_HOURS_REQUIRED - total), warning: false }
  }
  const start = addYears(end, -5)
  const inCycle = entries.filter((e) => {
    const d = parseDate(e.completed_on)
    return d && d.getTime() > start.getTime() && d.getTime() <= end.getTime()
  })
  const logged = inCycle.reduce((sum, e) => sum + Number(e.hours || 0), 0)
  const remaining = Math.max(0, DCPC_HOURS_REQUIRED - logged)
  const daysLeft = daysBetween(startOfDay(today), end)
  return {
    cycleStart: toISODate(start),
    cycleEnd: toISODate(end),
    hoursLogged: logged,
    hoursRemaining: remaining,
    warning: remaining > 0 && daysLeft <= 365,
  }
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

export type StatusCounts = Record<ComplianceStatus, number>

export function emptyCounts(): StatusCounts {
  return { missing: 0, awaiting_review: 0, rejected: 0, valid: 0, expiring: 0, expired: 0, exempt: 0 }
}

export function countStatuses(statuses: ComplianceStatus[]): StatusCounts {
  const counts = emptyCounts()
  for (const s of statuses) counts[s] += 1
  return counts
}

/** A person is "at risk" if anything is expired, missing or rejected. */
export function worstStatus(statuses: ComplianceStatus[]): ComplianceStatus | null {
  if (statuses.length === 0) return null
  const order: ComplianceStatus[] = ['expired', 'missing', 'rejected', 'expiring', 'awaiting_review', 'valid', 'exempt']
  for (const s of order) if (statuses.includes(s)) return s
  return null
}
