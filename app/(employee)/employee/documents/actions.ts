'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function deleteDocument(documentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile) return { error: 'Employee profile not found' }

  // SECURITY: verify ownership before touching anything -- without this an
  // employee could delete any document in the system by id alone.
  const { data: doc } = await adminClient
    .from('document_uploads')
    .select('id, employee_id, file_path, document_type')
    .eq('id', documentId)
    .maybeSingle()

  if (!doc) return { error: 'Document not found' }
  if (doc.employee_id !== profile.id) return { error: 'Not authorised' }

  // SAFETY: never delete a document a checklist item still points to --
  // there is no foreign key enforcing this at the database level, and an
  // employer may rely on it as evidence of a completed check (right to
  // work documents in particular must be retained for the duration of
  // employment + 2 years after under UK law). Only documents that were
  // never linked, or were unlinked after a rejected/superseded upload, can
  // be removed here.
  const { data: linkedItem } = await adminClient
    .from('checklist_items')
    .select('id')
    .eq('document_upload_id', documentId)
    .maybeSingle()

  if (linkedItem) {
    return { error: 'This document is linked to a checklist item and cannot be deleted.' }
  }

  // Share codes have no real file in storage -- only real uploads need the
  // storage object removed.
  if (!doc.file_path.startsWith('share_code:')) {
    const { error: storageError } = await adminClient.storage
      .from('employee-documents')
      .remove([doc.file_path])
    if (storageError) {
      console.error('Storage removal failed:', storageError)
      return { error: 'Could not remove the stored file. Please try again.' }
    }
  }

  const { error: deleteError } = await adminClient
    .from('document_uploads')
    .delete()
    .eq('id', documentId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employee',
    action: 'document_deleted',
    resource_type: 'document_uploads',
    resource_id: documentId,
    employee_id: profile.id,
    metadata: { document_type: doc.document_type },
  })

  revalidatePath('/employee/documents')
  return {}
}
