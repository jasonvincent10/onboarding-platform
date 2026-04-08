'use client'

import { useState, useTransition } from 'react'
import { createTemplate } from '@/app/actions/templates'
import { Plus, X, Loader2 } from 'lucide-react'

export function CreateTemplateForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await createTemplate(formData)
        // redirect happens inside the action
      } catch (err: any) {
        setError(err.message ?? 'Something went wrong')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New template
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-900">
            New template
          </h2>
          <button
            onClick={() => {
              setOpen(false)
              setError(null)
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="template_name"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Template name <span className="text-red-500">*</span>
            </label>
            <input
              id="template_name"
              name="template_name"
              type="text"
              required
              placeholder="e.g. Software Engineer Onboarding"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="role_type"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Role type{' '}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="role_type"
              name="role_type"
              type="text"
              placeholder="e.g. Engineering, Sales, Operations"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Helps you find the right template when inviting a new starter.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create template
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
