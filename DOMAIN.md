# Domain, email and deploy setup — vopria.com

Written when the project was wiped back to an empty Next.js shell, then updated
when the shell was stripped to bare Next.js. The full previous codebase is at
the `pre-wipe` tag (on `master`, and pushed to GitHub).

Everything below was hardcoded or configured somewhere in the code that got
deleted. It is recorded here so none of it ever has to be worked out again.

## Where the live setup actually lives

**None of the following is in this repo, and none of it was touched:**

- **The domain** — `vopria.com` is attached to the Vercel project, which builds
  from the GitHub remote `origin`
  (`https://github.com/jasonvincent10/onboarding-platform.git`). Keep that remote
  and repo: pointing Vercel at a different repo means re-attaching the domain and
  re-adding every environment variable.
- **DNS** — A/CNAME records for `vopria.com` at the registrar, plus the
  MX / TXT (SPF) / DKIM records for the `mail.vopria.com` sending subdomain.
- **Resend** — `mail.vopria.com` is a verified sending domain in the Resend
  account. Verification lives in Resend + DNS, not here.
- **Supabase** — the old project, its data and its auth redirect allowlist still
  exist untouched in the Supabase dashboard.
- **Stripe** — the old webhook endpoint still points at `/api/webhooks/stripe`,
  which no longer exists in this codebase.
- **Vercel environment variables** — still hold the full original set of keys,
  including the ones removed from `.env.local` locally (see below).

## Email addresses

| Purpose | Address |
| --- | --- |
| Transactional "from" | `Vopria <onboarding@mail.vopria.com>` |
| Enquiries inbox | `info@vopria.com` |
| Cold outreach "from" | `Vopria <hello@mail.vopria.com>` |
| Cold outreach reply-to / opt-out | `info@vopria.com` |
| Public site URL used in outreach footers | `https://vopria.com` |

`RESEND_API_KEY` and `RESEND_FROM_EMAIL` are deliberately kept in `.env.local`
even though the `resend` npm package was removed — they are the domain setup,
not application code, and re-verifying a sending domain is the slow part.

Historical warning worth keeping: three call sites once hardcoded
`onboarding@resend.dev` (Resend's shared test domain), silently bypassing the
verified domain. If email sending returns, route it through one shared constant.

## Site URL convention

Every URL-aware file reads the same env var with the same fallback:

```ts
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
```

Used by `app/layout.tsx` (`metadataBase`), `app/robots.ts` and `app/sitemap.ts`.
`NEXT_PUBLIC_APP_URL` is set to the live origin in Vercel, so nothing hardcodes
the production domain — that env var is what makes canonical URLs, OG tags and
the sitemap correct in production.

`robots.ts` and `sitemap.ts` were reduced to the shell: robots allows `/` and
disallows `/api/`; the sitemap lists only `/`. Add entries as public pages
are built.

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
- JSON-LD: `Organization` (name, url, logo, email `info@vopria.com`) and `WebSite`

Brand assets in `public/` and the ink-navy palette in `tailwind.config.ts` /
`app/globals.css` were all kept.

## What was stripped, and what it was

If any of this comes back, these are the exact values — no need to rediscover them.

### Sentry (removed entirely)
Deleted `instrumentation.ts`, `instrumentation-client.ts`,
`sentry.server.config.ts`, `sentry.edge.config.ts`, the `withSentryConfig`
wrapper in `next.config.js`, the `@sentry/nextjs` dependency and
`.env.sentry-build-plugin`.

- org `onboarding-platform`, project `onboarder`
- `tunnelRoute: '/monitoring'` — browser reports proxied through our own domain
  so ad-blockers that block sentry.io don't drop them
- `hideSourceMaps: true`, `widenClientFileUpload: true`, silent unless `CI`
- source map upload needs `SENTRY_AUTH_TOKEN` (still set in Vercel)
- client DSN: `https://fa179eec6f3125783d3fdb1922b8b491@o4511688862990336.ingest.de.sentry.io/4511688874459216`

### Vercel crons (removed from vercel.json)
| Path | Schedule |
| --- | --- |
| `/api/cron/reminders` | `0 8 * * *` |
| `/api/cron/check-overdue` | `0 7 * * *` |

Both handlers authenticated with `Bearer ${process.env.CRON_SECRET}` and
rejected anything else.

### CSP (reset to a plain self-only default in next.config.js)
The original additionally allowed: the Supabase project URL (plus its `wss://`
origin) in `img-src`/`connect-src`, `https://js.stripe.com` and
`https://checkout.stripe.com` in `script-src`/`frame-src`/`form-action`,
`https://api.stripe.com` in `connect-src`, `https://va.vercel-scripts.com`,
and `https://*.sentry.io`. Images were allowed from `*.supabase.co` storage.
Region `lhr1` (London) and the security headers were kept as they were.

### Dependencies (removed)
`@sentry/nextjs`, `@supabase/ssr`, `@supabase/supabase-js`, `stripe`, `resend`,
`zod`, `clsx`, `lucide-react`, `vitest` (with `vitest.config.mts`), and `eslint` +
`eslint-config-next` (which was pinned to 14.2.15 against Next 16, and whose
`next lint` command Next 16 removed outright -- the `lint` script was broken, so
it went too). Add linting back with eslint 9 flat config when the new project
needs it.

### Environment variables (removed from .env.local, still set in Vercel)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`,
`SENTRY_AUTH_TOKEN`.

⚠️ **`ENCRYPTION_KEY` cannot be regenerated.** It is the AES-256 key for the
field-level encryption of NI numbers and bank details in the live Supabase
database. Lose it and those columns are permanently unreadable. A verbatim copy
of the original `.env.local` is kept at `.env.local.pre-wipe.bak`
(gitignored, local only — back it up somewhere safe), and the same values are
still in the Vercel project's environment variables.

## Recovering the deleted code

```
git show pre-wipe:<path>            # read one file
git checkout pre-wipe -- <path>     # restore one file
git diff pre-wipe                   # everything that changed
```

The `pre-wipe` tag is on `master` and is pushed to GitHub. The database schema
history (`Supabase/Migrations/001`–`013`) exists only in that tag — it is the
only record of the live Supabase schema.
