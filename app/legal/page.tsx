import Link from 'next/link'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/legal/Breadcrumbs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata = pageMetadata({
  title: 'Legal - Vopria',
  description:
    "Vopria's Terms of Service, Privacy Policy and Data Processing Agreement.",
  path: '/legal',
})

const docs = [
  {
    href: '/legal/terms',
    title: 'Terms of Service',
    description: 'The agreement between you and Vopria for using the platform.',
  },
  {
    href: '/legal/privacy',
    title: 'Privacy Policy',
    description: 'How we collect, use and protect your personal data.',
  },
  {
    href: '/legal/dpa',
    title: 'Data Processing Agreement',
    description: 'Our commitments to employer customers as data processor.',
  },
]

export default function LegalIndexPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Legal', path: '/legal' }]} baseUrl={APP_URL} />
      <h1 className="text-3xl font-bold text-fg">Legal</h1>
      <ul className="mt-6 space-y-4">
        {docs.map((doc) => (
          <li key={doc.href} className="rounded-lg border border-line bg-ink-raised p-5">
            <Link href={doc.href} className="text-base font-semibold text-fg-accent hover:text-fg">
              {doc.title}
            </Link>
            <p className="mt-1 text-sm text-fg-body">{doc.description}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
