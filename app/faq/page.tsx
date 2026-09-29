import type { Metadata } from 'next'
import { Faq } from '@/components/sections/Faq'
import { FinalCta } from '@/components/sections/FinalCta'
import { pages } from '@/content/site'
import { bookingHref } from '@/lib/config'
import { pageMetadata } from '@/lib/seo'

const page = pages.faq

export const metadata: Metadata = pageMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
})

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
