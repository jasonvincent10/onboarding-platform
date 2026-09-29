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
 * UK GDPR privacy notice.
 *
 * Written to describe what this codebase actually does — the contact form
 * posts to a server action which emails the enquiry via Resend; the site is
 * hosted on Vercel; no analytics or advertising cookies are set anywhere.
 * Everything stated below is true of the build as it stands.
 *
 * STILL TO CONFIRM before this is fully accurate (deliberately omitted rather
 * than guessed, since these are legal statements):
 *   - Whether Vopria is a registered company. If so, add the registered name,
 *     company number and registered address to the "Who we are" table — a
 *     limited company is required to show these.
 *   - ICO registration number, if registered.
 *   - Concrete retention periods, if you want to commit to specific ones
 *     rather than the qualitative wording used below.
 *   - Your email provider (Google Workspace / Microsoft 365 / other) in the
 *     processor list.
 *   - Your booking tool, once CALENDLY_URL is set.
 * This is a considered starting point, not legal advice — worth having
 * reviewed by someone qualified.
 */

const LAST_UPDATED = '28 September 2026'

export default function PrivacyPage() {
  return (
    <div className="bg-canvas px-5 py-16 sm:px-6 md:py-24">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Privacy notice
        </h1>
        <p className="mt-4 text-sm text-ink-muted">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 flex flex-col gap-10">
          <Section title="Who we are">
            <P>
              This notice explains how {site.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects and
              uses personal data, and what rights you have over it. We are the data controller for
              the information described below.
            </P>
            <Dl
              rows={[
                ['Contact for data protection', site.email],
                ['Where we operate', site.country],
              ]}
            />
            <P>
              If you would like our full registration details, please ask and we will provide them.
            </P>
          </Section>

          <Section title="What personal data we collect">
            <P>We collect only what we need in order to respond to you and to run our business.</P>
            <Ul
              items={[
                'Information you give us through our contact form: your name, work email address, company, role, company size, your answer on where your team is with AI, and the content of your message.',
                'Information you give us by email, telephone or during a call, including anything you choose to tell us about your organisation and how it works.',
                'If you engage us, the business contact details and project information needed to deliver the work, as set out in our engagement contract.',
                'Basic technical information logged automatically by our hosting provider when you visit, such as IP address and request details, used to keep the site secure and available.',
              ]}
            />
            <P>
              We do not ask for special category data, and we ask that you do not send it to us
              through the contact form.
            </P>
          </Section>

          <Section title="How and why we use it">
            <P>Under UK GDPR we must have a lawful basis for using your personal data. Ours are:</P>
            <Dl
              rows={[
                [
                  'Responding to your enquiry',
                  'Consent. We ask you to confirm on the form before we use your details to reply, and you can withdraw that at any time.',
                ],
                [
                  'Delivering work you have engaged us for',
                  'Performance of a contract with you or your organisation.',
                ],
                [
                  'Keeping our site secure and working',
                  'Legitimate interests. We need to protect our systems and diagnose faults.',
                ],
                [
                  'Meeting our legal and accounting obligations',
                  'Legal obligation, for example retaining records required by HMRC.',
                ],
              ]}
            />
            <P>
              We do not use your details for marketing unrelated to your enquiry, and we do not
              sell or share them for anyone else&rsquo;s marketing.
            </P>
          </Section>

          <Section title="Who we share it with">
            <P>
              We use a small number of service providers who process data on our behalf, under
              contract and only on our instructions:
            </P>
            <Ul
              items={[
                'Resend delivers the email generated by our contact form, so your submission passes through their systems in order to reach our inbox.',
                'Vercel hosts this website and processes server request logs.',
                'Our email provider hosts the inbox your enquiry arrives in.',
                'Our scheduling provider, if you book a call with us, processes the details you enter.',
              ]}
            />
            <P>
              We may also disclose information where we are required to by law. Some of these
              providers may process data outside the UK; where they do, we rely on appropriate
              safeguards such as UK adequacy regulations or the UK International Data Transfer
              Agreement.
            </P>
          </Section>

          <Section title="How long we keep it">
            <P>
              We keep personal data only for as long as we actually need it. Enquiries that do not
              lead to work are kept while there is a realistic prospect of following them up and
              are then deleted. Client records are kept for the duration of the engagement and
              afterwards for as long as our contractual, tax and accounting obligations require.
              Server and security logs are retained by our hosting provider for a short period. If
              you would like your details removed sooner, ask us and we will do it.
            </P>
          </Section>

          <Section title="Cookies and analytics">
            <P>
              This website sets no advertising or tracking cookies and uses no third-party
              analytics. There is nothing here that follows you around the web, which is why you
              have not been asked to accept any cookies. If that ever changes we will update this
              notice and ask for your consent before setting any non-essential cookie.
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
              To exercise any of these, email <MailLink />. We will respond within one month, and
              you do not have to pay a fee.
            </P>
          </Section>

          <Section title="Complaints">
            <P>
              If you are unhappy with how we have handled your personal data, please tell us first
              at <MailLink /> so we can put it right. You also have the right to complain to the
              Information Commissioner&rsquo;s Office at{' '}
              <a
                href="https://ico.org.uk/make-a-complaint/"
                className="rounded font-semibold text-accent underline underline-offset-2 hover:text-accent-hover"
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
            className="rounded text-sm font-semibold text-accent underline underline-offset-4 hover:text-accent-hover"
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
      className="rounded font-semibold text-accent underline underline-offset-2 hover:text-accent-hover"
    >
      {site.email}
    </a>
  )
}
