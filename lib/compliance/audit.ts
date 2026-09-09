// lib/compliance/audit.ts
// Audit-log helper that surfaces insert errors instead of swallowing them.
// (CONTEXT.md gotcha: a missing audit_action enum value fails silently.)

import { createAdminClient } from '@/lib/supabase/admin'

export interface AuditEntry {
  actorId: string | null
  actorType: 'employer' | 'employee' | 'system'
  action: string
  resourceType: string
  resourceId: string | null
  employerId: string
  employeeId?: string | null
  metadata?: Record<string, unknown>
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('audit_log').insert({
    actor_id: entry.actorId,
    actor_type: entry.actorType,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    employer_id: entry.employerId,
    employee_id: entry.employeeId ?? null,
    metadata: entry.metadata ?? {},
  })
  if (error) console.error(`[audit] ${entry.action} insert failed:`, error.message)
}
