'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (res.ok) {
        setSent(true)
      } else {
        setError(data.error ?? 'Could not send your enquiry. Please try again.')
      }
    } catch {
      setError('Could not send your enquiry. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-status-approved/30 bg-status-approved/10 px-6 py-8 text-center">
        <p className="text-base font-semibold text-status-approved">Thanks — that's on its way</p>
        <p className="mt-1 text-sm text-fg-body">We'll get back to you shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-fg-body">
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-fg-body">
          Email address
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-fg-body">
          What do you need?
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us a bit about your team and what you're looking for."
          className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 resize-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3">
          <p className="text-sm text-status-rejected">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  )
}
