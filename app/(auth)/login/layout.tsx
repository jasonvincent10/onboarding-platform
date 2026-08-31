import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Log in - Vopria',
  description: 'Sign in to your Vopria employer dashboard to manage new starter onboarding.',
  path: '/login',
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
