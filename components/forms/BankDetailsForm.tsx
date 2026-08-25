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
  const [sortCodeError, setSortCodeError] = useState<string | null>(null);
  const [accountNumberError, setAccountNumberError] = useState<string | null>(null);
  const [holderNameError, setHolderNameError] = useState<string | null>(null);

  const handleSortCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    setServerError(null);
    const digits = input.replace(/[^0-9]/g, '');
    if (digits.length <= 2) {
      input = digits;
    } else if (digits.length <= 4) {
      input = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else {
      input = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
    }
    setSortCode(input);
    if (digits.length === 6) {
      const result = validateSortCode(digits);
      setSortCodeError(result.error);
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
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-fg mb-1">Bank Details</h2>
      <p className="text-sm text-fg-muted mb-6">
        Your employer needs these to set up your salary payments. You can find
        your sort code and account number on your bank card, a bank statement,
        or in your banking app.
      </p>

      <div className="mb-4">
        <label htmlFor="holder-name" className="block text-sm font-medium text-fg-body mb-1">
          Account holder name
        </label>
        <input
          id="holder-name"
          type="text"
          value={accountHolderName}
          onChange={handleHolderNameChange}
          placeholder="As shown on your bank account"
          autoComplete="off"
          className={`block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 ${holderNameError ? 'border-status-rejected focus:border-status-rejected' : 'border-line-strong focus:border-brand'}`}
        />
        {holderNameError && (
          <p className="mt-1 text-xs text-status-rejected">{holderNameError}</p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="sort-code" className="block text-sm font-medium text-fg-body mb-1">
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
          className={`block w-full rounded-lg border px-3 py-2.5 font-mono text-base tracking-widest shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 ${sortCodeError ? 'border-status-rejected focus:border-status-rejected' : 'border-line-strong focus:border-brand'}`}
        />
        {sortCodeError && (
          <p className="mt-1 text-xs text-status-rejected">{sortCodeError}</p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="account-number" className="block text-sm font-medium text-fg-body mb-1">
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
          className={`block w-full rounded-lg border px-3 py-2.5 font-mono text-base tracking-widest shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 ${accountNumberError ? 'border-status-rejected focus:border-status-rejected' : 'border-line-strong focus:border-brand'}`}
        />
        {accountNumberError && (
          <p className="mt-1 text-xs text-status-rejected">{accountNumberError}</p>
        )}
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3 text-sm text-status-rejected">
          {serverError}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-status-approved/30 bg-status-approved/10 px-4 py-3 text-xs text-status-approved">
        Your sort code and account number are encrypted before being stored. Your employer will only see them with your explicit consent.
      </div>

      <button
        onClick={handleSubmit}
        disabled={!formValid || submitting}
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
        ) : existingSortCode ? 'Update Bank Details' : 'Submit Bank Details'}
      </button>
    </div>
  );
}