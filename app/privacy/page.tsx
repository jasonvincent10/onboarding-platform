import type { Metadata } from 'next'
import Link from 'next/link'
import { site } from '@/content/site'

export const metadata: Metadata = {
  title: 'Privacy notice',
  description:
    'How Vopria collects, uses and protects personal data, your rights under UK GDPR, and how to contact us about them.',
  alternates: { canonical: '/privacy' },
  // A legal notice has no search value and changes without notice.
  robots: { index: false, follow: true },
}

/**
 * UK GDPR privacy notice template.
 *
 * Every [PLACEHOLDER] must be replaced with real company details before this
 * goes live — see the summary handed over with the build. This is a structured
 * starting point drafted to the ICO's expected sections, not legal advice;
 * have it reviewed before publishing.
 */

const LAST_UPDATED = '[DATE THIS NOTICE WAS LAST REVIEWED]'

export default function PrivacyPage() {
  return (
    <div className="bg-canvas px-5 py-16 sm:px-6 md:py-24">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Privacy notice
        </h1>
        <p className="mt-4 text-sm text-ink-muted">Last updated: {LAST_UPDATED}</p>

        <div className="mt-6 rounded-2xl border border-accent-mist bg-brand-gradient-soft px-5 py-4 text-sm leading-relaxed text-ink-soft">
          <strong className="font-bold text-ink">Before publishing:</strong> this notice is a
          template. Replace every <code className="font-mono text-primary">[PLACEHOLDER]</code> with
          your real company details and have it reviewed by someone qualified. It is a structured
          starting point, not legal advice.
        </div>

        <div className="mt-10 flex flex-col gap-10">
          <Section title="Who we are">
            <P>
              This notice explains how <strong>[REGISTERED COMPANY NAME]</strong>, trading as{' '}
              {site.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), collects and uses personal data. We
              are the data controller for the information described below.
            </P>
            <Dl
              rows={[
                ['Registered company name', '[REGISTERED COMPANY NAME]'],
                ['Company number', '[COMPANY NUMBER]'],
                ['Registered address', '[REGISTERED ADDRESS]'],
                ['ICO registration number', '[ICO REGISTRATION NUMBER, IF APPLICABLE]'],
                ['Contact for data protection', site.email],
              ]}
            />
          </Section>

          <Section title="What personal data we collect">
            <P>We collect only what we need in order to respond to you and to run our business.</P>
            <Ul
              items={[
                'Information you give us through our contact form: your name, work email address, company, role, company size, your answer on where your team is with AI, and the content of your message.',
                'Information you give us by email, telephone or during a call, including anything you choose to tell us about your organisation and its processes.',
                'If you engage us, the business contact details and project information needed to deliver the work, as set out in our engagement contract.',
                'Basic technical information collected automatically by our hosting provider, such as IP address and request logs, used to keep the site secure and available. [CONFIRM WHAT YOUR HOSTING PROVIDER RETAINS]',
              ]}
            />
            <P>
              We do not ask for special category data, and we ask that you do not send it to us
              through the contact form.
            </P>
          </Section>

          <Section title="How and why we use it">
            <P>
              Under UK GDPR we must have a lawful basis for using your personal data. Ours are:
            </P>
            <Dl
              rows={[
                [
                  'Responding to your enquiry',
                  'Legitimate interests — you contacted us and expect a reply. We also ask for your explicit consent on the form before we use your details to respond.',
                ],
                [
                  'Delivering work you have engaged us for',
                  'Performance of a contract with you or your organisation.',
                ],
                [
                  'Keeping our site secure and working',
                  'Legitimate interests — protecting our systems and diagnosing faults.',
                ],
                [
                  'Meeting our legal and accounting obligations',
                  'Legal obligation — for example retaining records required by HMRC.',
                ],
              ]}
            />
            <P>
              We do not use your details for marketing unrelated to your enquiry, and we do not sell
              or share them for anyone else&rsquo;s marketing.
            </P>
          </Section>

          <Section title="Who we share it with">
            <P>
              We use a small number of service providers who process data on our behalf, under
              contract and only on our instructions:
            </P>
            <Ul
              items={[
                'Resend — delivers the email generated by our contact form. Your submission passes through their systems in order to reach our inbox.',
                'Vercel — hosts this website and processes server request logs.',
                '[EMAIL PROVIDER, e.g. Google Workspace or Microsoft 365] — hosts the inbox your enquiry arrives in.',
                '[CALENDLY OR YOUR BOOKING TOOL] — if you book a call, that provider processes the details you enter.',
                '[ANY OTHER PROCESSOR: CRM, ACCOUNTING, ANALYTICS]',
              ]}
            />
            <P>
              We may also disclose information where we are required to by law. Some providers may
              process data outside the UK; where they do, we rely on the UK International Data
              Transfer Agreement, the UK Addendum to the EU Standard Contractual Clauses, or an
              adequacy decision. [CONFIRM THE TRANSFER MECHANISM FOR EACH PROVIDER]
            </P>
          </Section>

          <Section title="How long we keep it">
            <Ul
              items={[
                'Enquiries that do not lead to work: [E.G. 24 MONTHS] from our last contact, then deleted.',
                'Client records: for the duration of the engagement and [E.G. 6 YEARS] afterwards, to meet contractual and tax obligations.',
                'Server and security logs: [CONFIRM RETENTION WITH YOUR HOSTING PROVIDER].',
              ]}
            />
          </Section>

          <Section title="Cookies and analytics">
            <P>
              [CONFIRM AND EDIT THIS SECTION.] This website does not set advertising or tracking
              cookies, and does not use third-party analytics. If that changes, we will update this
              notice and add a cookie banner that asks for your consent before any non-essential
              cookie is set.
            </P>
          </Section>

          <Section title="How we protect your data">
            <P>
              The site is served over HTTPS, access to our inbox and systems is protected by strong
              authentication, and we limit access to personal data to those who need it to do the
              work. No system is perfectly secure, but we take these obligations seriously.
            </P>
          </Section>

          <Section title="Your rights">
            <P>Under UK GDPR you have the right to:</P>
            <Ul
              items={[
                'Ask for a copy of the personal data we hold about you.',
                'Ask us to correct data that is inaccurate or incomplete.',
                'Ask us to delete your data where there is no good reason for us to keep it.',
                'Object to, or ask us to restrict, our use of your data.',
                'Ask us to transfer your data to another organisation, where technically feasible.',
                'Withdraw consent at any time, where we relied on your consent.',
              ]}
            />
            <P>
              To exercise any of these, email <MailLink />. We will respond within one month. You do
              not have to pay a fee.
            </P>
          </Section>

          <Section title="Complaints">
            <P>
              If you are unhappy with how we have handled your personal data, please tell us first
              at <MailLink /> so we can put it right. You also have the right to complain to the
              Information Commissioner&rsquo;s Office at{' '}
              <a
                href="https://ico.org.uk/make-a-complaint/"
                className="rounded font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
                target="_blank"
                rel="noopener noreferrer"
              >
                ico.org.uk
              </a>
              , by calling 0303 123 1113, or by writing to Information Commissioner&rsquo;s Office,
              Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF.
            </P>
          </Section>

          <Section title="Changes to this notice">
            <P>
              We may update this notice from time to time. The date at the top shows when it was
              last reviewed.
            </P>
          </Section>
        </div>

        <div className="mt-12 border-t border-line pt-8">
          <Link
            href="/"
            className="rounded text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary-hover"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.975rem] leading-relaxed text-ink-soft">{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-[0.975rem] leading-relaxed text-ink-soft marker:text-accent">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function Dl({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-col gap-3 rounded-2xl border border-line bg-canvas-raised p-5">
      {rows.map(([term, value]) => (
        <div key={term} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
          <dt className="shrink-0 text-sm font-bold text-ink sm:w-56">{term}</dt>
          <dd className="text-[0.925rem] leading-relaxed text-ink-soft">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function MailLink() {
  return (
    <a
      href={`mailto:${site.email}`}
      className="rounded font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
    >
      {site.email}
    </a>
  )
}
