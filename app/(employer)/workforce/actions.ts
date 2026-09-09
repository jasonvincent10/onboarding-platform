'use server'

// ============================================================================
// Workforce server actions.
// SECURITY: every action resolves the caller via getEmployerContext() and
// scopes every adminClient query by that employer_id. A bare employment id
// from the client is never trusted on its own.
// ============================================================================

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmployerContext, wouldExceedHeadcount, type EmployerContext } from '@/lib/entitlements'
import { parseWorkforceCsv, parseUkDate } from '@/lib/compliance/csv-import'
import { writeAudit } from '@/lib/compliance/audit'
import { buildWorkforceInviteEmailHtml } from '@/lib/email/compliance-templates'
import { RESEND_FROM } from '@/lib/email/from'

export type ActionResult = { error?: string; success?: boolean; id?: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function requireContext(): Promise<{ ctx: EmployerContext } | { error: string }> {
  const ctx = await getEmployerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.entitlements.compliance) return { error: 'Workforce and compliance features need the Comply plan. Upgrade in Settings, Billing.' }
  return { ctx }
}

function revalidateWorkforce(employmentId?: string) {
  revalidatePath('/workforce')
  revalidatePath('/compliance')
  revalidatePath('/dashboard')
  if (employmentId) revalidatePath(`/workforce/${employmentId}`)
}

/** Ensures role groups with these names exist for the employer; returns their ids. */
async function ensureRoleGroups(employerId: string, names: string[]): Promise<string[]> {
  const clean = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)))
  if (clean.length === 0) return []
  const adminClient = createAdminClient()
  await adminClient
    .from('role_groups')
    .upsert(clean.map((name) => ({ employer_id: employerId, name })), { onConflict: 'employer_id,name', ignoreDuplicates: true })
  const { data } = await adminClient.from('role_groups').select('id, name').eq('employer_id', employerId).in('name', clean)
  return (data ?? []).map((g) => g.id)
}

async function setRoleGroups(employerId: string, employmentId: string, roleGroupIds: string[]) {
  const adminClient = createAdminClient()
  // Only groups that belong to this employer may be linked.
  const { data: valid } = roleGroupIds.length > 0
    ? await adminClient.from('role_groups').select('id').eq('employer_id', employerId).in('id', roleGroupIds)
    : { data: [] }
  await adminClient.from('employment_role_groups').delete().eq('employment_id', employmentId)
  if (valid && valid.length > 0) {
    await adminClient.from('employment_role_groups').insert(valid.map((g) => ({ employment_id: employmentId, role_group_id: g.id })))
  }
}

// ─── Add one person ──────────────────────────────────────────────────────────

export async function addPerson(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const fullName = (formData.get('full_name') as string)?.trim()
  const emailRaw = (formData.get('email') as string)?.trim().toLowerCase()
  const jobTitle = (formData.get('job_title') as string)?.trim() || null
  const department = (formData.get('department') as string)?.trim() || null
  const startDate = (formData.get('start_date') as string)?.trim() || null
  const dob = (formData.get('date_of_birth') as string)?.trim() || null
  const roleGroupIds = formData.getAll('role_group_ids').map(String).filter(Boolean)

  if (!fullName) return { error: 'Full name is required.' }
  if (emailRaw && !EMAIL_RE.test(emailRaw)) return { error: 'Please enter a valid email address.' }
  if (startDate && !parseUkDate(startDate)) return { error: 'Start date is not a valid date.' }
  if (dob && !parseUkDate(dob)) return { error: 'Date of birth is not a valid date.' }

  const cap = await wouldExceedHeadcount(ctx, 1)
  if (cap.exceeded) return { error: `Your plan covers up to ${cap.cap} people and you already have ${cap.current}. Upgrade your band in Settings, Billing to add more.` }

  const adminClient = createAdminClient()
  if (emailRaw) {
    const { data: existing } = await adminClient
      .from('employments')
      .select('id')
      .eq('employer_id', ctx.employerId)
      .eq('status', 'active')
      .ilike('email', emailRaw)
      .maybeSingle()
    if (existing) return { error: `${emailRaw} is already in your workforce.` }
  }

  const { data: inserted, error } = await adminClient
    .from('employments')
    .insert({
      employer_id: ctx.employerId,
      full_name: fullName,
      email: emailRaw || null,
      job_title: jobTitle,
      department,
      start_date: startDate ? parseUkDate(startDate) : null,
      date_of_birth: dob ? parseUkDate(dob) : null,
      status: 'active',
    })
    .select('id')
    .single()
  if (error || !inserted) return { error: error?.message ?? 'Could not add this person.' }

  await setRoleGroups(ctx.employerId, inserted.id, roleGroupIds)

  await writeAudit({
    actorId: ctx.userId,
    actorType: 'employer',
    action: 'employment_created',
    resourceType: 'employments',
    resourceId: inserted.id,
    employerId: ctx.employerId,
    metadata: { full_name: fullName, source: 'manual' },
  })

  revalidateWorkforce()
  return { success: true, id: inserted.id }
}

