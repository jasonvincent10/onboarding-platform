'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createInvitation, type InviteState } from './actions'

interface Template {
  id: string
  template_name: string
  role_type: string | null
  is_default: boolean
}

interface InviteFormProps {
  templates: Template[]
  companyName: string
}

// ── Minimum start date: tomorrow ─────────────────────────────────────────────
function getMinDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function InviteForm({ templates, companyName }: InviteFormProps) {
  const [state, setState] = useState<InviteState | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createInvitation(null, formData)
      setState(result)
    })
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (state?.success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center pt-16 px-4">
        <div className="w-full max-w-lg">

          {/* Success card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-emerald-50 border-b border-emerald-100 px-8 py-6 flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-emerald-700 text-sm font-semibold">Invitation sent</p>
                <p className="text-emerald-900 text-lg font-bold mt-0.5">
                  {state.inviteeName} is on their way.
                </p>
              </div>
            </div>

            <div className="px-8 py-6">
              <p className="text-slate-600 text-sm leading-relaxed">
                An invitation email has been sent to{' '}
                <span className="font-medium text-slate-800">{state.inviteeEmail}</span> with a
                secure link to complete their onboarding checklist.
              </p>

              <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                You&apos;ll be notified when they start completing items and when documents are
                ready for your review. Track progress on your dashboard.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setState(null)}
                  className="flex-1 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold
                             px-4 py-2.5 rounded-lg transition-colors"
                >
                  Invite another starter
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 text-center bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium
                             px-4 py-2.5 rounded-lg border border-slate-200 transition-colors"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg mx-auto">

        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800
                     transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to dashboard
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Invite a new starter
          </h1>
          {companyName && (
            <p className="mt-1 text-slate-500 text-sm">
              Sending on behalf of{' '}
              <span className="font-medium text-slate-700">{companyName}</span>
            </p>
          )}
        </div>

        {/* No templates warning */}
        {templates.length === 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 text-sm font-medium">No templates found</p>
            <p className="text-amber-700 text-sm mt-0.5">
              You need at least one onboarding template before you can invite a new starter.{' '}
              <Link href="/dashboard/templates" className="underline font-medium">
                Create a template →
              </Link>
            </p>
          </div>
        )}

        {/* Error banner */}
        {state?.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-red-700 text-sm leading-relaxed">{state.error}</p>
          </div>
        )}

        {/* Form card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200">

          <div className="px-8 py-6 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">New starter details</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              These details will appear in the invitation email.
            </p>
          </div>

          <div className="px-8 py-6 space-y-5">

            {/* Full name */}
            <div>
              <label
                htmlFor="invitee_name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Full name <span className="text-red-400">*</span>
              </label>
              <input
                id="invitee_name"
                name="invitee_name"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. Sarah Johnson"
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300
                           rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2
                           focus:ring-slate-900 focus:border-transparent transition"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="invitee_email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email address <span className="text-red-400">*</span>
              </label>
              <input
                id="invitee_email"
                name="invitee_email"
                type="email"
                required
                autoComplete="off"
                placeholder="sarah@example.com"
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300
                           rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2
                           focus:ring-slate-900 focus:border-transparent transition"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                The invitation link will be sent here. Use their personal email, not a work one they
                don&apos;t have yet.
              </p>
            </div>

            {/* Role title */}
            <div>
              <label
                htmlFor="role_title"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Job title <span className="text-red-400">*</span>
              </label>
              <input
                id="role_title"
                name="role_title"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. Marketing Manager"
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300
                           rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2
                           focus:ring-slate-900 focus:border-transparent transition"
              />
            </div>

            {/* Start date */}
            <div>
              <label
                htmlFor="start_date"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Start date <span className="text-red-400">*</span>
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                min={getMinDate()}
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300
                           rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900
                           focus:border-transparent transition"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Checklist deadlines are calculated automatically from this date.
              </p>
            </div>

            {/* Template select */}
            <div>
              <label
                htmlFor="template_id"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Onboarding template <span className="text-red-400">*</span>
              </label>

              {templates.length > 0 ? (
                <select
                  id="template_id"
                  name="template_id"
                  required
                  defaultValue={templates.find((t) => t.is_default)?.id ?? templates[0]?.id ?? ''}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300
                             rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900
                             focus:border-transparent transition appearance-none
                             bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
                             bg-no-repeat bg-[right_12px_center]"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.template_name}
                      {t.is_default ? ' (default)' : ''}
                      {t.role_type ? ` — ${t.role_type}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3.5 py-2.5 text-sm text-slate-400 bg-slate-50 border
                                border-slate-200 rounded-lg">
                  No templates available
                </div>
              )}

              <p className="mt-1.5 text-xs text-slate-400">
                This determines which documents and forms the new starter will need to complete.{' '}
                <Link href="/dashboard/templates" className="text-slate-500 underline">
                  Manage templates
                </Link>
              </p>
            </div>

          </div>

          {/* Form footer */}
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 rounded-b-2xl
                          flex flex-col sm:flex-row items-center justify-between gap-3">

            <p className="text-xs text-slate-400 order-2 sm:order-1">
              An email will be sent immediately on submission.
            </p>

            <button
              type="submit"
              disabled={isPending || templates.length === 0}
              className="w-full sm:w-auto order-1 sm:order-2 flex items-center justify-center gap-2
                         bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed
                         text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {isPending ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Sending invitation…
                </>
              ) : (
                <>
                  Send invitation
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </>
              )}
            </button>
          </div>

        </form>

        {/* GDPR note */}
        <p className="mt-4 text-xs text-center text-slate-400 leading-relaxed">
          By sending this invitation you confirm you have a lawful basis under UK GDPR to collect
          this employee&apos;s personal data. The new starter will be asked to give explicit consent
          before sharing any sensitive information.
        </p>

      </div>
    </div>
  )
}
