'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'

/**
 * Fades and lifts its children in when they scroll into view, once.
 *
 * Every reveal on the site goes through here, so they all share one pace.
 * The timings live in globals.css as --motion-* custom properties; this
 * component only says WHEN to play and WHICH position an item holds in its
 * group. Reduced motion skips the observer entirely and shows the final
 * state, so content is never hidden behind an animation.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  className = '',
  /**
   * Position in a staggered group: 0 plays first, 1 one stagger later, and so
   * on. The gap itself is --motion-stagger, so it is the same everywhere.
   * Wide screens only; on narrow screens items stack and arrive one at a
   * time, where a delay would only read as lag.
   */
  step = 0,
}: {
  children: ReactNode
  as?: ElementType
  className?: string
  step?: number
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
      // Fires once the element's top clears the bottom 30% of the screen, so
      // the motion plays where the reader is looking rather than at the very
      // edge. A position, not a visible-fraction threshold, so an element
      // taller than the screen can never get stuck waiting to qualify.
      { threshold: 0, rootMargin: '0px 0px -30% 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      data-revealed={revealed ? 'true' : 'false'}
      style={step ? ({ '--reveal-step': step } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  )
}
