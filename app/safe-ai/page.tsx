import type { Metadata } from 'next'
import { Security } from '@/components/sections/Security'
import { FinalCta } from '@/components/sections/FinalCta'
import { pages } from '@/content/site'
import { bookingHref } from '@/lib/config'
import { pageMetadata } from '@/lib/seo'

const page = pages.safeAi

export const metadata: Metadata = pageMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
})

/**
 * Further reading, linked from the main menu. The section leads the page, so
 * it renders its own heading as the h1 rather than repeating a title above it.
 */
export default function SafeAiPage() {
  const bookingUrl = bookingHref()

  return (
    <>
      <Security bookingUrl={bookingUrl} headingLevel="h1" />
      <FinalCta bookingUrl={bookingUrl} />
    </>
  )
}
