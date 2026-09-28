/**
 * Environment-derived configuration, read once and in one place.
 *
 * Only NEXT_PUBLIC_APP_URL is exposed to the browser. The rest are read in
 * Server Components / route handlers and passed down as props where needed,
 * so the Calendly link and inbox address never end up in the client bundle
 * unless they are rendered into markup.
 */

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Where enquiries land. The brief specifies jason@vopria.com; DOMAIN.md records
 * info@vopria.com as the general enquiries inbox, so this is overridable
 * without a code change.
 */
export const CONTACT_INBOX = process.env.CONTACT_INBOX || 'jason@vopria.com'

/**
 * Resend "from" address. Must be on the verified mail.vopria.com sending
 * domain — see DOMAIN.md. Any local part on that domain is fine.
 */
export const MAIL_FROM = process.env.RESEND_FROM_EMAIL || 'Vopria <website@mail.vopria.com>'

/**
 * Booking link. Placeholder until the real Calendly URL is set in Vercel —
 * callers fall back to the contact page when this is unset.
 */
export const CALENDLY_URL = process.env.CALENDLY_URL || ''

/** Booking href with a graceful fallback to the contact form. */
export function bookingHref(): string {
  return CALENDLY_URL || '/contact'
}
