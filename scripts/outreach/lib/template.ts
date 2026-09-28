// Deliberately plain — this is cold outreach, not a branded transactional
// email. Heavily designed HTML (logo banners, colour blocks) reads as
// "marketing" to both spam filters and the human opening it. Keep it
// looking like something a person typed.

export interface OutreachEmail {
  company: string // full legal name, for our own records/matching
  displayName?: string // short trading name for use in prose (falls back to company)
  email: string
  greetingName?: string // first name, if we have a real decision maker
  subject: string
  opening: string // the personalized hook (1-2 sentences), already written
  // Which half of the product this email pitches. Batches 1-4 predate this
  // and default to onboarding, so their copy renders exactly as before.
  angle?: 'onboarding' | 'compliance'
}

function shortName(e: OutreachEmail): string {
  return e.displayName ?? e.company
}

const SIGNOFF = 'Vopria'
const SITE_URL = 'https://vopria.com'
const REPLY_INBOX = 'info@vopria.com'

function bridgeParagraph(e: OutreachEmail): string {
  if (e.angle === 'compliance') {
    return `That's the gap Vopria closes. Every certificate, licence, check and medical sits in one place with the date it runs out, and reminders go out before anything lapses — to the person who holds it, and to you the moment something expires that legally stops them working. New starters go through the same system, so what you collect on day one is still being watched two years later.`
  }
  return `That's the gap Vopria closes. New starters complete one guided checklist — right to work, eligibility documents, bank details, policy sign-off — from their phone, and it's reviewed, approved and logged automatically. No more chasing it branch by branch or site by site.`
}

function ctaParagraph(e: OutreachEmail): string {
  return `Worth a 15-minute look at how it'd sit alongside what you're already doing at ${shortName(e)}? Happy to just send a short walkthrough if that's easier than a call — just reply to this email.`
}

function footerText(e: OutreachEmail): string {
  const topic = e.angle === 'compliance' ? 'keeping training and licence records in date' : 'onboarding'
  return `You're getting this because we thought Vopria could be useful for ${topic} at ${shortName(e)} — this isn't a mass blast. Not relevant? Just reply and let us know, or email ${REPLY_INBOX}, and we won't follow up again.\n${SITE_URL}`
}

export function renderOutreachText(e: OutreachEmail): string {
  const greeting = e.greetingName ? `Hi ${e.greetingName},` : `Hi,`
  return [
    greeting,
    '',
    e.opening,
    '',
    bridgeParagraph(e),
    '',
    ctaParagraph(e),
    '',
    SIGNOFF,
    '',
    '---',
    footerText(e),
  ].join('\n')
}

export function renderOutreachHtml(e: OutreachEmail): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const greeting = e.greetingName ? `Hi ${escape(e.greetingName)},` : `Hi,`
  const p = (text: string) =>
    `<p style="margin:0 0 16px;">${escape(text)}</p>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;">
    ${p(greeting)}
    ${p(e.opening)}
    ${p(bridgeParagraph(e))}
    ${p(ctaParagraph(e))}
    <p style="margin:0 0 16px;">${escape(SIGNOFF)}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
    <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;white-space:pre-line;">${escape(footerText(e))}</p>
  </div>
</body>
</html>`
}
