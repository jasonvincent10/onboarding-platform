import type { Metadata } from 'next'
import { Journey } from '@/components/sections/Journey'
import { Outcomes } from '@/components/sections/Outcomes'
import { FinalCta } from '@/components/sections/FinalCta'
import { pages, site } from '@/content/site'
import { bookingHref } from '@/lib/config'

const page = pages.workingWithUs

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
 * Further reading, linked from the main menu. The engagement shape leads as
 * the h1; the illustrative outcomes follow it as a second-level section.
 */
export default function WorkingWithUsPage() {
  const bookingUrl = bookingHref()

  return (
    <>
      <Journey bookingUrl={bookingUrl} headingLevel="h1" />
      <Outcomes />
      <FinalCta bookingUrl={bookingUrl} />
    </>
  )
}
