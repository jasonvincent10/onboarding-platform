import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import OnboardingsList, { type OnboardingInstance } from '@/components/employer/OnboardingsList'

export default async function OnboardingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user!.id)
    .maybeSingle()

  const employerId = member?.employer_id

  const { data: onboardings } = await supabase
    .from('onboarding_instances')
    .select('id, invitee_name, role_title, start_date, status, readiness_pct, invitee_email')
    .eq('employer_id', employerId)
    .order('start_date', { ascending: true })

  const items = (onboardings ?? []) as OnboardingInstance[]

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Onboardings</h1>
          <p className="text-slate-500 mt-1 text-[15px]">
            {items.length} onboarding{items.length !== 1 ? 's' : ''} in total.
          </p>
        </div>
        <Link
          href="/dashboard/invite"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Invite new starter
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-8 py-16 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-6">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-violet-600">
              <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10 10-4.477 10-10S19.523 4 14 4Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 9v5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No onboardings yet</h2>
          <p className="text-[15px] text-slate-500 leading-relaxed">
            Invite your first new starter and their onboarding will appear here.
          </p>
        </div>
      ) : (
        <OnboardingsList items={items} />
      )}
    </div>
  )
}
