'use client'

// The compliance section of a person's page: one row per applicable
// requirement with status, dates, evidence and the actions that make sense
// for its current state.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from './StatusBadge'
import Modal from './Modal'
import RecordForm from './RecordForm'
import { describeDue, formatDate, intervalLabel } from '@/lib/compliance/format'
import { dcpcHoursSummary } from '@/lib/compliance/engine'
import { DCPC_HOURS_REQUIRED, type ComplianceRecord, type ComplianceStatus, type HoursLogEntry, type RequirementType } from '@/lib/compliance/types'
import {
  addHoursEntry,
  clearExemption,
  deleteHoursEntry,
  deleteRecord,
  getEvidenceUrl,
  rejectRecord,
  setExemption,
  verifyRecord,
} from '@/app/(employer)/compliance/actions'

export interface PersonCell {
  employerRequirementId: string
  type: RequirementType
  intervalMonths: number | null
  record: ComplianceRecord | null
  status: ComplianceStatus
  daysUntil: number | null
  hours: HoursLogEntry[]
}

interface Props {
  employmentId: string
  dateOfBirth: string | null
  cells: PersonCell[]
}

type ModalState =
  | { kind: 'record'; cell: PersonCell }
  | { kind: 'reject'; cell: PersonCell }
  | { kind: 'exempt'; cell: PersonCell }
  | { kind: 'hours'; cell: PersonCell }
  | null

const smallBtn = 'rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-fg-body hover:bg-ink-raised-hover transition disabled:opacity-50'
const primaryBtn = 'rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-hover transition disabled:opacity-50'

