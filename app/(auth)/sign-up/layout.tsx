import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Sign up - Vopria',
  description: 'Create a free Vopria account and onboard your first 3 hires at no cost.',
  path: '/sign-up',
})

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
