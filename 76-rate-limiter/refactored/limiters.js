/**
 * Two rate limiters that never call Date.now() themselves.
 *
 * Both take a `now` function in their options. Production passes
 * `Date.now`; tests pass `() => clock` and move `clock` by hand. Injected
 * time is testable time — the same move as project 46's stopwatch, where
 * elapsed time became something you DERIVE from a clock rather than
 * something you accumulate from ticks.
 *
 * Neither class prints. `allow()` returns a boolean; the caller decides
 * whether that becomes a log line, an HTTP 429, or a metric.
 */

const validateNow = (now) => {
  if (typeof now !== 'function') {
    throw new TypeError(`now must be a function returning milliseconds, got ${typeof now}`);
  }
  return now;
};

const validatePositive = (value, label) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive number, got ${value}`);
  }
  return value;
};

/**
 * SLIDING WINDOW LOG — the direct fix for the original's boundary burst.
 *
 * Instead of one counter reset on a clock boundary, keep the TIMESTAMP of
 * every recent request. "How many in the last second?" is then asked
 * relative to *now*, not relative to a boundary the calendar chose:
 *
 *   fixed window : |....5....|....5....|   <- 10 allowed across the seam
 *   sliding      :      [ last 1000ms ]    <- the window follows you
 *
 * Cost: O(requests in the window) of memory per key. Exact, and honest
 * about it — see TokenBucket for the cheap approximation.
 */
export class SlidingWindowLimiter {
  #limit;
  #windowMs;
  #now;
  #hits = new Map(); // key -> array of timestamps, oldest first

  constructor({ limit, windowMs, now = Date.now } = {}) {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new RangeError(`limit must be a non-negative integer, got ${limit}`);
    }
    this.#limit = limit;
    this.#windowMs = validatePositive(windowMs, 'windowMs');
    this.#now = validateNow(now);
  }

  /** Drop timestamps that have fallen out the back of the window. */
  #recent(key) {
    const cutoff = this.#now() - this.#windowMs;
    const timestamps = (this.#hits.get(key) ?? []).filter((at) => at > cutoff);
    if (timestamps.length === 0) this.#hits.delete(key); // don't leak keys
    else this.#hits.set(key, timestamps);
    return timestamps;
  }

  /** Record a request if it fits. Returns whether it was permitted. */
  allow(key) {
    const timestamps = this.#recent(key);
    if (timestamps.length >= this.#limit) return false;
    timestamps.push(this.#now());
    this.#hits.set(key, timestamps);
    return true;
  }

  /** Requests counted against `key` right now. No side effects. */
  count(key) {
    return this.#recent(key).length;
  }

  /** How long until one more request would be allowed. 0 = right now. */
  retryAfterMs(key) {
    const timestamps = this.#recent(key);
    if (timestamps.length < this.#limit) return 0;
    const oldest = timestamps[timestamps.length - this.#limit];
    return oldest + this.#windowMs - this.#now();
  }

  /** Number of keys currently being tracked — for leak checks. */
  get trackedKeys() {
    return this.#hits.size;
  }
}

/**
 * TOKEN BUCKET — the limiter most APIs actually ship.
 *
 * A bucket holds up to `capacity` tokens and refills at a steady
 * `refillPerSecond`. Each request spends one. Idle time buys you tokens,
 * so a client can burst up to `capacity` after a quiet spell, but the
 * long-run average can never exceed the refill rate.
 *
 * The trick is that nothing runs on a timer: tokens are computed lazily
 * from "how long since I last looked?" — the same derive-don't-accumulate
 * idea as project 46. Memory is O(1) per key, not O(requests).
 */
export class TokenBucket {
  #capacity;
  #refillPerMs;
  #now;
  #buckets = new Map(); // key -> { tokens, updatedAt }

  constructor({ capacity, refillPerSecond, now = Date.now } = {}) {
    this.#capacity = validatePositive(capacity, 'capacity');
    this.#refillPerMs = validatePositive(refillPerSecond, 'refillPerSecond') / 1000;
    this.#now = validateNow(now);
  }

  /** Bring a bucket up to date with the clock, creating it if needed. */
  #refill(key) {
    const at = this.#now();
    const bucket = this.#buckets.get(key) ?? { tokens: this.#capacity, updatedAt: at };
    const earned = (at - bucket.updatedAt) * this.#refillPerMs;
    bucket.tokens = Math.min(this.#capacity, bucket.tokens + earned);
    bucket.updatedAt = at;
    this.#buckets.set(key, bucket);
    return bucket;
  }

  /** Spend `cost` tokens if they are available. */
  allow(key, cost = 1) {
    validatePositive(cost, 'cost');
    const bucket = this.#refill(key);
    if (bucket.tokens < cost) return false;
    bucket.tokens -= cost;
    return true;
  }

  /** Tokens available to `key` right now (fractional). No side effects on the answer. */
  tokens(key) {
    return this.#refill(key).tokens;
  }

  /** How long until `cost` tokens are available. 0 = right now. */
  retryAfterMs(key, cost = 1) {
    const bucket = this.#refill(key);
    if (bucket.tokens >= cost) return 0;
    return (cost - bucket.tokens) / this.#refillPerMs;
  }
}
