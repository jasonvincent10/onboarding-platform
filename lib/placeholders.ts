/**
 * Placeholder handling for copy that is not written yet.
 *
 * Unfinished copy in content/site.ts is marked with [BRACKETED CAPITALS].
 * Rather than publishing those brackets, components ask `isPlaceholder()`
 * and simply omit the block — a missing founder note reads as a design
 * choice, whereas "[FOUNDER NAME]" reads as a broken site.
 *
 * This is self-healing: replace the placeholder text in content/site.ts with
 * real words and the block appears on the next build. Nothing else to change,
 * no flags to remember to flip.
 */

/** Matches a [BRACKETED CAPITALS] marker — at least two chars, no lowercase. */
const PLACEHOLDER_PATTERN = /\[[A-Z0-9][A-Z0-9 ,.'’/:—–-]{1,}\]/

/** True when `text` is missing or still contains an unfilled marker. */
export function isPlaceholder(text: string | undefined | null): boolean {
  if (!text) return true
  return PLACEHOLDER_PATTERN.test(text)
}

/** True when every one of `texts` is real copy. */
export function allComplete(...texts: (string | undefined | null)[]): boolean {
  return texts.every((text) => !isPlaceholder(text))
}

/**
 * Removes inline editorial markers such as [REVIEW] from copy that is
 * otherwise fit to publish, so a note-to-self never reaches a visitor.
 */
export function stripMarkers(text: string): string {
  return text.replace(/\s*\[(REVIEW|TODO|DRAFT|CHECK)\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
}
