'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────

type ItemStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'overdue'
type ItemType = 'document_upload' | 'form' | 'acknowledgement'

interface ChecklistItem {
  id: string
  item_name: string
  item_type: ItemType
  data_category: string
  status: ItemStatus
  deadline: string | null
  was_pre_populated: boolean
  reviewer_notes: string | null
  acknowledged_at: string | null
  document_upload_id: string | null
}

interface OnboardingInfo {
  id: string
  roleTitle: string
  startDate: string | null
  status: string
  readinessPct: number
  inviteeName: string
  companyName: string
}

interface ChecklistViewProps {
  onboarding: OnboardingInfo
  items: ChecklistItem[]
  welcomed: boolean
}

// ─── Status config ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ItemStatus, {
  label: string
  dotClass: string
  badgeClass: string
  icon: string
}> = {
  not_started: {
    label: 'Not started',
    dotClass: 'bg-status-inactive',
    badgeClass: 'bg-status-inactive/10 text-status-inactive border-status-inactive/30',
    icon: '○',
  },
  in_progress: {
    label: 'In progress',
    dotClass: 'bg-status-inactive',
    badgeClass: 'bg-status-inactive/10 text-status-inactive border-status-inactive/30',
    icon: '◐',
  },
  submitted: {
    label: 'Submitted',
    dotClass: 'bg-status-pending animate-pulse',
    badgeClass: 'bg-status-pending/10 text-status-pending border-status-pending/30',
    icon: '⟳',
  },
  approved: {
    label: 'Approved',
    dotClass: 'bg-status-approved',
    badgeClass: 'bg-status-approved/10 text-status-approved border-status-approved/30',
    icon: '✓',
  },
  overdue: {
    label: 'Overdue',
    dotClass: 'bg-status-rejected',
    badgeClass: 'bg-status-rejected/10 text-status-rejected border-status-rejected/30',
    icon: '!',
  },
}

