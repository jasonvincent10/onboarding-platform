// lib/security-headers.ts
// Task 4.4: security headers for next.config.
//
// Wire into next.config.ts (or .mjs):
//
//   import { securityHeaders } from "./lib/security-headers";
//   const nextConfig = {
//     async headers() {
//       return [{ source: "/(.*)", headers: securityHeaders }];
//     },
//   };
//
// The CSP allows Supabase (API + storage), Stripe (checkout redirect happens
// off-site so only connect/frame for js.stripe.com is needed if you later
// embed Stripe elements), and Vercel analytics. 'unsafe-inline' for styles is
// required by Tailwind's inlined critical styles and any raw <style> tags used
// for the media-query fallback pattern.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hhdapipznswdeqsxedmy.supabase.co";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: " + supabaseUrl,
  "font-src 'self' data:",
  "connect-src 'self' " + supabaseUrl + " wss://" + supabaseUrl.replace("https://", "") + " https://api.stripe.com https://*.sentry.io",
  "frame-src https://js.stripe.com https://checkout.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
