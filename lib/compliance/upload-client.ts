'use client'

// lib/compliance/upload-client.ts
// Browser-side upload to the compliance-evidence bucket using a signed upload
// URL minted by a server action (which did the ownership check).

import { createClient } from '@/lib/supabase/client'
import { EVIDENCE_BUCKET } from './evidence-constants'

export async function uploadWithSignedUrl(path: string, token: string, file: File): Promise<{ error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).uploadToSignedUrl(path, token, file, { contentType: file.type })
  if (error) return { error: error.message }
  return {}
}
