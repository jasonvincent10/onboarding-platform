import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getEmployerContext } from '@/lib/entitlements'
import { buildComplianceOverview } from '@/lib/compliance/queries'
import UpgradePanel from '@/components/compliance/UpgradePanel'
import ComplianceOverview, { type OverviewVM } from '@/components/compliance/ComplianceOverview'
import { ComplianceExportButton } from '@/components/ExportButtons'

export const metadata = { title: 'Compliance - Vopria' }

export default async function CompliancePage() {
  const ctx = await getEmployerContext()
  if (!ctx) redirect('/login')

  if (!ctx.entitlements.compliance) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1">Compliance</h1>
        <p className="text-fg-muted text-[15px] mb-6">Who is in date, who is not, and what is due next.</p>
        <UpgradePanel feature="compliance" />
      </div>
    )
  }

  const overview = await buildComplianceOverview(ctx.employerId)

  const vm: OverviewVM = {
    requirements: overview.personRequirements.map((r) => ({
      id: r.requirement.id,
      type: r.type,
      intervalMonths: null,
    })),
    people: overview.people.map((p) => ({
      id: p.employment.id,
      full_name: p.employment.full_name,
      job_title: p.employment.job_title,
      role_group_ids: p.employment.role_group_ids ?? [],
      worst: p.worst,
      counts: p.counts,
      cells: p.cells.map((c) => ({ reqId: c.requirement.id, status: c.status, daysUntil: c.daysUntil, expiresAt: c.record?.expires_at ?? null })),
    })),
    org: overview.organisation.map((c) => ({
      reqId: c.requirement.id,
      type: c.type,
      intervalMonths: c.intervalMonths,
      record: c.record,
      status: c.status,
      daysUntil: c.daysUntil,
    })),
    roleGroups: overview.roleGroups,
    totals: overview.totals,
    hasAnyRequirements: overview.personRequirements.length + overview.organisation.length > 0,
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Compliance</h1>
          <p className="text-fg-muted mt-1 text-[15px]">
            {vm.hasAnyRequirements
              ? `${overview.personRequirements.length} requirement${overview.personRequirements.length === 1 ? '' : 's'} tracked across ${overview.totals.people} ${overview.totals.people === 1 ? 'person' : 'people'}.`
              : 'Nothing is being tracked yet.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ComplianceExportButton verifiedOnly />
          <Link href="/compliance/settings" className="rounded-lg border border-line-strong bg-ink-raised px-4 py-2.5 text-sm font-medium text-fg-body hover:bg-ink-raised-hover transition">Requirements</Link>
          <Link href="/workforce" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition">Workforce</Link>
        </div>
      </div>
      <ComplianceOverview vm={vm} />
    </div>
  )
}
