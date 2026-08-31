import { SlidingWindowLimiter, TokenBucket } from './limiters.js';

// The demo drives a FAKE clock. No busy-waiting, no sleeping, and the
// output is identical every run — because time is an argument now.
let clock = 0;
const now = () => clock;
const at = (ms) => {
  clock = ms;
};

console.log('--- the boundary burst, replayed against a sliding window ---');
const sliding = new SlidingWindowLimiter({ limit: 5, windowMs: 1000, now });

at(970);
const before = [0, 1, 2, 3, 4].map(() => sliding.allow('grace'));
at(1010); // the exact seam where the original handed out 5 free requests
const after = [0, 1, 2, 3, 4].map(() => sliding.allow('grace'));

console.log(`  at t=970ms:  ${before.filter(Boolean).length}/5 allowed`);
console.log(`  at t=1010ms: ${after.filter(Boolean).length}/5 allowed (the original allowed 5)`);
console.log(`  retry after: ${sliding.retryAfterMs('grace')}ms`);

at(1971); // 1000ms after the first request finally expired
console.log(`  at t=1971ms: ${sliding.allow('grace')} — the window slid, not reset`);

console.log('--- keys are independent ---');
at(2000);
console.log(`  ada: ${sliding.allow('ada')}, count=${sliding.count('ada')}`);
console.log(`  grace still counted separately: ${sliding.count('grace')}`);

console.log('--- token bucket: burst, then throttle to the refill rate ---');
const bucket = new TokenBucket({ capacity: 5, refillPerSecond: 2, now });

at(0);
const burst = [0, 1, 2, 3, 4, 5].map(() => bucket.allow('ada'));
console.log(`  a fresh bucket allows a burst of ${burst.filter(Boolean).length}, then blocks`);
console.log(`  wait ${bucket.retryAfterMs('ada')}ms for the next one`);

at(500);
console.log(`  after 500ms (1 token earned): ${bucket.allow('ada')}`);
console.log(`  immediately again: ${bucket.allow('ada')}`);

at(10_000);
console.log(`  after 10s idle, tokens are capped at capacity: ${bucket.tokens('ada')}`);

// The whole file ran in microseconds and asked the clock for nothing.
console.log('\n(zero real time elapsed: every "wait" above was an assignment)');
