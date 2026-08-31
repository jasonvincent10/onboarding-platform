import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Employee sign in - Vopria',
  description: 'Sign in to complete your onboarding checklist as a new starter.',
  path: '/employee-login',
})

export default function EmployeeLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
