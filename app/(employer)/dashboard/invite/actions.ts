'use server'

import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { buildInviteEmailHtml } from '@/lib/email/invite-template'

const resend = new Resend(process.env.RESEND_API_KEY)

export type InviteState = {
  success: boolean
  error?: string
  instanceId?: string
  inviteeName?: string
  inviteeEmail?: string
}

export async function createInvitation(
  _prev: InviteState | null,
  formData: FormData
): Promise<InviteState> {
  const supabase = await createClient()

  // --- 1. Extract and validate form data ---
  const inviteeName = (formData.get('invitee_name') as string)?.trim()
  const inviteeEmail = (formData.get('invitee_email') as string)?.trim().toLowerCase()
  const roleTitle = (formData.get('role_title') as string)?.trim()
  const startDate = formData.get('start_date') as string
  const templateId = formData.get('template_id') as string

  if (!inviteeName || !inviteeEmail || !roleTitle || !startDate || !templateId) {
    return { success: false, error: 'All fields are required.' }
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  // Start date must be in the future
  const startDateObj = new Date(startDate)
  if (startDateObj <= new Date()) {
    return { success: false, error: 'Start date must be in the future.' }
  }

  // --- 2. Verify authenticated employer ---
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'You must be logged in to send invitations.' }
  }

  // --- 3. Get employer account ---
  // If this returns null, the Task 1.3 sign-up bug hasn't been fixed yet.
  // See the fix in: app/(employer)/auth/sign-up/actions.ts
  const { data: member, error: memberError } = await supabase
    .from('employer_members')
    .select('employer_id, employer_accounts(company_name)')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) {
    return {
      success: false,
      error:
        'Your employer account is not fully set up. Please contact support or check the Task 1.3 fix in CONTEXT.md.',
    }
  }

  const employerId = member.employer_id
  const companyName = (member.employer_accounts as any)?.company_name ?? 'Your new employer'

  // --- 4. Verify template belongs to this employer ---
  const { data: template, error: templateError } = await supabase
    .from('onboarding_templates')
    .select('id, template_name')
    .eq('id', templateId)
    .eq('employer_id', employerId)
    .single()

  if (templateError || !template) {
    return {
      success: false,
      error: 'Template not found or does not belong to your account.',
    }
  }

  // --- 5. Duplicate check — same email + this employer + still active ---
  const { data: existing } = await supabase
    .from('onboarding_instances')
    .select('id')
    .eq('employer_id', employerId)
    .eq('invitee_email', inviteeEmail)
    .in('status', ['pending', 'in_progress'])
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error: `There is already an active onboarding for ${inviteeEmail}. Check your dashboard.`,
    }
  }

  // --- 6. Generate secure invitation token ---
  const invitationToken = crypto.randomUUID()

  // --- 7. Create the onboarding instance ---
  const { data: instance, error: instanceError } = await supabase
    .from('onboarding_instances')
    .insert({
      employer_id: employerId,
      template_id: templateId,
      invitee_name: inviteeName,
      invitee_email: inviteeEmail,
      role_title: roleTitle,
      start_date: startDate,
      invitation_token: invitationToken,
      status: 'pending',
      readiness_pct: 0,
    })
    .select('id')
    .single()

  if (instanceError || !instance) {
    return {
      success: false,
      error: `Failed to create onboarding record: ${instanceError?.message ?? 'Unknown error'}`,
    }
  }

  // --- 8. Copy template_items → checklist_items with calculated deadlines ---
  const { data: templateItems, error: itemsError } = await supabase
    .from('template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    console.error('Failed to fetch template items:', itemsError.message)
  }

  if (templateItems && templateItems.length > 0) {
    const startMs = startDateObj.getTime()

    const checklistRows = templateItems.map((item: any) => ({
      onboarding_id: instance.id,
      template_item_id: item.id,
      item_name: item.item_name,
      item_type: item.item_type,
      data_category: item.data_category,
      status: 'not_started',
      // Deadline = start date minus N days. If no deadline_days_before_start, default to start date.
      deadline:
        item.deadline_days_before_start != null
          ? new Date(startMs - item.deadline_days_before_start * 86_400_000)
              .toISOString()
              .split('T')[0]
          : startDate,
      was_pre_populated: false,
    }))

    const { error: checklistError } = await supabase
      .from('checklist_items')
      .insert(checklistRows)

    if (checklistError) {
      // Non-fatal: the onboarding instance exists, checklist items can be re-created.
      // Log it but don't fail the whole operation.
      console.error('Checklist item creation error:', checklistError.message)
    }
  }

  // --- 9. Send invitation email via Resend ---
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join?token=${invitationToken}`

  const { error: emailError } = await resend.emails.send({
    // TODO before launch: replace with your verified Resend domain
    // e.g. 'Onboarder <noreply@yourdomain.co.uk>'
    from: 'Onboarder <onboarding@resend.dev>',
    to: inviteeEmail,
    subject: `${companyName} — Complete your new starter onboarding`,
    html: buildInviteEmailHtml({
      inviteeName,
      companyName,
      roleTitle,
      startDate,
      inviteUrl,
    }),
  })

  if (emailError) {
    // The onboarding instance was created successfully.
    // Don't roll back — the employer can copy the invite link from the dashboard.
    console.error('Resend email error:', emailError)
    return {
      success: false,
      error: `Onboarding created but the invitation email failed to send (${emailError.message}). Copy the invite link from the dashboard and send it manually.`,
    }
  }

  // --- 10. Write audit log entry ---
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employer',
    action: 'invitation_sent',
    resource_type: 'onboarding_instance',
    resource_id: instance.id,
    employer_id: employerId,
    metadata: {
      invitee_email: inviteeEmail,
      role_title: roleTitle,
      template_name: template.template_name,
    },
  })

  revalidatePath('/dashboard')

  return {
    success: true,
    instanceId: instance.id,
    inviteeName,
    inviteeEmail,
  }
}
