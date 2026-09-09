'use client'

// Employee self-service: what applies to me, what is due, upload renewals.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from './StatusBadge'
import Modal from './Modal'
import RecordForm from './RecordForm'
import { describeDue, formatDate } from '@/lib/compliance/format'
import type { ComplianceRecord, ComplianceStatus, RequirementType } from '@/lib/compliance/types'
import { getMyEvidenceUrl } from '@/app/(employee)/employee/compliance/actions'

export interface MyCell {
  employerRequirementId: string
  type: RequirementType
  intervalMonths: number | null
  record: ComplianceRecord | null
  status: ComplianceStatus
  daysUntil: number | null
}

export interface MyEmployerView {
  employmentId: string
  companyName: string
  jobTitle: string | null
  dateOfBirth: string | null
  cells: MyCell[]
}

export default function MyCompliance({ views }: { views: MyEmployerView[] }) {
  const router = useRouter()
  const [uploading, setUploading] = useState<{ view: MyEmployerView; cell: MyCell } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function view(cell: MyCell) {
    if (!cell.record) return
    const res = await getMyEvidenceUrl(cell.record.id)
    if (res.error) setError(res.error)
    else if (res.url) window.open(res.url, '_blank', 'noopener')
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-status-rejected">{error}</p>}
      {views.map((v) => {
        const due = v.cells.filter((c) => ['expired', 'missing', 'rejected', 'expiring'].includes(c.status))
        return (
          <section key={v.employmentId}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-fg">{v.companyName}</h2>
              <p className="text-xs text-fg-muted">
                {v.jobTitle ? `${v.jobTitle} · ` : ''}
                {due.length === 0 ? 'Everything is in date.' : `${due.length} item${due.length === 1 ? '' : 's'} need${due.length === 1 ? 's' : ''} your attention.`}
              </p>
            </div>
            {v.cells.length === 0 ? (
              <p className="text-sm text-fg-muted">Your employer has not set any requirements for you yet.</p>
            ) : (
              <div className="bg-ink-raised rounded-2xl border border-line divide-y divide-line overflow-hidden">
                {v.cells.map((cell) => {
                  const rec = cell.record
                  const canUpload = cell.status !== 'exempt' && cell.status !== 'awaiting_review'
                  return (
                    <div key={cell.employerRequirementId} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-fg">{cell.type.name}</p>
                            <StatusBadge status={cell.status} />
                          </div>
                          <p className="mt-0.5 text-xs text-fg-muted">
                            {describeDue(cell.status, cell.daysUntil, rec?.expires_at)}
                            {rec?.issued_at ? ` · Issued ${formatDate(rec.issued_at)}` : ''}
                          </p>
                          {cell.status === 'rejected' && rec?.reviewer_notes && (
                            <p className="mt-1 text-xs text-status-rejected">Your employer said: {rec.reviewer_notes}</p>
                          )}
                          {cell.status === 'awaiting_review' && <p className="mt-1 text-xs text-fg-muted">Your employer will check this shortly.</p>}
                          {cell.type.guidance && (cell.status === 'missing' || cell.status === 'rejected' || cell.status === 'expiring' || cell.status === 'expired') && (
                            <p className="mt-1 text-xs text-fg-body">{cell.type.guidance}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {rec?.document_path && (
                            <button type="button" onClick={() => view(cell)} className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-fg-body hover:bg-ink-raised-hover">View</button>
                          )}
                          {canUpload && (
                            <button type="button" onClick={() => setUploading({ view: v, cell })} className="rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-hover">
                              {rec && !rec.is_exempt ? 'Upload renewal' : 'Upload'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      <Modal open={!!uploading} onClose={() => setUploading(null)}>
        {uploading && (
          <RecordForm
            mode="employee"
            employmentId={uploading.view.employmentId}
            employerRequirementId={uploading.cell.employerRequirementId}
            type={uploading.cell.type}
            intervalMonths={uploading.cell.intervalMonths}
            dateOfBirth={uploading.view.dateOfBirth}
            isRenewal={!!uploading.cell.record}
            onDone={() => { setUploading(null); router.refresh() }}
            onCancel={() => setUploading(null)}
          />
        )}
      </Modal>
    </div>
  )
}
