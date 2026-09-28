import { faq } from '@/content/site'
import { Section, SectionHeading } from '../ui'
import { Reveal } from '../Reveal'

/**
 * FAQ accordion built on native <details>/<summary>.
 *
 * Deliberately not a custom JS widget: the native element is keyboard
 * operable, announced correctly by screen readers, expandable with no
 * JavaScript, and findable by in-page browser search when closed in
 * modern browsers. The only custom part is the chevron.
 */
export function Faq() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        // Placeholder markers are stripped from structured data so search
        // engines never index an internal review note.
        text: item.answer.replace(/\s*\[REVIEW\]\s*/g, '').trim(),
      },
    })),
  }

  return (
    <Section id={faq.id} tone="raised" labelledBy="faq-heading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <SectionHeading id="faq-heading" eyebrow={faq.eyebrow} heading={faq.heading} />
        </Reveal>

        <div className="flex flex-col gap-3">
          {faq.items.map((item, index) => (
            <Reveal key={item.question} delay={index * 70}>
              <details className="group rounded-2xl border border-line bg-canvas transition hover:border-accent-mist open:border-accent-mist open:shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-6 py-5 text-base font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronIcon />
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="max-w-prose text-[0.95rem] leading-relaxed text-ink-muted">
                    {item.answer}
                  </p>
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

function ChevronIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-primary transition-transform duration-200 group-open:-rotate-180"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  )
}
