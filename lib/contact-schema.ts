/**
 * Server-side validation for the contact form.
 *
 * Hand-rolled rather than pulling in a schema library: eight fields with
 * simple rules does not justify the dependency, and keeping it plain means
 * the exact error copy shown to the visitor lives next to the rule producing
 * it. Shared by the server action and the client for field naming.
 */

import { contactPage } from '@/content/site'

export type ContactFields = {
  name: string
  email: string
  company: string
  role: string
  companySize: string
  aiStage: string
  message: string
  consent: boolean
}

export type FieldErrors = Partial<Record<keyof ContactFields, string>>

export type ContactState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  errors?: FieldErrors
  /** Echoed back so a failed submission does not clear what was typed. */
  values?: Partial<Record<Exclude<keyof ContactFields, 'consent'>, string>>
}

/** The honeypot input's name. A real visitor never fills this. */
export const HONEYPOT_FIELD = 'website'

const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 200 },
  company: { min: 2, max: 120 },
  role: { min: 2, max: 120 },
  message: { min: 10, max: 4000 },
} as const

/**
 * Deliberately permissive: one @, something either side, a dot in the domain,
 * no whitespace. Stricter patterns reject valid addresses more often than they
 * catch typos, and the real test is whether our reply arrives.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

function str(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateContact(formData: FormData): {
  ok: boolean
  errors: FieldErrors
  data: ContactFields
} {
  const data: ContactFields = {
    name: str(formData.get('name')),
    email: str(formData.get('email')),
    company: str(formData.get('company')),
    role: str(formData.get('role')),
    companySize: str(formData.get('companySize')),
    aiStage: str(formData.get('aiStage')),
    message: str(formData.get('message')),
    consent: formData.get('consent') === 'on' || formData.get('consent') === 'true',
  }

  const errors: FieldErrors = {}

  if (data.name.length < LIMITS.name.min) {
    errors.name = 'Please tell us your name.'
  } else if (data.name.length > LIMITS.name.max) {
    errors.name = `Please keep this under ${LIMITS.name.max} characters.`
  }

  if (!data.email) {
    errors.email = 'Please give us an email address so we can reply.'
  } else if (!EMAIL_PATTERN.test(data.email) || data.email.length > LIMITS.email.max) {
    errors.email = 'That does not look like a valid email address.'
  }

  if (data.company.length < LIMITS.company.min) {
    errors.company = 'Please tell us which organisation you are with.'
  } else if (data.company.length > LIMITS.company.max) {
    errors.company = `Please keep this under ${LIMITS.company.max} characters.`
  }

  if (data.role.length < LIMITS.role.min) {
    errors.role = 'Please tell us your role.'
  } else if (data.role.length > LIMITS.role.max) {
    errors.role = `Please keep this under ${LIMITS.role.max} characters.`
  }

  // Dropdowns are validated against the lists we actually rendered, so a
  // tampered payload cannot smuggle arbitrary text into the notification email.
  if (!data.companySize) {
    errors.companySize = 'Please choose a company size.'
  } else if (!(contactPage.companySizes as readonly string[]).includes(data.companySize)) {
    errors.companySize = 'Please choose one of the listed options.'
  }

  if (!data.aiStage) {
    errors.aiStage = 'Please choose the option that fits best.'
  } else if (!(contactPage.aiStages as readonly string[]).includes(data.aiStage)) {
    errors.aiStage = 'Please choose one of the listed options.'
  }

  if (data.message.length < LIMITS.message.min) {
    errors.message = 'Please give us a little more detail — at least a sentence.'
  } else if (data.message.length > LIMITS.message.max) {
    errors.message = `Please keep this under ${LIMITS.message.max} characters.`
  }

  if (!data.consent) {
    errors.consent = 'Please tick the box so we know we may reply to you.'
  }

  return { ok: Object.keys(errors).length === 0, errors, data }
}
