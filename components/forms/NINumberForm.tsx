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
    <div style={{ maxWidth: '480px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        National Insurance Number
      </h2>

      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Your NI number is on your payslip, P60, or any letter from HMRC.
        It&apos;s 2 letters, 6 numbers, then 1 letter (e.g. AB 12 34 56 C).
        This will be encrypted before storage.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="ni-number"
          style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.875rem' }}
        >
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
          style={{
            width: '100%',
            padding: '0.625rem 0.75rem',
            border: `1px solid ${error ? '#ef4444' : isValid ? '#22c55e' : '#d1d5db'}`,
            borderRadius: '0.375rem',
            fontSize: '1.125rem',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            outline: 'none',
          }}
        />

        {/* Validation feedback */}
        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            {error}
          </p>
        )}

        {isValid && formatted && (
          <p style={{ color: '#22c55e', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            ✓ Valid format: {formatted}
          </p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            color: '#dc2626',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {serverError}
        </div>
      )}

      {/* Encryption notice */}
      <div
        style={{
          padding: '0.75rem',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '0.375rem',
          fontSize: '0.8125rem',
          color: '#166534',
          marginBottom: '1.5rem',
        }}
      >
        🔒 Your NI number is encrypted before being stored. Your employer will
        only see it with your explicit consent.
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: isValid && !submitting ? '#4f46e5' : '#9ca3af',
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'Saving...' : existingValue ? 'Update NI Number' : 'Submit NI Number'}
      </button>
    </div>
  );
}
