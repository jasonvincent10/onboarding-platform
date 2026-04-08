import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Vercel sends CRON_SECRET as a Bearer token — reject anything else
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Fetch all onboardings that are still active
  const { data: activeOnboardings, error: fetchError } = await supabase
    .from('onboarding_instances')
    .select('id')
    .in('status', ['pending', 'in_progress'])

  if (fetchError) {
    console.error('[cron/check-overdue] fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const ids = activeOnboardings?.map((o) => o.id) ?? []

  let processed = 0
  let errors = 0

  for (const id of ids) {
    const { error: rpcError } = await supabase.rpc('recalculate_onboarding_status', {
      p_onboarding_id: id,
    })
    if (rpcError) {
      console.error(`[cron/check-overdue] failed for onboarding ${id}:`, rpcError)
      errors++
    } else {
      processed++
    }
  }

  console.log(`[cron/check-overdue] done — processed: ${processed}, errors: ${errors}`)
  return NextResponse.json({ processed, errors })
}