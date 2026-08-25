import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getOnboardingForReview } from './actions'
import OnboardingDetailView from '@/components/employer/OnboardingDetailView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OnboardingDetailPage({ params }: Props) {
  const { id } = await params
  const result = await getOnboardingForReview(id)

  if ('error' in result) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-ink-inset">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">

        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-fg">
            {result.instance.invitee_name}
          </h1>
          <p className="text-fg-muted mt-1">
            {result.instance.role_title} · Starting{' '}
            {new Date(result.instance.start_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p className="text-sm text-fg-muted mt-0.5">
            {result.instance.invitee_email}
          </p>
        </div>

        <OnboardingDetailView
          onboardingId={id}
          items={result.items}
          employeeName={result.instance.invitee_name}
          status={result.instance.status}
          rejectedAt={result.instance.rejected_at}
        />

      </div>
    </div>
  )
}
