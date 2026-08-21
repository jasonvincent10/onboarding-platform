import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit, clientKey } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request for a fresh key', () => {
    const result = rateLimit('rl-basic-allow', 3, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('allows up to maxRequests and denies the next one', () => {
    const key = 'rl-exhausts-limit'
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true)
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true)
    const third = rateLimit(key, 2, 60_000)
    expect(third.allowed).toBe(false)
    expect(third.remaining).toBe(0)
  })

  it('tracks separate keys independently', () => {
    const a = rateLimit('rl-independent-a', 1, 60_000)
    const b = rateLimit('rl-independent-b', 1, 60_000)
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
    // Second call against 'a' should now be denied, but 'b' is untouched by it
    expect(rateLimit('rl-independent-a', 1, 60_000).allowed).toBe(false)
  })

  it('resets the bucket once the window has fully elapsed', () => {
    const key = 'rl-window-reset'
    expect(rateLimit(key, 1, 60_000).allowed).toBe(true)
    expect(rateLimit(key, 1, 60_000).allowed).toBe(false)

    vi.advanceTimersByTime(60_001)

    expect(rateLimit(key, 1, 60_000).allowed).toBe(true)
  })

  it('does not reset early — one millisecond before the window ends still counts against the limit', () => {
    const key = 'rl-window-not-yet'
    expect(rateLimit(key, 1, 60_000).allowed).toBe(true)

    vi.advanceTimersByTime(59_999)

    expect(rateLimit(key, 1, 60_000).allowed).toBe(false)
  })
})

describe('clientKey', () => {
  it('extracts the first IP from a comma-separated x-forwarded-for header', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    })
    expect(clientKey(request, 'checkout')).toBe('checkout:203.0.113.5')
  })

  it('trims whitespace around the IP', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '  203.0.113.5  , 10.0.0.1' },
    })
    expect(clientKey(request, 'checkout')).toBe('checkout:203.0.113.5')
  })

  it('falls back to "unknown" when the header is missing', () => {
    const request = new Request('https://example.com')
    expect(clientKey(request, 'checkout')).toBe('checkout:unknown')
  })
})
