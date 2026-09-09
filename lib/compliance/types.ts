// lib/compliance/types.ts
// Shared shapes and display labels for the compliance feature. Safe to import
// from client components (no server-only imports here).

export type Sector = 'care' | 'construction' | 'hospitality' | 'logistics' | 'security' | 'cross_sector'

export const SECTORS: { value: Exclude<Sector, 'cross_sector'>; label: string }[] = [
  { value: 'care', label: 'Care' },
  { value: 'construction', label: 'Construction' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'security', label: 'Security' },
]

export const SECTOR_LABELS: Record<Sector | 'other', string> = {
  care: 'Care',
  construction: 'Construction',
  hospitality: 'Hospitality',
  logistics: 'Logistics',
  security: 'Security',
  cross_sector: 'Every sector',
  other: 'Other',
}

export type RequirementCategory =
  | 'training'
  | 'licence'
  | 'check'
  | 'registration'
  | 'medical'
  | 'screening'
  | 'hr_event'

export const CATEGORY_LABELS: Record<RequirementCategory, string> = {
  training: 'Training',
  licence: 'Licence or card',
  check: 'Check',
  registration: 'Registration',
  medical: 'Medical',
  screening: 'Screening',
  hr_event: 'HR event',
}

export type RenewalRule =
  | 'fixed_interval'
  | 'employer_interval'
  | 'document_date'
  | 'no_expiry'
  | 'age_based'
  | 'status_check'
  | 'event_based'

export const RENEWAL_RULE_LABELS: Record<RenewalRule, string> = {
  fixed_interval: 'Fixed renewal period',
  employer_interval: 'Renewal period you set',
  document_date: 'Expiry date on the document',
  no_expiry: 'Does not expire',
  age_based: 'Depends on age',
  status_check: 'Periodic status check',
  event_based: 'Expires with a project or event',
}

export type Subject = 'person' | 'organisation'

export interface RequirementType {
  id: string
  employer_id: string | null
  code: string | null
  name: string
  description: string | null
  guidance: string | null
  statutory_basis: string | null
  category: RequirementCategory
  sectors: string[]
  subject: Subject
  renewal_rule: RenewalRule
  default_interval_months: number | null
  interval_locked: boolean
  work_blocking: boolean
  evidence_required: boolean
  reference_label: string | null
  captures: Record<string, unknown>
  sort_order: number
  is_active: boolean
}

export interface EmployerRequirement {
  id: string
  employer_id: string
  requirement_type_id: string
  enabled: boolean
  interval_months_override: number | null
  reminder_lead_days: number[]
  applies_to: 'all' | 'role_groups'
  role_group_ids?: string[]
}

export interface RoleGroup {
  id: string
  name: string
}

export type EmploymentStatus = 'active' | 'leaver'

export interface Employment {
  id: string
  employer_id: string
  employee_id: string | null
  source_onboarding_id: string | null
  full_name: string
  email: string | null
  job_title: string | null
  department: string | null
  date_of_birth: string | null
  start_date: string | null
  end_date: string | null
  status: EmploymentStatus
  invited_at: string | null
  created_at: string
  role_group_ids?: string[]
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected'

export interface ComplianceRecord {
  id: string
  employer_id: string
  employment_id: string | null
  employer_requirement_id: string
  issued_at: string | null
  expires_at: string | null
  last_checked_at: string | null
  document_path: string | null
  document_name: string | null
  reference_encrypted?: string | null
  attributes: Record<string, unknown>
  verification_status: VerificationStatus
  verified_by: string | null
  verified_at: string | null
  reviewer_notes: string | null
  is_exempt: boolean
  exempt_reason: string | null
  is_current: boolean
  superseded_by: string | null
  submitted_by: 'employer' | 'employee'
  created_at: string
}

export interface HoursLogEntry {
  id: string
  record_id: string
  course_name: string
  hours: number
  completed_on: string
  provider: string | null
  document_path: string | null
}

export type ComplianceStatus =
  | 'missing'
  | 'awaiting_review'
  | 'rejected'
  | 'valid'
  | 'expiring'
  | 'expired'
  | 'exempt'

export const STATUS_META: Record<ComplianceStatus, { label: string; badge: string; dot: string; rank: number }> = {
  expired: { label: 'Expired', badge: 'bg-status-rejected/15 text-status-rejected', dot: 'bg-status-rejected', rank: 0 },
  missing: { label: 'Missing', badge: 'bg-status-rejected/15 text-status-rejected', dot: 'bg-status-rejected', rank: 1 },
  rejected: { label: 'Re-upload needed', badge: 'bg-status-rejected/15 text-status-rejected', dot: 'bg-status-rejected', rank: 2 },
  expiring: { label: 'Expiring', badge: 'bg-status-pending/15 text-status-pending', dot: 'bg-status-pending', rank: 3 },
  awaiting_review: { label: 'Awaiting review', badge: 'bg-status-pending/15 text-status-pending', dot: 'bg-status-pending', rank: 4 },
  valid: { label: 'Valid', badge: 'bg-status-approved/15 text-status-approved', dot: 'bg-status-approved', rank: 5 },
  exempt: { label: 'Exempt', badge: 'bg-status-inactive/15 text-status-inactive', dot: 'bg-status-inactive', rank: 6 },
}

export const DEFAULT_LEAD_DAYS = [90, 30, 7]
export const DCPC_HOURS_REQUIRED = 35
