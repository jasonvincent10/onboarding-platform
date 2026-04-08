'use client'

import { useCallback, useRef, useState } from 'react'
import {
  ACCEPTED_MIME_TYPES,
  formatFileSize,
  isImageType,
  MAX_FILE_SIZE_LABEL,
  uploadToStorage,
  validateFile,
} from '@/lib/storage/upload'
import { recordDocumentUpload } from '@/app/(employee)/employee/onboarding/[id]/item/[itemId]/actions'
import { useRouter } from 'next/navigation'

interface DocumentUploadProps {
  onboardingId: string
  itemId: string
  itemName: string
  dataCategory: string
  userId: string
  /** Whether to show an expiry date field (e.g. for right-to-work documents) */
  requiresExpiry?: boolean
  /** If there's already a submitted/approved upload, pass it here */
  existingUpload?: {
    filePath: string
    documentType: string
    verificationStatus: string
    expiryDate?: string | null
    signedUrl?: string | null
  } | null
  /** Employer's re-upload note (shown when status is 'in_progress' after rejection) */
  reviewerNote?: string | null
  onSuccess?: () => void
}

type UploadStage =
  | 'idle'
  | 'drag-over'
  | 'validating'
  | 'uploading'
  | 'recording'
  | 'done'
  | 'error'

