import { redirect } from 'next/navigation';
import { getPortableReviewData } from '@/lib/actions/portability-actions';
import PortableProfileReview from '@/components/portability/PortableProfileReview';

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortableProfileReviewPage({ params }: ReviewPageProps) {
  const { id: onboardingId } = await params;

  const { data } = await getPortableReviewData(onboardingId);

  if (!data) {
    redirect(`/employee/onboarding/${onboardingId}`);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: 'rgba(93, 202, 165, 0.15)',
            color: 'var(--status-approved)',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '12px',
          }}>
            Welcome back
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Your profile is already partially complete
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-body)', lineHeight: '1.6' }}>
            You&apos;re starting onboarding with <strong style={{ color: 'var(--text-primary)' }}>{data.employerName}</strong>
            {data.roleTitle ? ` as ${data.roleTitle}` : ''}.
            We found existing data from your profile that can save you time.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: 'var(--bg-raised)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--status-approved)' }}>
              {data.matchResult.prePopulatableCount}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>items can be carried forward</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {data.matchResult.totalItems}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>total checklist items</div>
          </div>
        </div>

        <PortableProfileReview
          onboardingId={data.onboardingId}
          matchResult={data.matchResult}
          maskedData={data.maskedData}
          employerName={data.employerName}
        />
      </div>
    </div>
  );
}