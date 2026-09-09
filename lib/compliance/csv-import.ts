// lib/compliance/csv-import.ts
// Parses an employer's workforce CSV into people rows. Pure, no I/O.
//
// Accepted headers (case and punctuation insensitive):
//   full name | name              -> full_name   (required)
//   email | email address         -> email
//   job title | role | position   -> job_title
//   department | team             -> department
//   start date | started          -> start_date  (YYYY-MM-DD or DD/MM/YYYY)
//   date of birth | dob           -> date_of_birth
//   role groups | groups          -> role_groups (semicolon or pipe separated)

export interface ImportedPerson {
  full_name: string
  email: string | null
  job_title: string | null
  department: string | null
  start_date: string | null
  date_of_birth: string | null
  role_groups: string[]
}

export interface ImportError {
  line: number
  message: string
}

export interface ImportResult {
  people: ImportedPerson[]
  errors: ImportError[]
  /** Header names the parser could not map; shown so the user can fix the file. */
  ignoredColumns: string[]
}

const HEADER_MAP: Record<string, keyof ImportedPerson> = {
  fullname: 'full_name',
  name: 'full_name',
  employeename: 'full_name',
  email: 'email',
  emailaddress: 'email',
  jobtitle: 'job_title',
  role: 'job_title',
  position: 'job_title',
  title: 'job_title',
  department: 'department',
  team: 'department',
  startdate: 'start_date',
  started: 'start_date',
  dateofbirth: 'date_of_birth',
  dob: 'date_of_birth',
  birthdate: 'date_of_birth',
  rolegroups: 'role_groups',
  groups: 'role_groups',
  rolegroup: 'role_groups',
}

export const MAX_IMPORT_ROWS = 500

/** RFC 4180-style CSV parser: quotes, escaped quotes, commas in quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^﻿/, '')

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY. Returns ISO or null. */
export function parseUkDate(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  let y: number, m: number, d: number
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v)
  if (match) {
    y = Number(match[1]); m = Number(match[2]); d = Number(match[3])
  } else {
    match = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(v)
    if (!match) return null
    d = Number(match[1]); m = Number(match[2]); y = Number(match[3])
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return date.toISOString().slice(0, 10)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseWorkforceCsv(text: string): ImportResult {
  const rows = parseCsv(text)
  const errors: ImportError[] = []
  if (rows.length === 0) return { people: [], errors: [{ line: 1, message: 'The file is empty.' }], ignoredColumns: [] }

  const headers = rows[0].map(normaliseHeader)
  const mapped = headers.map((h) => HEADER_MAP[h] ?? null)
  const ignoredColumns = rows[0].filter((_, i) => mapped[i] === null && rows[0][i].trim() !== '')

  if (!mapped.includes('full_name')) {
    return { people: [], errors: [{ line: 1, message: 'No "Full name" column found. The first row must be a header row.' }], ignoredColumns }
  }

  const people: ImportedPerson[] = []
  const seenEmails = new Set<string>()

  for (let r = 1; r < rows.length; r++) {
    const line = r + 1
    if (people.length >= MAX_IMPORT_ROWS) {
      errors.push({ line, message: `Only the first ${MAX_IMPORT_ROWS} people were imported.` })
      break
    }
    const cells = rows[r]
    const person: ImportedPerson = {
      full_name: '',
      email: null,
      job_title: null,
      department: null,
      start_date: null,
      date_of_birth: null,
      role_groups: [],
    }
    let rowError: string | null = null

    mapped.forEach((key, i) => {
      if (!key) return
      const raw = (cells[i] ?? '').trim()
      if (!raw) return
      switch (key) {
        case 'full_name':
          person.full_name = raw
          break
        case 'email': {
          const email = raw.toLowerCase()
          if (!EMAIL_RE.test(email)) rowError = `"${raw}" is not a valid email address.`
          else person.email = email
          break
        }
        case 'job_title':
          person.job_title = raw
          break
        case 'department':
          person.department = raw
          break
        case 'start_date': {
          const iso = parseUkDate(raw)
          if (!iso) rowError = `Start date "${raw}" is not a valid date. Use DD/MM/YYYY.`
          else person.start_date = iso
          break
        }
        case 'date_of_birth': {
          const iso = parseUkDate(raw)
          if (!iso) rowError = `Date of birth "${raw}" is not a valid date. Use DD/MM/YYYY.`
          else person.date_of_birth = iso
          break
        }
        case 'role_groups':
          person.role_groups = raw.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
          break
      }
    })

    if (!person.full_name) rowError = rowError ?? 'Full name is missing.'
    if (person.email) {
      if (seenEmails.has(person.email)) rowError = rowError ?? `Duplicate email ${person.email} in the file.`
      seenEmails.add(person.email)
    }

    if (rowError) errors.push({ line, message: rowError })
    else people.push(person)
  }

  return { people, errors, ignoredColumns }
}