// ─── Update a person ─────────────────────────────────────────────────────────

export async function updatePerson(employmentId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const fullName = (formData.get('full_name') as string)?.trim()
  const emailRaw = (formData.get('email') as string)?.trim().toLowerCase()
  const jobTitle = (formData.get('job_title') as string)?.trim() || null
  const department = (formData.get('department') as string)?.trim() || null
  const startDate = (formData.get('start_date') as string)?.trim() || null
  const dob = (formData.get('date_of_birth') as string)?.trim() || null
  const roleGroupIds = formData.getAll('role_group_ids').map(String).filter(Boolean)

  if (!fullName) return { error: 'Full name is required.' }
  if (emailRaw && !EMAIL_RE.test(emailRaw)) return { error: 'Please enter a valid email address.' }
  if (startDate && !parseUkDate(startDate)) return { error: 'Start date is not a valid date.' }
  if (dob && !parseUkDate(dob)) return { error: 'Date of birth is not a valid date.' }

  const adminClient = createAdminClient()
  const { data: updated, error } = await adminClient
    .from('employments')
    .update({
      full_name: fullName,
      email: emailRaw || null,
      job_title: jobTitle,
      department,
      start_date: startDate ? parseUkDate(startDate) : null,
      date_of_birth: dob ? parseUkDate(dob) : null,
    })
    .eq('id', employmentId)
    .eq('employer_id', ctx.employerId)
    .select('id')
  if (error) return { error: error.message.includes('uq_employments_active_email') ? 'Another active person already uses that email.' : error.message }
  if (!updated || updated.length === 0) return { error: 'Person not found.' }

  await setRoleGroups(ctx.employerId, employmentId, roleGroupIds)

  await writeAudit({
    actorId: ctx.userId,
    actorType: 'employer',
    action: 'employment_updated',
    resourceType: 'employments',
    resourceId: employmentId,
    employerId: ctx.employerId,
  })

  revalidateWorkforce(employmentId)
  return { success: true }
}

// ─── Leaver / reactivate ─────────────────────────────────────────────────────

