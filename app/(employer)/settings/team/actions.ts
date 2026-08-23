'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { buildTeamInviteEmailHtml } from '@/lib/email/team-invite-template'

const resend = new Resend(process.env.RESEND_API_KEY)

export type InviteTeamMemberState = {
  error?: string
  success?: boolean
}

export async function inviteTeamMember(
  _prev: InviteTeamMemberState | null,
  formData: FormData
): Promise<InviteTeamMemberState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  const adminClient = createAdminClient()

  const { data: member } = await adminClient
    .from('employer_members')
    .select('employer_id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Not an employer account' }

  // Already a member of this employer?
  const { data: existingMember } = await adminClient
    .from('employer_members')
    .select('id')
    .eq('employer_id', member.employer_id)
    .ilike('email', email)
    .maybeSingle()

  if (existingMember) {
    return { error: `${email} is already on your team.` }
  }

  // Already an unactioned pending invite for this email?
  const { data: existingInvite } = await adminClient
    .from('employer_invitations')
    .select('id')
    .eq('employer_id', member.employer_id)
    .ilike('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingInvite) {
    return { error: `${email} already has a pending invitation.` }
  }

  const { data: employer } = await adminClient
    .from('employer_accounts')
    .select('company_name')
    .eq('id', member.employer_id)
    .maybeSingle()

  const { data: invitation, error: insertError } = await adminClient
    .from('employer_invitations')
    .insert({
      employer_id: member.employer_id,
      email,
      role: 'admin',
      invited_by: user.id,
    })
    .select('id, invitation_token')
    .single()

  if (insertError || !invitation) {
    return { error: insertError?.message ?? 'Failed to create invitation.' }
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/team-invite?token=${invitation.invitation_token}`
  const companyName = employer?.company_name ?? 'your team'
  const inviterName = member.full_name || user.email || 'A teammate'

  const { error: emailError } = await resend.emails.send({
    from: 'Onboarder <onboarding@resend.dev>',
    to: email,
    subject: `${inviterName} invited you to join ${companyName} on Onboarder`,
    html: buildTeamInviteEmailHtml({ companyName, inviterName, inviteUrl }),
  })

  if (emailError) {
    console.error('Team invite email error:', emailError)
    return {
      error: `Invitation created but the email failed to send (${emailError.message}). They can still be added manually once you resolve email delivery.`,
    }
  }

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employer',
    action: 'team_member_invited',
    resource_type: 'employer_invitations',
    resource_id: invitation.id,
    employer_id: member.employer_id,
    metadata: { invitee_email: email },
  })

  revalidatePath('/settings/team')
  return { success: true }
}

export async function revokeInvitation(invitationId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const adminClient = createAdminClient()

  const { data: member } = await adminClient
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Not an employer account' }

  // Scoped by BOTH id and employer_id -- without the second check, any
  // employer member could revoke any invitation in the system by id alone.
  const { data: updated, error } = await adminClient
    .from('employer_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('employer_id', member.employer_id)
    .eq('status', 'pending')
    .select('id')

  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'Invitation not found or already actioned.' }

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employer',
    action: 'team_invitation_revoked',
    resource_type: 'employer_invitations',
    resource_id: invitationId,
    employer_id: member.employer_id,
  })

  revalidatePath('/settings/team')
  return {}
}
