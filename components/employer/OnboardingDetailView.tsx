'use client'

import { useState } from 'react'
import {
  approveChecklistItem,
  requestReupload,
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
}

const STATUS_CONFIG: Record<string, { label: string; colour: string; dot: string }> = {
  approved:    { label: 'Approved',        colour: 'bg-green-100 text-green-800',   dot: 'bg-green-500' },
  submitted:   { label: 'Awaiting review', colour: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500' },
  in_progress: { label: 'In progress',     colour: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  not_started: { label: 'Not started',     colour: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
  overdue:     { label: 'Overdue',         colour: 'bg-red-100 text-red-800',       dot: 'bg-red-500' },
}

const SORT_ORDER = ['submitted', 'overdue', 'in_progress', 'not_started', 'approved']

export default function OnboardingDetailView({ onboardingId, items: initialItems, employeeName }: Props) {
  const [items] = useState(initialItems)

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

  return (
    <div>
      {/* Progress summary card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Day-one readiness</span>
          <span className="text-xl font-bold text-gray-900 tabular-nums">{readinessPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{
              width: `${readinessPct}%`,
              backgroundColor:
                readinessPct === 100 ? '#22c55e'
                : readinessPct >= 60 ? '#f59e0b'
                : '#6366f1',
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {approvedCount} of {items.length} items approved
          {submittedCount > 0 && (
            <span className="ml-2 text-blue-600 font-medium">
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
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Item header row */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.item_name}</p>
                    {item.deadline && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Due {new Date(item.deadline).toLocaleDateString('en-GB')}
                      </p>
                    )}
                    {item.reviewer_notes && item.status === 'not_started' && (
                      <p className="text-xs text-amber-600 mt-1">
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
                      className="text-sm text-violet-600 hover:text-violet-800 font-medium"
                    >
                      {isViewing ? 'Close' : 'Review →'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded review panel */}
              {isViewing && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">

                  {viewLoading && (
                    <p className="text-sm text-gray-500 py-2">Loading submission...</p>
                  )}

                  {viewError && !viewLoading && (
                    <p className="text-sm text-red-600 py-2">{viewError}</p>
                  )}

                  {/* GOV.UK share code — not a real file, verify online */}
                  {shareCode && !viewLoading && (
                    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-xs text-gray-500">GOV.UK share code</p>
                      <p className="mt-1 font-mono text-sm tracking-widest text-gray-900">
                        {shareCode}
                      </p>
                      <a
                        href="https://www.gov.uk/view-right-to-work"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-violet-600 hover:text-violet-800 underline underline-offset-2"
                      >
                        Verify at gov.uk/view-right-to-work
                      </a>
                      <p className="mt-1 text-xs text-gray-400">
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
                        className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open document in new tab
                      </a>
                      <p className="text-xs text-gray-400 mt-1">Link expires in 60 minutes</p>
                    </div>
                  )}

                  {/* Form / acknowledgement data */}
                  {formData && !viewLoading && (
                    <div className="mb-4 bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                      {Object.entries(formData).map(([label, value]) => (
                        <div key={label} className="flex gap-3 text-sm">
                          <span className="text-gray-500 w-36 flex-shrink-0">{label}</span>
                          <span className="text-gray-900 font-mono">{value}</span>
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
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
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
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Request re-upload
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Tell <strong>{employeeName}</strong> what needs to be corrected for{' '}
              <strong>{reuploadModal.itemName}</strong>.
            </p>

            <textarea
              value={reuploadNote}
              onChange={e => { setReuploadNote(e.target.value); setReuploadError('') }}
              placeholder="e.g. The document is blurry and the expiry date cannot be read. Please re-upload a clear photo or scan."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              autoFocus
            />

            {reuploadError && (
              <p className="text-xs text-red-600 mt-1">{reuploadError}</p>
            )}

            <p className="text-xs text-gray-400 mt-2">
              The employee will see this note and can then re-submit.
            </p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReuploadSubmit}
                disabled={reuploadLoading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
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
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
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