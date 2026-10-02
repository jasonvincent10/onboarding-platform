import type { Metadata } from 'next'
import { Method } from '@/components/sections/Method'
import { Journey } from '@/components/sections/Journey'
import { Outcomes } from '@/components/sections/Outcomes'
import { FinalCta } from '@/components/sections/FinalCta'
import { pages } from '@/content/site'
import { bookingHref } from '@/lib/config'
import { pageMetadata } from '@/lib/seo'

const page = pages.workingWithUs

export const metadata: Metadata = pageMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
})

/**
 * How we work, in two passes. The Discovery Method leads as the h1 because it
 * is the analytical core: what we actually do to your processes. The journey
 * below it answers a different question, what the engagement feels like
 * commercially, and the outcomes show the shape of the result.
 */
export default function WorkingWithUsPage() {
  const bookingUrl = bookingHref()

  return (
    <>
      <Method headingLevel="h1" />
      <Journey bookingUrl={bookingUrl} />
      <Outcomes />
      <FinalCta bookingUrl={bookingUrl} />
    </>
  )
}
