// Client-safe constants for evidence uploads (no server imports).
export const EVIDENCE_BUCKET = 'compliance-evidence'
export const EVIDENCE_ACCEPT = '.pdf,.jpg,.jpeg,.png'
export const EVIDENCE_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
