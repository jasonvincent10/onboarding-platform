import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Maturity } from '@/components/sections/Maturity'
import { Competitive } from '@/components/sections/Competitive'
import { Services } from '@/components/sections/Services'
import { Method } from '@/components/sections/Method'
import { Why } from '@/components/sections/Why'
import { FurtherReading } from '@/components/sections/FurtherReading'
import { FinalCta } from '@/components/sections/FinalCta'
import { bookingHref } from '@/lib/config'

/**
 * The home page carries the argument and nothing more: the problem, where you
 * are, why it matters, what we do, how we do it, why us, and the ask.
 *
 * The detail — deliverables, safe adoption, what an engagement looks like, and
 * the full FAQ — lives on its own pages, reached from the menu or from the
 * further-reading cards near the foot of this page.
 */
export default function HomePage() {
  // Resolved once on the server and threaded through, so CALENDLY_URL is read
  // in exactly one place and never reaches the client bundle as a variable.
  const bookingUrl = bookingHref()

  return (
    <>
      <Hero bookingUrl={bookingUrl} />
      <Problem />
      <Maturity />
      <Competitive />
      <Services bookingUrl={bookingUrl} />
      <Method />
      <Why />
      <FurtherReading />
      <FinalCta bookingUrl={bookingUrl} />
    </>
  )
}
