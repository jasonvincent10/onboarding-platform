import type { Metadata } from 'next'
import { Deliverables } from '@/components/sections/Deliverables'
import { FinalCta } from '@/components/sections/FinalCta'
import { pages, site } from '@/content/site'
import { bookingHref } from '@/lib/config'

const page = pages.whatYouGet

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
 * Further reading, linked from the main menu. The section leads the page, so
 * it renders its own heading as the h1 rather than repeating a title above it.
 */
export default function WhatYouGetPage() {
  const bookingUrl = bookingHref()

  return (
    <>
      <Deliverables bookingUrl={bookingUrl} headingLevel="h1" />
      <FinalCta bookingUrl={bookingUrl} />
    </>
  )
}
