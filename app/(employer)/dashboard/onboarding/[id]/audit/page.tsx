import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AuditTrailPage({ params }: PageProps) {
  const { id: onboardingId } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) redirect('/dashboard')

  const { data: instance } = await supabase
    .from('onboarding_instances')
    .select('id, invitee_name')
    .eq('id', onboardingId)
    .eq('employer_id', member.employer_id)
    .maybeSingle()

  if (!instance) redirect('/dashboard')

  const { data: entries, error } = await adminClient
    .from('audit_log')
    .select('id, actor_id, actor_type, action, resource_type, resource_id, created_at, metadata')
    .eq('employer_id', member.employer_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Audit log fetch error:', error)
  }

  const filtered = (entries ?? []).filter(
    entry => (entry.metadata as Record<string, unknown> | null)?.onboarding_id === onboardingId
  )

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-xl font-semibold text-fg mb-1">Audit trail</h1>
      <p className="text-sm text-fg-muted mb-6">{instance.invitee_name}</p>

      {filtered.length === 0 && (
        <p className="text-sm text-fg-muted">No audit entries recorded yet.</p>
      )}

      {filtered.length > 0 && (
        <div className="bg-ink-raised rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-inset border-b border-line">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-fg-body">Timestamp</th>
                <th className="text-left px-4 py-2 font-medium text-fg-body">Actor</th>
                <th className="text-left px-4 py-2 font-medium text-fg-body">Action</th>
                <th className="text-left px-4 py-2 font-medium text-fg-body">Resource</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-fg-muted whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString('en-GB')}
                  </td>
                  <td className="px-4 py-2 text-fg-body capitalize">{entry.actor_type}</td>
                  <td className="px-4 py-2 text-fg">{entry.action}</td>
                  <td className="px-4 py-2 text-fg-muted">
                    {entry.resource_type}
                    {entry.resource_id ? ` (${entry.resource_id.slice(0, 8)})` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}