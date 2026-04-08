'use client';

import { useState, useCallback } from 'react';
import { validateSortCode, validateAccountNumber } from '@/lib/validation/bank-details';
import { submitBankDetails } from '@/lib/actions/form-actions';

interface BankDetailsFormProps {
  onboardingId: string;
  checklistItemId: string;
  existingSortCode: string | null;
  existingAccountNumber: string | null;
  existingAccountHolderName: string | null;
  onSuccess: () => void;
}

export default function BankDetailsForm({
  onboardingId,
  checklistItemId,
  existingSortCode,
  existingAccountNumber,
  existingAccountHolderName,
  onSuccess,
}: BankDetailsFormProps) {
  const [sortCode, setSortCode] = useState(existingSortCode ?? '');
  const [accountNumber, setAccountNumber] = useState(existingAccountNumber ?? '');
  const [accountHolderName, setAccountHolderName] = useState(existingAccountHolderName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Individual field validation states
  const [sortCodeError, setSortCodeError] = useState<string | null>(null);
  const [accountNumberError, setAccountNumberError] = useState<string | null>(null);
  const [holderNameError, setHolderNameError] = useState<string | null>(null);

  // Auto-format sort code as user types (XX-XX-XX)
  const handleSortCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    setServerError(null);

    // Strip non-digits for processing
    const digits = input.replace(/[^0-9]/g, '');

    // Auto-insert hyphens
    if (digits.length <= 2) {
      input = digits;
    } else if (digits.length <= 4) {
      input = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else {
      input = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
    }

    setSortCode(input);

    // Only validate once they've entered enough
    if (digits.length === 6) {
      const result = validateSortCode(digits);
      setSortCodeError(result.error);
    } else if (digits.length > 0 && digits.length < 6) {
      setSortCodeError(null); // Don't show error while typing
    } else {
      setSortCodeError(null);
    }
  }, []);

  const handleAccountNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9]/g, '');
    setAccountNumber(input);
    setServerError(null);

    if (input.length >= 7) {
      const result = validateAccountNumber(input);
      setAccountNumberError(result.error);
    } else if (input.length > 0) {
      setAccountNumberError(null);
    } else {
      setAccountNumberError(null);
    }
  }, []);

  const handleHolderNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountHolderName(e.target.value);
    setServerError(null);

    if (e.target.value.trim().length > 0 && e.target.value.trim().length < 2) {
      setHolderNameError('Name must be at least 2 characters');
    } else {
      setHolderNameError(null);
    }
  }, []);

  const isFormValid = () => {
    const sc = validateSortCode(sortCode);
    const an = validateAccountNumber(accountNumber);
    return sc.valid && an.valid && accountHolderName.trim().length >= 2;
  };

  const handleSubmit = async () => {
    // Final validation pass
    const scResult = validateSortCode(sortCode);
    const anResult = validateAccountNumber(accountNumber);

    setSortCodeError(scResult.error);
    setAccountNumberError(anResult.error);

    if (accountHolderName.trim().length < 2) {
      setHolderNameError('Account holder name is required');
    }

    if (!scResult.valid || !anResult.valid || accountHolderName.trim().length < 2) {
      return;
    }

    setSubmitting(true);
    setServerError(null);

    const result = await submitBankDetails(
      onboardingId,
      checklistItemId,
      sortCode,
      accountNumber,
      accountHolderName
    );

    if (result.success) {
      onSuccess();
    } else {
      setServerError(result.error ?? 'Failed to save');
    }

    setSubmitting(false);
  };

  const formValid = isFormValid();

  return (
    <div style={{ maxWidth: '480px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Bank Details
      </h2>

      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Your employer needs these to set up your salary payments. You can find
        your sort code and account number on your bank card, a bank statement,
        or in your banking app.
      </p>

      {/* Account Holder Name */}
      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="holder-name"
          style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.875rem' }}
        >
          Account holder name
        </label>
        <input
          id="holder-name"
          type="text"
          value={accountHolderName}
          onChange={handleHolderNameChange}
          placeholder="As shown on your bank account"
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.625rem 0.75rem',
            border: `1px solid ${holderNameError ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '0.375rem',
            fontSize: '1rem',
          }}
        />
        {holderNameError && (
          <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {holderNameError}
          </p>
        )}
      </div>

      {/* Sort Code */}
      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="sort-code"
          style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.875rem' }}
        >
          Sort code
        </label>
        <input
          id="sort-code"
          type="text"
          value={sortCode}
          onChange={handleSortCodeChange}
          placeholder="XX-XX-XX"
          maxLength={8}
          autoComplete="off"
          inputMode="numeric"
          style={{
            width: '100%',
            padding: '0.625rem 0.75rem',
            border: `1px solid ${sortCodeError ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '0.375rem',
            fontSize: '1.125rem',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        />
        {sortCodeError && (
          <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {sortCodeError}
          </p>
        )}
      </div>

      {/* Account Number */}
      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="account-number"
          style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.875rem' }}
        >
          Account number
        </label>
        <input
          id="account-number"
          type="text"
          value={accountNumber}
          onChange={handleAccountNumberChange}
          placeholder="8 digits"
          maxLength={8}
          autoComplete="off"
          inputMode="numeric"
          style={{
            width: '100%',
            padding: '0.625rem 0.75rem',
            border: `1px solid ${accountNumberError ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '0.375rem',
            fontSize: '1.125rem',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        />
        {accountNumberError && (
          <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {accountNumberError}
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
        🔒 Your sort code and account number are encrypted before being stored.
        Your employer will only see them with your explicit consent.
      </div>

      <button
        onClick={handleSubmit}
        disabled={!formValid || submitting}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: formValid && !submitting ? '#4f46e5' : '#9ca3af',
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: formValid && !submitting ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'Saving...' : existingSortCode ? 'Update Bank Details' : 'Submit Bank Details'}
      </button>
    </div>
  );
}
