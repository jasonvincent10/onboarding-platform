import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordForm from './ResetPasswordForm'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No session means the recovery link was never exchanged (missing/expired
  // code, or opened in a different browser than it was requested from —
  // /auth/callback already routes that failure case to /forgot-password, but
  // this covers someone navigating here directly).
  if (!user) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1.5">
            Link expired
          </h1>
          <p className="text-[15px] text-slate-500">
            This password reset link is invalid or has expired. Links expire after 1
            hour and can only be used once.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
          <Link
            href="/forgot-password"
            className="block w-full text-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return <ResetPasswordForm />
}
