'use client'

import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { submitRightToWork } from '@/lib/actions/rtw-actions'

const RTW_DOCUMENT_TYPES = [
  {
    value: 'british_irish_passport',
    label: 'British or Irish passport',
    requiresExpiry: false,
    isOnlineCheck: false,
    guidance: [
      'Upload a clear photo or scan of the photo page.',
      'Make sure all four corners are visible and all text is readable.',
      'British and Irish passport holders have a permanent right to work in the UK.',
    ],
  },
  {
    value: 'brp',
    label: 'Biometric Residence Permit (BRP)',
    requiresExpiry: true,
    isOnlineCheck: false,
    guidance: [
      'Upload the front of your BRP card.',
      'The expiry date is printed on the front — enter it below.',
      'Make sure the card number and your photo are clearly visible.',
    ],
  },
  {
    value: 'share_code',
    label: 'GOV.UK share code (online check)',
    requiresExpiry: false,
    isOnlineCheck: true,
    guidance: [
      'Get your share code at gov.uk/prove-right-to-work.',
      'You will need your UK Visas and Immigration account or eVisa details.',
      'Share codes are valid for 90 days — generate a fresh one for this application.',
      'Enter your share code below. Your employer will verify it online using your date of birth.',
    ],
  },
  {
    value: 'passport_with_visa',
    label: 'Passport with visa or entry vignette',
    requiresExpiry: true,
    isOnlineCheck: false,
    guidance: [
      'Upload your passport photo page AND the page showing your visa or vignette.',
      'You can combine both pages into a single PDF, or upload two images.',
      'Enter the visa expiry date below — not your passport expiry date.',
    ],
  },
  {
    value: 'indefinite_leave',
    label: 'Indefinite Leave to Remain (ILR) or No Time Limit',
    requiresExpiry: false,
    isOnlineCheck: false,
    guidance: [
      'Upload your ILR endorsement, Home Office letter, or NTL vignette.',
      'If your ILR is shown in a passport, upload the photo page and the ILR stamp page.',
      'ILR holders have a permanent right to work — no expiry check is needed.',
    ],
  },
] as const

type DocTypeValue = (typeof RTW_DOCUMENT_TYPES)[number]['value']

interface RightToWorkUploadProps {
  checklistItemId: string
  onboardingId: string
  onComplete: () => void
}

export default function RightToWorkUpload({
  checklistItemId,
  onboardingId,
  onComplete,
}: RightToWorkUploadProps) {
  const [selectedDocType, setSelectedDocType] = useState<DocTypeValue | ''>('')
  const [shareCode, setShareCode] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const docType = RTW_DOCUMENT_TYPES.find((d) => d.value === selectedDocType)

  const handleDocTypeChange = (value: string) => {
    setSelectedDocType(value as DocTypeValue | '')
    setSelectedFile(null)
    setShareCode('')
    setExpiryDate('')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      setError('Please upload a PDF, JPG, or PNG file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.')
      return
    }
    setError(null)
    setSelectedFile(file)
  }

  const isShareCodeValid = (code: string) => {
    const cleaned = code.replace(/-/g, '').toUpperCase()
    return cleaned.length === 9 && /^[A-Z0-9]{9}$/.test(cleaned)
  }

  const handleSubmit = async () => {
    if (!selectedDocType || !docType) return
    setError(null)
    setUploading(true)

    try {
      if (docType.isOnlineCheck) {
        if (!shareCode.trim()) {
          setError('Please enter your share code.')
          setUploading(false)
          return
        }
        if (!isShareCodeValid(shareCode)) {
          setError('Share code must be 9 characters, letters and numbers only (e.g. W4G-12K-88K).')
          setUploading(false)
          return
        }

        const result = await submitRightToWork({
          checklistItemId,
          onboardingId,
          documentType: selectedDocType,
          shareCode: shareCode.replace(/-/g, '').toUpperCase(),
          expiryDate: null,
        })

        if (!result.success) {
          setError(result.error ?? 'Something went wrong. Please try again.')
          setUploading(false)
          return
        }
      } else {
        if (!selectedFile) {
          setError('Please select a file to upload.')
          setUploading(false)
          return
        }
        if (docType.requiresExpiry && !expiryDate) {
          setError('Please enter the document expiry date.')
          setUploading(false)
          return
        }

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Session expired. Please refresh and try again.')
          setUploading(false)
          return
        }

        const ext = selectedFile.name.split('.').pop()
        const filePath = `${user.id}/rtw_${selectedDocType}_${Date.now()}.${ext}`

        const { error: storageError } = await supabase.storage
          .from('employee-documents')
          .upload(filePath, selectedFile, { upsert: false })

        if (storageError) {
          setError('File upload failed. Please try again.')
          setUploading(false)
          return
        }

        const result = await submitRightToWork({
          checklistItemId,
          onboardingId,
          documentType: selectedDocType,
          filePath,
          expiryDate: expiryDate || null,
        })

        if (!result.success) {
          setError(result.error ?? 'Something went wrong. Please try again.')
          setUploading(false)
          return
        }
      }

      onComplete()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Why we need this */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900">Why we need this</h3>
        <p className="mt-1 text-sm text-blue-800">
          UK law requires employers to check that every new employee has the right to work before their
          start date. This check must be completed and approved before your first day.
        </p>
      </div>

      {/* Document type selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          What document are you providing?
        </label>
        <select
          value={selectedDocType}
          onChange={(e) => handleDocTypeChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a document type...</option>
          {RTW_DOCUMENT_TYPES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Guidance + form — only shown once a doc type is selected */}
      {docType && (
        <div className="space-y-5">

          {/* Guidance panel */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h4 className="mb-2 text-sm font-semibold text-amber-900">What you need</h4>
            <ul className="space-y-1.5">
              {docType.guidance.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-800">
                  <span className="mt-0.5 flex-shrink-0 text-amber-500">&#8226;</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            {docType.isOnlineCheck && (
              
                href="https://www.gov.uk/prove-right-to-work"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-semibold text-amber-900 underline underline-offset-2"
              >
                Go to gov.uk/prove-right-to-work
              </a>
            )}
          </div>

          {/* Share code input */}
          {docType.isOnlineCheck && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Your share code
              </label>
              <input
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                placeholder="e.g. W4G-12K-88K"
                maxLength={11}
                className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm uppercase tracking-widest focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                9 characters. Letters and numbers only. Dashes are optional.
              </p>
            </div>
          )}

          {/* File upload */}
          {!docType.isOnlineCheck && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Upload document
              </label>
              <input
                ref={fileInputRef}
                id="rtw-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="rtw-file-input"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50"
              >
                {selectedFile ? (
                  <>
                    <p className="text-sm font-medium text-indigo-700">{selectedFile.name}</p>
                    <p className="mt-1 text-xs text-gray-500">Click to change</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">Click to select a file</p>
                    <p className="mt-1 text-xs text-gray-400">PDF, JPG or PNG, up to 10MB</p>
                  </>
                )}
              </label>
            </div>
          )}

          {/* Expiry date — required */}
          {docType.requiresExpiry && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Document expiry date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be a future date. Your employer will be reminded before it expires.
              </p>
            </div>
          )}

          {/* Expiry date — optional (non-expiring documents) */}
          {!docType.requiresExpiry && !docType.isOnlineCheck && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Expiry date{' '}
                <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={uploading}
            style={{ backgroundColor: uploading ? '#a5b4fc' : '#4f46e5', color: '#ffffff' }}
            className="w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            {uploading ? 'Submitting...' : 'Submit for review'}
          </button>
        </div>
      )}
    </div>
  )
}