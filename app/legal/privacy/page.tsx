// app/legal/privacy/page.tsx
// Task 4.3: DRAFT privacy policy. A solicitor MUST review before launch.
// Replace [PLACEHOLDERS] before publishing.

export const metadata = {
  title: "Privacy Policy - Vopria",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-xl font-semibold text-fg">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-6 text-fg-body">{children}</p>;
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-fg">Privacy Policy</h1>
      <P>Last updated: 25 August 2026. This is a draft pending legal review.</P>

      <H2>1. Who we are</H2>
      <P>
        Vopria (Vopria Ltd, registered at [ADDRESS]) provides an employee
        onboarding platform for UK employers and their new starters.
        Contact: jason@vopria.com.
      </P>

      <H2>2. Controller and processor roles</H2>
      <P>
        For employee onboarding data collected on behalf of an employer (such as
        your P45, bank details, National Insurance number and right to work
        documents submitted for a specific onboarding), the employer is the data
        controller and Vopria acts as a data processor under a Data
        Processing Agreement.
      </P>
      <P>
        For your basic account details (login credentials, name, email) and for
        employer account data, Vopria is the data controller.
      </P>

      <H2>3. What we collect</H2>
      <P>
        Employees: name, email, date of birth, address, phone number, National
        Insurance number, bank details, emergency contacts, right to work
        status and documents, uploaded documents such as a P45, and policy
        acknowledgements. Employers: company name and number, contact details,
        and billing information (payment card details are handled by Stripe and
        never stored on our servers). We also keep audit logs of actions taken
        on the platform and technical data such as IP addresses.
      </P>

      <H2>4. Why we process it (lawful bases)</H2>
      <P>
        Performance of a contract: providing the onboarding service to
        employers and the account service to employees. Legal obligation:
        employers use the platform to meet right to work and payroll
        obligations. Consent: an employer only gains access to a data category
        with your explicit, granular, recorded consent, which you can withdraw
        at any time. Legitimate interests: service security, fraud prevention
        and product improvement.
      </P>

      <H2>5. How we protect it</H2>
      <P>
        Sensitive fields (National Insurance number and bank details) are
        encrypted at field level with AES-256 before storage, in addition to
        encryption at rest and in transit. Access is restricted by row-level
        security so employees can only access their own data and employers can
        only access onboardings they created, with your active consent for each
        data category. Every access and change is recorded in an audit trail.
      </P>

      <H2>6. Who we share it with</H2>
      <P>
        Employers you are onboarding with (only the categories you have
        consented to share); Supabase (database and file storage, EU region);
        Vercel (hosting); Resend (transactional email); Stripe (payments for
        employers); and Sentry (error monitoring). We do not sell personal
        data.
      </P>

      <H2>7. International transfers</H2>
      <P>
        Data is stored in the EU. Where a service provider processes data
        outside the UK or EEA, transfers are protected by the UK International
        Data Transfer Agreement or Addendum, or an adequacy decision.
      </P>

      <H2>8. How long we keep it</H2>
      <P>
        <strong>If you are not confirmed as a hire</strong> (your application is
        withdrawn or the employer indicates it is not proceeding), your
        uploaded documents and sensitive profile data (National Insurance
        number, bank details, address, date of birth, right to work status,
        emergency contacts) are automatically and permanently deleted 7 days
        later. This happens automatically — you do not need to request it.
      </P>
      <P>
        <strong>If you are confirmed as a hire</strong>, your data is not
        subject to the 7-day deletion above. Right to work evidence in
        particular must be retained by the employer for the duration of your
        employment plus 2 years afterwards, under UK Home Office rules — we
        keep this data available to the employer for that period. Employer
        access to any category continues only for as long as you have granted
        consent for it; withdrawing consent ends the employer&apos;s ability to
        view that data going forward, but does not itself trigger deletion,
        since the employer may have a separate statutory obligation to retain
        it in their own records.
      </P>
      <P>
        Employers are responsible for their own statutory retention
        obligations for records they have already exported. Audit logs
        (a record that an action took place, not the underlying personal
        data) are retained for compliance purposes even after the data they
        relate to has been deleted.
      </P>

      <H2>9. Your rights</H2>
      <P>
        Under UK GDPR you have the right of access (you can download a full
        copy of your data from your profile at any time), rectification,
        erasure, restriction, portability and objection, and the right to
        withdraw consent. To exercise any right, use the in-product tools or
        contact jason@vopria.com. You may complain to the ICO at ico.org.uk.
      </P>

      <H2>10. Cookies</H2>
      <P>
        We use only essential cookies required to keep you signed in securely
        (set by our authentication provider, Supabase). We do not use
        advertising or tracking cookies, and do not run third-party analytics
        that track you across other sites.
      </P>

      <H2>11. Changes</H2>
      <P>
        We will notify registered users of material changes to this policy by
        email and in-product notice.
      </P>
    </main>
  );
}
