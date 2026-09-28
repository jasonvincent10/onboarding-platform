'use server'

import { headers } from 'next/headers'
import { Resend } from 'resend'
import { CONTACT_INBOX, MAIL_FROM } from '@/lib/config'
import { checkRateLimit, clientKeyFrom } from '@/lib/rate-limit'
import {
  HONEYPOT_FIELD,
  validateContact,
  type ContactState,
  type ContactFields,
} from '@/lib/contact-schema'

/**
 * Handles a contact form submission.
 *
 * Server Actions are reachable by direct POST, not only through our form, so
 * every check here runs server-side regardless of what the client did:
 * honeypot, rate limit, field validation, and allow-listing of the two
 * dropdowns. There is no authentication because this is a public form — the
 * rate limiter is what stands in for it.
 */
export async function submitContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const headerList = await headers()

  // Honeypot: a hidden field that only an automated filler would complete.
  // Answer with the success state so a bot learns nothing from the response.
  if (String(formData.get(HONEYPOT_FIELD) ?? '').trim() !== '') {
    return { status: 'success' }
  }

  const { ok, errors, data } = validateContact(formData)

  // Everything the visitor typed, echoed back so a rejected submission does
  // not wipe the form. Consent is excluded — a checkbox should be re-ticked.
  const values = {
    name: data.name,
    email: data.email,
    company: data.company,
    role: data.role,
    companySize: data.companySize,
    aiStage: data.aiStage,
    message: data.message,
  }

  if (!ok) {
    return {
      status: 'error',
      message: 'Please check the highlighted fields and try again.',
      errors,
      values,
    }
  }

  const limit = checkRateLimit(clientKeyFrom(headerList))
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))
    return {
      status: 'error',
      message: `That is a few messages in a short space of time. Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}, or email ${CONTACT_INBOX} directly.`,
      values,
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Misconfiguration, not visitor error — log it and tell them the honest
    // fallback rather than pretending the message was sent.
    console.error('[contact] RESEND_API_KEY is not set; cannot send enquiry email')
    return {
      status: 'error',
      message: `Sorry — our contact form is temporarily unavailable. Please email ${CONTACT_INBOX} and we will pick it up right away.`,
      values,
    }
  }

  try {
    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from: MAIL_FROM,
      to: [CONTACT_INBOX],
      // Replies from the inbox go straight back to the enquirer.
      replyTo: data.email,
      subject: `Website enquiry — ${data.company} (${data.name})`,
      text: asPlainText(data),
      html: asHtml(data),
    })

    if (error) {
      console.error('[contact] Resend rejected the message:', error)
      return {
        status: 'error',
        message: `Sorry — we could not send that just now. Please try again, or email ${CONTACT_INBOX} directly.`,
        values,
      }
    }

    return { status: 'success' }
  } catch (cause) {
    console.error('[contact] Unexpected failure sending enquiry:', cause)
    return {
      status: 'error',
      message: `Sorry — something went wrong at our end. Please try again, or email ${CONTACT_INBOX} directly.`,
      values,
    }
  }
}

function asPlainText(data: ContactFields): string {
  return [
    `New enquiry from the Vopria website`,
    ``,
    `Name:         ${data.name}`,
    `Email:        ${data.email}`,
    `Company:      ${data.company}`,
    `Role:         ${data.role}`,
    `Company size: ${data.companySize}`,
    `AI stage:     ${data.aiStage}`,
    ``,
    `Message:`,
    data.message,
    ``,
    `— Consent given to reply to this enquiry.`,
  ].join('\n')
}

/** Escapes user input before it goes anywhere near an HTML email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function asHtml(data: ContactFields): string {
  const row = (label: string, value: string) =>
    `<tr>
       <td style="padding:6px 16px 6px 0;color:#6B6485;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
       <td style="padding:6px 0;color:#1E1B2E;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
     </tr>`

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#FAF8FF;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #E6E0F7;border-radius:16px;padding:28px;">
      <h1 style="margin:0 0 4px;font-size:18px;color:#1E1B2E;">New website enquiry</h1>
      <p style="margin:0 0 20px;font-size:13px;color:#6B6485;">Sent from the contact form on vopria.com</p>

      <table style="border-collapse:collapse;width:100%;">
        ${row('Name', data.name)}
        ${row('Email', data.email)}
        ${row('Company', data.company)}
        ${row('Role', data.role)}
        ${row('Company size', data.companySize)}
        ${row('AI stage', data.aiStage)}
      </table>

      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #E6E0F7;">
        <p style="margin:0 0 8px;font-size:13px;color:#6B6485;">Message</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#1E1B2E;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
      </div>

      <p style="margin:20px 0 0;font-size:12px;color:#938DAB;">
        Consent was given to use these details to reply to this enquiry.
      </p>
    </div>
  </body>
</html>`
}
