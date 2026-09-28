import Link from 'next/link'
import { Logo } from './Logo'
import { footer, nav, site } from '@/content/site'
import { isPlaceholder } from '@/lib/placeholders'

export function Footer() {
  const year = new Date().getFullYear()
  // Company registration details are a legal statement — better absent than
  // published as brackets. Fill footer.legalNote in content/site.ts and this
  // line returns on the next build.
  const showLegalNote = !isPlaceholder(footer.legalNote)

  return (
    <footer className="border-t border-line bg-canvas-sunken px-5 py-14 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex rounded-lg" aria-label="Vopria — home">
              <Logo />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">{footer.blurb}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink">Explore</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded text-sm text-ink-muted transition hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink">Contact</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                <li>
                  <Link
                    href="/contact"
                    className="rounded text-sm text-ink-muted transition hover:text-primary"
                  >
                    Book a discovery call
                  </Link>
                </li>
                <li>
                  <a
                    href={`mailto:${site.email}`}
                    className="rounded text-sm text-ink-muted transition hover:text-primary"
                  >
                    {site.email}
                  </a>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="rounded text-sm text-ink-muted transition hover:text-primary"
                  >
                    {footer.privacyLabel}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. All rights reserved.
          </p>
          {showLegalNote ? <p className="max-w-lg sm:text-right">{footer.legalNote}</p> : null}
        </div>
      </div>
    </footer>
  )
}
