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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '12px',
          }}>
            Welcome back
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            Your profile is already partially complete
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.5' }}>
            You&apos;re starting onboarding with <strong style={{ color: '#111827' }}>{data.employerName}</strong>
            {data.roleTitle ? ` as ${data.roleTitle}` : ''}.
            We found existing data from your profile that can save you time.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>
              {data.matchResult.prePopulatableCount}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>items can be carried forward</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
              {data.matchResult.totalItems}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>total checklist items</div>
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