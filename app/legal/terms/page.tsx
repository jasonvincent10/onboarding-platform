// app/legal/terms/page.tsx
// Task 4.3: DRAFT terms of service. A solicitor MUST review before launch.

export const metadata = {
  title: "Terms of Service - Vopria",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-xl font-semibold text-fg">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-6 text-fg-body">{children}</p>;
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-fg">Terms of Service</h1>
      <P>Last updated: 25 August 2026. This is a draft pending legal review.</P>

      <H2>1. The service</H2>
      <P>
        Vopria provides software for UK employers to collect onboarding
        information and documents from new starters, and for employees to
        track and complete their onboarding checklist. These terms govern use
        of the platform by both employer and employee users.
      </P>

      <H2>2. Accounts</H2>
      <P>
        You must provide accurate information and keep your credentials secure.
        Employer accounts confirm they are authorised to act for the named
        company. Employee accounts belong to the individual, not any employer.
      </P>
      <P>
        [LAWYER INPUT NEEDED: eligibility/age wording. UK employment law
        permits 16–17 year olds to work in many roles and hold an NI number,
        so a blanket &quot;18+&quot; restriction may be inappropriate for an
        employee-onboarding product — but processing a minor&apos;s data has
        its own UK GDPR considerations (Article 8, parental consent contexts).
        Please advise the correct age/eligibility position for this specific
        service before this goes live.]
      </P>

      <H2>3. Employer responsibilities</H2>
      <P>
        Employers remain the data controller for onboarding data they collect
        and are responsible for their legal obligations as an employer,
        including right to work checks under the Immigration, Asylum and
        Nationality Act 2006. Vopria provides guidance and a structured
        workflow but does not perform right to work verification and does not
        provide a statutory excuse. Employers must review original documents or
        GOV.UK share codes in line with Home Office guidance.
      </P>

      <H2>4. Employee data and consent</H2>
      <P>
        Documents and profile data belong to the employee. Sharing profile data
        with an employer requires the employee&apos;s explicit consent per data
        category, which may be withdrawn at any time. Withdrawal does not
        affect data an employer has already lawfully exported for its own
        records. If an employer indicates an applicant is not proceeding, that
        applicant&apos;s documents and sensitive profile data are automatically
        deleted 7 days later — see the Privacy Policy for full detail. This
        does not apply once an applicant is confirmed as a hire, whose data is
        retained per the employer&apos;s statutory obligations.
      </P>

      <H2>5. Fees</H2>
      <P>
        Employers receive 3 free onboardings, after which each new onboarding
        requires a paid credit at the price shown at checkout, plus VAT where
        applicable. Payments are processed by Stripe. Credits are
        non-refundable once the corresponding onboarding has been initiated.
        Employee accounts are free. Employers with higher hiring volumes may
        instead agree a custom unlimited plan with us in writing, at a price
        and term agreed separately from the pay-per-hire pricing above.
      </P>

      <H2>6. Acceptable use</H2>
      <P>
        You must not misuse the platform, attempt to access data you are not
        authorised to see, upload unlawful content, or use the service to
        process data about anyone without a lawful basis. We may suspend
        accounts that breach these terms.
      </P>

      <H2>7. Availability and support</H2>
      <P>
        The service is provided on a reasonable-endeavours basis without an
        uptime guarantee during the early access period. Support is provided by
        email at jason@vopria.com.
      </P>

      <H2>8. Liability</H2>
      <P>
        Nothing in these terms limits liability for fraud or for death or
        personal injury caused by negligence. Subject to that, our total
        liability to an employer in any 12 month period is limited to the fees
        paid by that employer in that period, and we are not liable for
        indirect or consequential loss, including any civil penalty arising
        from an employer&apos;s right to work obligations.
      </P>

      <H2>9. Termination</H2>
      <P>
        Either party may close their account at any time. On employer account
        closure, access to employee documents ends. On employee account
        closure, the profile and documents are deleted in line with the
        Privacy Policy.
      </P>

      <H2>10. General</H2>
      <P>
        These terms are governed by the laws of England and Wales and subject
        to the exclusive jurisdiction of the courts of England and Wales. We
        may update these terms with notice to registered users.
      </P>
    </main>
  );
}
