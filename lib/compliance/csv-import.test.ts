import { describe, expect, it } from 'vitest'
import { parseCsv, parseUkDate, parseWorkforceCsv } from './csv-import'

describe('parseCsv', () => {
  it('handles quotes, embedded commas and CRLF', () => {
    const rows = parseCsv('a,b\r\n"Smith, Jane","say ""hi"""\r\n')
    expect(rows).toEqual([['a', 'b'], ['Smith, Jane', 'say "hi"']])
  })
  it('drops blank lines and a BOM', () => {
    expect(parseCsv('﻿x\n\n\ny\n')).toEqual([['x'], ['y']])
  })
})

describe('parseUkDate', () => {
  it('accepts ISO and UK formats', () => {
    expect(parseUkDate('2026-03-05')).toBe('2026-03-05')
    expect(parseUkDate('05/03/2026')).toBe('2026-03-05')
    expect(parseUkDate('5.3.2026')).toBe('2026-03-05')
  })
  it('rejects impossible dates', () => {
    expect(parseUkDate('31/02/2026')).toBeNull()
    expect(parseUkDate('2026-13-01')).toBeNull()
    expect(parseUkDate('March 5')).toBeNull()
  })
})

describe('parseWorkforceCsv', () => {
  it('maps flexible headers and normalises values', () => {
    const csv = [
      'Full Name,Email Address,Job Title,Team,Start date,DOB,Role groups,Payroll No',
      'Jane Smith,JANE@Example.com,Care Assistant,Nights,01/02/2024,20/05/1990,Drivers; Nights,123',
    ].join('\n')
    const result = parseWorkforceCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.ignoredColumns).toEqual(['Payroll No'])
    expect(result.people).toEqual([
      {
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        job_title: 'Care Assistant',
        department: 'Nights',
        start_date: '2024-02-01',
        date_of_birth: '1990-05-20',
        role_groups: ['Drivers', 'Nights'],
      },
    ])
  })
  it('reports row-level problems with line numbers and keeps good rows', () => {
    const csv = ['Name,Email,Start date', 'Good Person,good@x.com,2024-01-01', ',nobody@x.com,', 'Bad Date,bad@x.com,99/99/2024', 'Dup,good@x.com,'].join('\n')
    const result = parseWorkforceCsv(csv)
    expect(result.people.map((p) => p.full_name)).toEqual(['Good Person'])
    expect(result.errors.map((e) => e.line)).toEqual([3, 4, 5])
  })
  it('requires a name column', () => {
    expect(parseWorkforceCsv('Email\nx@y.com').errors[0].message).toMatch(/Full name/)
  })
})
