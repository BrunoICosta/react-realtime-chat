export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number }

export interface TokenBucketOptions {
  /** Maximum burst size. */
  capacity: number
  /** Tokens added back per second. */
  refillPerSecond: number
  now?: () => number
}

/**
 * Classic token bucket: allows short bursts up to `capacity`, then a steady
 * `refillPerSecond` rate. Cheap enough to keep one per socket per event family.
 */
export class TokenBucket {
  private tokens: number
  private updatedAt: number
  private readonly capacity: number
  private readonly refillPerMs: number
  private readonly now: () => number

  constructor({ capacity, refillPerSecond, now = Date.now }: TokenBucketOptions) {
    this.capacity = capacity
    this.refillPerMs = refillPerSecond / 1000
    this.now = now
    this.tokens = capacity
    this.updatedAt = now()
  }

  take(): RateLimitResult {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return { allowed: true }
    }
    const missing = 1 - this.tokens
    return { allowed: false, retryAfterMs: Math.ceil(missing / this.refillPerMs) }
  }

  private refill() {
    const now = this.now()
    const elapsed = now - this.updatedAt
    if (elapsed <= 0) return
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs)
    this.updatedAt = now
  }
}

export type RateLimitedAction = 'message' | 'typing' | 'room'

export type RateLimitPolicy = Record<RateLimitedAction, Omit<TokenBucketOptions, 'now'>>

export const DEFAULT_RATE_LIMITS: RateLimitPolicy = {
  // 5 messages in a burst, then one every 800ms.
  message: { capacity: 5, refillPerSecond: 1.25 },
  // Clients throttle typing events themselves; this only stops floods.
  typing: { capacity: 10, refillPerSecond: 2 },
  // Joining, leaving and creating rooms.
  room: { capacity: 10, refillPerSecond: 0.5 },
}

export function createSocketRateLimiter(
  policy: RateLimitPolicy = DEFAULT_RATE_LIMITS,
  now: () => number = Date.now,
) {
  const buckets = {
    message: new TokenBucket({ ...policy.message, now }),
    typing: new TokenBucket({ ...policy.typing, now }),
    room: new TokenBucket({ ...policy.room, now }),
  } satisfies Record<RateLimitedAction, TokenBucket>

  return (action: RateLimitedAction): RateLimitResult => buckets[action].take()
}

export type SocketRateLimiter = ReturnType<typeof createSocketRateLimiter>
