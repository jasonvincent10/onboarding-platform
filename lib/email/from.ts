// Single source of truth for the Resend "from" address. Every call site
// that sends email should import this rather than hardcode a from address --
// three of them previously hardcoded 'onboarding@resend.dev' (Resend's
// shared test domain) with a "replace before launch" comment that never
// got actioned, which was silently undermining the verified mail.vopria.com
// domain setup.
export const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL ?? 'Vopria <onboarding@mail.vopria.com>';