// ─── Item type config ─────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ItemType, { label: string; icon: React.ReactNode }> = {
  document_upload: {
    label: 'Document upload',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  form: {
    label: 'Form to fill in',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  acknowledgement: {
    label: 'Read & acknowledge',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDeadline(dateStr: string | null): { label: string; urgency: 'fine' | 'soon' | 'overdue' } {
  if (!dateStr) return { label: 'No deadline', urgency: 'fine' }

  const now = new Date()
  const deadline = new Date(dateStr)
  const diffMs = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, urgency: 'overdue' }
  if (diffDays === 0) return { label: 'Due today', urgency: 'overdue' }
  if (diffDays === 1) return { label: 'Due tomorrow', urgency: 'soon' }
  if (diffDays <= 5) return { label: `Due in ${diffDays} days`, urgency: 'soon' }
  return {
    label: `Due ${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    urgency: 'fine',
  }
}

const URGENCY_CLASSES = {
  fine: 'text-fg-muted',
  soon: 'text-status-pending',
  overdue: 'text-status-rejected font-medium',
}

// ─── Main component ───────────────────────────────────────────────────────

export default function ChecklistView({ onboarding, items, welcomed }: ChecklistViewProps) {
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(welcomed)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  // Dismiss welcome banner after 6s
  useEffect(() => {
    if (!welcomed) return
    const t = setTimeout(() => setShowWelcomeBanner(false), 6000)
    return () => clearTimeout(t)
  }, [welcomed])

  const pct = onboarding.readinessPct
  const isComplete = onboarding.status === 'complete'

  // Status breakdown
  const counts = items.reduce(
    (acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  const startLabel = onboarding.startDate
    ? new Date(onboarding.startDate).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'TBC'

  // Sort: overdue first, then not_started, then in_progress/submitted, then approved
  const sortOrder: Record<ItemStatus, number> = {
    overdue: 0, not_started: 1, in_progress: 2, submitted: 3, approved: 4,
  }
  const sorted = [...items].sort(
    (a, b) => (sortOrder[a.status] ?? 5) - (sortOrder[b.status] ?? 5)
  )

  if (onboarding.status === 'rejected') {
    return (
      <div className="space-y-5">
        <div className="bg-ink-raised rounded-2xl border border-line p-5">
          <p className="text-xs font-medium text-fg-accent uppercase tracking-wide">
            {onboarding.companyName}
          </p>
          <h1 className="text-lg font-semibold text-fg mt-0.5">{onboarding.roleTitle}</h1>
        </div>
        <div className="bg-status-rejected/10 border border-status-rejected/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-status-rejected">This application wasn&apos;t successful</p>
          <p className="text-sm text-fg-body mt-1">
            {onboarding.companyName} has let us know this application won&apos;t be moving forward.
            Your documents and personal data for this application will be automatically
            removed within 7 days — there&apos;s nothing further for you to do.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Welcome banner */}
      {showWelcomeBanner && (
        <div className="bg-brand text-white rounded-xl px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Invitation accepted</p>
            <p className="text-xs text-white/80 mt-0.5">
              Welcome to {onboarding.companyName}! Complete the steps below before your start date.
            </p>
          </div>
          <button
            onClick={() => setShowWelcomeBanner(false)}
            className="shrink-0 text-white/70 hover:text-white ml-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header card */}
      <div className="bg-ink-raised rounded-2xl border border-line p-5">
        {/* Company + role */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-medium text-fg-accent uppercase tracking-wide">
              {onboarding.companyName}
            </p>
            <h1 className="text-lg font-semibold text-fg mt-0.5">
              {onboarding.roleTitle}
            </h1>
            <p className="text-sm text-fg-muted mt-0.5 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Starts {startLabel}
            </p>
          </div>

          {/* Readiness badge */}
          {isComplete ? (
            <div className="shrink-0 flex items-center gap-1.5 bg-status-approved/10 border border-status-approved/30 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 bg-status-approved rounded-full" />
              <span className="text-xs font-semibold text-status-approved">Complete</span>
            </div>
          ) : (
            <div className="shrink-0 text-center">
              <p className="text-2xl font-bold text-fg leading-none">{pct}%</p>
              <p className="text-xs text-fg-muted mt-0.5">ready</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!isComplete && (
          <div className="space-y-2">
            <div className="h-2 bg-ink-inset rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  pct === 100 ? 'bg-status-approved' : pct >= 60 ? 'bg-brand' : 'bg-status-pending'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Status counts */}
            <div className="flex items-center gap-3 flex-wrap">
              {(['approved', 'submitted', 'in_progress', 'not_started', 'overdue'] as ItemStatus[]).map(s => {
                const n = counts[s]
                if (!n) return null
                const cfg = STATUS_CONFIG[s]
                return (
                  <span key={s} className="flex items-center gap-1 text-xs text-fg-muted">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                    {n} {cfg.label.toLowerCase()}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed state */}
        {isComplete && (
          <div className="bg-status-approved/10 border border-status-approved/30 rounded-xl p-3 text-sm text-status-approved">
            🎉 All tasks complete. Your profile is saved and ready for your next employer.
          </div>
        )}
      </div>

      {/* Portable profile notice */}
      {items.some(i => i.was_pre_populated) && (
        <div className="flex items-start gap-2.5 bg-brand/10 border border-brand/30 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-fg-accent shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-xs text-fg-accent">
            <span className="font-semibold">Some items pre-filled from your profile</span> — review them to confirm they're still correct.
          </p>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-2">
        {sorted.map(item => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            onboardingId={onboarding.id}
            isExpanded={expandedItem === item.id}
            onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
          />
        ))}

        {items.length === 0 && (
          <div className="bg-ink-raised rounded-xl border border-line p-8 text-center text-sm text-fg-muted">
            No checklist items yet. Your employer is setting things up.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Individual checklist item card ──────────────────────────────────────

interface ChecklistItemCardProps {
  item: ChecklistItem
  onboardingId: string
  isExpanded: boolean
  onToggle: () => void
}

function ChecklistItemCard({ item, onboardingId, isExpanded, onToggle }: ChecklistItemCardProps) {
  const cfg = STATUS_CONFIG[item.status]
  const typeCfg = TYPE_CONFIG[item.item_type] ?? { label: item.item_type, icon: null }
  const deadline = formatDeadline(item.deadline)

  const isActionable = item.status === 'not_started' || item.status === 'in_progress' || item.status === 'overdue'
  const isApproved = item.status === 'approved'

  return (
    <div
      className={`bg-ink-raised rounded-xl border transition-all ${
        item.status === 'overdue'
          ? 'border-status-rejected/30'
          : isApproved
          ? 'border-status-approved/30'
          : 'border-line'
      }`}
    >
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Traffic light dot */}
        <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${cfg.dotClass}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-sm font-medium ${isApproved ? 'text-fg-muted line-through' : 'text-fg'} truncate`}>
                {item.item_name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {/* Type label */}
                <span className="flex items-center gap-1 text-xs text-fg-muted">
                  {typeCfg.icon && <span className="text-fg-muted">{typeCfg.icon}</span>}
                  {typeCfg.label}
                </span>
                {/* Deadline */}
                {item.deadline && item.status !== 'approved' && (
                  <>
                    <span className="text-fg-muted">·</span>
                    <span className={`text-xs ${URGENCY_CLASSES[deadline.urgency]}`}>
                      {deadline.label}
                    </span>
                  </>
                )}
                {/* Pre-populated badge */}
                {item.was_pre_populated && (
                  <>
                    <span className="text-fg-muted">·</span>
                    <span className="text-xs text-fg-accent font-medium">From profile</span>
                  </>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div className="shrink-0 flex items-center gap-1.5">
              <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${cfg.badgeClass}`}>
                {cfg.label}
              </span>
              {/* Chevron */}
              <svg
                className={`w-4 h-4 text-fg-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className="border-t border-line px-4 pb-4 pt-3 space-y-3">
          {/* Reviewer note */}
          {item.reviewer_notes && item.status !== 'approved' && (
            <div className="flex items-start gap-2 bg-status-pending/10 border border-status-pending/30 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-status-pending shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-status-pending">Action needed</p>
                <p className="text-xs text-status-pending mt-0.5">{item.reviewer_notes}</p>
              </div>
            </div>
          )}

          {/* Approved confirmation */}
          {isApproved && (
            <div className="flex items-center gap-2 text-xs text-status-approved">
              <svg className="w-4 h-4 text-status-approved" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Reviewed and approved by your employer.
            </div>
          )}

          {/* Submitted state */}
          {item.status === 'submitted' && (
            <div className="flex items-center gap-2 text-xs text-status-pending">
              <svg className="w-4 h-4 text-status-pending" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submitted — waiting for your employer to review.
            </div>
          )}

          {/* CTA for actionable items — onboardingId threaded in from parent */}
          {isActionable && (
            <Link
              href={`/employee/onboarding/${onboardingId}/item/${item.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg transition-colors text-sm font-medium bg-brand text-white hover:bg-brand-hover"
            >
              {item.item_type === 'document_upload' && 'Upload document'}
              {item.item_type === 'form' && 'Fill in details'}
              {item.item_type === 'acknowledgement' && 'Read & acknowledge'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* Deadline detail */}
          {item.deadline && (
            <p className={`text-xs ${URGENCY_CLASSES[deadline.urgency]}`}>
              Deadline: {new Date(item.deadline).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
