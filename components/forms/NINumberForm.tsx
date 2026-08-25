'use client';

import { useState, useCallback } from 'react';
import { validateNINumber } from '@/lib/validation/ni-number';
import { submitNINumber } from '@/lib/actions/form-actions';

interface NINumberFormProps {
  onboardingId: string;
  checklistItemId: string;
  existingValue: string | null;
  onSuccess: () => void;
}

export default function NINumberForm({
  onboardingId,
  checklistItemId,
  existingValue,
  onSuccess,
}: NINumberFormProps) {
  const [value, setValue] = useState(existingValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [formatted, setFormatted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setValue(input);
    setServerError(null);

    if (input.replace(/\s/g, '').length === 0) {
      setError(null);
      setIsValid(false);
      setFormatted(null);
      return;
    }

    const result = validateNINumber(input);
    setError(result.error);
    setIsValid(result.valid);
    setFormatted(result.formatted);
  }, []);

  const handleSubmit = async () => {
    if (!isValid) return;

    setSubmitting(true);
    setServerError(null);

    const result = await submitNINumber(onboardingId, checklistItemId, value);

    if (result.success) {
      onSuccess();
    } else {
      setServerError(result.error ?? 'Failed to save');
    }

    setSubmitting(false);
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-fg mb-1">National Insurance Number</h2>
      <p className="text-sm text-fg-muted mb-6">
        Your NI number is on your payslip, P60, or any letter from HMRC.
        It is 2 letters, 6 numbers, then 1 letter (e.g. AB 12 34 56 C).
        This will be encrypted before storage.
      </p>

      <div className="mb-4">
        <label htmlFor="ni-number" className="block text-sm font-medium text-fg-body mb-1">
          NI Number
        </label>
        <input
          id="ni-number"
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="AB 12 34 56 C"
          maxLength={13}
          autoComplete="off"
          spellCheck={false}
          className={`block w-full rounded-lg border px-3 py-2.5 font-mono text-base uppercase tracking-widest shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 ${error ? 'border-status-rejected focus:border-status-rejected' : isValid ? 'border-status-approved focus:border-status-approved' : 'border-line-strong focus:border-brand'}`}
        />
        {error && (
          <p className="mt-1 text-xs text-status-rejected">{error}</p>
        )}
        {isValid && formatted && (
          <p className="mt-1 text-xs text-status-approved">Valid format: {formatted}</p>
        )}
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3 text-sm text-status-rejected">
          {serverError}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-status-approved/30 bg-status-approved/10 px-4 py-3 text-xs text-status-approved">
        Your NI number is encrypted before being stored. Your employer will only see it with your explicit consent.
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Saving...
          </>
        ) : existingValue ? 'Update NI Number' : 'Submit NI Number'}
      </button>
    </div>
  );
}
