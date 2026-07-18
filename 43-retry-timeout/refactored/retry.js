/**
 * Two small async tools that compose:
 *
 *   withTimeout(promise, ms)  — give any promise a deadline
 *   retry(fn, options)        — re-run a flaky async fn with
 *                               exponential backoff
 *
 * Both are ~15 lines. Together: retry(() => withTimeout(call(), 2000))
 * is a production-grade "call this flaky thing" harness.
 */

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Promise.race: whichever settles first wins. If the timer wins, the
 * caller gets a TimeoutError instead of waiting forever. (The losing
 * operation isn't cancelled — JS can't force that — but nobody is
 * left waiting on it.)
 */
export class TimeoutError extends Error {
  constructor(ms) {
    super(`Timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout(promise, ms) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  return Promise.race([promise, deadline])
    .finally(() => clearTimeout(timer)); // don't leave timers running
}

/**
 * Retry with exponential backoff: wait base, 2x base, 4x base...
 * between attempts — give a struggling server ROOM, don't pile on.
 *
 * shouldRetry decides which errors are worth another attempt:
 * a 503 is temporary (retry), a 404 is a fact (don't).
 *
 * `sleep` is injectable so tests run instantly (project 06's rng
 * trick; project 28 used the test runner's fake clock — either works).
 */
export async function retry(fn, {
  attempts = 3,
  baseDelayMs = 100,
  shouldRetry = () => true,
  sleep = defaultSleep,
} = {}) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError(`attempts must be >= 1, got ${attempts}`);
  }

  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      const outOfAttempts = attempt >= attempts;
      if (outOfAttempts || !shouldRetry(err)) throw err;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}
