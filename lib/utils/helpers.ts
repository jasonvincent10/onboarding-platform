import { type ClassValue, clsx } from 'clsx'

/**
 * Merge Tailwind class names safely.
 * Usage: cn('px-4 py-2', isActive && 'bg-brand-600', className)
 *
 * Note: install clsx if not already present: npm install clsx
 */
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

/**
 * Format a date as a human-readable string.
 * e.g. 1 April 2026
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Calculate days remaining until a deadline.
 * Returns negative numbers for overdue items.
 */
export function daysUntil(deadline: string | Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(deadline)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Derive checklist status label from days remaining.
 * Used where the status engine hasn't run yet (optimistic UI).
 */
export function deadlineLabel(deadline: string | Date): string {
  const days = daysUntil(deadline)
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

/**
 * Validate a UK National Insurance number.
 * Format: two letters, six digits, one letter (A–D).
 * Invalid prefixes: D, F, I, Q, U, V as first letter; D, F, I, O, Q, U, V as second.
 */
export function isValidNINumber(ni: string): boolean {
  const cleaned = ni.replace(/\s/g, '').toUpperCase()
  return /^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(cleaned)
}

/**
 * Format a NI number with standard spacing: AB 12 34 56 C
 */
export function formatNINumber(ni: string): string {
  const cleaned = ni.replace(/\s/g, '').toUpperCase()
  return cleaned.replace(/^(.{2})(.{2})(.{2})(.{2})(.{1})$/, '$1 $2 $3 $4 $5')
}

/**
 * Validate UK sort code format (NN-NN-NN or NNNNNN).
 */
export function isValidSortCode(sortCode: string): boolean {
  return /^\d{2}-?\d{2}-?\d{2}$/.test(sortCode.trim())
}

/**
 * Validate UK bank account number (8 digits).
 */
export function isValidAccountNumber(accountNumber: string): boolean {
  return /^\d{8}$/.test(accountNumber.trim())
}

/**
 * Truncate a filename for display.
 * e.g. "my-very-long-passport-scan.pdf" → "my-very-long-pa….pdf"
 */
export function truncateFilename(filename: string, maxLength = 30): string {
  const ext = filename.split('.').pop() ?? ''
  const name = filename.slice(0, filename.length - ext.length - 1)
  if (filename.length <= maxLength) return filename
  return `${name.slice(0, maxLength - ext.length - 4)}….${ext}`
}

/**
 * Convert bytes to a human-readable file size string.
 * e.g. 1048576 → "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