export default function DocumentUpload({
  onboardingId,
  itemId,
  itemName,
  dataCategory,
  userId,
  requiresExpiry = false,
  existingUpload,
  reviewerNote,
  onSuccess,
}: DocumentUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<UploadStage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [expiryDate, setExpiryDate] = useState(existingUpload?.expiryDate ?? '')
  const [expiryError, setExpiryError] = useState<string | null>(null)

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleFile = useCallback(
    (file: File) => {
      clearPreview()
      setError(null)
      setStage('validating')

      const validation = validateFile(file)
      if (!validation.valid) {
        setError(validation.error ?? 'Invalid file.')
        setStage('error')
        return
      }

      setSelectedFile(file)

      if (isImageType(file.type)) {
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)
      }

      setStage('idle')
    },
    [previewUrl]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setStage('idle')
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setStage('drag-over')
  }

  const handleDragLeave = () => {
    setStage('idle')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so same file can be re-selected if needed
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!selectedFile) return

    if (requiresExpiry && !expiryDate) {
      setExpiryError('Please enter an expiry date for this document.')
      return
    }
    setExpiryError(null)
    setError(null)
    setStage('uploading')
    setProgress(0)

    // 1. Upload file to Supabase Storage
    const { path, error: storageError } = await uploadToStorage(
      selectedFile,
      userId,
      itemName,
      (pct) => setProgress(pct)
    )

    if (storageError || !path) {
      setError(storageError ?? 'Upload failed. Please try again.')
      setStage('error')
      return
    }

    // 2. Record in DB and update checklist item
    setStage('recording')
    const result = await recordDocumentUpload({
      onboardingId,
      itemId,
      filePath: path,
      documentType: itemName,
      dataCategory,
      expiryDate: expiryDate || null,
    })

    if (!result.success) {
      setError(result.error ?? 'Could not save record. Please try again.')
      setStage('error')
      return
    }

    setStage('done')
    onSuccess?.()
    router.refresh()
  }

  const handleReplace = () => {
    setSelectedFile(null)
    clearPreview()
    setStage('idle')
    setError(null)
    setProgress(0)
  }

  // ─── Already submitted / approved ───────────────────────────────────────────
  if (existingUpload && stage !== 'done') {
    const isApproved = existingUpload.verificationStatus === 'approved'
    const needsReupload =
      existingUpload.verificationStatus === 'rejected' || reviewerNote

    return (
      <div className="space-y-4">
        {reviewerNote && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Re-upload requested
            </p>
            <p className="mt-1 text-sm text-amber-700">{reviewerNote}</p>
          </div>
        )}

        <ExistingFileCard
          upload={existingUpload}
          isApproved={isApproved}
        />

        {needsReupload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <UploadIcon className="h-4 w-4" />
            Upload replacement
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={Object.keys(ACCEPTED_MIME_TYPES).join(',')}
          onChange={handleInputChange}
          className="sr-only"
        />
      </div>
    )
  }

  // ─── Upload done this session ─────────────────────────────────────────────
  if (stage === 'done') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Document submitted
          </p>
          <p className="text-xs text-emerald-600">
            Your employer will review this shortly.
          </p>
        </div>
      </div>
    )
  }

  // ─── Main upload UI ───────────────────────────────────────────────────────
  const isUploading = stage === 'uploading' || stage === 'recording'
  const isDragOver = stage === 'drag-over'

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (!selectedFile) fileInputRef.current?.click()
          }
        }}
        className={[
          'relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200',
          isDragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40',
          selectedFile ? 'cursor-default' : '',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={Object.keys(ACCEPTED_MIME_TYPES).join(',')}
          onChange={handleInputChange}
          className="sr-only"
          disabled={isUploading}
        />

        {selectedFile ? (
          /* ── File selected — show preview ─────────────────────────── */
          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Preview thumbnail */}
              <div className="flex-shrink-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-20 w-20 rounded-lg border border-slate-200 object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
                    <PdfIcon className="h-10 w-10 text-red-400" />
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {selectedFile.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatFileSize(selectedFile.size)} ·{' '}
                  {selectedFile.type === 'application/pdf'
                    ? 'PDF document'
                    : 'Image'}
                </p>

                {/* Progress bar */}
                {isUploading && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                        style={{
                          width:
                            stage === 'recording' ? '90%' : `${progress}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {stage === 'recording'
                        ? 'Saving record…'
                        : 'Uploading…'}
                    </p>
                  </div>
                )}

                {!isUploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReplace()
                    }}
                    className="mt-2 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800"
                  >
                    Choose a different file
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Empty drop zone ──────────────────────────────────────── */
          <div className="flex flex-col items-center gap-3 px-6 py-10">
            <div
              className={[
                'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
                isDragOver ? 'bg-indigo-100' : 'bg-white shadow-sm',
              ].join(' ')}
            >
              <UploadIcon
                className={[
                  'h-6 w-6 transition-colors',
                  isDragOver ? 'text-indigo-600' : 'text-slate-400',
                ].join(' ')}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                {isDragOver ? 'Drop file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                PDF, JPG or PNG · max {MAX_FILE_SIZE_LABEL}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {stage === 'error' && error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertIcon className="h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Expiry date field */}
      {requiresExpiry && selectedFile && (
        <div className="space-y-1.5">
          <label
            htmlFor="expiry-date"
            className="block text-sm font-medium text-slate-700"
          >
            Document expiry date{' '}
            <span className="font-normal text-slate-500">(if applicable)</span>
          </label>
          <input
            id="expiry-date"
            type="date"
            value={expiryDate}
            onChange={(e) => {
              setExpiryDate(e.target.value)
              setExpiryError(null)
            }}
            min={new Date().toISOString().split('T')[0]}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {expiryError && (
            <p className="text-xs text-red-600">{expiryError}</p>
          )}
        </div>
      )}

      {/* Submit button */}
      {selectedFile && !isUploading && stage !== 'done' && (
        <button
          onClick={handleSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 sm:w-auto"
          style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
        >
          <UploadIcon className="h-4 w-4" />
          Submit document
        </button>
      )}

      {isUploading && (
        <button
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-indigo-400 px-5 py-3 text-sm font-semibold text-white sm:w-auto"
        >
          <SpinnerIcon className="h-4 w-4 animate-spin" />
          {stage === 'recording' ? 'Saving…' : 'Uploading…'}
        </button>
      )}
    </div>
  )
}

// ─── Existing file card ────────────────────────────────────────────────────

function ExistingFileCard({
  upload,
  isApproved,
}: {
  upload: NonNullable<DocumentUploadProps['existingUpload']>
  isApproved: boolean
}) {
  return (
    <div
      className={[
        'flex items-center gap-3 rounded-xl border p-4',
        isApproved
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
        {upload.signedUrl &&
        (upload.filePath.endsWith('.jpg') ||
          upload.filePath.endsWith('.png')) ? (
          <img
            src={upload.signedUrl}
            alt="Document"
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <PdfIcon className="h-6 w-6 text-red-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">
          {upload.documentType}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <StatusBadge status={upload.verificationStatus} />
          {upload.expiryDate && (
            <span className="text-xs text-slate-500">
              Expires {new Date(upload.expiryDate).toLocaleDateString('en-GB')}
            </span>
          )}
        </div>
      </div>

      {upload.signedUrl && (
        <a
          href={upload.signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          View
        </a>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'With employer',
      className: 'bg-amber-100 text-amber-700',
    },
    approved: {
      label: 'Approved',
      className: 'bg-emerald-100 text-emerald-700',
    },
    rejected: {
      label: 'Re-upload needed',
      className: 'bg-red-100 text-red-700',
    },
  }
  const cfg = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}

// ─── Inline SVG icons ──────────────────────────────────────────────────────

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  )
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
