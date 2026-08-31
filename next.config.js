/** @type {import('next').NextConfig} */

const { withSentryConfig } = require('@sentry/nextjs')

const isDev = process.env.NODE_ENV === 'development'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hhdapipznswdeqsxedmy.supabase.co'

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : "") + " https://js.stripe.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: " + supabaseUrl,
  "font-src 'self' data:",
  "connect-src 'self' " + supabaseUrl + " wss://" + supabaseUrl.replace('https://', '') + " https://api.stripe.com https://*.sentry.io",
  "frame-src https://js.stripe.com https://checkout.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig = {
  typedRoutes: false,
  // Don't advertise the framework via the X-Powered-By response header.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

// Uploads production source maps to Sentry on build so error stack traces
// show real source, not minified bundles. Reads SENTRY_AUTH_TOKEN from the
// environment automatically -- must be set in Vercel for this to do
// anything there (a build without it just skips the upload silently).
module.exports = withSentryConfig(nextConfig, {
  org: 'onboarding-platform',
  project: 'onboarder',

  // Only print Sentry CLI output during CI builds, not local dev/build
  silent: !process.env.CI,

  // Upload a wider set of source files for more complete stack traces
  widenClientFileUpload: true,

  // Route browser-side error reports through our own domain so ad-blockers
  // that block sentry.io directly don't silently drop them
  tunnelRoute: '/monitoring',

  // Source maps are uploaded to Sentry but not publicly served from our
  // own domain -- don't want to leak them
  hideSourceMaps: true,
})