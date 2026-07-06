// app/legal/privacy/page.tsx
// Task 4.3: DRAFT privacy policy. A solicitor MUST review before launch.
// Replace [PLACEHOLDERS] before publishing.

export const metadata = {
  title: "Privacy Policy - Onboarder",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-xl font-semibold text-gray-900">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-6 text-gray-700">{children}</p>;
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <P>Last updated: [DATE]. This is a draft pending legal review.</P>

      <H2>1. Who we are</H2>
      <P>
        Onboarder ([LEGAL ENTITY NAME], company number [NUMBER], registered at
        [ADDRESS]) provides an employee onboarding platform for UK employers and
        their new starters. We are registered with the Information
        Commissioner&apos;s Office (ICO) under registration number [ICO NUMBER].
        Contact: [EMAIL].
      </P>

      <H2>2. Controller and processor roles</H2>
      <P>
        For employee onboarding data collected on behalf of an employer (such as
        your P45, bank details, National Insurance number and right to work
        documents submitted for a specific onboarding), the employer is the data
        controller and Onboarder acts as a data processor under a Data
        Processing Agreement.
      </P>
      <P>
        For your portable employee profile (the account and data you keep after
        an onboarding completes, which you may re-use with future employers),
        and for employer account data, Onboarder is the data controller.
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
        employers and the profile service to employees. Legal obligation:
        employers use the platform to meet right to work and payroll
        obligations. Consent: sharing data from your portable profile with a
        new employer only happens with your explicit, granular, recorded
        consent, which you can withdraw at any time. Legitimate interests:
        service security, fraud prevention and product improvement.
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
        Employer access to your onboarding documents is time-limited and ends
        after the onboarding relationship ends. Your portable profile persists
        under your control until you delete your account. Employers are
        responsible for their own statutory retention obligations for records
        they export. Audit logs are kept for [PERIOD] for security and
        compliance.
      </P>

      <H2>9. Your rights</H2>
      <P>
        Under UK GDPR you have the right of access (you can download a full
        copy of your data from your profile at any time), rectification,
        erasure, restriction, portability and objection, and the right to
        withdraw consent. To exercise any right, use the in-product tools or
        contact [EMAIL]. You may complain to the ICO at ico.org.uk.
      </P>

      <H2>10. Changes</H2>
      <P>
        We will notify registered users of material changes to this policy by
        email and in-product notice.
      </P>
    </main>
  );
}
