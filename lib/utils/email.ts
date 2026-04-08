import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@yourdomain.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export interface SendInviteEmailParams {
  to: string
  employeeName: string
  employerName: string
  roleName: string
  startDate: string
  inviteToken: string
}

/**
 * Send a new starter invitation email.
 * The email appears to come from the employer (via the platform).
 */
export async function sendInviteEmail({
  to,
  employeeName,
  employerName,
  roleName,
  startDate,
  inviteToken,
}: SendInviteEmailParams) {
  const inviteUrl = `${APP_URL}/employee/accept-invite?token=${inviteToken}`

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Complete your onboarding for ${employerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #0284c7;">Welcome to ${employerName}, ${employeeName}!</h2>
        <p>
          You've been invited to complete your onboarding as <strong>${roleName}</strong>,
          starting <strong>${startDate}</strong>.
        </p>
        <p>
          Please complete the checklist before your start date so everything is ready for day one.
        </p>
        <p style="margin: 32px 0;">
          <a href="${inviteUrl}"
             style="background: #0284c7; color: white; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600;">
            Complete your onboarding
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b;">
          If you weren't expecting this email, you can ignore it.
          This link expires in 7 days.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">
          Sent on behalf of ${employerName} via Onboarding Platform.
        </p>
      </div>
    `,
  })
}

export interface SendReminderEmailParams {
  to: string
  employeeName: string
  employerName: string
  incompleteItems: Array<{ name: string; deadline: string }>
}

/**
 * Send an automated reminder to an employee with incomplete checklist items.
 */
export async function sendReminderEmail({
  to,
  employeeName,
  employerName,
  incompleteItems,
}: SendReminderEmailParams) {
  const itemList = incompleteItems
    .map(item => `<li>${item.name} — due ${item.deadline}</li>`)
    .join('')

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Action needed: complete your onboarding for ${employerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #0284c7;">Hi ${employeeName},</h2>
        <p>
          You have outstanding items to complete for your onboarding with
          <strong>${employerName}</strong>:
        </p>
        <ul style="padding-left: 20px; line-height: 2;">
          ${itemList}
        </ul>
        <p style="margin: 32px 0;">
          <a href="${APP_URL}/employee/checklist"
             style="background: #0284c7; color: white; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600;">
            Complete your checklist
          </a>
        </p>
      </div>
    `,
  })
}
