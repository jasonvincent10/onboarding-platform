// lib/compliance/format.ts
// Display helpers shared by server and client components.

import type { ComplianceStatus } from './types'

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function intervalLabel(months: number | null | undefined): string {
  if (!months) return ''
  if (months % 12 === 0) {
    const years = months / 12
    return years === 1 ? 'every year' : `every ${years} years`
  }
  return months === 1 ? 'every month' : `every ${months} months`
}

/** "Expires in 12 days", "Expired 3 days ago", "Due today". */
export function describeDue(status: ComplianceStatus, daysUntil: number | null, expiresAt: string | null | undefined): string {
  if (status === 'missing') return 'No record'
  if (status === 'exempt') return 'Exempt'
  if (status === 'rejected') return 'Re-upload needed'
  if (status === 'awaiting_review') return expiresAt ? `Awaiting review, expires ${formatDate(expiresAt)}` : 'Awaiting review'
  if (daysUntil === null) return 'Does not expire'
  if (daysUntil < 0) return `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago`
  if (daysUntil === 0) return 'Expires today'
  if (daysUntil === 1) return 'Expires tomorrow'
  if (daysUntil < 60) return `Expires in ${daysUntil} days`
  return `Expires ${formatDate(expiresAt)}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
