'use client'

import { useState } from 'react'
import {
  approveChecklistItem,
  requestReupload,
  rejectCandidate,
  getSignedDocumentUrl,
  getDecryptedFormData,
} from '@/app/(employer)/dashboard/onboarding/[id]/actions'

interface ChecklistItem {
  id: string
  item_name: string
  item_type: string
  data_category: string
  status: string
  deadline: string | null
  document_upload_id: string | null
  acknowledged_at: string | null
  reviewed_by: string | null
  reviewer_notes: string | null
  was_pre_populated: boolean
  description: string | null
}

interface Props {
  onboardingId: string
  items: ChecklistItem[]
  employeeName: string
  status: string
  rejectedAt: string | null
}

const STATUS_CONFIG: Record<string, { label: string; colour: string; dot: string }> = {
  approved:    { label: 'Approved',        colour: 'bg-status-approved/15 text-status-approved',   dot: 'bg-status-approved' },
  submitted:   { label: 'Awaiting review', colour: 'bg-status-pending/15 text-status-pending',     dot: 'bg-status-pending' },
  in_progress: { label: 'In progress',     colour: 'bg-status-inactive/15 text-status-inactive', dot: 'bg-status-inactive' },
  not_started: { label: 'Not started',     colour: 'bg-status-inactive/15 text-status-inactive',     dot: 'bg-status-inactive' },
  overdue:     { label: 'Overdue',         colour: 'bg-status-rejected/15 text-status-rejected',       dot: 'bg-status-rejected' },
}

const SORT_ORDER = ['submitted', 'overdue', 'in_progress', 'not_started', 'approved']

