import { describe, expect, it } from 'vitest'
import {
  addMonths,
  computeExpiry,
  countStatuses,
  dcpcHoursSummary,
  deriveStatus,
  effectiveIntervalMonths,
  parseDate,
  requirementApplies,
  worstStatus,
  yearsBetween,
} from './engine'

const d = (s: string) => parseDate(s)!

describe('addMonths', () => {
  it('adds whole months', () => {
    expect(addMonths(d('2026-01-15'), 12).toISOString().slice(0, 10)).toBe('2027-01-15')
  })
  it('clamps to the end of a shorter month', () => {
    expect(addMonths(d('2026-01-31'), 1).toISOString().slice(0, 10)).toBe('2026-02-28')
    expect(addMonths(d('2028-01-31'), 1).toISOString().slice(0, 10)).toBe('2028-02-29')
  })
  it('handles year rollover and negative months', () => {
    expect(addMonths(d('2026-11-30'), 3).toISOString().slice(0, 10)).toBe('2027-02-28')
    expect(addMonths(d('2026-03-31'), -1).toISOString().slice(0, 10)).toBe('2026-02-28')
  })
})

describe('yearsBetween', () => {
  it('counts full years only', () => {
    expect(yearsBetween(d('1981-06-10'), d('2026-06-09'))).toBe(44)
    expect(yearsBetween(d('1981-06-10'), d('2026-06-10'))).toBe(45)
  })
})

describe('computeExpiry', () => {
  it('fixed interval: CSCS card 5 years from issue', () => {
    expect(computeExpiry({ rule: 'fixed_interval', issuedAt: '2026-03-01', intervalMonths: 60 })).toEqual({ expiresAt: '2031-03-01' })
  })
  it('employer interval: food hygiene 3 years', () => {
    expect(computeExpiry({ rule: 'employer_interval', issuedAt: '2024-09-30', intervalMonths: 36 })).toEqual({ expiresAt: '2027-09-30' })
  })
  it('interval rules need an issue date and an interval', () => {
    expect(computeExpiry({ rule: 'fixed_interval', intervalMonths: 60 }).note).toBe('needs_issue_date')
    expect(computeExpiry({ rule: 'employer_interval', issuedAt: '2026-01-01' }).note).toBe('needs_interval')
  })
  it('document date: visa expiry is taken as-is', () => {
    expect(computeExpiry({ rule: 'document_date', documentDate: '2027-04-18' })).toEqual({ expiresAt: '2027-04-18' })
    expect(computeExpiry({ rule: 'document_date' }).note).toBe('needs_document_date')
  })
  it('event based: site induction ends with the project', () => {
    expect(computeExpiry({ rule: 'event_based', documentDate: '2026-12-31' })).toEqual({ expiresAt: '2026-12-31' })
  })
  it('no expiry', () => {
    expect(computeExpiry({ rule: 'no_expiry', issuedAt: '2020-01-01' })).toEqual({ expiresAt: null })
  })
  it('status check: DBS Update Service recheck 12 months after last check', () => {
    expect(computeExpiry({ rule: 'status_check', lastCheckedAt: '2026-02-14', intervalMonths: 12 })).toEqual({ expiresAt: '2027-02-14' })
    expect(computeExpiry({ rule: 'status_check', issuedAt: '2026-02-14', intervalMonths: 6 })).toEqual({ expiresAt: '2026-08-14' })
    expect(computeExpiry({ rule: 'status_check', intervalMonths: 6 }).note).toBe('needs_check_date')
  })

  describe('age based: driver medical', () => {
    it('under 45 at the medical: next due on the 45th birthday', () => {
      expect(computeExpiry({ rule: 'age_based', issuedAt: '2026-01-10', dateOfBirth: '1990-05-20' })).toEqual({ expiresAt: '2035-05-20' })
    })
    it('45 to 64: five years, capped at the 65th birthday', () => {
      expect(computeExpiry({ rule: 'age_based', issuedAt: '2026-01-10', dateOfBirth: '1976-05-20' })).toEqual({ expiresAt: '2031-01-10' })
      expect(computeExpiry({ rule: 'age_based', issuedAt: '2026-01-10', dateOfBirth: '1963-05-20' })).toEqual({ expiresAt: '2028-05-20' })
    })
    it('65 and over: annually', () => {
      expect(computeExpiry({ rule: 'age_based', issuedAt: '2026-01-10', dateOfBirth: '1958-05-20' })).toEqual({ expiresAt: '2027-01-10' })
    })
    it('needs a date of birth', () => {
      expect(computeExpiry({ rule: 'age_based', issuedAt: '2026-01-10' }).note).toBe('needs_date_of_birth')
    })
  })
})

