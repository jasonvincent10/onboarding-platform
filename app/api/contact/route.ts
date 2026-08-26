import { Resend } from 'resend'
import { RESEND_FROM } from '@/lib/email/from'
import { rateLimit, clientKey } from '@/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

const ENQUIRIES_TO = 'info@vopria.com'

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, 'contact'), 5, 60 * 60_000)
  if (!limited.allowed) {
    return Response.json({ error: 'Too many enquiries sent. Please try again later.' }, { status: 429 })
  }

  let body: { name?: string; email?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim()
  const message = (body.message ?? '').trim()

  if (!name || name.length > 200) {
    return Response.json({ error: 'Please enter your name.' }, { status: 400 })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!message || message.length < 10) {
    return Response.json({ error: 'Please add a few details about what you need.' }, { status: 400 })
  }
  if (message.length > 5000) {
    return Response.json({ error: 'Message is too long.' }, { status: 400 })
  }

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  try {
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to: ENQUIRIES_TO,
      replyTo: email,
      subject: `Unlimited plan enquiry from ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #6D28D9;">New Unlimited plan enquiry</h2>
          <p><strong>Name:</strong> ${escape(name)}</p>
          <p><strong>Email:</strong> ${escape(email)}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${escape(message)}</p>
        </div>
      `,
    })

    if (error) {
      console.error('Contact form send failed:', error)
      return Response.json({ error: 'Could not send your enquiry. Please try again.' }, { status: 502 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return Response.json({ error: 'Could not send your enquiry. Please try again.' }, { status: 500 })
  }
}
