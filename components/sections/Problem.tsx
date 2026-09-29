import { problem } from '@/content/site'
import { Section, SectionHeading } from '../ui'
import { Reveal } from '../Reveal'

export function Problem() {
  return (
    <Section id={problem.id} tone="raised" labelledBy="problem-heading">
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <Reveal>
            <SectionHeading
              id="problem-heading"
              eyebrow={problem.eyebrow}
              heading={problem.heading}
            />
          </Reveal>

          <Reveal delay={80}>
            <div className="flex max-w-prose flex-col gap-4 text-lg leading-relaxed text-ink-soft">
              {problem.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Reveal>
        </div>

        <ul className="flex flex-col gap-4 self-center">
          {problem.points.map((point, index) => (
            <Reveal as="li" key={point.title} delay={index * 90}>
              <div className="flex gap-4 rounded-2xl border border-line bg-canvas p-6 transition hover:border-accent-mist hover:shadow-card">
                <StalledIcon />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-bold text-ink">{point.title}</h3>
                  <p className="text-[0.95rem] leading-relaxed text-ink-muted">{point.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  )
}

/** Abstract "flatlined progress" glyph — a line that rises then stalls. */
function StalledIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      className="mt-0.5 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="36" height="36" rx="10" fill="#2C1D58" />
      <path
        d="M9 24l5-6 4 3"
        stroke="#C4B5FD"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 21h9"
        stroke="#A78BFA"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 3.5"
      />
    </svg>
  )
}
