import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/** Joins class names, dropping falsy entries. Saves pulling in clsx. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

const buttonSizes = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
} as const

const buttonVariants = {
  /** Solid brand purple — the single most important action on a screen. */
  primary: 'bg-primary text-white shadow-card hover:bg-primary-hover hover:shadow-lifted',
  /** Outlined — secondary actions sitting next to a primary. */
  secondary: 'border border-line-strong bg-canvas-raised text-ink hover:border-accent hover:bg-accent-veil',
  /** White on purple — for use inside the gradient CTA band and footer. */
  inverse: 'bg-white text-primary shadow-glow hover:bg-accent-veil',
  /** Outlined white — secondary action on a dark gradient. */
  inverseGhost: 'border border-white/40 text-white hover:border-white hover:bg-white/10',
} as const

type ButtonVariant = keyof typeof buttonVariants
type ButtonSize = keyof typeof buttonSizes

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} & Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'>) {
  const classes = cx(buttonBase, buttonSizes[size], buttonVariants[variant], className)

  // External booking links (Calendly) need a plain anchor, not the router.
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  )
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cx(buttonBase, buttonSizes[size], buttonVariants[variant])
}

/** Small uppercase label that opens most sections. */
export function Eyebrow({ children, inverted = false }: { children: ReactNode; inverted?: boolean }) {
  return (
    <p
      className={cx(
        'text-xs font-bold uppercase tracking-[0.14em]',
        inverted ? 'text-accent-mist' : 'text-primary-soft',
      )}
    >
      {children}
    </p>
  )
}

/**
 * Standard section shell: vertical rhythm, max width and the anchor id that
 * the header nav scrolls to. `tone` picks the background band.
 */
export function Section({
  id,
  children,
  className,
  tone = 'canvas',
  labelledBy,
}: {
  id?: string
  children: ReactNode
  className?: string
  tone?: 'canvas' | 'raised' | 'sunken'
  labelledBy?: string
}) {
  const tones = {
    canvas: 'bg-canvas',
    raised: 'bg-canvas-raised',
    sunken: 'bg-canvas-sunken',
  } as const

  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cx('scroll-mt-24 px-5 py-20 sm:px-6 md:py-28', tones[tone], className)}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  )
}

/** Section heading block — eyebrow, h2 and optional standfirst. */
export function SectionHeading({
  id,
  eyebrow,
  heading,
  intro,
  align = 'left',
  inverted = false,
}: {
  id?: string
  eyebrow?: string
  heading: string
  intro?: string
  align?: 'left' | 'centre'
  inverted?: boolean
}) {
  return (
    <div className={cx('flex flex-col gap-3', align === 'centre' && 'items-center text-center')}>
      {eyebrow ? <Eyebrow inverted={inverted}>{eyebrow}</Eyebrow> : null}
      <h2
        id={id}
        className={cx(
          'max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-[1.1]',
          inverted && 'text-white',
        )}
      >
        {heading}
      </h2>
      {intro ? (
        <p className={cx('max-w-prose text-lg', inverted ? 'text-accent-veil' : 'text-ink-soft')}>
          {intro}
        </p>
      ) : null}
    </div>
  )
}
