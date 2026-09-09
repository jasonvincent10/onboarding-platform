// lib/compliance/evidence.ts
// Server-only helpers for the compliance-evidence bucket. Access is entirely
// through signed URLs minted here after the caller has proved ownership, so
// the bucket needs no storage RLS policies.

import { createAdminClient } from '@/lib/supabase/admin'

export const EVIDENCE_BUCKET = 'compliance-evidence'
export const EVIDENCE_MIME_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
}
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024

/** Folder for a person's evidence, or the organisation folder. */
export function evidenceFolder(employerId: string, employmentId: string | null): string {
  return `${employerId}/${employmentId ?? 'org'}`
}

export function buildEvidencePath(employerId: string, employmentId: string | null, fileName: string, mimeType: string): string {
  const ext = EVIDENCE_MIME_TYPES[mimeType] ?? '.bin'
  const slug = fileName.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40) || 'evidence'
  return `${evidenceFolder(employerId, employmentId)}/${Date.now()}_${slug}${ext}`
}

/** A path is only accepted on save if it sits in the folder the caller was allowed to upload to. */
export function isPathInFolder(path: string, employerId: string, employmentId: string | null): boolean {
  return path.startsWith(evidenceFolder(employerId, employmentId) + '/') && !path.includes('..')
}

export async function createEvidenceUploadUrl(path: string): Promise<{ token: string } | { error: string }> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage.from(EVIDENCE_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { error: error?.message ?? 'Could not prepare upload' }
  return { token: data.token }
}

export async function createEvidenceViewUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}

export async function deleteEvidence(path: string): Promise<void> {
  const adminClient = createAdminClient()
  await adminClient.storage.from(EVIDENCE_BUCKET).remove([path])
}
