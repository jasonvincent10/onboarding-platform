'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Logo } from './Logo'
import { buttonClasses, cx } from './ui'
import { cta, nav } from '@/content/site'

/**
 * Sticky site header.
 *
 * Client component because of the mobile menu. The booking URL is resolved on
 * the server and passed in, so CALENDLY_URL stays out of the client bundle as
 * a variable — only the resolved href is rendered.
 */
export function Header({ bookingUrl }: { bookingUrl: string }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Subtle border/shadow once the page has moved, so the header separates
  // from the hero without a hard edge at rest.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu on Escape, and return focus to the toggle.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Close when focus or a pointer leaves the open panel.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <header
      className={cx(
        'sticky top-0 z-50 w-full bg-canvas/85 backdrop-blur-md transition-shadow',
        scrolled ? 'border-b border-line shadow-[0_1px_20px_-6px_rgba(0,0,0,0.65)]' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-[var(--header-height)] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <Link
          href="/"
          className="rounded-lg"
          aria-label="Vopria, home"
          onClick={() => setOpen(false)}
        >
          <Logo />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:bg-accent-veil hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <a href={bookingUrl} className={buttonClasses('primary', 'md')} {...externalProps(bookingUrl)}>
            {cta.short}
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line text-ink transition hover:border-accent hover:bg-accent-veil md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <HamburgerIcon open={open} />
        </button>
      </div>

      {/* Mobile panel */}
      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!open}
        className="border-t border-line bg-canvas-raised md:hidden"
      >
        <nav aria-label="Primary" className="mx-auto w-full max-w-6xl px-5 py-4 sm:px-6">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-medium text-ink transition hover:bg-accent-veil hover:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={bookingUrl}
            onClick={() => setOpen(false)}
            className={cx(buttonClasses('primary', 'lg'), 'mt-3 w-full')}
            {...externalProps(bookingUrl)}
          >
            {cta.short}
          </a>
        </nav>
      </div>
    </header>
  )
}

/** Opens Calendly in a new tab; internal fallback links navigate normally. */
function externalProps(href: string) {
  return /^https?:\/\//.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {open ? (
        <>
          <path d="M5 5l10 10" />
          <path d="M15 5L5 15" />
        </>
      ) : (
        <>
          <path d="M3 6h14" />
          <path d="M3 10h14" />
          <path d="M3 14h14" />
        </>
      )}
    </svg>
  )
}
