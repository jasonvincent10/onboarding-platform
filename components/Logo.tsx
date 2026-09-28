/**
 * Vopria wordmark.
 *
 * The mark is a vector rebuild of the icon already shipped in public/ (the
 * favicons and touch icon): two stacked rounded bars, the lower one shorter.
 * Redrawn here as SVG so it stays crisp at any size and can take brand colour
 * from the palette rather than being baked into a PNG.
 *
 * Placeholder status: this matches the existing icon set, but if a designed
 * logo file arrives, swap the <svg> below for it and nothing else changes.
 */

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* Flat accent purple rather than a gradient: it matches the favicons and
          touch icon already shipped in public/, and avoids an SVG <defs> id,
          which would be duplicated in the DOM wherever the logo appears twice
          (header and footer) and is invalid HTML. */}
      <rect width="40" height="40" rx="11" fill="#8B5CF6" />
      <rect x="11.5" y="11" width="17" height="9.5" rx="4.75" fill="#fff" />
      <rect x="11.5" y="23" width="11" height="6" rx="3" fill="#fff" fillOpacity="0.92" />
    </svg>
  )
}

export function Logo({
  className = '',
  /** Renders the wordmark in white, for use on the dark gradient footer/CTA. */
  inverted = false,
}: {
  className?: string
  inverted?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span
        className={`text-xl font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-ink'}`}
      >
        Vopria
      </span>
    </span>
  )
}
