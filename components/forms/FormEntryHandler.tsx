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
    const isApproved = status === 'approved'
    return (
      <div className="py-8 text-center">
        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${isApproved ? 'bg-emerald-100' : 'bg-indigo-50'}`}>
          {isApproved ? (
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
        </div>
        <h2 className={`text-base font-semibold ${isApproved ? 'text-emerald-800' : 'text-gray-900'}`}>
          {isApproved ? 'Approved' : 'Submitted'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isApproved
            ? `Your ${itemName.toLowerCase()} has been approved by your employer.`
            : `Your ${itemName.toLowerCase()} has been submitted and is awaiting review.`}
        </p>
        <button
          onClick={() => router.push(`/employee/onboarding/${onboardingId}`)}
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Back to checklist
        </button>
      </div>
    );
  }

  // Just submitted — show confirmation
  if (submitted) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-emerald-800">Saved!</h2>
        <p className="mt-1 text-sm text-gray-500">Redirecting to your checklist...</p>
      </div>
    );
  }

  // Loading profile data
  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 text-sm text-gray-500">
        <svg className="h-4 w-4 animate-spin text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Unknown form type: {formFieldKey}</p>
          <p className="mt-1 text-sm text-amber-700">
            This checklist item has a form_field_key that does not match any available form. Please contact support.
          </p>
        </div>
      );
  }
}
