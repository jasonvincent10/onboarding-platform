'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { importWorkforce, type ImportState } from '@/app/(employer)/workforce/actions'
import Modal from '@/components/compliance/Modal'

const TEMPLATE = 'Full name,Email,Job title,Department,Start date,Date of birth,Role groups\r\nJane Smith,jane@example.co.uk,Care Assistant,Nights,01/02/2024,20/05/1990,Drivers; Nights\r\n'

export default function ImportCsvForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<ImportState | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await importWorkforce(null, formData)
      setState(result)
      if (result.imported) router.refresh()
    })
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'vopria-workforce-template.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <button type="button" onClick={() => { setState(null); setOpen(true) }} className="rounded-lg border border-line-strong bg-ink-raised px-4 py-2.5 text-sm font-medium text-fg-body hover:bg-ink-raised-hover transition">
        Import CSV
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-fg">Import your workforce from a CSV</h3>
            <p className="mt-1 text-xs text-fg-muted">
              First row must be headers. Columns: Full name (required), Email, Job title, Department, Start date, Date of birth, Role groups. Dates as DD/MM/YYYY. People already in your workforce with the same email are skipped.
            </p>
            <button type="button" onClick={downloadTemplate} className="mt-2 text-xs font-medium text-fg-accent hover:text-fg">Download a template</button>
          </div>

          {state?.error && (
            <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2">
              <p className="text-sm text-status-rejected">{state.error}</p>
            </div>
          )}
          {state?.imported !== undefined && (
            <div className="rounded-lg border border-status-approved/30 bg-status-approved/10 px-3 py-2">
              <p className="text-sm text-status-approved">Imported {state.imported} {state.imported === 1 ? 'person' : 'people'}.</p>
              {state.skipped && state.skipped.length > 0 && <p className="text-xs text-fg-body mt-1">Skipped (already present): {state.skipped.join(', ')}</p>}
              {state.ignoredColumns && state.ignoredColumns.length > 0 && <p className="text-xs text-fg-muted mt-1">Ignored columns: {state.ignoredColumns.join(', ')}</p>}
            </div>
          )}
          {state?.rowErrors && state.rowErrors.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-status-pending/30 bg-status-pending/10 px-3 py-2">
              <p className="text-xs font-semibold text-status-pending mb-1">Rows not imported</p>
              <ul className="space-y-0.5">
                {state.rowErrors.map((e, i) => (
                  <li key={i} className="text-xs text-status-pending">{e.line > 0 ? `Line ${e.line}: ` : ''}{e.message}</li>
                ))}
              </ul>
            </div>
          )}

          <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm text-fg-body file:mr-3 file:rounded-md file:border-0 file:bg-brand/15 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg-accent" />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="px-3.5 py-2 text-sm font-medium text-fg-body hover:text-fg">{state?.imported !== undefined ? 'Close' : 'Cancel'}</button>
            <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{pending ? 'Importing...' : 'Import'}</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
