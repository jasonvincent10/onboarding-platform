import { createClient } from '@/lib/supabase/client'

export const ACCEPTED_MIME_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
} as const

export type AcceptedMimeType = keyof typeof ACCEPTED_MIME_TYPES

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_FILE_SIZE_LABEL = '10MB'
export const STORAGE_BUCKET = 'employee-documents'

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!Object.keys(ACCEPTED_MIME_TYPES).includes(file.type)) {
    return {
      valid: false,
      error: 'Only PDF, JPG, and PNG files are accepted.',
    }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File must be smaller than ${MAX_FILE_SIZE_LABEL}.`,
    }
  }
  return { valid: true }
}

export function getFileExtension(mimeType: string): string {
  return ACCEPTED_MIME_TYPES[mimeType as AcceptedMimeType] ?? '.bin'
}

export function isImageType(mimeType: string): boolean {
  return mimeType === 'image/jpeg' || mimeType === 'image/png'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Uploads a file directly from the browser to Supabase Storage.
 * Storage RLS must allow: authenticated users upload to their own {userId}/ folder.
 */
export async function uploadToStorage(
  file: File,
  userId: string,
  documentType: string,
  onProgress?: (pct: number) => void
): Promise<{ path: string; error?: string }> {
  const supabase = createClient()

  const ext = getFileExtension(file.type)
  const timestamp = Date.now()
  const slug = documentType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40)
  const filePath = `${userId}/${slug}_${timestamp}${ext}`

  // Simulate progress start — Supabase JS doesn't expose upload progress natively
  onProgress?.(10)

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) {
    return { path: '', error: error.message }
  }

  onProgress?.(100)
  return { path: data.path }
}

/**
 * Creates a short-lived signed URL for reading a private file.
 * Use server-side for employer access; client-side for employee previewing their own file.
 */
export async function getSignedUrl(
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds)

  if (error || !data) return null
  return data.signedUrl
}
