import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DocumentsList, { type DocumentRow } from './DocumentsList'

export default async function MyDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">Your profile isn&apos;t fully set up yet.</p>
      </div>
    )
  }

  const adminClient = createAdminClient()

  const { data: documents } = await adminClient
    .from('document_uploads')
    .select('id, document_type, document_name, file_path, data_category, verification_status, expiry_date, created_at')
    .eq('employee_id', profile.id)
    .order('created_at', { ascending: false })

  const docs = documents ?? []

  // Which of these are still relied on by a checklist item -- those can't
  // be deleted (see actions.ts for why).
  const ids = docs.map((d) => d.id)
  const { data: linkedRows } = ids.length > 0
    ? await adminClient.from('checklist_items').select('document_upload_id').in('document_upload_id', ids)
    : { data: [] }
  const linkedIds = new Set((linkedRows ?? []).map((r) => r.document_upload_id))

  const rows: DocumentRow[] = await Promise.all(
    docs.map(async (d) => {
      const isShareCode = d.file_path.startsWith('share_code:')
      let signedUrl: string | null = null
      if (!isShareCode) {
        const { data } = await adminClient.storage
          .from('employee-documents')
          .createSignedUrl(d.file_path, 3600)
        signedUrl = data?.signedUrl ?? null
      }
      return {
        id: d.id,
        documentType: d.document_type,
        documentName: d.document_name,
        dataCategory: d.data_category,
        verificationStatus: d.verification_status,
        expiryDate: d.expiry_date,
        createdAt: d.created_at,
        isShareCode,
        shareCode: isShareCode ? d.file_path.replace('share_code:', '') : null,
        signedUrl,
        canDelete: !linkedIds.has(d.id),
      }
    })
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Your documents</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Everything you&apos;ve uploaded across every onboarding, in one place. Documents
          still linked to an active checklist item can&apos;t be deleted, since your employer
          relies on them as evidence of a completed check.
        </p>
      </div>
      <DocumentsList documents={rows} />
    </div>
  )
}