export default function PersonRecords({ employmentId, dateOfBirth, cells }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [viewing, setViewing] = useState<{ url?: string; reference?: string | null; name: string } | null>(null)

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.error) setError(res.error)
      else {
        setModal(null)
        setReason('')
        router.refresh()
      }
    })
  }

  async function view(cell: PersonCell) {
    if (!cell.record) return
    const res = await getEvidenceUrl(cell.record.id)
    if (res.error) setError(res.error)
    else setViewing({ url: res.url, reference: res.reference, name: cell.type.name })
  }

  if (cells.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
        <p className="text-sm font-medium text-fg-body">No requirements apply to this person yet.</p>
        <p className="mt-1 text-xs text-fg-muted">Enable requirements in Compliance settings, or add this person to a role group that has some.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3">
          <p className="text-sm text-status-rejected">{error}</p>
        </div>
      )}

      <div className="bg-ink-raised rounded-2xl border border-line divide-y divide-line overflow-hidden">
        {cells.map((cell) => {
          const rec = cell.record
          const trackHours = cell.type.captures?.hours === true
          const hours = trackHours ? dcpcHoursSummary(cell.hours, rec?.expires_at ?? null, new Date()) : null
          const attrs = (rec?.attributes ?? {}) as Record<string, unknown>
          return (
            <div key={cell.employerRequirementId} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-fg">{cell.type.name}</p>
                    <StatusBadge status={cell.status} />
                    {cell.type.work_blocking && <span className="text-[11px] font-semibold uppercase tracking-wide text-status-rejected/80">Required to work</span>}
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    {describeDue(cell.status, cell.daysUntil, rec?.expires_at)}
                    {rec?.issued_at && ` · Issued ${formatDate(rec.issued_at)}`}
                    {rec?.last_checked_at && cell.type.renewal_rule === 'status_check' && ` · Checked ${formatDate(rec.last_checked_at)}`}
                    {cell.intervalMonths && cell.type.renewal_rule !== 'document_date' && cell.type.renewal_rule !== 'no_expiry' && ` · Renews ${intervalLabel(cell.intervalMonths)}`}
                    {rec?.submitted_by === 'employee' && ' · Uploaded by employee'}
                  </p>
                  {Object.keys(attrs).length > 0 && (
                    <p className="mt-1 text-xs text-fg-muted">
                      {Object.entries(attrs).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v).replace(/_/g, ' ')}`).join(' · ')}
                    </p>
                  )}
                  {rec?.is_exempt && rec.exempt_reason && <p className="mt-1 text-xs text-fg-muted">Exempt: {rec.exempt_reason}</p>}
                  {rec?.verification_status === 'rejected' && rec.reviewer_notes && <p className="mt-1 text-xs text-status-rejected">Rejected: {rec.reviewer_notes}</p>}
                  {hours && (
                    <p className={`mt-1 text-xs ${hours.warning ? 'text-status-pending' : 'text-fg-muted'}`}>
                      Periodic training: {hours.hoursLogged} of {DCPC_HOURS_REQUIRED} hours this cycle{hours.warning ? `, ${hours.hoursRemaining} still needed before the card expires` : ''}.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {rec && !rec.is_exempt && (rec.document_path || cell.type.reference_label) && (
                    <button type="button" onClick={() => view(cell)} className={smallBtn}>View</button>
                  )}
                  {rec?.verification_status === 'pending' && (
                    <>
                      <button type="button" disabled={pending} onClick={() => run(() => verifyRecord(rec.id))} className={primaryBtn}>Verify</button>
                      <button type="button" disabled={pending} onClick={() => { setReason(''); setModal({ kind: 'reject', cell }) }} className={smallBtn}>Reject</button>
                    </>
                  )}
                  {!rec?.is_exempt && (
                    <button type="button" onClick={() => setModal({ kind: 'record', cell })} className={rec && rec.verification_status !== 'pending' ? smallBtn : primaryBtn}>
                      {rec && !rec.is_exempt ? 'Renew' : 'Add record'}
                    </button>
                  )}
                  {trackHours && rec && !rec.is_exempt && (
                    <button type="button" onClick={() => setModal({ kind: 'hours', cell })} className={smallBtn}>Log hours</button>
                  )}
                  {rec?.is_exempt ? (
                    <button type="button" disabled={pending} onClick={() => run(() => clearExemption(rec.id))} className={smallBtn}>Remove exemption</button>
                  ) : (
                    <button type="button" onClick={() => { setReason(''); setModal({ kind: 'exempt', cell }) }} className={smallBtn}>Exempt</button>
                  )}
                  {rec && !rec.is_exempt && (
                    <button type="button" disabled={pending} onClick={() => { if (confirm('Delete this record? The previous record, if any, becomes current again.')) run(() => deleteRecord(rec.id)) }} className={`${smallBtn} text-status-rejected`}>Delete</button>
                  )}
                </div>
              </div>

              {trackHours && cell.hours.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-line pt-3">
                  {cell.hours.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 text-xs text-fg-body">
                      <span>{formatDate(h.completed_on)} · {h.course_name}{h.provider ? ` (${h.provider})` : ''} · {h.hours}h</span>
                      <button type="button" disabled={pending} onClick={() => run(() => deleteHoursEntry(h.id))} className="text-fg-muted hover:text-status-rejected">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {/* Add / renew */}
      <Modal open={modal?.kind === 'record'} onClose={() => setModal(null)}>
        {modal?.kind === 'record' && (
          <RecordForm
            mode="employer"
            employmentId={employmentId}
            employerRequirementId={modal.cell.employerRequirementId}
            type={modal.cell.type}
            intervalMonths={modal.cell.intervalMonths}
            dateOfBirth={dateOfBirth}
            isRenewal={!!modal.cell.record && !modal.cell.record.is_exempt}
            onDone={() => { setModal(null); router.refresh() }}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>

      {/* Reject */}
      <Modal open={modal?.kind === 'reject'} onClose={() => setModal(null)}>
        {modal?.kind === 'reject' && modal.cell.record && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">Reject upload: {modal.cell.type.name}</h3>
            <p className="text-xs text-fg-muted">Tell them what to fix. They will see this note and be asked to upload again.</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg" placeholder="e.g. The photo is blurred, please upload a clearer copy" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-2 text-sm text-fg-body">Cancel</button>
              <button type="button" disabled={pending} onClick={() => run(() => rejectRecord(modal.cell.record!.id, reason))} className="rounded-lg bg-status-rejected px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Reject</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Exempt */}
      <Modal open={modal?.kind === 'exempt'} onClose={() => setModal(null)}>
        {modal?.kind === 'exempt' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">Mark as exempt: {modal.cell.type.name}</h3>
            <p className="text-xs text-fg-muted">Use this when the requirement genuinely does not apply to this person. The reason is kept in the audit trail.</p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg" placeholder="e.g. Office-based, never drives on company business" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-2 text-sm text-fg-body">Cancel</button>
              <button type="button" disabled={pending} onClick={() => run(() => setExemption({ employmentId, employerRequirementId: modal.cell.employerRequirementId, reason }))} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save exemption</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Hours */}
      <Modal open={modal?.kind === 'hours'} onClose={() => setModal(null)}>
        {modal?.kind === 'hours' && modal.cell.record && (
          <HoursForm recordId={modal.cell.record.id} onDone={() => { setModal(null); router.refresh() }} onCancel={() => setModal(null)} />
        )}
      </Modal>

      {/* Evidence viewer */}
      <Modal open={!!viewing} onClose={() => setViewing(null)}>
        {viewing && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">{viewing.name}</h3>
            {viewing.reference && <p className="text-sm text-fg-body">Reference: <span className="font-mono text-fg">{viewing.reference}</span></p>}
            {viewing.url ? (
              <a href={viewing.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Open evidence in a new tab</a>
            ) : (
              <p className="text-xs text-fg-muted">No file attached to this record.</p>
            )}
            <p className="text-xs text-fg-muted">This view is logged in the audit trail.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

function HoursForm({ recordId, onDone, onCancel }: { recordId: string; onDone: () => void; onCancel: () => void }) {
  const [course, setCourse] = useState('')
  const [hours, setHours] = useState('7')
  const [date, setDate] = useState('')
  const [provider, setProvider] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const cls = 'w-full rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const res = await addHoursEntry(recordId, { courseName: course, hours: Number(hours), completedOn: date, provider })
          if (res.error) setError(res.error)
          else onDone()
        })
      }}
      className="space-y-3"
    >
      <h3 className="text-sm font-semibold text-fg">Log Driver CPC training hours</h3>
      <p className="text-xs text-fg-muted">National DCPC accepts 3.5-hour blocks and e-learning. International DCPC needs courses of at least 7 hours.</p>
      {error && <p className="text-sm text-status-rejected">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-fg-body mb-1">Course name</label>
          <input value={course} onChange={(e) => setCourse(e.target.value)} className={cls} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-body mb-1">Hours</label>
          <input type="number" step="0.5" min="0.5" max="35" value={hours} onChange={(e) => setHours(e.target.value)} className={cls} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-body mb-1">Completed on</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls} required />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-fg-body mb-1">Provider <span className="text-fg-muted font-normal">(optional)</span></label>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} className={cls} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-fg-body">Cancel</button>
        <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Add hours</button>
      </div>
    </form>
  )
}
