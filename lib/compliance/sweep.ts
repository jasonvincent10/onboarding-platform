// lib/compliance/sweep.ts
// Daily compliance sweep, run from the check-overdue cron (Vercel's free
// tier caps cron jobs at two, both already used). For every employer on a
// plan with compliance:
//   1. Employee reminders at each lead day (90/30/7 by default), once per
//      record per lead, plus one "expired" and one "missing" nudge.
//   2. Immediate employer escalation when a work-blocking item expires.
//   3. A Monday digest to every employer member.
// compliance_notifications_sent dedupes so a missed day never double-sends.

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { entitlementsFor } from '@/lib/plans'
import { RESEND_FROM } from '@/lib/email/from'
import {
  buildComplianceDigestEmail,
  buildComplianceReminderEmail,
  buildWorkBlockingEscalationEmail,
  type DigestLine,
  type ReminderLine,
} from '@/lib/email/compliance-templates'
import { buildComplianceOverview, type PersonCompliance, type RequirementCell } from './queries'
import { writeAudit } from './audit'

export interface SweepResult {
  employersSwept: number
  employeeReminders: number
  escalations: number
  digests: number
  errors: string[]
}

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Which lead-day threshold (if any) this cell has crossed that has not been sent yet. */
function dueLead(cell: RequirementCell, sent: Set<string>): { lead: number; key: string } | null {
  if (!cell.record || cell.daysUntil === null) return null
  if (cell.status !== 'expiring' && cell.status !== 'expired') return null
  if (cell.status === 'expired') {
    const key = `${cell.record.id}:expired`
    return sent.has(key) ? null : { lead: -1, key }
  }
  const leads = [...(cell.requirement.reminder_lead_days ?? [90, 30, 7])].sort((a, b) => a - b)
  // Smallest lead the cell is inside of that has not been sent: on day 29
  // with leads 90/30/7 that is 30 (90 was sent earlier, 7 not yet reached).
  for (const lead of leads) {
    if (cell.daysUntil <= lead) {
      const key = `${cell.record.id}:${lead}`
      if (!sent.has(key)) return { lead, key }
      return null
    }
  }
  return null
}

