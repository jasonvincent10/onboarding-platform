// lib/rate-limit.ts
// Task 4.4: simple in-memory rate limiter for API routes and server actions.
//
// NOTE: in-memory limits are per serverless instance on Vercel, so this is a
// speed bump rather than a hard guarantee. It is appropriate for MVP. When
// you have paying customers, swap the store for Upstash Redis (@upstash/ratelimit)
// without changing call sites.
//
// Usage in a route handler:
//   const limited = rateLimit("checkout:" + user.id, 10, 60_000);
//   if (!limited.allowed) {
//     return new Response("Too many requests", { status: 429 });
//   }

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map does not grow unbounded
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  sweep();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: maxRequests - 1, resetAt: fresh.resetAt };
  }

  bucket.count += 1;
  const allowed = bucket.count <= maxRequests;
  return {
    allowed,
    remaining: Math.max(0, maxRequests - bucket.count),
    resetAt: bucket.resetAt,
  };
}

// Helper to derive a client key from a Request (IP based, behind Vercel proxy)
export function clientKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || "unknown";
  return prefix + ":" + ip;
}
