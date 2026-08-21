import { describe, it, expect } from 'vitest'
import { csvEscape, csvRow, toCsv, csvResponse } from './csv'

describe('csvEscape', () => {
  it('leaves plain values unchanged', () => {
    expect(csvEscape('hello')).toBe('hello')
    expect(csvEscape(42)).toBe('42')
  })

  it('returns an empty string for null or undefined', () => {
    expect(csvEscape(null)).toBe('')
    expect(csvEscape(undefined)).toBe('')
  })

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"')
    expect(csvEscape('line1\rline2')).toBe('"line1\rline2"')
  })
})

describe('csvRow', () => {
  it('joins escaped values with commas', () => {
    expect(csvRow(['a', 'b,c', 3])).toBe('a,"b,c",3')
  })
})

describe('toCsv', () => {
  it('builds a header row plus data rows, CRLF-joined with a trailing CRLF', () => {
    const csv = toCsv(['name', 'age'], [['Jane', 30], ['O\'Brien, Sam', 41]])
    expect(csv).toBe('name,age\r\nJane,30\r\n"O\'Brien, Sam",41\r\n')
  })

  it('produces just the header (plus trailing CRLF) when there are no rows', () => {
    expect(toCsv(['a', 'b'], [])).toBe('a,b\r\n')
  })
})

describe('csvResponse', () => {
  it('sets the correct content type, disposition, and body', async () => {
    const res = csvResponse('a,b\r\n1,2\r\n', 'export.csv')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="export.csv"')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.text()).toBe('a,b\r\n1,2\r\n')
  })
})
