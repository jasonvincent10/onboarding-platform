-- ============================================================
-- Supabase Storage RLS Policies — employee-documents bucket
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
-- 
-- Prerequisites:
-- 1. The bucket 'employee-documents' must already exist (create it
--    manually in Dashboard → Storage if you haven't already):
--      Name:             employee-documents
--      Public:           No (private)
--      File size limit:  10485760  (10MB)
--      Allowed MIME:     application/pdf, image/jpeg, image/png
--
-- 2. File paths follow the convention:  {user_id}/{document_type}_{timestamp}.{ext}
--    This means storage.foldername(name)[1] = auth.uid()::text
--    is the RLS key — each user's files live under their own user_id folder.
-- ============================================================

-- ── Employee: upload their own documents ────────────────────
CREATE POLICY "employees_insert_own_documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ── Employee: read their own documents ──────────────────────
CREATE POLICY "employees_select_own_documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ── Employee: delete (replace) their own documents ──────────
CREATE POLICY "employees_delete_own_documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ── Service role: full access (used server-side for employer ─
--    document review — no extra policy needed, service role   ─
--    bypasses RLS by default)                                 ─
-- ────────────────────────────────────────────────────────────
-- NOTE: Employers never access storage directly from the browser.
-- When an employer needs to view a document, the Next.js server
-- generates a signed URL using the service-role client.
-- This means the employer's browser just fetches a time-limited
-- pre-signed HTTPS URL — no browser-side RLS needed for employers.
-- ============================================================
