'use client'

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

/**
 * Fades and slides its children in when they scroll into view.
 *
 * Deliberately small: one IntersectionObserver per element, disconnected as
 * soon as it has fired once. The visual start state lives in CSS (.reveal in
 * globals.css), which is also where prefers-reduced-motion switches it off —
 * so a visitor who has asked for less motion gets the final state with no
 * observer work at all, and content is never hidden behind an animation.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  className = '',
  /** Stagger within a group, in milliseconds. */
  delay = 0,
}: {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // No observer support, or the visitor prefers reduced motion: show it now.
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      data-revealed={revealed ? 'true' : 'false'}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