export async function runComplianceSweep(now = new Date()): Promise<SweepResult> {
  const adminClient = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()
  const result: SweepResult = { employersSwept: 0, employeeReminders: 0, escalations: 0, digests: 0, errors: [] }
  const isMonday = now.getUTCDay() === 1
  const week = isoWeek(now)

  const { data: accounts, error } = await adminClient
    .from('employer_accounts')
    .select('id, company_name, plan_tier, plan_band, subscription_status, trial_ends_at, current_period_end')
  if (error) {
    result.errors.push(`accounts: ${error.message}`)
    return result
  }

  for (const account of accounts ?? []) {
    if (!entitlementsFor(account).compliance) continue
    try {
      const overview = await buildComplianceOverview(account.id, now)
      if (overview.personRequirements.length + overview.organisation.length === 0) continue
      result.employersSwept++

      const { data: sentRows } = await adminClient.from('compliance_notifications_sent').select('kind, key').eq('employer_id', account.id)
      const sent = new Set((sentRows ?? []).map((r) => `${r.kind}|${r.key}`))
      const has = (kind: string, key: string) => sent.has(`${kind}|${key}`)
      const toInsert: { employer_id: string; record_id: string | null; kind: string; key: string }[] = []

      const reminderKeys = new Set((sentRows ?? []).filter((r) => r.kind === 'employee_reminder').map((r) => r.key))

      // ── 1. Employee reminders ──────────────────────────────────────────
      for (const person of overview.people) {
        const e = person.employment
        if (!e.email) continue
        const lines: ReminderLine[] = []
        const keys: { kind: string; key: string; recordId: string | null }[] = []
        for (const cell of person.cells) {
          const due = dueLead(cell, reminderKeys)
          if (due) {
            lines.push({ name: cell.type.name, expiresAt: cell.record?.expires_at ?? null, daysUntil: cell.daysUntil, workBlocking: cell.type.work_blocking })
            keys.push({ kind: 'employee_reminder', key: due.key, recordId: cell.record?.id ?? null })
          } else if (cell.status === 'missing' || cell.status === 'rejected') {
            const key = `${e.id}:${cell.requirement.id}:${cell.status}${cell.record ? ':' + cell.record.id : ''}`
            if (!has('employee_missing', key)) {
              lines.push({ name: cell.type.name, expiresAt: null, daysUntil: null, workBlocking: cell.type.work_blocking })
              keys.push({ kind: 'employee_missing', key, recordId: cell.record?.id ?? null })
            }
          }
        }
        if (lines.length === 0) continue
        const email = buildComplianceReminderEmail({ personName: e.full_name, companyName: account.company_name, appUrl, hasAccount: !!e.employee_id, lines })
        const { error: sendError } = await resend.emails.send({ from: RESEND_FROM, to: e.email, subject: email.subject, html: email.html })
        if (sendError) {
          result.errors.push(`reminder to ${e.email}: ${sendError.message}`)
          continue
        }
        result.employeeReminders++
        for (const k of keys) toInsert.push({ employer_id: account.id, record_id: k.recordId, kind: k.kind, key: k.key })
        await writeAudit({ actorId: null, actorType: 'system', action: 'compliance_reminder_sent', resourceType: 'employments', resourceId: e.id, employerId: account.id, employeeId: e.employee_id, metadata: { items: lines.map((l) => l.name) } })
      }

      // ── Employer recipients ────────────────────────────────────────────
      const { data: members } = await adminClient.from('employer_members').select('full_name, email').eq('employer_id', account.id)
      const recipients = (members ?? []).map((m) => m.email).filter((x): x is string => !!x)
      const firstName = members?.[0]?.full_name?.split(' ')[0] || 'there'

      // ── 2. Work-blocking escalation ────────────────────────────────────
      const blocking: DigestLine[] = []
      const blockingKeys: { key: string; recordId: string }[] = []
      const collect = (personName: string, cells: RequirementCell[]) => {
        for (const cell of cells) {
          if (!cell.type.work_blocking || cell.status !== 'expired' || !cell.record) continue
          const key = `${cell.record.id}:blocking`
          if (has('employer_escalation', key)) continue
          blocking.push({ personName, requirementName: cell.type.name, expiresAt: cell.record.expires_at, daysUntil: cell.daysUntil, workBlocking: true, status: cell.status })
          blockingKeys.push({ key, recordId: cell.record.id })
        }
      }
      for (const p of overview.people) collect(p.employment.full_name, p.cells)
      collect('Organisation', overview.organisation)

      if (blocking.length > 0 && recipients.length > 0) {
        const email = buildWorkBlockingEscalationEmail({ employerName: firstName, companyName: account.company_name, appUrl, lines: blocking })
        const { error: sendError } = await resend.emails.send({ from: RESEND_FROM, to: recipients, subject: email.subject, html: email.html })
        if (sendError) result.errors.push(`escalation for ${account.company_name}: ${sendError.message}`)
        else {
          result.escalations++
          for (const k of blockingKeys) toInsert.push({ employer_id: account.id, record_id: k.recordId, kind: 'employer_escalation', key: k.key })
          await writeAudit({ actorId: null, actorType: 'system', action: 'compliance_escalation_sent', resourceType: 'employer_accounts', resourceId: account.id, employerId: account.id, metadata: { count: blocking.length } })
        }
      }

      // ── 3. Monday digest ───────────────────────────────────────────────
      const digestKey = `${account.id}:${week}`
      if (isMonday && recipients.length > 0 && !has('employer_digest', digestKey)) {
        const expired: DigestLine[] = []
        const expiring: DigestLine[] = []
        const missing: DigestLine[] = []
        let awaiting = 0
        const add = (personName: string, cells: RequirementCell[]) => {
          for (const c of cells) {
            const line: DigestLine = { personName, requirementName: c.type.name, expiresAt: c.record?.expires_at ?? null, daysUntil: c.daysUntil, workBlocking: c.type.work_blocking, status: c.status }
            if (c.status === 'expired') expired.push(line)
            else if (c.status === 'missing' || c.status === 'rejected') missing.push(line)
            else if (c.status === 'expiring' && c.daysUntil !== null && c.daysUntil <= 30) expiring.push(line)
            else if (c.status === 'awaiting_review') awaiting++
          }
        }
        for (const p of overview.people as PersonCompliance[]) add(p.employment.full_name, p.cells)
        add('Organisation', overview.organisation)

        const email = buildComplianceDigestEmail({ employerName: firstName, companyName: account.company_name, appUrl, expired, expiring, missing, awaitingReview: awaiting })
        const { error: sendError } = await resend.emails.send({ from: RESEND_FROM, to: recipients, subject: email.subject, html: email.html })
        if (sendError) result.errors.push(`digest for ${account.company_name}: ${sendError.message}`)
        else {
          result.digests++
          toInsert.push({ employer_id: account.id, record_id: null, kind: 'employer_digest', key: digestKey })
        }
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await adminClient.from('compliance_notifications_sent').upsert(toInsert, { onConflict: 'kind,key', ignoreDuplicates: true })
        if (insertError) result.errors.push(`dedupe insert for ${account.company_name}: ${insertError.message}`)
      }
    } catch (err) {
      result.errors.push(`${account.company_name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}
