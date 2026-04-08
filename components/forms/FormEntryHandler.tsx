'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getExistingProfileData, type ExistingProfileData } from '@/lib/actions/form-actions';
import NINumberForm from '@/components/forms/NINumberForm';
import BankDetailsForm from '@/components/forms/BankDetailsForm';
import EmergencyContactsForm from '@/components/forms/EmergencyContactsForm';

interface FormEntryHandlerProps {
  onboardingId: string;
  checklistItemId: string;
  formFieldKey: string;    // 'ni_number' | 'bank_details' | 'emergency_contacts'
  itemName: string;
  itemDescription?: string;
  status: string;
}

export default function FormEntryHandler({
  onboardingId,
  checklistItemId,
  formFieldKey,
  itemName,
  itemDescription,
  status,
}: FormEntryHandlerProps) {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ExistingProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Load existing profile data for pre-population
  useEffect(() => {
    async function loadData() {
      const data = await getExistingProfileData();
      setProfileData(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSuccess = () => {
    setSubmitted(true);
    // Redirect back to the onboarding checklist after a brief moment
    setTimeout(() => {
      router.push(`/employee/onboarding/${onboardingId}`);
      router.refresh(); // Refresh server data to show updated status
    }, 1500);
  };

  // Already submitted — show success state
  if (status === 'submitted' || status === 'approved') {
    return (
      <div style={{ maxWidth: '480px', textAlign: 'center', padding: '2rem 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
          {status === 'approved' ? '✅' : '📤'}
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {status === 'approved' ? 'Approved' : 'Submitted'}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {status === 'approved'
            ? `Your ${itemName.toLowerCase()} has been approved by your employer.`
            : `Your ${itemName.toLowerCase()} has been submitted and is awaiting review.`}
        </p>
        <button
          onClick={() => router.push(`/employee/onboarding/${onboardingId}`)}
          style={{
            padding: '0.625rem 1.5rem',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.9375rem',
            cursor: 'pointer',
          }}
        >
          Back to Checklist
        </button>
      </div>
    );
  }

  // Just submitted — show confirmation
  if (submitted) {
    return (
      <div style={{ maxWidth: '480px', textAlign: 'center', padding: '2rem 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✓</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#22c55e' }}>Saved!</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Redirecting to your checklist...
        </p>
      </div>
    );
  }

  // Loading profile data
  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#6b7280' }}>
        Loading your profile data...
      </div>
    );
  }

  // Route to the correct form based on form_field_key
  switch (formFieldKey) {
    case 'ni_number':
      return (
        <NINumberForm
          onboardingId={onboardingId}
          checklistItemId={checklistItemId}
          existingValue={profileData?.niNumber ?? null}
          onSuccess={handleSuccess}
        />
      );

    case 'bank_details':
      return (
        <BankDetailsForm
          onboardingId={onboardingId}
          checklistItemId={checklistItemId}
          existingSortCode={profileData?.sortCode ?? null}
          existingAccountNumber={profileData?.accountNumber ?? null}
          existingAccountHolderName={profileData?.accountHolderName ?? null}
          onSuccess={handleSuccess}
        />
      );

    case 'emergency_contacts':
      return (
        <EmergencyContactsForm
          onboardingId={onboardingId}
          checklistItemId={checklistItemId}
          existingContacts={profileData?.emergencyContacts ?? null}
          onSuccess={handleSuccess}
        />
      );

    default:
      return (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '0.375rem',
            color: '#92400e',
          }}
        >
          <p style={{ fontWeight: 500 }}>Unknown form type: {formFieldKey}</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            This checklist item has a form_field_key that doesn&apos;t match any
            available form. Please contact support.
          </p>
        </div>
      );
  }
}
