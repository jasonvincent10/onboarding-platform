import { createClient } from '@/lib/supabase/server'
import InviteTeamMemberForm from './InviteTeamMemberForm'
import RevokeInviteButton from './RevokeInviteButton'

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

interface Invitation {
  id: string
  email: string
  status: string
  created_at: string
}

export default async function TeamSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user!.id)
    .maybeSingle()

  const { data: members } = member?.employer_id
    ? await supabase
        .from('employer_members')
        .select('id, full_name, email, role, created_at')
        .eq('employer_id', member.employer_id)
        .order('created_at', { ascending: true })
    : { data: null }

  const { data: invitations } = member?.employer_id
    ? await supabase
        .from('employer_invitations')
        .select('id, email, status, created_at')
        .eq('employer_id', member.employer_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
    : { data: null }

  const team = (members ?? []) as Member[]
  const pending = (invitations ?? []) as Invitation[]

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-ink-raised rounded-2xl border border-line shadow-sm">
        <div className="px-6 py-5 border-b border-line flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-fg">Team members</h2>
            <p className="text-sm text-fg-muted mt-0.5">
              Everyone with access to this employer account.
            </p>
          </div>
        </div>

        <div className="divide-y divide-line">
          {team.map((m) => (
            <div key={m.id} className="px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-fg-accent">
                  {(m.full_name || m.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg truncate">{m.full_name || m.email}</p>
                <p className="text-xs text-fg-muted truncate">{m.email}</p>
              </div>
              <span className="shrink-0 inline-flex items-center rounded-full bg-ink-inset px-2.5 py-0.5 text-xs font-medium text-fg-body capitalize">
                {m.role}
              </span>
            </div>
          ))}
        </div>

        {pending.length > 0 && (
          <div className="border-t border-line">
            <p className="px-6 pt-4 text-xs font-semibold text-fg-muted uppercase tracking-wide">
              Pending invitations
            </p>
            <div className="divide-y divide-line">
              {pending.map((inv) => (
                <div key={inv.id} className="px-6 py-3.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-fg-body truncate">{inv.email}</p>
                    <p className="text-xs text-status-pending">Invited, awaiting response</p>
                  </div>
                  <RevokeInviteButton invitationId={inv.id} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-line">
          <InviteTeamMemberForm />
        </div>
      </div>
    </div>
  )
}
