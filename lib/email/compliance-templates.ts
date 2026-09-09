// lib/email/compliance-templates.ts
// HTML builders for compliance emails: workforce invite, employee expiry
// reminder, employer weekly digest, work-blocking escalation.

function safe(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(iso: string | null): string {
  if (!iso) return 'no expiry'
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function shell(eyebrow: string, heading: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="background:#7c3aed;padding:24px 32px;border-radius:12px 12px 0 0;">
            <p style="margin:0;color:#ddd6fe;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${safe(eyebrow)}</p>
            <p style="margin:6px 0 0;color:#f8fafc;font-size:20px;font-weight:700;">${safe(heading)}</p>
          </td>
        </tr>
        <tr><td style="background:#ffffff;padding:32px;">${body}</td></tr>
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:18px 32px;border-radius:0 0 12px 12px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Sent by Vopria on behalf of your employer. If this was unexpected you can ignore it.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-top:8px;">
    <a href="${safe(href)}" style="display:inline-block;background:#7c3aed;color:#f8fafc;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">${safe(label)}</a>
  </td></tr></table>`
}

// ─── Workforce invite ────────────────────────────────────────────────────────

export function buildWorkforceInviteEmailHtml(p: { personName: string; companyName: string; inviteUrl: string }): string {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;">Hi ${safe(p.personName)},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.65;">
      ${safe(p.companyName)} uses Vopria to keep track of training, licences and checks.
      Create your account to see what is due, upload renewals yourself, and get reminders before anything expires.
    </p>
    ${button(p.inviteUrl, 'Set up my access')}
    <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
      If the button does not work, copy this link into your browser:<br/>
      <a href="${safe(p.inviteUrl)}" style="color:#64748b;word-break:break-all;">${safe(p.inviteUrl)}</a>
    </p>`
  return shell('Compliance access', p.companyName, body)
}

// ─── Employee reminder ───────────────────────────────────────────────────────

export interface ReminderLine {
  name: string
  expiresAt: string | null
  daysUntil: number | null
  workBlocking: boolean
}

export function buildComplianceReminderEmail(p: { personName: string; companyName: string; appUrl: string; hasAccount: boolean; lines: ReminderLine[] }): { subject: string; html: string } {
  const rows = p.lines
    .map((l) => {
      const label = l.daysUntil === null ? 'due' : l.daysUntil < 0 ? `expired ${Math.abs(l.daysUntil)} day${Math.abs(l.daysUntil) === 1 ? '' : 's'} ago` : l.daysUntil === 0 ? 'expires today' : `${l.daysUntil} day${l.daysUntil === 1 ? '' : 's'} left`
      const colour = l.daysUntil !== null && l.daysUntil <= 7 ? '#dc2626' : '#d97706'
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">${safe(l.name)}${l.workBlocking ? ' <span style="font-size:11px;color:#dc2626;font-weight:600;">required to work</span>' : ''}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;color:${colour};font-weight:600;white-space:nowrap;">${safe(formatDate(l.expiresAt))}<br/><span style="font-weight:400;">${label}</span></td>
      </tr>`
    })
    .join('')

  const cta = p.hasAccount
    ? button(`${p.appUrl}/employee/compliance`, 'Upload my renewal')
    : `<p style="margin:16px 0 0;font-size:14px;color:#475569;line-height:1.6;">Send your renewed certificate or card to your manager, or ask them for a Vopria login so you can upload it yourself.</p>`

  const expired = p.lines.some((l) => l.daysUntil !== null && l.daysUntil < 0)
  const body = `
    <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Hi ${safe(p.personName)},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
      ${expired ? 'Something on your compliance record has expired.' : 'Something on your compliance record is due for renewal soon.'}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${cta}`

  return {
    subject: expired ? `Action needed: your ${p.companyName} compliance record has expired items` : `Reminder: renewals due for ${p.companyName}`,
    html: shell('Compliance reminder', p.companyName, body),
  }
}

// ─── Employer digest / escalation ────────────────────────────────────────────

export interface DigestLine {
  personName: string
  requirementName: string
  expiresAt: string | null
  daysUntil: number | null
  workBlocking: boolean
  status: string
}

export function buildComplianceDigestEmail(p: {
  employerName: string
  companyName: string
  appUrl: string
  expired: DigestLine[]
  expiring: DigestLine[]
  missing: DigestLine[]
  awaitingReview: number
}): { subject: string; html: string } {
  const section = (title: string, colour: string, lines: DigestLine[]) => {
    if (lines.length === 0) return ''
    const rows = lines
      .slice(0, 40)
      .map((l) => `<li style="margin:4px 0;font-size:13px;color:#374151;">${safe(l.personName)}: ${safe(l.requirementName)}${l.expiresAt ? ` (${safe(formatDate(l.expiresAt))})` : ''}${l.workBlocking ? ' <span style="color:#dc2626;font-weight:600;">required to work</span>' : ''}</li>`)
      .join('')
    const more = lines.length > 40 ? `<li style="margin:4px 0;font-size:13px;color:#6b7280;">and ${lines.length - 40} more</li>` : ''
    return `<p style="margin:20px 0 6px;font-size:13px;font-weight:700;color:${colour};text-transform:uppercase;letter-spacing:0.05em;">${safe(title)} (${lines.length})</p><ul style="margin:0;padding-left:18px;">${rows}${more}</ul>`
  }

  const body = `
    <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Hi ${safe(p.employerName)},</p>
    <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">Here is where ${safe(p.companyName)} stands this week.</p>
    ${section('Expired', '#dc2626', p.expired)}
    ${section('Missing', '#dc2626', p.missing)}
    ${section('Expiring soon', '#d97706', p.expiring)}
    ${p.awaitingReview > 0 ? `<p style="margin:20px 0 0;font-size:14px;color:#374151;">${p.awaitingReview} upload${p.awaitingReview === 1 ? '' : 's'} awaiting your review.</p>` : ''}
    ${p.expired.length + p.missing.length + p.expiring.length + p.awaitingReview === 0 ? '<p style="margin:16px 0 0;font-size:14px;color:#059669;font-weight:600;">Everything is in date. Nothing to do this week.</p>' : ''}
    ${button(`${p.appUrl}/compliance`, 'Open compliance overview')}`

  const total = p.expired.length + p.missing.length
  return {
    subject: total > 0 ? `${total} compliance item${total === 1 ? '' : 's'} need attention at ${p.companyName}` : `Weekly compliance digest for ${p.companyName}`,
    html: shell('Weekly compliance digest', p.companyName, body),
  }
}

export function buildWorkBlockingEscalationEmail(p: { employerName: string; companyName: string; appUrl: string; lines: DigestLine[] }): { subject: string; html: string } {
  const rows = p.lines
    .map((l) => `<li style="margin:6px 0;font-size:14px;color:#111827;"><strong>${safe(l.personName)}</strong>: ${safe(l.requirementName)} ${l.status === 'missing' ? 'has no record' : `expired ${safe(formatDate(l.expiresAt))}`}</li>`)
    .join('')
  const body = `
    <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Hi ${safe(p.employerName)},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
      The following items are required for someone to work legally or safely, and they are now out of date. Please act before their next shift.
    </p>
    <ul style="margin:0;padding-left:18px;">${rows}</ul>
    ${button(`${p.appUrl}/compliance`, 'Review now')}`
  return {
    subject: `Urgent: ${p.lines.length} work-blocking compliance item${p.lines.length === 1 ? '' : 's'} at ${p.companyName}`,
    html: shell('Urgent compliance alert', p.companyName, body),
  }
}
