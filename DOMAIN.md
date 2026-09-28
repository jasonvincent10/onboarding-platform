# Domain, email and deploy setup — vopria.com

Written immediately before the project code was wiped (tag `pre-wipe` holds the
full previous codebase). Everything below was hardcoded or configured somewhere
in the code that got deleted, so it is recorded here to avoid ever setting it up
again from scratch.

## Where the live setup actually lives

**None of the following is in this repo, and none of it was touched by the wipe:**

- **The domain itself** — `vopria.com` is attached to the Vercel project. Vercel
  builds from the GitHub remote `origin`
  (`https://github.com/jasonvincent10/onboarding-platform.git`). Keep that remote
  and repo intact: pointing Vercel at a different repo means re-attaching the
  domain and re-adding every environment variable.
- **DNS** — A/CNAME records for `vopria.com` at the registrar, plus the MX / TXT
  (SPF) / DKIM records for the `mail.vopria.com` sending subdomain.
- **Resend** — `mail.vopria.com` is a verified sending domain in the Resend
  account. Verification lives in Resend + DNS, not here.
- **Supabase** — the auth redirect / site URL allowlist (password reset, magic
  links, `/auth/callback`) is configured in the Supabase dashboard.
- **Stripe** — the webhook endpoint pointing at `/api/webhooks/stripe`.

## Email addresses

| Purpose | Address | Was defined in |
| --- | --- | --- |
| Transactional "from" (all platform email) | `Vopria <onboarding@mail.vopria.com>` | `lib/email/from.ts` (kept) |
| Enquiries inbox (contact form "to") | `info@vopria.com` | `app/api/contact/route.ts` (deleted) |
| Cold outreach "from" | `Vopria <hello@mail.vopria.com>` | `scripts/outreach/send.ts` (deleted) |
| Cold outreach reply-to / opt-out | `info@vopria.com` | `scripts/outreach/send.ts`, `lib/template.ts` (deleted) |
| Public site URL used in outreach footers | `https://vopria.com` | `scripts/outreach/lib/template.ts` (deleted) |

`lib/email/from.ts` is the single source of truth for the transactional from
address and is deliberately kept. It reads `RESEND_FROM_EMAIL` and falls back to
the literal `Vopria <onboarding@mail.vopria.com>`. Three call sites once
hardcoded `onboarding@resend.dev` (Resend's shared test domain), which silently
bypassed the verified domain — never reintroduce that.

## Site URL convention

Every URL-aware file reads the same env var with the same fallback:

```ts
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
```

Used by `app/layout.tsx` (`metadataBase`), `app/robots.ts` (sitemap URL),
`app/sitemap.ts` (every entry) — all kept. `NEXT_PUBLIC_APP_URL` is set to the
live origin in Vercel's environment variables; nothing hardcodes the production
domain, so the env var is what makes canonical URLs, OG tags and the sitemap
correct in production.

### robots.ts
Allows `/`, disallows `/dashboard`, `/onboardings`, `/settings`, `/templates`,
`/employee/`, `/join`, `/team-invite`, `/reset-password`, `/auth/`, `/api/`.
Points at `${APP_URL}/sitemap.xml`.

### sitemap.ts
Curated allowlist, not a crawl — the product is mostly private and
authenticated. Public routes: `/`, `/contact`, `/sign-up`, `/login`,
`/employee-login`, `/legal`, `/legal/terms`, `/legal/privacy`, `/legal/dpa`.

## Metadata and JSON-LD (app/layout.tsx — kept verbatim)

- `SITE_NAME` = `Vopria`
- `SITE_TITLE` = `Vopria — Employee Onboarding`
- `SITE_DESCRIPTION` = "Compliant, paperless employee onboarding for growing
  teams. Documents, eligibility checks, bank details — all in one place."
- Locale `en_GB`, theme colour `#0F1836`
- Icons: `/favicon.ico`, `/favicon-16x16.png`, `/favicon-32x32.png`,
  `/android-chrome-192x192.png`, `/android-chrome-512x512.png`, apple touch icon
  `/apple-touch-icon.png` (180x180); manifest `/site.webmanifest`
- OG + Twitter card image `/og-image.png` (1200x630), `summary_large_image`
- Two JSON-LD blocks: `Organization` (name, url `APP_URL`, logo
  `${APP_URL}/android-chrome-512x512.png`, email `info@vopria.com`) and
  `WebSite` (name, url `APP_URL`)

All brand assets in `public/` were kept.

## vercel.json (kept verbatim)

Framework `nextjs`, region `lhr1` (London).

Crons — both endpoints authenticate with `Bearer ${process.env.CRON_SECRET}`
and reject anything else:

| Path | Schedule |
| --- | --- |
| `/api/cron/reminders` | `0 8 * * *` (08:00 daily) |
| `/api/cron/check-overdue` | `0 7 * * *` (07:00 daily) |

**The route handlers behind both paths were deleted.** The cron entries remain
in `vercel.json`; recreate the handlers at those exact paths, or Vercel will hit
404s daily.

Headers on `/(.*)`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`.

## next.config.js (kept verbatim)

- Sentry via `withSentryConfig`: org `onboarding-platform`, project `onboarder`,
  `tunnelRoute: '/monitoring'` (browser error reports are proxied through our own
  domain so ad-blockers that block sentry.io don't drop them — this is why
  `/monitoring` must stay free for Sentry), `hideSourceMaps: true`,
  `widenClientFileUpload: true`, silent unless `CI`. Source map upload needs
  `SENTRY_AUTH_TOKEN` set in Vercel.
- Client DSN is in `instrumentation-client.ts` (kept).
- CSP is built from `NEXT_PUBLIC_SUPABASE_URL` (with a hardcoded project-ref
  fallback) and allows Stripe (`js.stripe.com`, `api.stripe.com`,
  `checkout.stripe.com`), Vercel analytics scripts and `*.sentry.io`.
  `frame-ancestors 'none'`, HSTS with preload.
- `poweredByHeader: false`; remote images allowed from `*.supabase.co`
  storage public objects.

## Environment variable names

From `.env.local` (kept, untouched — **values are not recorded here**):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
ENCRYPTION_KEY
CRON_SECRET
SENTRY_AUTH_TOKEN
```

`.env.sentry-build-plugin` (kept) holds the Sentry build token separately.
The same variables are set independently in the Vercel project — the wipe did
not touch them.

## Recovering the deleted code

```
git show pre-wipe:<path>      # read one file
git checkout pre-wipe -- <path>   # restore one file
git diff pre-wipe               # everything that changed
```

The `pre-wipe` tag is on `master`. The database schema history
(`Supabase/Migrations/001`–`013`) only exists in that tag — it is the only
record of the live Supabase schema.
