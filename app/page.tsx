import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Maturity } from '@/components/sections/Maturity'
import { Competitive } from '@/components/sections/Competitive'
import { Services } from '@/components/sections/Services'
import { Method } from '@/components/sections/Method'
import { Deliverables } from '@/components/sections/Deliverables'
import { Security } from '@/components/sections/Security'
import { Why } from '@/components/sections/Why'
import { Journey } from '@/components/sections/Journey'
import { Outcomes } from '@/components/sections/Outcomes'
import { Faq } from '@/components/sections/Faq'
import { FinalCta } from '@/components/sections/FinalCta'
import { bookingHref } from '@/lib/config'

/**
 * Section order is the argument the page makes, in order:
 * the problem → where you are → why it matters → how we help → how we do it
 * → what you receive → doing it safely → why us → what it feels like →
 * what it looks like in practice → questions → ask.
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
      <Deliverables bookingUrl={bookingUrl} />
      <Security bookingUrl={bookingUrl} />
      <Why />
      <Journey bookingUrl={bookingUrl} />
      <Outcomes />
      <Faq />
      <FinalCta bookingUrl={bookingUrl} />
    </>
  )
}
