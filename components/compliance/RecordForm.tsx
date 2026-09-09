'use client'

// Add / renew a compliance record. Used by employers (person page and
// organisation section) and by employees (self-service). The fields shown
// depend on the requirement's renewal rule, and the expiry preview uses the
// same pure engine the server uses, so what the user sees is what gets saved.

import { useMemo, useRef, useState } from 'react'
import { computeExpiry } from '@/lib/compliance/engine'
import { formatDate, intervalLabel, todayISO } from '@/lib/compliance/format'
import { EVIDENCE_ACCEPT, EVIDENCE_ALLOWED_TYPES, EVIDENCE_MAX_BYTES } from '@/lib/compliance/evidence-constants'
import { uploadWithSignedUrl } from '@/lib/compliance/upload-client'
import type { RequirementType } from '@/lib/compliance/types'
import { prepareEvidenceUpload, saveRecord } from '@/app/(employer)/compliance/actions'
import { prepareMyEvidenceUpload, submitMyEvidence } from '@/app/(employee)/employee/compliance/actions'

interface Props {
  mode: 'employer' | 'employee'
  employmentId: string | null
  employerRequirementId: string
  type: RequirementType
  intervalMonths: number | null
  dateOfBirth: string | null
  isRenewal: boolean
  onDone: () => void
  onCancel: () => void
}

