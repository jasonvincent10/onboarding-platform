'use client';

import { useCallback, useRef, useState } from 'react';
import { validateAddress } from '@/lib/validation/address';
import { submitAddressProof } from '@/lib/actions/form-actions';
import {
  formatFileSize,
  MAX_FILE_SIZE_LABEL,
  uploadToStorage,
  validateFile,
} from '@/lib/storage/upload';

interface AddressProofFormProps {
  onboardingId: string;
  checklistItemId: string;
  userId: string;
  existingLine1: string | null;
  existingLine2: string | null;
  existingCity: string | null;
  existingPostcode: string | null;
  onSuccess: () => void;
}

export default function AddressProofForm({
  onboardingId,
  checklistItemId,
  userId,
  existingLine1,
  existingLine2,
  existingCity,
  existingPostcode,
  onSuccess,
}: AddressProofFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [line1, setLine1] = useState(existingLine1 ?? '');
  const [line2, setLine2] = useState(existingLine2 ?? '');
  const [city, setCity] = useState(existingCity ?? '');
  const [postcode, setPostcode] = useState(existingPostcode ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setFileError(null);
    const validation = validateFile(file);
    if (!validation.valid) {
      setFileError(validation.error ?? 'Invalid file.');
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSubmit = async () => {
    setServerError(null);

    const validation = validateAddress({ line1, line2, city, postcode });
    setFieldErrors(validation.errors);

    if (!selectedFile) {
      setFileError('Please attach a proof of address document.');
    }

    if (!validation.valid || !selectedFile) return;

    setSubmitting(true);

    const { path, error: uploadError } = await uploadToStorage(
      selectedFile,
      userId,
      'proof_of_address'
    );

    if (uploadError || !path) {
      setServerError(uploadError ?? 'Could not upload the file. Please try again.');
      setSubmitting(false);
      return;
    }

    const result = await submitAddressProof(onboardingId, checklistItemId, {
      address: { line1, line2, city, postcode },
      filePath: path,
      documentType: 'proof_of_address',
    });

    setSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setServerError(result.error ?? 'Failed to save');
    }
  };

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 ${
      hasError ? 'border-status-rejected focus:border-status-rejected' : 'border-line-strong focus:border-brand'
    }`;

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-fg mb-1">Proof of address</h2>
      <p className="text-sm text-fg-muted mb-6">
        Enter your current address, then attach a recent utility bill, bank statement,
        or council tax bill showing that address — dated within the last 3 months.
      </p>

      <div className="mb-4">
        <label htmlFor="address-line1" className="block text-sm font-medium text-fg-body mb-1">
          Address line 1
        </label>
        <input
          id="address-line1"
          type="text"
          value={line1}
          onChange={(e) => { setLine1(e.target.value); setServerError(null); }}
          placeholder="House number and street"
          autoComplete="address-line1"
          className={inputClass(!!fieldErrors.line1)}
        />
        {fieldErrors.line1 && <p className="mt-1 text-xs text-status-rejected">{fieldErrors.line1}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="address-line2" className="block text-sm font-medium text-fg-body mb-1">
          Address line 2 <span className="text-fg-muted font-normal">(optional)</span>
        </label>
        <input
          id="address-line2"
          type="text"
          value={line2}
          onChange={(e) => setLine2(e.target.value)}
          placeholder="Flat, apartment, etc."
          autoComplete="address-line2"
          className={inputClass(false)}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="address-city" className="block text-sm font-medium text-fg-body mb-1">
            Town / city
          </label>
          <input
            id="address-city"
            type="text"
            value={city}
            onChange={(e) => { setCity(e.target.value); setServerError(null); }}
            autoComplete="address-level2"
            className={inputClass(!!fieldErrors.city)}
          />
          {fieldErrors.city && <p className="mt-1 text-xs text-status-rejected">{fieldErrors.city}</p>}
        </div>
        <div>
          <label htmlFor="address-postcode" className="block text-sm font-medium text-fg-body mb-1">
            Postcode
          </label>
          <input
            id="address-postcode"
            type="text"
            value={postcode}
            onChange={(e) => { setPostcode(e.target.value); setServerError(null); }}
            placeholder="e.g. SW1A 1AA"
            autoComplete="postal-code"
            className={inputClass(!!fieldErrors.postcode)}
          />
          {fieldErrors.postcode && <p className="mt-1 text-xs text-status-rejected">{fieldErrors.postcode}</p>}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-fg-body mb-1">Proof document</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragOver ? 'border-brand bg-brand/10' : 'border-line-strong hover:border-brand hover:bg-brand/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {selectedFile ? (
            <p className="text-sm text-fg-body">
              {selectedFile.name} <span className="text-fg-muted">({formatFileSize(selectedFile.size)})</span>
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-fg-muted">Drop a file here, or click to browse</p>
              <p className="mt-1 text-xs text-fg-muted">PDF, JPG or PNG, up to {MAX_FILE_SIZE_LABEL}</p>
            </>
          )}
        </div>
        {fileError && <p className="mt-1 text-xs text-status-rejected">{fileError}</p>}
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3 text-sm text-status-rejected">
          {serverError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Submitting...
          </>
        ) : 'Submit proof of address'}
      </button>
    </div>
  );
}
