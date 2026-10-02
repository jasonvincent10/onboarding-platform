import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Maturity } from '@/components/sections/Maturity'
import { Services } from '@/components/sections/Services'
import { Why } from '@/components/sections/Why'
import { FinalCta } from '@/components/sections/FinalCta'
import { bookingHref } from '@/lib/config'

/**
 * The home page carries the argument and nothing more: the problem, where you
 * are, what we do, why us, and the ask.
 *
 * The detail lives on its own pages, reached from the menu. The Discovery
 * Method moved to /working-with-us and staying competitive to its own page;
 * the Services section keeps a single line pointing at the former.
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
      <Services bookingUrl={bookingUrl} />
      <Why />
      <FinalCta bookingUrl={bookingUrl} />
    </>
  )
}
