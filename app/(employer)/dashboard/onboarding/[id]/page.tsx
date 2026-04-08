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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← Back to dashboard
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {result.instance.invitee_name}
          </h1>
          <p className="text-gray-500 mt-1">
            {result.instance.role_title} · Starting{' '}
            {new Date(result.instance.start_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">
            {result.instance.invitee_email}
          </p>
        </div>

        <OnboardingDetailView
          onboardingId={id}
          items={result.items}
          employeeName={result.instance.invitee_name}
        />

      </div>
    </div>
  )
}
