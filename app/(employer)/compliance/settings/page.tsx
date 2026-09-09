import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getEmployerContext } from '@/lib/entitlements'
import { loadEmployerRequirements, loadLibrary, loadRoleGroups } from '@/lib/compliance/queries'
import UpgradePanel from '@/components/compliance/UpgradePanel'
import RequirementPicker from '@/components/compliance/RequirementPicker'
import { CustomRequirements, RoleGroupsManager } from '@/components/compliance/SettingsExtras'

export const metadata = { title: 'Compliance requirements - Vopria' }

export default async function ComplianceSettingsPage() {
  const ctx = await getEmployerContext()
  if (!ctx) redirect('/login')

  if (!ctx.entitlements.compliance) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Compliance requirements</h1>
        <UpgradePanel feature="compliance" />
      </div>
    )
  }

  const [library, requirements, roleGroups] = await Promise.all([
    loadLibrary(ctx.employerId),
    loadEmployerRequirements(ctx.employerId),
    loadRoleGroups(ctx.employerId),
  ])

  return (
    <div>
      <div className="mb-6">
        <Link href="/compliance" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to compliance
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-fg tracking-tight">What you track</h1>
      <p className="text-fg-muted mt-1 text-[15px] mb-6">
        Tick the requirements your people need. Intervals set by law or the issuing body are fixed; the rest default to sector convention and are yours to change.
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <RequirementPicker library={library} requirements={requirements} roleGroups={roleGroups} sector={ctx.sector} />
        <div className="space-y-6">
          <RoleGroupsManager roleGroups={roleGroups} />
          <CustomRequirements custom={library.filter((t) => t.employer_id === ctx.employerId)} />
        </div>
      </div>
    </div>
  )
}