export async function setEmploymentStatus(employmentId: string, status: 'active' | 'leaver', endDate?: string | null): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  if (status === 'active') {
    const cap = await wouldExceedHeadcount(ctx, 1)
    if (cap.exceeded) return { error: `Your plan covers up to ${cap.cap} active people. Upgrade your band to reactivate this person.` }
  }

  const adminClient = createAdminClient()
  const { data: updated, error } = await adminClient
    .from('employments')
    .update({
      status,
      end_date: status === 'leaver' ? (endDate && parseUkDate(endDate)) || new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', employmentId)
    .eq('employer_id', ctx.employerId)
    .select('id')
  if (error) return { error: error.message.includes('uq_employments') ? 'An active record for this person already exists.' : error.message }
  if (!updated || updated.length === 0) return { error: 'Person not found.' }

  await writeAudit({
    actorId: ctx.userId,
    actorType: 'employer',
    action: status === 'leaver' ? 'employment_ended' : 'employment_updated',
    resourceType: 'employments',
    resourceId: employmentId,
    employerId: ctx.employerId,
    metadata: { status },
  })

  revalidateWorkforce(employmentId)
  return { success: true }
}

// ─── Delete (only for people with no compliance history) ─────────────────────

export async function deletePerson(employmentId: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { count } = await adminClient
    .from('compliance_records')
    .select('id', { count: 'exact', head: true })
    .eq('employer_id', ctx.employerId)
    .eq('employment_id', employmentId)
  if ((count ?? 0) > 0) return { error: 'This person has compliance records. Mark them as a leaver instead of deleting.' }

  const { data: deleted, error } = await adminClient
    .from('employments')
    .delete()
    .eq('id', employmentId)
    .eq('employer_id', ctx.employerId)
    .select('id')
  if (error) return { error: error.message }
  if (!deleted || deleted.length === 0) return { error: 'Person not found.' }

  await writeAudit({
    actorId: ctx.userId,
    actorType: 'employer',
    action: 'employment_ended',
    resourceType: 'employments',
    resourceId: employmentId,
    employerId: ctx.employerId,
    metadata: { deleted: true },
  })

  revalidateWorkforce()
  return { success: true }
}

// ─── CSV import ──────────────────────────────────────────────────────────────

export type ImportState = {
  error?: string
  imported?: number
  skipped?: string[]
  rowErrors?: { line: number; message: string }[]
  ignoredColumns?: string[]
}

export async function importWorkforce(_prev: ImportState | null, formData: FormData): Promise<ImportState> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const file = formData.get('file')
  let text = ''
  if (file && typeof file === 'object' && 'text' in file) {
    text = await (file as File).text()
  } else {
    text = String(formData.get('csv') ?? '')
  }
  if (!text.trim()) return { error: 'Choose a CSV file to import.' }
  if (text.length > 2_000_000) return { error: 'That file is too large. Split it into smaller files.' }

  const parsed = parseWorkforceCsv(text)
  if (parsed.people.length === 0) {
    return { error: 'No people could be read from the file.', rowErrors: parsed.errors, ignoredColumns: parsed.ignoredColumns }
  }

  const adminClient = createAdminClient()

  // Skip anyone already active with the same email.
  const emails = parsed.people.map((p) => p.email).filter((e): e is string => !!e)
  const { data: existing } = emails.length > 0
    ? await adminClient.from('employments').select('email').eq('employer_id', ctx.employerId).eq('status', 'active').in('email', emails)
    : { data: [] }
  const existingEmails = new Set((existing ?? []).map((e) => (e.email as string).toLowerCase()))

  const toInsert = parsed.people.filter((p) => !p.email || !existingEmails.has(p.email))
  const skipped = parsed.people.filter((p) => p.email && existingEmails.has(p.email)).map((p) => p.full_name)

  const cap = await wouldExceedHeadcount(ctx, toInsert.length)
  if (cap.exceeded) {
    return { error: `This import would take you to ${cap.current + toInsert.length} active people, but your plan covers ${cap.cap}. Upgrade your band in Settings, Billing, or import fewer people.` }
  }

  const allGroupNames = toInsert.flatMap((p) => p.role_groups)
  const groupIds = await ensureRoleGroups(ctx.employerId, allGroupNames)
  const { data: groups } = groupIds.length > 0
    ? await adminClient.from('role_groups').select('id, name').eq('employer_id', ctx.employerId).in('id', groupIds)
    : { data: [] }
  const groupIdByName = new Map((groups ?? []).map((g) => [g.name.toLowerCase(), g.id]))

  let imported = 0
  for (const p of toInsert) {
    const { data: row, error } = await adminClient
      .from('employments')
      .insert({
        employer_id: ctx.employerId,
        full_name: p.full_name,
        email: p.email,
        job_title: p.job_title,
        department: p.department,
        start_date: p.start_date,
        date_of_birth: p.date_of_birth,
        status: 'active',
      })
      .select('id')
      .single()
    if (error || !row) {
      parsed.errors.push({ line: 0, message: `${p.full_name}: ${error?.message ?? 'insert failed'}` })
      continue
    }
    imported++
    const ids = p.role_groups.map((n) => groupIdByName.get(n.toLowerCase())).filter((id): id is string => !!id)
    if (ids.length > 0) {
      await adminClient.from('employment_role_groups').insert(ids.map((role_group_id) => ({ employment_id: row.id, role_group_id })))
    }
  }

  await writeAudit({
    actorId: ctx.userId,
    actorType: 'employer',
    action: 'workforce_imported',
    resourceType: 'employments',
    resourceId: null,
    employerId: ctx.employerId,
    metadata: { imported, skipped: skipped.length, errors: parsed.errors.length },
  })

  revalidateWorkforce()
  return { imported, skipped, rowErrors: parsed.errors, ignoredColumns: parsed.ignoredColumns }
}

// ─── Invite to self-service ──────────────────────────────────────────────────

export async function sendWorkforceInvite(employmentId: string): Promise<ActionResult> {
  const gate = await requireContext()
  if ('error' in gate) return { error: gate.error }
  const { ctx } = gate

  const adminClient = createAdminClient()
  const { data: person } = await adminClient
    .from('employments')
    .select('id, full_name, email, employee_id, invitation_token, status')
    .eq('id', employmentId)
    .eq('employer_id', ctx.employerId)
    .maybeSingle()
  if (!person) return { error: 'Person not found.' }
  if (person.status !== 'active') return { error: 'Only active people can be invited.' }
  if (!person.email) return { error: 'Add an email address for this person first.' }
  if (person.employee_id) return { error: 'This person already has Vopria access.' }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()
  const inviteUrl = `${appUrl}/workforce-invite?token=${person.invitation_token}`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailError } = await resend.emails.send({
    from: RESEND_FROM,
    to: person.email,
    subject: `${ctx.companyName} has set up your compliance record on Vopria`,
    html: buildWorkforceInviteEmailHtml({ personName: person.full_name, companyName: ctx.companyName, inviteUrl }),
  })
  if (emailError) return { error: `Invitation could not be sent (${emailError.message}).` }

  await adminClient.from('employments').update({ invited_at: new Date().toISOString() }).eq('id', employmentId)

  await writeAudit({
    actorId: ctx.userId,
    actorType: 'employer',
    action: 'workforce_invite_sent',
    resourceType: 'employments',
    resourceId: employmentId,
    employerId: ctx.employerId,
    metadata: { email: person.email },
  })

  revalidateWorkforce(employmentId)
  return { success: true }
}
