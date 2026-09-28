/**
 * Minimal fixed-window rate limiter, in process memory.
 *
 * Scope and limits, stated plainly: this counts requests per serverless
 * instance, not globally. On Vercel a burst spread across cold starts can
 * exceed the nominal limit, and counters reset when an instance recycles.
 * That is an accepted trade-off for a contact form — it stops casual repeat
 * submissions and simple scripted floods without adding a Redis dependency
 * to an otherwise static marketing site. If this ever needs to be strict,
 * swap the Map for Upstash/Vercel KV behind the same function signature.
 */

type Window = { count: number; resetAt: number }

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_PER_WINDOW = 5

const hits = new Map<string, Window>()

/** Drops expired windows so the Map cannot grow without bound. */
function sweep(now: number) {
  if (hits.size < 500) return
  for (const [key, window] of hits) {
    if (window.resetAt <= now) hits.delete(key)
  }
}

export function checkRateLimit(key: string): {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
} {
  const now = Date.now()
  sweep(now)

  const existing = hits.get(key)

  if (!existing || existing.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_PER_WINDOW - 1, retryAfterSeconds: 0 }
  }

  if (existing.count >= MAX_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: MAX_PER_WINDOW - existing.count,
    retryAfterSeconds: 0,
  }
}

/**
 * Best-effort client IP. Vercel sets x-forwarded-for; we take the first entry,
 * which is the original client. Falls back to a constant so a missing header
 * degrades to a shared bucket rather than to no limiting at all.
 */
export function clientKeyFrom(headerList: Headers): string {
  const forwarded = headerList.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || headerList.get('x-real-ip')?.trim()
  return ip || 'unknown-client'
}
