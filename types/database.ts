/**
 * Database type definitions.
 *
 * ─── HOW TO GENERATE ────────────────────────────────────────────────────────
 * After completing Task 1.2 (database schema), run:
 *
 *   npx supabase gen types typescript \
 *     --project-id <your-project-ref> \
 *     --schema public > types/database.ts
 *
 * This replaces the placeholder below with full type safety across the app.
 * ────────────────────────────────────────────────────────────────────────────
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Placeholder — replace with generated types after Task 1.2
export interface Database {
  public: {
    Tables: {
      employer_accounts: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      employee_profiles: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      onboarding_instances: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      checklist_items: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      document_uploads: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      onboarding_templates: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      consent_records: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      audit_log: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      checklist_item_status: 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'overdue'
      checklist_item_type: 'document_upload' | 'form' | 'acknowledgement'
      user_role: 'employer' | 'employee'
    }
  }
}

// Convenience type aliases — use these throughout the app
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type ChecklistItemStatus = Database['public']['Enums']['checklist_item_status']
export type ChecklistItemType = Database['public']['Enums']['checklist_item_type']
export type UserRole = Database['public']['Enums']['user_role']
