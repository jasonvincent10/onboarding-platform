import type { Metadata } from 'next'
import { Faq } from '@/components/sections/Faq'
import { FinalCta } from '@/components/sections/FinalCta'
import { pages, site } from '@/content/site'
import { bookingHref } from '@/lib/config'

const page = pages.faq

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: page.path },
  openGraph: {
    title: `${page.title} | ${site.name}`,
    description: page.description,
    url: page.path,
    type: 'website',
  },
}

/**
 * Further reading, linked from the main menu. The accordion leads the page, so
 * it renders its own heading as the h1 rather than repeating a title above it.
 *
 * The FAQPage JSON-LD lives inside the section, so it moves here with it and
 * is no longer emitted on the home page.
 */
export default function FaqPage() {
  return (
    <>
      <Faq headingLevel="h1" />
      <FinalCta bookingUrl={bookingHref()} />
    </>
  )
}
