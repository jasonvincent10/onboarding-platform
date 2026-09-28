'use client'

import { useActionState, useEffect, useId, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { submitContact } from '@/app/contact/actions'
import { HONEYPOT_FIELD, type ContactState } from '@/lib/contact-schema'
import { contactPage } from '@/content/site'
import { buttonClasses, cx } from './ui'

const INITIAL: ContactState = { status: 'idle' }

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, INITIAL)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  // Move focus to the outcome so keyboard and screen-reader users are told
  // what happened rather than being left at the submit button.
  useEffect(() => {
    if (state.status === 'error') errorSummaryRef.current?.focus()
    if (state.status === 'success') successRef.current?.focus()
  }, [state])

  if (state.status === 'success') {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="flex flex-col items-start gap-4 rounded-2xl border border-accent-mist bg-brand-gradient-soft p-6 sm:p-8"
      >
        <SuccessIcon />
        <h2 className="text-xl font-extrabold tracking-tight text-ink">
          {contactPage.successHeading}
        </h2>
        <p className="max-w-prose text-[0.975rem] leading-relaxed text-ink-soft">
          {contactPage.successBody}
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <h2 className="text-lg font-extrabold tracking-tight text-ink">
        {contactPage.formHeading}
      </h2>

      {state.status === 'error' && state.message ? (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-sm font-medium text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="name"
          label={contactPage.fields.name.label}
          placeholder={contactPage.fields.name.placeholder}
          autoComplete="name"
          defaultValue={state.values?.name}
          error={state.errors?.name}
          required
        />
        <Field
          name="email"
          type="email"
          label={contactPage.fields.email.label}
          placeholder={contactPage.fields.email.placeholder}
          autoComplete="email"
          defaultValue={state.values?.email}
          error={state.errors?.email}
          required
        />
        <Field
          name="company"
          label={contactPage.fields.company.label}
          placeholder={contactPage.fields.company.placeholder}
          autoComplete="organization"
          defaultValue={state.values?.company}
          error={state.errors?.company}
          required
        />
        <Field
          name="role"
          label={contactPage.fields.role.label}
          placeholder={contactPage.fields.role.placeholder}
          autoComplete="organization-title"
          defaultValue={state.values?.role}
          error={state.errors?.role}
          required
        />
        <SelectField
          name="companySize"
          label={contactPage.fields.companySize.label}
          options={contactPage.companySizes}
          defaultValue={state.values?.companySize}
          error={state.errors?.companySize}
          required
        />
        <SelectField
          name="aiStage"
          label={contactPage.fields.aiStage.label}
          options={contactPage.aiStages}
          defaultValue={state.values?.aiStage}
          error={state.errors?.aiStage}
          required
        />
      </div>

      <Field
        name="message"
        label={contactPage.fields.message.label}
        placeholder={contactPage.fields.message.placeholder}
        defaultValue={state.values?.message}
        error={state.errors?.message}
        multiline
        required
      />

      {/* Honeypot. Hidden from sight and from assistive tech, and skipped in the
          tab order — anything that fills it is not a person. Not display:none,
          which some bots detect and skip. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <ConsentField error={state.errors?.consent} />

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  // useFormStatus must be read from a child of the <form>, not the form itself.
  const { pending } = useFormStatus()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="submit"
        disabled={pending}
        className={cx(buttonClasses('primary', 'lg'), 'w-full sm:w-auto')}
      >
        {pending ? (
          <>
            <Spinner />
            Sending…
          </>
        ) : (
          'Send message'
        )}
      </button>
      <p aria-live="polite" className="text-xs text-ink-muted">
        {pending ? 'Sending your message…' : 'We reply within two working days.'}
      </p>
    </div>
  )
}

type FieldProps = {
  name: string
  label: string
  placeholder?: string
  type?: string
  autoComplete?: string
  defaultValue?: string
  error?: string
  required?: boolean
  multiline?: boolean
}

function Field({
  name,
  label,
  placeholder,
  type = 'text',
  autoComplete,
  defaultValue,
  error,
  required,
  multiline,
}: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  const shared = {
    id,
    name,
    placeholder,
    defaultValue,
    required,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: inputClasses(Boolean(error)),
  }

  return (
    <div className={cx('flex flex-col gap-2', multiline && 'sm:col-span-2')}>
      <FieldLabel htmlFor={id} label={label} required={required} />
      {multiline ? (
        <textarea {...shared} rows={6} className={cx(shared.className, 'resize-y')} />
      ) : (
        <input {...shared} type={type} autoComplete={autoComplete} />
      )}
      <FieldError id={errorId} error={error} />
    </div>
  )
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
  error,
  required,
}: {
  name: string
  label: string
  options: readonly string[]
  defaultValue?: string
  error?: string
  required?: boolean
}) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className="relative">
        {/*
          React resets the form once the action completes, which restores every
          field to its *default* — so what survives a failed submission is
          defaultValue, not the live DOM value. Text inputs get this for free
          because React keeps their defaultValue attribute in step. A <select>
          only applies defaultValue on mount, so without the key below it would
          reset to "Please choose…" and appear to have cleared itself. Keying on
          the echoed value remounts it, re-applying the correct default.
        */}
        <select
          key={defaultValue ?? ''}
          id={id}
          name={name}
          defaultValue={defaultValue ?? ''}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cx(inputClasses(Boolean(error)), 'appearance-none pr-10')}
        >
          <option value="" disabled>
            Please choose…
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  )
}

function ConsentField({ error }: { error?: string }) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          name="consent"
          type="checkbox"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 h-[1.15rem] w-[1.15rem] shrink-0 cursor-pointer rounded border-line-strong accent-primary"
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-ink-soft">
          {contactPage.fields.consent.label}{' '}
          <span className="text-red-600" aria-hidden="true">
            *
          </span>
        </label>
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  )
}

function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor: string
  label: string
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
      {label}
      {required ? (
        <>
          {' '}
          <span className="text-red-600" aria-hidden="true">
            *
          </span>
          <span className="sr-only">(required)</span>
        </>
      ) : null}
    </label>
  )
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={id} className="text-sm font-medium text-red-700">
      {error}
    </p>
  )
}

function inputClasses(hasError: boolean) {
  return cx(
    'w-full rounded-xl border bg-canvas-raised px-4 py-3 text-[0.95rem] text-ink transition',
    'placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    hasError ? 'border-red-400 bg-red-50/40' : 'border-line-strong hover:border-accent-soft',
  )
}

function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SuccessIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true" focusable="false">
      <circle cx="22" cy="22" r="22" fill="#5B21B6" fillOpacity="0.12" />
      <path
        d="M14 22.5l5.5 5.5L30 17"
        stroke="#5B21B6"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
