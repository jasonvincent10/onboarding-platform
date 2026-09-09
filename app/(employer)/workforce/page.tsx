import { redirect } from 'next/navigation'
import { getEmployerContext } from '@/lib/entitlements'
import { buildComplianceOverview, loadEmployments } from '@/lib/compliance/queries'
import UpgradePanel from '@/components/compliance/UpgradePanel'
import WorkforceList, { type WorkforceRow } from '@/components/workforce/WorkforceList'
import AddPersonForm from '@/components/workforce/AddPersonForm'
import ImportCsvForm from '@/components/workforce/ImportCsvForm'
import { ComplianceExportButton } from '@/components/ExportButtons'

export const metadata = { title: 'Workforce - Vopria' }

export default async function WorkforcePage() {
  const ctx = await getEmployerContext()
  if (!ctx) redirect('/login')

  if (!ctx.entitlements.compliance) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1">Workforce</h1>
        <p className="text-fg-muted text-[15px] mb-6">Everyone who works for {ctx.companyName}, with their compliance at a glance.</p>
        <UpgradePanel feature="workforce" />
      </div>
    )
  }

  const [overview, leavers] = await Promise.all([
    buildComplianceOverview(ctx.employerId),
    loadEmployments(ctx.employerId, { status: 'leaver' }),
  ])

  const rows: WorkforceRow[] = [
    ...overview.people.map((p) => ({
      id: p.employment.id,
      full_name: p.employment.full_name,
      email: p.employment.email,
      job_title: p.employment.job_title,
      department: p.employment.department,
      start_date: p.employment.start_date,
      end_date: p.employment.end_date,
      status: p.employment.status,
      employee_id: p.employment.employee_id,
      role_group_ids: p.employment.role_group_ids ?? [],
      worst: p.worst,
      counts: p.counts,
      requirementCount: p.cells.length,
    })),
    ...leavers.map((e) => ({
      id: e.id,
      full_name: e.full_name,
      email: e.email,
      job_title: e.job_title,
      department: e.department,
      start_date: e.start_date,
      end_date: e.end_date,
      status: e.status,
      employee_id: e.employee_id,
      role_group_ids: e.role_group_ids ?? [],
      worst: null,
      counts: null,
      requirementCount: 0,
    })),
  ]

  const cap = ctx.entitlements.headcountCap

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Workforce</h1>
          <p className="text-fg-muted mt-1 text-[15px]">
            {overview.totals.people} active {overview.totals.people === 1 ? 'person' : 'people'}
            {cap ? ` of ${cap} on your plan` : ''}
            {overview.totals.atRisk > 0 ? ` · ${overview.totals.atRisk} at risk` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ComplianceExportButton />
          <ImportCsvForm />
          <AddPersonForm roleGroups={overview.roleGroups} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-ink-raised rounded-2xl border border-line shadow-sm px-8 py-14 text-center max-w-2xl">
          <h2 className="text-lg font-semibold text-fg">Your workforce is empty</h2>
          <p className="mt-2 text-sm text-fg-muted leading-relaxed">
            People join automatically when their onboarding completes. For everyone already on the team, import a CSV or add them one at a time.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <ImportCsvForm />
            <AddPersonForm roleGroups={overview.roleGroups} />
          </div>
        </div>
      ) : (
        <WorkforceList people={rows} roleGroups={overview.roleGroups} />
      )}
    </div>
  )
}