export default function OnboardingDetailView({ onboardingId, items: initialItems, employeeName, status, rejectedAt }: Props) {
  const [items] = useState(initialItems)

  // Reject state
  const [confirmingReject, setConfirmingReject] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectError, setRejectError] = useState('')

  // Viewing state
  const [viewingItem, setViewingItem] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')

  // Approve state
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Re-upload modal state
  const [reuploadModal, setReuploadModal] = useState<{ itemId: string; itemName: string } | null>(null)
  const [reuploadNote, setReuploadNote] = useState('')
  const [reuploadError, setReuploadError] = useState('')
  const [reuploadLoading, setReuploadLoading] = useState(false)

  const approvedCount = items.filter(i => i.status === 'approved').length
  const submittedCount = items.filter(i => i.status === 'submitted').length
  const readinessPct = items.length > 0 ? Math.round((approvedCount / items.length) * 100) : 0

  const sorted = [...items].sort(
    (a, b) => SORT_ORDER.indexOf(a.status) - SORT_ORDER.indexOf(b.status)
  )

  function handleCloseView() {
    setViewingItem(null)
    setDocumentUrl(null)
    setShareCode(null)
    setFormData(null)
    setViewError('')
  }

  async function handleViewItem(item: ChecklistItem) {
    setViewingItem(item.id)
    setDocumentUrl(null)
    setShareCode(null)
    setFormData(null)
    setViewError('')
    setViewLoading(true)

    try {
      if (item.item_type === 'document_upload' && item.document_upload_id) {
        const result = await getSignedDocumentUrl(item.document_upload_id, onboardingId)
        if ('error' in result) {
          setViewError(result.error ?? '')
        } else if ('shareCode' in result) {
          setShareCode(result.shareCode ?? null)
        } else {
          setDocumentUrl(result.url ?? null)
        }
      } else if (item.item_type === 'form_entry') {
        const result = await getDecryptedFormData(onboardingId, item.data_category)
        if ('error' in result) {
          setViewError(result.error ?? '')
        } else {
          setFormData(result.fields ?? null)
        }
      } else if (item.item_type === 'acknowledgement') {
        setFormData({
          'Acknowledged at': item.acknowledged_at
            ? new Date(item.acknowledged_at).toLocaleString('en-GB')
            : '(not yet acknowledged)',
        })
      }
    } finally {
      setViewLoading(false)
    }
  }

  async function handleApprove(itemId: string) {
    setApprovingId(itemId)
    const result = await approveChecklistItem(itemId, onboardingId)
    setApprovingId(null)
    if (result.error) {
      alert('Error: ' + result.error)
    } else {
      window.location.reload()
    }
  }

  async function handleReject() {
    setRejecting(true)
    setRejectError('')
    const result = await rejectCandidate(onboardingId)
    setRejecting(false)
    if (result.error) {
      setRejectError(result.error)
    } else {
      window.location.reload()
    }
  }

  function openReuploadModal(item: ChecklistItem) {
    setReuploadModal({ itemId: item.id, itemName: item.item_name })
    setReuploadNote('')
    setReuploadError('')
  }

  async function handleReuploadSubmit() {
    if (!reuploadModal) return
    if (!reuploadNote.trim()) {
      setReuploadError('Please add a note explaining what needs to be corrected.')
      return
    }
    setReuploadLoading(true)
    setReuploadError('')

    const result = await requestReupload(reuploadModal.itemId, onboardingId, reuploadNote)
    setReuploadLoading(false)

    if (result.error) {
      setReuploadError(result.error)
    } else {
      window.location.reload()
    }
  }

  if (status === 'rejected') {
    const purgeDate = rejectedAt
      ? new Date(new Date(rejectedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null
    return (
      <div className="bg-status-rejected/10 border border-status-rejected/30 rounded-xl p-5">
        <p className="text-sm font-semibold text-status-rejected">Candidate rejected</p>
        <p className="text-sm text-fg-body mt-1">
          {employeeName}&apos;s documents and personal data will be automatically removed
          {purgeDate
            ? ` on ${purgeDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : ' 7 days after rejection'}.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Reject candidate */}
      {status !== 'complete' && (
        <div className="mb-6 flex items-center justify-end gap-3">
          {confirmingReject ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-fg-muted">
                Reject {employeeName}? Their data will be removed automatically 7 days later.
              </span>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="font-medium text-status-rejected hover:opacity-80 disabled:opacity-50"
              >
                {rejecting ? 'Rejecting…' : 'Yes, reject'}
              </button>
              <button
                onClick={() => setConfirmingReject(false)}
                className="font-medium text-fg-muted hover:text-fg-body"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingReject(true)}
              className="text-sm font-medium text-fg-muted hover:text-status-rejected"
            >
              Reject candidate
            </button>
          )}
        </div>
      )}
      {rejectError && <p className="mb-3 text-sm text-status-rejected text-right">{rejectError}</p>}

      {/* Progress summary card */}
      <div className="bg-ink-raised rounded-xl border border-line p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-fg-body">Day-one readiness</span>
          <span className="text-xl font-bold text-fg tabular-nums">{readinessPct}%</span>
        </div>
        <div className="w-full bg-ink-inset rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{
              width: `${readinessPct}%`,
              backgroundColor:
                readinessPct === 100 ? 'var(--status-approved)'
                : readinessPct >= 60 ? 'var(--status-pending)'
                : 'var(--accent)',
            }}
          />
        </div>
        <p className="text-xs text-fg-muted mt-2">
          {approvedCount} of {items.length} items approved
          {submittedCount > 0 && (
            <span className="ml-2 text-status-pending font-medium">
              · {submittedCount} awaiting your review
            </span>
          )}
        </p>
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {sorted.map(item => {
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['not_started']
          const isViewing = viewingItem === item.id
          const canReview = item.status === 'submitted'

          return (
            <div
              key={item.id}
              className="bg-ink-raised rounded-xl border border-line overflow-hidden"
            >
              {/* Item header row */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-fg truncate">{item.item_name}</p>
                    {item.deadline && (
                      <p className="text-xs text-fg-muted mt-0.5">
                        Due {new Date(item.deadline).toLocaleDateString('en-GB')}
                      </p>
                    )}
                    {item.reviewer_notes && item.status === 'not_started' && (
                      <p className="text-xs text-status-pending mt-1">
                        Re-upload requested: {item.reviewer_notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.colour}`}>
                    {cfg.label}
                  </span>
                  {canReview && (
                    <button
                      onClick={() => isViewing ? handleCloseView() : handleViewItem(item)}
                      className="text-sm text-fg-accent hover:text-fg font-medium"
                    >
                      {isViewing ? 'Close' : 'Review →'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded review panel */}
              {isViewing && (
                <div className="border-t border-line bg-ink-inset p-4">

                  {viewLoading && (
                    <p className="text-sm text-fg-muted py-2">Loading submission...</p>
                  )}

                  {viewError && !viewLoading && (
                    <p className="text-sm text-status-rejected py-2">{viewError}</p>
                  )}

                  {/* GOV.UK share code — not a real file, verify online */}
                  {shareCode && !viewLoading && (
                    <div className="mb-4 rounded-lg border border-line bg-ink-raised p-3">
                      <p className="text-xs text-fg-muted">GOV.UK share code</p>
                      <p className="mt-1 font-mono text-sm tracking-widest text-fg">
                        {shareCode}
                      </p>
                      <a
                        href="https://www.gov.uk/view-right-to-work"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-fg-accent hover:text-fg underline underline-offset-2"
                      >
                        Verify at gov.uk/view-right-to-work
                      </a>
                      <p className="mt-1 text-xs text-fg-muted">
                        You&apos;ll need the employee&apos;s date of birth to complete the check.
                      </p>
                    </div>
                  )}

                  {/* Document link */}
                  {documentUrl && !viewLoading && (
                    <div className="mb-4">
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-fg-accent hover:text-fg font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open document in new tab
                      </a>
                      <p className="text-xs text-fg-muted mt-1">Link expires in 60 minutes</p>
                    </div>
                  )}

                  {/* Form / acknowledgement data */}
                  {formData && !viewLoading && (
                    <div className="mb-4 bg-ink-raised rounded-lg border border-line p-3 space-y-2">
                      {Object.entries(formData).map(([label, value]) => (
                        <div key={label} className="flex gap-3 text-sm">
                          <span className="text-fg-muted w-36 flex-shrink-0">{label}</span>
                          <span className="text-fg font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons — only show when content has loaded */}
                  {!viewLoading && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={approvingId === item.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-status-approved px-4 py-2 text-sm font-medium text-white hover:bg-status-approved disabled:opacity-50 transition-colors"
                      >
                        {approvingId === item.id ? (
                          <>
                            <svg className="h-3.5 w-3.5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Approving...
                          </>
                        ) : 'Approve'}
                      </button>
                      <button
                        onClick={() => openReuploadModal(item)}
                        className="rounded-lg bg-status-pending px-4 py-2 text-sm font-medium text-white hover:bg-status-pending transition-colors"
                      >
                        Request re-upload
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Re-upload modal */}
      {reuploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setReuploadModal(null) }}
        >
          <div className="bg-ink-raised rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-fg mb-1">
              Request re-upload
            </h2>
            <p className="text-sm text-fg-muted mb-4">
              Tell <strong>{employeeName}</strong> what needs to be corrected for{' '}
              <strong>{reuploadModal.itemName}</strong>.
            </p>

            <textarea
              value={reuploadNote}
              onChange={e => { setReuploadNote(e.target.value); setReuploadError('') }}
              placeholder="e.g. The document is blurry and the expiry date cannot be read. Please re-upload a clear photo or scan."
              rows={4}
              className="w-full border border-line-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              autoFocus
            />

            {reuploadError && (
              <p className="text-xs text-status-rejected mt-1">{reuploadError}</p>
            )}

            <p className="text-xs text-fg-muted mt-2">
              The employee will see this note and can then re-submit.
            </p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReuploadSubmit}
                disabled={reuploadLoading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-status-pending py-2 text-sm font-medium text-white hover:bg-status-pending disabled:opacity-50 transition-colors"
              >
                {reuploadLoading ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending...
                  </>
                ) : 'Send request'}
              </button>
              <button
                onClick={() => setReuploadModal(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-line-strong text-fg-body hover:bg-ink-inset"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}