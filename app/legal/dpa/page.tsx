// app/legal/dpa/page.tsx
// Task 4.3: DRAFT Data Processing Agreement for employer customers.
// A solicitor MUST review before launch.

export const metadata = {
  title: "Data Processing Agreement - Vopria",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-xl font-semibold text-fg">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-6 text-fg-body">{children}</p>;
}

export default function DpaPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-fg">Data Processing Agreement</h1>
      <P>
        Last updated: 25 August 2026. Draft pending legal review. This DPA forms part
        of the Terms of Service between Vopria (the Processor) and the
        employer customer (the Controller) and applies to onboarding personal
        data processed on the Controller&apos;s behalf.
      </P>

      <H2>1. Subject matter and duration</H2>
      <P>
        Processing of new starter onboarding data (identity, contact, National
        Insurance number, bank details, emergency contacts, right to work
        documents, P45 and policy acknowledgements) for the duration of the
        Controller&apos;s use of the service, for the purpose of running
        employee onboarding.
      </P>

      <H2>2. Processor obligations</H2>
      <P>
        The Processor shall: process personal data only on the
        Controller&apos;s documented instructions as expressed through use of
        the platform; ensure persons authorised to process the data are bound
        by confidentiality; implement the technical and organisational
        measures in Annex 1; assist the Controller with data subject requests
        and with obligations under UK GDPR Articles 32 to 36; notify the
        Controller without undue delay after becoming aware of a personal data
        breach; and at the end of the relationship delete or return the
        personal data as described in the Privacy Policy. Where an applicant
        is not confirmed as a hire, the Processor deletes the relevant
        personal data automatically 7 days after the Controller records that
        outcome, independent of any other instruction from the Controller.
      </P>

      <H2>3. Sub-processors</H2>
      <P>
        The Controller authorises the following sub-processors: Supabase
        (database and storage, EU region), Vercel (hosting), Resend (email),
        Stripe (payments) and Sentry (error monitoring). The Processor will
        give notice of changes to sub-processors and the Controller may object
        on reasonable grounds.
      </P>

      <H2>4. International transfers</H2>
      <P>
        Personal data is stored in the EU. Any transfer outside the UK or EEA
        is protected by the UK International Data Transfer Agreement or
        Addendum, or an adequacy regulation.
      </P>

      <H2>5. Audit</H2>
      <P>
        The Processor will make available information reasonably necessary to
        demonstrate compliance with this DPA, including the in-product audit
        trail, and will allow audits by the Controller no more than once per
        year on 30 days notice at the Controller&apos;s cost.
      </P>

      <H2>Annex 1: Technical and organisational measures</H2>
      <P>
        AES-256 field-level encryption of National Insurance numbers and bank
        details; encryption in transit (TLS) and at rest; database row-level
        security restricting access by role, ownership and recorded consent;
        append-only consent and audit logs; role-restricted service
        credentials; security headers and rate limiting at the application
        layer; documents stored in a private bucket with per-user path
        isolation.
      </P>
    </main>
  );
}
