import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { APP_URL, bookingHref } from '@/lib/config'
import { site, why } from '@/content/site'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const SITE_TITLE = 'Vopria | AI consultancy for UK organisations'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: SITE_TITLE,
    // Page-level titles render as "Contact — Vopria".
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/android-chrome-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/android-chrome-512x512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: SITE_TITLE,
    description: site.description,
    siteName: site.name,
    locale: 'en_GB',
    type: 'website',
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: site.description,
  },
}

export const viewport: Viewport = {
  themeColor: '#17102D',
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${APP_URL}/#organization`,
  name: site.name,
  url: APP_URL,
  logo: `${APP_URL}/android-chrome-512x512.png`,
  image: `${APP_URL}/opengraph-image`,
  email: site.email,
  description: site.description,
  areaServed: { '@type': 'Country', name: site.country },
  // Pulled from the founder note so the name is stated once, in content.
  founder: { '@type': 'Person', name: why.founder.name, jobTitle: why.founder.role },
  knowsAbout: [
    'Artificial intelligence consultancy',
    'Business process discovery',
    'Workflow automation',
    'AI capability training',
    'Agentic AI systems',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Sales enquiries',
    email: site.email,
    areaServed: 'GB',
    availableLanguage: 'English',
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${APP_URL}/#website`,
  name: site.name,
  url: APP_URL,
  inLanguage: 'en-GB',
  publisher: { '@id': `${APP_URL}/#organization` },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-scroll-behavior="smooth" restores Next's scroll override for route
    // transitions — as of Next 16 it no longer does this automatically, and
    // without it our global `scroll-behavior: smooth` makes navigations crawl.
    <html lang="en-GB" className={jakarta.variable} data-scroll-behavior="smooth">
      <head>
        {/* With JS off the IntersectionObserver never runs, so reveal elements
            would stay at opacity 0. Show them immediately instead. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
      </head>
      <body className="bg-canvas font-sans text-ink-soft antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <Header bookingUrl={bookingHref()} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