describe('effectiveIntervalMonths', () => {
  const locked = { renewal_rule: 'fixed_interval' as const, default_interval_months: 60, interval_locked: true }
  const open = { renewal_rule: 'employer_interval' as const, default_interval_months: 36, interval_locked: false }
  it('ignores overrides on locked intervals', () => {
    expect(effectiveIntervalMonths(locked, { interval_months_override: 12 })).toBe(60)
  })
  it('honours overrides on open intervals and falls back to the default', () => {
    expect(effectiveIntervalMonths(open, { interval_months_override: 24 })).toBe(24)
    expect(effectiveIntervalMonths(open, { interval_months_override: null })).toBe(36)
    expect(effectiveIntervalMonths(open, null)).toBe(36)
  })
})

describe('deriveStatus', () => {
  const today = d('2026-09-08')
  const base = { verification_status: 'verified' as const, is_exempt: false }

  it('missing when there is no record', () => {
    expect(deriveStatus(null, { today })).toEqual({ status: 'missing', daysUntil: null })
  })
  it('exempt beats everything', () => {
    expect(deriveStatus({ ...base, is_exempt: true, expires_at: '2020-01-01' }, { today }).status).toBe('exempt')
  })
  it('rejected evidence needs a re-upload', () => {
    expect(deriveStatus({ ...base, verification_status: 'rejected', expires_at: '2030-01-01' }, { today }).status).toBe('rejected')
  })
  it('pending evidence is awaiting review', () => {
    expect(deriveStatus({ ...base, verification_status: 'pending', expires_at: '2030-01-01' }, { today }).status).toBe('awaiting_review')
  })
  it('no expiry date means valid', () => {
    expect(deriveStatus({ ...base, expires_at: null }, { today })).toEqual({ status: 'valid', daysUntil: null })
  })
  it('expired yesterday, valid today', () => {
    expect(deriveStatus({ ...base, expires_at: '2026-09-07' }, { today })).toEqual({ status: 'expired', daysUntil: -1 })
    expect(deriveStatus({ ...base, expires_at: '2026-09-08' }, { today })).toEqual({ status: 'expiring', daysUntil: 0 })
  })
  it('expiring inside the largest lead window, valid outside it', () => {
    expect(deriveStatus({ ...base, expires_at: '2026-12-07' }, { today }).status).toBe('expiring') // 90 days
    expect(deriveStatus({ ...base, expires_at: '2026-12-08' }, { today }).status).toBe('valid') // 91 days
    expect(deriveStatus({ ...base, expires_at: '2026-10-01' }, { today, leadDays: [14] }).status).toBe('valid')
    expect(deriveStatus({ ...base, expires_at: '2026-09-20' }, { today, leadDays: [14] }).status).toBe('expiring')
  })
})

describe('requirementApplies', () => {
  it('disabled never applies', () => {
    expect(requirementApplies({ enabled: false, applies_to: 'all' }, [])).toBe(false)
  })
  it('all applies to everyone', () => {
    expect(requirementApplies({ enabled: true, applies_to: 'all' }, [])).toBe(true)
  })
  it('role groups need an overlap', () => {
    const req = { enabled: true, applies_to: 'role_groups' as const, role_group_ids: ['drivers'] }
    expect(requirementApplies(req, ['drivers', 'office'])).toBe(true)
    expect(requirementApplies(req, ['office'])).toBe(false)
    expect(requirementApplies({ ...req, role_group_ids: [] }, ['drivers'])).toBe(false)
  })
})

describe('dcpcHoursSummary', () => {
  const today = d('2026-09-08')
  it('sums hours inside the 5-year cycle ending at expiry', () => {
    const s = dcpcHoursSummary(
      [
        { hours: 7, completed_on: '2022-01-10' }, // inside
        { hours: 7, completed_on: '2020-12-31' }, // outside (before cycle start)
        { hours: 3.5, completed_on: '2026-06-01' }, // inside
      ],
      '2027-03-01',
      today
    )
    expect(s.cycleStart).toBe('2022-03-01')
    expect(s.hoursLogged).toBe(3.5) // only the 2026 course is inside 2022-03-01..2027-03-01
    expect(s.hoursRemaining).toBe(31.5)
    expect(s.warning).toBe(true) // under a year left with hours owed
  })
  it('no warning when complete or when more than a year remains', () => {
    expect(dcpcHoursSummary([{ hours: 35, completed_on: '2025-01-01' }], '2027-03-01', today).warning).toBe(false)
    expect(dcpcHoursSummary([], '2029-03-01', today).warning).toBe(false)
  })
})

describe('aggregation', () => {
  it('counts and ranks', () => {
    expect(countStatuses(['valid', 'valid', 'expired']).valid).toBe(2)
    expect(worstStatus(['valid', 'expiring', 'missing'])).toBe('missing')
    expect(worstStatus([])).toBeNull()
  })
})
