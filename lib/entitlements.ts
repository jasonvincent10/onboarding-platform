// lib/entitlements.ts
// Server-side plan gate. Every page and server action behind a paid feature
// calls getEmployerContext() (auth + membership) and checks the returned
// entitlements, so gating lives in one place.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { entitlementsFor, type Entitlements } from '@/lib/plans'

export interface EmployerContext {
  userId: string
  userEmail: string | null
  employerId: string
  memberName: string
  companyName: string
  sector: string | null
  entitlements: Entitlements
}

/**
 * Resolves the signed-in employer member and their plan. Returns null when
 * the caller is not signed in or not an employer member. Uses adminClient
 * for the account row because employer_accounts RLS is scoped by membership
 * and this is the one place we deliberately read plan columns.
 */
export async function getEmployerContext(): Promise<EmployerContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminClient = createAdminClient()
  const { data: member } = await adminClient
    .from('employer_members')
    .select('employer_id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member) return null

  const { data: account } = await adminClient
    .from('employer_accounts')
    .select('company_name, sector, plan_tier, plan_band, subscription_status, trial_ends_at, current_period_end')
    .eq('id', member.employer_id)
    .maybeSingle()

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    employerId: member.employer_id,
    memberName: member.full_name || user.email || 'You',
    companyName: account?.company_name ?? 'Your company',
    sector: account?.sector ?? null,
    entitlements: entitlementsFor(account),
  }
}

export async function countActiveEmployments(employerId: string): Promise<number> {
  const adminClient = createAdminClient()
  const { count } = await adminClient
    .from('employments')
    .select('id', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .eq('status', 'active')
  return count ?? 0
}

/**
 * True when adding `adding` more active people would exceed the band cap.
 * Custom and uncapped plans always pass.
 */
export async function wouldExceedHeadcount(ctx: EmployerContext, adding: number): Promise<{ exceeded: boolean; current: number; cap: number | null }> {
  const cap = ctx.entitlements.headcountCap
  const current = await countActiveEmployments(ctx.employerId)
  if (cap === null) return { exceeded: false, current, cap }
  return { exceeded: current + adding > cap, current, cap }
}
