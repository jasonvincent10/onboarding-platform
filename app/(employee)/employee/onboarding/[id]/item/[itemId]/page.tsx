import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getChecklistItem,
  getOnboardingContext,
  getDocumentSignedUrl,
} from './actions'
import DocumentUpload from '@/components/upload/DocumentUpload'
import FormEntryHandler from '@/components/forms/FormEntryHandler'
import PolicyAcknowledgement from '@/components/forms/PolicyAcknowledgement'
import RightToWorkUpload from '@/components/forms/RightToWorkUpload'

interface Props {
  params: Promise<{ id: string; itemId: string }>
}

export default async function ItemPage({ params }: Props) {
  const { id: onboardingId, itemId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/employee-login')

  const [item, onboarding] = await Promise.all([
    getChecklistItem(itemId, onboardingId),
    getOnboardingContext(onboardingId),
  ])

  if (!item || !onboarding) notFound()

  // Consent guard: mirrors the check on the checklist page. A signed-in
  // employee can otherwise navigate straight to an item URL and submit
  // data for a category they have not (or no longer) consented to.
  if (item.data_category) {
    const { getConsentStatus } = await import('@/lib/consent')
    const { data: profile } = await supabase
      .from('employee_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profile) {
      const status = await getConsentStatus(profile.id, onboarding.employer_id)
      const granted = status.some(
        (s) => s.data_category === item.data_category && s.latest_action === 'granted'
      )
      if (!granted) {
        redirect(`/employee/onboarding/${onboardingId}/consent`)
      }
    }
  }

  let signedUrl: string | null = null
  if (item.document_uploads?.file_path) {
    const result = await getDocumentSignedUrl(item.document_uploads.file_path)
    signedUrl = result.url
  }

  let policyDocumentUrl: string | null = null
  if (item.policy_document_path) {
    const result = await getDocumentSignedUrl(item.policy_document_path)
    policyDocumentUrl = result.url
  }

  const adminClient = createAdminClient()
  const { data: employerAccount } = await adminClient
    .from('employer_accounts')
    .select('company_name')
    .eq('id', onboarding.employer_id)
    .maybeSingle()
  const companyName = employerAccount?.company_name ?? 'Your employer'

  const statusConfig = {
    not_started: { label: 'Not started', colour: 'bg-status-inactive/15 text-status-inactive' },
    in_progress: { label: 'In progress', colour: 'bg-status-inactive/15 text-status-inactive' },
    submitted: { label: 'Submitted', colour: 'bg-status-pending/15 text-status-pending' },
    approved: { label: 'Approved', colour: 'bg-status-approved/15 text-status-approved' },
    overdue: { label: 'Overdue', colour: 'bg-status-rejected/15 text-status-rejected' },
  }
  const status =
    statusConfig[item.status as keyof typeof statusConfig] ??
    statusConfig.not_started

  const categoryLabels: Record<string, string> = {
    ni_number: 'National Insurance number',
    bank_details: 'Bank details',
    emergency_contacts: 'Emergency contacts',
    right_to_work: 'Right to work',
    documents: 'Document',
    personal_info: 'Personal information',
    policy_acknowledgements: 'Policy acknowledgement',
  }
  const categoryLabel = categoryLabels[item.data_category] ?? item.data_category

  const requiresExpiry =
    item.data_category === 'right_to_work' ||
    item.item_name.toLowerCase().includes('visa') ||
    item.item_name.toLowerCase().includes('brp') ||
    item.item_name.toLowerCase().includes('passport')

  const isReadOnly = item.status === 'approved'

  return (
    <div className="min-h-screen bg-ink-inset">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href={`/employee/onboarding/${onboardingId}`}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <BackArrow className="h-4 w-4" />
          Back to checklist
        </Link>

        <div className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                {companyName} · {categoryLabel}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-fg">
                {item.item_name}
              </h1>
            </div>
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${status.colour}`}
            >
              {status.label}
            </span>
          </div>

          {item.deadline && (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-fg-muted">
              <ClockIcon className="h-4 w-4" />
              Due by{' '}
              <span className="font-medium text-fg-body">
                {new Date(item.deadline).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          {item.was_pre_populated && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-fg-accent">
              <SparkleIcon className="h-3.5 w-3.5" />
              Pre-filled from your profile
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-ink-raised shadow-sm">
          <div className="border-b border-line px-6 py-5">
            <h2 className="text-sm font-semibold text-fg">
              What you need to provide
            </h2>
            <p className="mt-1.5 text-sm text-fg-body">
              {getItemGuidance(item.item_name, item.data_category)}
            </p>
          </div>

          <div className="px-6 py-6">
            {item.item_type === 'document_upload' ? (
              <>
                {isReadOnly ? (
                  <div className="space-y-4">
                    <ApprovedBanner />
                    {item.document_uploads && (
                      <ExistingFileReadOnly
                        upload={item.document_uploads}
                        signedUrl={item.document_uploads.file_path?.startsWith('share_code:') ? null : signedUrl}
                      />
                    )}
                  </div>
                  ) : item.data_category === 'right_to_work' ? (
                  <RightToWorkUpload
                    checklistItemId={itemId}
                    onboardingId={onboardingId}
                  />
                ) : (
                  <DocumentUpload
                    onboardingId={onboardingId}
                    itemId={itemId}
                    itemName={item.item_name}
                    dataCategory={item.data_category}
                    userId={user.id}
                    requiresExpiry={requiresExpiry}
                    existingUpload={
                      item.document_uploads
                        ? {
                            filePath: item.document_uploads.file_path,
                            documentType: item.document_uploads.document_type,
                            verificationStatus:
                              item.document_uploads.verification_status,
                            expiryDate: item.document_uploads.expiry_date,
                            signedUrl,
                          }
                        : null
                    }
                    reviewerNote={item.reviewer_notes}
                  />
                )}
              </>
            ) : item.item_type === 'form_entry' ? (
              <FormEntryHandler
                onboardingId={onboardingId}
                checklistItemId={itemId}
                formFieldKey={item.form_field_key ?? ''}
                itemName={item.item_name}
                itemDescription={item.description ?? undefined}
                status={item.status}
              />
            ) : item.item_type === 'acknowledgement' ? (
              <PolicyAcknowledgement
                checklistItemId={itemId}
                onboardingId={onboardingId}
                itemName={item.item_name}
                description={item.description ?? null}
                policyDocumentUrl={policyDocumentUrl}
                alreadyAcknowledged={item.status === 'submitted' || item.status === 'approved'}
                acknowledgedAt={item.acknowledged_at ?? null}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-line px-6 py-8 text-center">
                <p className="text-sm text-fg-muted">Unknown item type.</p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-fg-muted">
          Your documents are stored securely and only shared with {companyName}{' '}
          with your consent.
        </p>
      </div>
    </div>
  )
}

function getItemGuidance(itemName: string, dataCategory: string): string {
  const name = itemName.toLowerCase()
  if (name.includes('p45'))
    return 'Upload your P45 from your previous employer. If you do not have one, upload your P46 or speak to your employer directly.'
  if (dataCategory === 'right_to_work')
    return 'Upload a document proving your right to work in the UK — such as a British or Irish passport, biometric residence permit (BRP), or a share code from the GOV.UK online service.'
  if (name.includes('passport'))
    return 'Upload a clear scan or photo of the photo page of your passport. All four corners must be visible.'
  if (dataCategory === 'documents')
    return 'Upload a clear, legible scan or photo of the requested document. PDF, JPG, and PNG files are accepted.'
  return 'Upload the requested document. PDF, JPG, and PNG files are accepted up to 10MB.'
}

function ApprovedBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-status-approved/30 bg-status-approved/10 px-5 py-4">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-status-approved/15">
        <CheckIcon className="h-5 w-5 text-status-approved" />
      </div>
      <div>
        <p className="text-sm font-semibold text-status-approved">Document approved</p>
        <p className="text-xs text-status-approved">No further action needed for this item.</p>
      </div>
    </div>
  )
}

function ExistingFileReadOnly({
  upload,
  signedUrl,
}: {
  upload: {
    document_type: string
    file_path: string
    verification_status: string
    expiry_date: string | null
  }
  signedUrl: string | null
}) {
  const isShareCode = upload.file_path?.startsWith('share_code:')
  const shareCodeValue = isShareCode ? upload.file_path.replace('share_code:', '') : null
  const isImage =
    !isShareCode &&
    (upload.file_path.endsWith('.jpg') || upload.file_path.endsWith('.png'))

  if (isShareCode) {
    return (
      <div className="rounded-xl border border-line bg-ink-raised p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-ink-inset text-lg font-bold text-fg-muted">
            #
          </div>
          <div>
            <p className="text-sm font-medium text-fg">GOV.UK share code submitted</p>
            <p className="mt-0.5 font-mono text-sm text-fg-body tracking-widest">
              {shareCodeValue}
            </p>
            <a href="https://www.gov.uk/view-right-to-work" target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-xs font-medium text-fg-accent underline underline-offset-2">
              Verify at gov.uk/view-right-to-work
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-raised p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-ink-inset">
        {isImage && signedUrl ? (
          <img src={signedUrl} alt="Document" className="h-full w-full rounded-lg object-cover" />
        ) : (
          <PdfIcon className="h-6 w-6 text-fg-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{upload.document_type}</p>
        {upload.expiry_date && (
          <p className="text-xs text-fg-muted">
            Expires{' '}
            {new Date(upload.expiry_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </div>
      {signedUrl && (
        <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 rounded-lg border border-line bg-ink-raised px-3 py-1.5 text-xs font-medium text-fg-body shadow-sm transition-colors hover:bg-ink-raised-hover">
          View
        </a>
      )}
    </div>
  )
}

function BackArrow({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}