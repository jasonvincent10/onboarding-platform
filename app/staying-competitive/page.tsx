import type { Metadata } from 'next'
import { Competitive } from '@/components/sections/Competitive'
import { FinalCta } from '@/components/sections/FinalCta'
import { pages } from '@/content/site'
import { bookingHref } from '@/lib/config'
import { pageMetadata } from '@/lib/seo'

const page = pages.stayingCompetitive

export const metadata: Metadata = pageMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
})

/**
 * Market positioning, moved off the home page. None of the other subpages
 * fitted it: what-you-get is deliverables, safe-ai is policy, and
 * working-with-us is the shape of an engagement. This is a different
 * argument, so it gets its own page.
 */
export default function StayingCompetitivePage() {
  const bookingUrl = bookingHref()

  return (
    <>
      <Competitive headingLevel="h1" />
      <FinalCta bookingUrl={bookingUrl} />
    </>
  )
}
