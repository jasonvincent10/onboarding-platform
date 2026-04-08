import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Browser/Client Component Supabase client.
 * Use this in 'use client' components only.
 *
 * Usage:
 *   const supabase = createClient()
 *   const { data } = await supabase.from('employer_accounts').select()
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
