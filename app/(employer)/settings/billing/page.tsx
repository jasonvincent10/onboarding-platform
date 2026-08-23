import { createClient } from '@/lib/supabase/server'
import { getBillingState } from '@/lib/billing'
import BillingPortalButton from './BillingPortalButton'

export default async function BillingSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user!.id)
    .maybeSingle()

  const billing = member?.employer_id ? await getBillingState(member.employer_id) : null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl">
      <div className="px-6 py-5 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">Billing</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your payment method and view invoices.
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {billing && (
          <div className="rounded-lg border border-slate-200 px-4 py-3.5">
            <p className="text-sm font-medium text-slate-900">
              {billing.freeRemaining > 0
                ? `Free trial: ${billing.freeRemaining} of ${billing.freeLimit} free onboardings remaining`
                : 'Free trial used'}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {billing.paidCredits > 0
                ? `${billing.paidCredits} paid onboarding credit${billing.paidCredits === 1 ? '' : 's'} available`
                : 'No paid credits yet.'}
            </p>
          </div>
        )}

        <BillingPortalButton />

        <p className="text-xs text-slate-400">
          Opens Stripe&apos;s secure billing portal in a new page, where you can update your card,
          view past invoices, and see your billing history.
        </p>
      </div>
    </div>
  )
}
