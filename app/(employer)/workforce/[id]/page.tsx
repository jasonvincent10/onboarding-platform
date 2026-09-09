import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getEmployerContext } from '@/lib/entitlements'
import { buildPersonCompliance, loadHoursLog, loadRoleGroups } from '@/lib/compliance/queries'
import PersonDetails from '@/components/workforce/PersonDetails'
import PersonRecords, { type PersonCell } from '@/components/compliance/PersonRecords'
import { StatusBadge } from '@/components/compliance/StatusBadge'
import { ComplianceExportButton } from '@/components/ExportButtons'

export const metadata = { title: 'Person - Vopria' }

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getEmployerContext()
  if (!ctx) redirect('/login')
  if (!ctx.entitlements.compliance) redirect('/workforce')

  const [person, roleGroups] = await Promise.all([
    buildPersonCompliance(ctx.employerId, id),
    loadRoleGroups(ctx.employerId),
  ])
  if (!person) notFound()

  const recordIds = person.cells.map((c) => c.record?.id).filter((x): x is string => !!x)
  const hours = await loadHoursLog(ctx.employerId, recordIds)

  const cells: PersonCell[] = person.cells.map((c) => ({
    employerRequirementId: c.requirement.id,
    type: c.type,
    intervalMonths: c.intervalMonths,
    record: c.record,
    status: c.status,
    daysUntil: c.daysUntil,
    hours: c.record ? hours[c.record.id] ?? [] : [],
  }))

  const e = person.employment

  return (
    <div>
      <div className="mb-6">
        <Link href="/workforce" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to workforce
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-fg tracking-tight">{e.full_name}</h1>
            {e.status === 'leaver' ? (
              <span className="rounded-full bg-status-inactive/15 px-2.5 py-0.5 text-xs font-medium text-status-inactive">Leaver</span>
            ) : person.worst ? (
              <StatusBadge status={person.worst} label={person.worst === 'valid' ? 'All in date' : undefined} />
            ) : null}
          </div>
          <p className="text-fg-muted mt-1 text-[15px]">{[e.job_title, e.department].filter(Boolean).join(' · ') || 'No job title yet'}</p>
        </div>
        <ComplianceExportButton employmentId={e.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 order-2 lg:order-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Compliance</h2>
            <Link href="/compliance/settings" className="text-xs font-medium text-fg-accent hover:text-fg">Change what applies</Link>
          </div>
          {e.status === 'leaver' && (
            <p className="text-xs text-fg-muted">This person has left. Records are kept for your audit trail but no reminders are sent.</p>
          )}
          <PersonRecords employmentId={e.id} dateOfBirth={e.date_of_birth} cells={cells} />
        </div>
        <div className="order-1 lg:order-2">
          <PersonDetails person={e} roleGroups={roleGroups} hasRecords={recordIds.length > 0} />
        </div>
      </div>
    </div>
  )
}