function humanise(key: string): string {
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

const inputClass = 'w-full rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'

export default function RecordForm({ mode, employmentId, employerRequirementId, type, intervalMonths, dateOfBirth, isRenewal, onDone, onCancel }: Props) {
  const rule = type.renewal_rule
  const needsIssue = rule === 'fixed_interval' || rule === 'employer_interval' || rule === 'age_based'
  const needsDocDate = rule === 'document_date' || rule === 'event_based'
  const needsCheck = rule === 'status_check'
  const optionalIssue = rule === 'no_expiry' || needsDocDate

  const [issuedAt, setIssuedAt] = useState('')
  const [documentDate, setDocumentDate] = useState('')
  const [checkedAt, setCheckedAt] = useState(needsCheck ? todayISO() : '')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [attrs, setAttrs] = useState<Record<string, string>>({})
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const captureFields = useMemo(
    () => Object.entries(type.captures ?? {}).filter(([k]) => k !== 'hours'),
    [type.captures]
  )

  const preview = useMemo(
    () =>
      computeExpiry({
        rule,
        issuedAt: issuedAt || null,
        documentDate: documentDate || null,
        intervalMonths,
        dateOfBirth,
        lastCheckedAt: checkedAt || null,
      }),
    [rule, issuedAt, documentDate, intervalMonths, dateOfBirth, checkedAt]
  )

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!EVIDENCE_ALLOWED_TYPES.includes(f.type)) {
      setError('Only PDF, JPG and PNG files are accepted.')
      return
    }
    if (f.size > EVIDENCE_MAX_BYTES) {
      setError('File must be under 10MB.')
      return
    }
    setError(null)
    setFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (needsIssue && !issuedAt) return setError('Enter the date this was completed or issued.')
    if (needsDocDate && !documentDate) return setError('Enter the expiry date shown on the document.')
    if (needsCheck && !checkedAt) return setError('Enter the date the check was carried out.')
    if (type.evidence_required && !file && !reference.trim()) return setError(type.reference_label ? `Upload the evidence or enter the ${type.reference_label.toLowerCase()}.` : 'Upload the evidence.')
    if (rule === 'age_based' && !dateOfBirth) return setError('A date of birth is needed for this requirement. Add it to the person first.')

    setBusy(true)
    try {
      let documentPath: string | null = null
      let documentName: string | null = null
      if (file) {
        const prep = mode === 'employer'
          ? await prepareEvidenceUpload({ employmentId, fileName: file.name, mimeType: file.type, sizeBytes: file.size })
          : await prepareMyEvidenceUpload({ employmentId: employmentId!, fileName: file.name, mimeType: file.type, sizeBytes: file.size })
        if ('error' in prep) {
          setError(prep.error)
          setBusy(false)
          return
        }
        const up = await uploadWithSignedUrl(prep.path, prep.token, file)
        if (up.error) {
          setError(`Upload failed: ${up.error}`)
          setBusy(false)
          return
        }
        documentPath = prep.path
        documentName = file.name
      }

      const attributes: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(attrs)) if (v) attributes[k] = v

      const result = mode === 'employer'
        ? await saveRecord({
            employmentId,
            employerRequirementId,
            issuedAt: issuedAt || null,
            documentDate: documentDate || null,
            lastCheckedAt: checkedAt || null,
            reference: reference || null,
            attributes,
            documentPath,
            documentName,
            notes: notes || null,
          })
        : await submitMyEvidence({
            employmentId: employmentId!,
            employerRequirementId,
            issuedAt: issuedAt || (needsCheck ? checkedAt : null) || null,
            documentDate: documentDate || null,
            reference: reference || null,
            attributes,
            documentPath,
            documentName,
          })

      if (result.error) {
        setError(result.error)
        setBusy(false)
        return
      }
      onDone()
    } catch {
      setError('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-fg">{isRenewal ? 'Renew' : 'Add'}: {type.name}</h3>
        {type.guidance && mode === 'employee' && <p className="mt-1 text-xs text-fg-muted">{type.guidance}</p>}
        {type.description && mode === 'employer' && <p className="mt-1 text-xs text-fg-muted">{type.description}</p>}
        {intervalMonths && (rule === 'fixed_interval' || rule === 'employer_interval' || rule === 'status_check') && (
          <p className="mt-1 text-xs text-fg-accent">Renews {intervalLabel(intervalMonths)}.</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2">
          <p className="text-sm text-status-rejected">{error}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(needsIssue || optionalIssue) && (
          <div>
            <label className="block text-xs font-medium text-fg-body mb-1">
              {rule === 'age_based' ? 'Date of medical' : 'Date completed or issued'}
              {needsIssue && <span className="text-status-rejected"> *</span>}
            </label>
            <input type="date" value={issuedAt} max={todayISO()} onChange={(e) => setIssuedAt(e.target.value)} className={inputClass} />
          </div>
        )}
        {needsDocDate && (
          <div>
            <label className="block text-xs font-medium text-fg-body mb-1">
              {rule === 'event_based' ? 'Project or event end date' : 'Expiry date on the document'}
              <span className="text-status-rejected"> *</span>
            </label>
            <input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className={inputClass} />
          </div>
        )}
        {needsCheck && (
          <div>
            <label className="block text-xs font-medium text-fg-body mb-1">Date checked <span className="text-status-rejected">*</span></label>
            <input type="date" value={checkedAt} max={todayISO()} onChange={(e) => setCheckedAt(e.target.value)} className={inputClass} />
          </div>
        )}
        {type.reference_label && (
          <div>
            <label className="block text-xs font-medium text-fg-body mb-1">{type.reference_label}</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} autoComplete="off" />
          </div>
        )}
        {captureFields.map(([key, spec]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-fg-body mb-1">{humanise(key)}</label>
            {Array.isArray(spec) ? (
              <select value={attrs[key] ?? ''} onChange={(e) => setAttrs((a) => ({ ...a, [key]: e.target.value }))} className={inputClass}>
                <option value="">Select</option>
                {spec.map((opt) => (
                  <option key={String(opt)} value={String(opt)}>{humanise(String(opt))}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={attrs[key] ?? ''} onChange={(e) => setAttrs((a) => ({ ...a, [key]: e.target.value }))} className={inputClass} />
            )}
          </div>
        ))}
      </div>

      {rule === 'age_based' && dateOfBirth && (
        <p className="text-xs text-fg-muted">Date of birth on file: {formatDate(dateOfBirth)}.</p>
      )}

      <div className="rounded-lg border border-line bg-ink-inset px-3 py-2 text-xs text-fg-body">
        {rule === 'no_expiry'
          ? 'This item does not expire once recorded.'
          : preview.expiresAt
            ? <>Next due: <span className="font-semibold text-fg">{formatDate(preview.expiresAt)}</span></>
            : 'Next due date will appear once the dates above are filled in.'}
      </div>

      <div>
        <label className="block text-xs font-medium text-fg-body mb-1">
          Evidence {type.evidence_required ? <span className="text-fg-muted font-normal">(PDF, JPG or PNG, up to 10MB)</span> : <span className="text-fg-muted font-normal">(optional)</span>}
        </label>
        <input ref={fileRef} type="file" accept={EVIDENCE_ACCEPT} onChange={handleFile} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-lg border-2 border-dashed border-line-strong px-4 py-4 text-sm text-fg-body hover:border-brand hover:bg-brand/10 transition">
          {file ? <span className="text-fg-accent font-medium">{file.name}</span> : 'Click to choose a file'}
        </button>
      </div>

      {mode === 'employer' && (
        <div>
          <label className="block text-xs font-medium text-fg-body mb-1">Notes <span className="text-fg-muted font-normal">(optional)</span></label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Provider, course code, anything useful later" />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-3.5 py-2 text-sm font-medium text-fg-body hover:text-fg transition">Cancel</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60 transition">
          {busy ? 'Saving...' : mode === 'employee' ? 'Submit for review' : 'Save record'}
        </button>
      </div>
    </form>
  )
}
