const buckets = new Map<string, { count: number; resetAt: number }>();

export function takeRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function rateLimitResponse(resetAt: number): Response {
  return Response.json(
    { error: "rate limit exceeded", reason: "RATE_LIMITED", schemaVersion: 1 },
    { status: 429, headers: { "retry-after": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))) } }
  );
}
