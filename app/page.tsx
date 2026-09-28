import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Maturity } from '@/components/sections/Maturity'
import { Services } from '@/components/sections/Services'
import { Process } from '@/components/sections/Process'
import { Why } from '@/components/sections/Why'
import { Outcomes } from '@/components/sections/Outcomes'
import { Faq } from '@/components/sections/Faq'
import { FinalCta } from '@/components/sections/FinalCta'
import { bookingHref } from '@/lib/config'

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
      <Process />
      <Why />
      <Outcomes />
      <Faq />
      <FinalCta bookingUrl={bookingUrl} />
    </>
  )
}
