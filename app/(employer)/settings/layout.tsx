import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SettingsTabs from './SettingsTabs'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    return (
      <div className="bg-ink-raised rounded-2xl border border-line px-8 py-10 text-center">
        <p className="text-sm font-medium text-fg-body">Your employer account isn&apos;t fully set up yet.</p>
        <Link href="/dashboard" className="mt-3 inline-block text-sm font-medium text-fg-accent hover:text-fg">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1">Settings</h1>
      <p className="text-fg-muted text-[15px] mb-6">Manage your company profile, team, and billing.</p>
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </div>
  )
}
