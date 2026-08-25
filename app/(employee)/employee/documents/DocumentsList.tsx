'use client'

import { useState, useTransition } from 'react'
import { deleteDocument } from './actions'

export interface DocumentRow {
  id: string
  documentType: string
  documentName: string
  dataCategory: string
  verificationStatus: string
  expiryDate: string | null
  createdAt: string
  isShareCode: boolean
  shareCode: string | null
  signedUrl: string | null
  canDelete: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  ni_number: 'National Insurance number',
  bank_details: 'Bank details',
  emergency_contacts: 'Emergency contacts',
  right_to_work: 'Right to work',
  documents: 'Document',
  personal_info: 'Personal information',
  policy_acknowledgements: 'Policy acknowledgement',
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'With employer', className: 'bg-status-pending/15 text-status-pending' },
  verified: { label: 'Approved', className: 'bg-status-approved/15 text-status-approved' },
  expired: { label: 'Expired', className: 'bg-status-rejected/15 text-status-rejected' },
  rejected: { label: 'Re-upload needed', className: 'bg-status-rejected/15 text-status-rejected' },
}

export default function DocumentsList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return (
      <div className="bg-ink-raised rounded-2xl border border-line p-10 text-center">
        <div className="w-12 h-12 bg-ink-inset rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-fg-body">No documents yet</p>
        <p className="text-xs text-fg-muted mt-1">
          Documents you upload during onboarding will appear here, and carry forward to future employers.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} />
      ))}
    </div>
  )
}

function DocumentCard({ doc }: { doc: DocumentRow }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [removed, setRemoved] = useState(false)

  const status = STATUS_CONFIG[doc.verificationStatus] ?? {
    label: doc.verificationStatus,
    className: 'bg-ink-inset text-fg-body',
  }
  const categoryLabel = CATEGORY_LABELS[doc.dataCategory] ?? doc.dataCategory

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteDocument(doc.id)
      if (result.error) {
        setError(result.error)
        setConfirming(false)
      } else {
        setRemoved(true)
      }
    })
  }

  if (removed) return null

  return (
    <div className="bg-ink-raised rounded-xl border border-line p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-ink-inset">
          {doc.isShareCode ? (
            <span className="text-lg font-bold text-fg-muted">#</span>
          ) : (
            <PdfIcon className="h-5 w-5 text-fg-muted" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{doc.documentName}</p>
              <p className="text-xs text-fg-muted mt-0.5">{categoryLabel}</p>
            </div>
            <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
          </div>

          {doc.isShareCode && (
            <p className="mt-2 font-mono text-sm tracking-widest text-fg-body">{doc.shareCode}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
            <span>
              Uploaded {new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {doc.expiryDate && (
              <span>
                Expires {new Date(doc.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-status-rejected">{error}</p>}

          <div className="mt-3 flex items-center gap-3">
            {doc.signedUrl && (
              <a
                href={doc.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-fg-accent hover:text-fg"
              >
                View
              </a>
            )}

            {doc.canDelete ? (
              confirming ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-fg-muted">Delete permanently?</span>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="text-xs font-medium text-status-rejected hover:text-status-rejected disabled:opacity-60"
                  >
                    {isPending ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="text-xs font-medium text-fg-muted hover:text-fg"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="text-xs font-medium text-fg-muted hover:text-status-rejected"
                >
                  Delete
                </button>
              )
            ) : (
              <span className="text-xs text-fg-muted" title="This document is still linked to a checklist item your employer relies on, so it can't be deleted.">
                Linked to an onboarding — can&apos;t be deleted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}
