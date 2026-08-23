import { createClient } from '@/lib/supabase/server'

interface Member {
  id: string
  full_name: string
  email: string
  role: string
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

  const team = (members ?? []) as Member[]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl">
      <div className="px-6 py-5 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">Team members</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Everyone with access to this employer account.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {team.map((m) => (
          <div key={m.id} className="px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-teal-800">
                {(m.full_name || m.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{m.full_name || m.email}</p>
              <p className="text-xs text-slate-500 truncate">{m.email}</p>
            </div>
            <span className="shrink-0 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
              {m.role}
            </span>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Inviting additional team members isn&apos;t available yet.
        </p>
      </div>
    </div>
  )
}
