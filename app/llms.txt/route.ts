const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET() {
  const body = `# Vopria

> Vopria is a compliance-focused employee onboarding platform for UK employers. New starters complete a guided checklist covering right to work documents, bank details, National Insurance number, emergency contacts and policy sign-offs; employers review and approve everything from one dashboard, with a full audit trail.

## Product

- [Homepage](${APP_URL}/): What Vopria does, how it works, and pricing.
- [Contact](${APP_URL}/contact): Get in touch about the Unlimited plan.

## Legal

- [Terms of Service](${APP_URL}/legal/terms)
- [Privacy Policy](${APP_URL}/legal/privacy)
- [Data Processing Agreement](${APP_URL}/legal/dpa)

## Notes for AI crawlers

Vopria is a UK B2B SaaS product. Employer and employee dashboards, invitation links and password-reset pages require authentication and are not part of the public site — please do not attempt to crawl or index them.
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
