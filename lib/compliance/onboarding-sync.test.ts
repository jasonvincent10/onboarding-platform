import { describe, expect, it } from 'vitest'
import { decideRecordDates } from './onboarding-sync'

const TODAY = '2026-09-09'

describe('decideRecordDates', () => {
  describe('when the document carries an expiry date', () => {
    it('trusts it over any rule, because the employee read it off the document', () => {
      for (const rule of ['fixed_interval', 'employer_interval', 'document_date', 'age_based', 'status_check', 'event_based'] as const) {
        const d = decideRecordDates(rule, '2029-04-01', null, TODAY)
        expect(d.expiresAt).toBe('2029-04-01')
        expect(d.pending).toBe(false)
        expect(d.note).toBeNull()
      }
    })
  })

  describe('when there is no date on the document', () => {
    it('records a no-expiry requirement as valid from today', () => {
      const d = decideRecordDates('no_expiry', null, null, TODAY)
      expect(d.issuedAt).toBe(TODAY)
      expect(d.expiresAt).toBeNull()
      expect(d.pending).toBe(false)
    })

    it('never guesses an issue date for interval rules', () => {
      // The whole point: a CSCS card approved today might expire next month.
      // Assuming it was issued today would show five years of false validity.
      for (const rule of ['fixed_interval', 'employer_interval'] as const) {
        const d = decideRecordDates(rule, null, null, TODAY)
        expect(d.issuedAt).toBeNull()
        expect(d.expiresAt).toBeNull()
        expect(d.pending).toBe(true)
        expect(d.note).toMatch(/issued/)
      }
    })

    it('asks for a check date rather than an issue date on status checks', () => {
      const d = decideRecordDates('status_check', null, null, TODAY)
      expect(d.pending).toBe(true)
      expect(d.note).toMatch(/checked/)
    })

    it('asks for a date of birth on age-based rules when none is held', () => {
      const d = decideRecordDates('age_based', null, null, TODAY)
      expect(d.pending).toBe(true)
      expect(d.note).toMatch(/date of birth/)
    })

    it('still asks for the medical date when a date of birth is known', () => {
      // Knowing the birthday is not enough on its own: the rule counts from
      // the last medical, so that date is still needed.
      const d = decideRecordDates('age_based', null, '1980-05-20', TODAY)
      expect(d.pending).toBe(true)
      expect(d.note).toMatch(/issued/)
    })

    it('leaves document-date rules pending, since the date is the whole record', () => {
      const d = decideRecordDates('document_date', null, null, TODAY)
      expect(d.pending).toBe(true)
      expect(d.expiresAt).toBeNull()
    })
  })

  it('never produces a verified record with no expiry unless the rule says it never expires', () => {
    const rules = ['fixed_interval', 'employer_interval', 'document_date', 'no_expiry', 'age_based', 'status_check', 'event_based'] as const
    for (const rule of rules) {
      const d = decideRecordDates(rule, null, '1980-05-20', TODAY)
      if (!d.pending) expect(rule).toBe('no_expiry')
    }
  })
})
