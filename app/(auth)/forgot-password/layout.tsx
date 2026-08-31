import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Reset your password - Vopria',
  description: 'Request a password reset link for your Vopria account.',
  path: '/forgot-password',
})

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
