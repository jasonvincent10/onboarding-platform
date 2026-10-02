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
  /**
   * `quick` is the shorter reveal for small grouped items. Its delay is set as
   * a custom property, not an inline transition-delay, so it can be dropped on
   * narrow screens and read by decorations inside the card.
   */
  variant = 'default',
}: {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
  variant?: 'default' | 'quick'
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
      // The quick reveal waits until the card is properly on screen, a third
      // of it visible and clear of the bottom fifth, so its motion plays where
      // the reader is looking rather than at the very edge of the viewport.
      quick
        ? { threshold: 0.35, rootMargin: '0px 0px -20% 0px' }
        : { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const quick = variant === 'quick'
  const style = !delay
    ? undefined
    : quick
      ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties)
      : { transitionDelay: `${delay}ms` }

  return (
    <Tag
      ref={ref}
      className={`reveal ${quick ? 'reveal-quick ' : ''}${className}`}
      data-revealed={revealed ? 'true' : 'false'}
      style={style}
    >
      {children}
    </Tag>
  )
}
