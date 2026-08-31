import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SlidingWindowLimiter, TokenBucket } from './limiters.js';

/** A clock you control. This is the whole reason the tests are instant. */
function fakeClock(start = 0) {
  let current = start;
  return {
    now: () => current,
    at(ms) {
      current = ms;
    },
    advance(ms) {
      current += ms;
    },
  };
}

test('sliding window: allows up to the limit, then blocks', () => {
  const clock = fakeClock();
  const limiter = new SlidingWindowLimiter({ limit: 3, windowMs: 1000, now: clock.now });
  assert.equal(limiter.allow('ada'), true);
  assert.equal(limiter.allow('ada'), true);
  assert.equal(limiter.allow('ada'), true);
  assert.equal(limiter.allow('ada'), false);
  assert.equal(limiter.count('ada'), 3);
});

test("THE BUG: the boundary burst the original waved through", () => {
  const clock = fakeClock();
  const limiter = new SlidingWindowLimiter({ limit: 5, windowMs: 1000, now: clock.now });

  clock.at(970); // just before the second boundary
  for (let i = 0; i < 5; i++) assert.equal(limiter.allow('grace'), true);

  clock.at(1010); // just after it — the original reset its counter here
  for (let i = 0; i < 5; i++) assert.equal(limiter.allow('grace'), false);

  assert.equal(limiter.count('grace'), 5); // 5 in the last second, not 10
});

test('sliding window: the window slides, it does not reset', () => {
  const clock = fakeClock();
  const limiter = new SlidingWindowLimiter({ limit: 2, windowMs: 1000, now: clock.now });
  clock.at(100);
  limiter.allow('ada');
  clock.at(600);
  limiter.allow('ada');
  clock.at(900);
  assert.equal(limiter.allow('ada'), false); // both still inside the window

  clock.at(1100); // the t=100 request has aged out; the t=600 one has not
  assert.equal(limiter.count('ada'), 1);
  assert.equal(limiter.allow('ada'), true);
  assert.equal(limiter.allow('ada'), false);
});

test('sliding window: a request expires exactly windowMs later', () => {
  const clock = fakeClock();
  const limiter = new SlidingWindowLimiter({ limit: 1, windowMs: 1000, now: clock.now });
  clock.at(500);
  assert.equal(limiter.allow('ada'), true);
  clock.at(1499);
  assert.equal(limiter.allow('ada'), false); // 999ms later: still counted
  clock.at(1500);
  assert.equal(limiter.allow('ada'), true); // 1000ms later: expired
});

test('sliding window: retryAfterMs says exactly how long to wait', () => {
  const clock = fakeClock();
  const limiter = new SlidingWindowLimiter({ limit: 2, windowMs: 1000, now: clock.now });
  assert.equal(limiter.retryAfterMs('ada'), 0); // nothing recorded yet
  clock.at(200);
  limiter.allow('ada');
  clock.at(300);
  limiter.allow('ada');
  assert.equal(limiter.retryAfterMs('ada'), 900); // the t=200 hit clears at t=1200

  clock.at(1200);
  assert.equal(limiter.retryAfterMs('ada'), 0);
  assert.equal(limiter.allow('ada'), true);
});

test('sliding window: keys are counted independently', () => {
  const clock = fakeClock();
  const limiter = new SlidingWindowLimiter({ limit: 1, windowMs: 1000, now: clock.now });
  assert.equal(limiter.allow('ada'), true);
  assert.equal(limiter.allow('grace'), true); // a different user is unaffected
  assert.equal(limiter.allow('ada'), false);
  assert.equal(limiter.count('grace'), 1);
});

test('sliding window: expired keys are forgotten, not leaked', () => {
  const clock = fakeClock();
  const limiter = new SlidingWindowLimiter({ limit: 5, windowMs: 1000, now: clock.now });
  for (let i = 0; i < 50; i++) limiter.allow(`user${i}`);
  assert.equal(limiter.trackedKeys, 50);
  clock.advance(5000);
  for (let i = 0; i < 50; i++) limiter.count(`user${i}`); // asking is enough to clean
  assert.equal(limiter.trackedKeys, 0);
});

test('sliding window: a limit of 0 blocks everything', () => {
  const limiter = new SlidingWindowLimiter({ limit: 0, windowMs: 1000, now: () => 0 });
  assert.equal(limiter.allow('ada'), false);
  assert.equal(limiter.count('ada'), 0);
});

test('sliding window: nonsense configuration is rejected', () => {
  assert.throws(() => new SlidingWindowLimiter({ limit: -1, windowMs: 1000 }), RangeError);
  assert.throws(() => new SlidingWindowLimiter({ limit: 2.5, windowMs: 1000 }), RangeError);
  assert.throws(() => new SlidingWindowLimiter({ limit: 5, windowMs: 0 }), RangeError);
  assert.throws(() => new SlidingWindowLimiter({ limit: 5, windowMs: 1000, now: 12345 }), TypeError);
});

test('token bucket: a fresh bucket allows a full burst, then blocks', () => {
  const clock = fakeClock();
  const bucket = new TokenBucket({ capacity: 5, refillPerSecond: 2, now: clock.now });
  for (let i = 0; i < 5; i++) assert.equal(bucket.allow('ada'), true);
  assert.equal(bucket.allow('ada'), false);
  assert.equal(bucket.tokens('ada'), 0);
});

test('token bucket: idle time refills at exactly the stated rate', () => {
  const clock = fakeClock();
  const bucket = new TokenBucket({ capacity: 5, refillPerSecond: 2, now: clock.now });
  for (let i = 0; i < 5; i++) bucket.allow('ada');

  clock.advance(250); // half a token
  assert.equal(bucket.tokens('ada'), 0.5);
  assert.equal(bucket.allow('ada'), false); // fractional tokens do not round up

  clock.advance(250); // a whole token now
  assert.equal(bucket.tokens('ada'), 1);
  assert.equal(bucket.allow('ada'), true);
  assert.equal(bucket.allow('ada'), false);
});

test('token bucket: refill is capped at capacity, however long you idle', () => {
  const clock = fakeClock();
  const bucket = new TokenBucket({ capacity: 5, refillPerSecond: 2, now: clock.now });
  for (let i = 0; i < 5; i++) bucket.allow('ada');
  clock.advance(60 * 60 * 1000); // an hour
  assert.equal(bucket.tokens('ada'), 5); // not 7200
  for (let i = 0; i < 5; i++) assert.equal(bucket.allow('ada'), true);
  assert.equal(bucket.allow('ada'), false);
});

test('token bucket: the long-run average is the refill rate, not the capacity', () => {
  const clock = fakeClock();
  const bucket = new TokenBucket({ capacity: 5, refillPerSecond: 2, now: clock.now });
  let allowed = 0;
  for (let ms = 0; ms <= 10_000; ms += 100) {
    clock.at(ms);
    if (bucket.allow('ada')) allowed++;
  }
  // 5 free at the start + 2 per second for 10 seconds
  assert.equal(allowed, 25);
});

test('token bucket: expensive requests can cost more than one token', () => {
  const clock = fakeClock();
  const bucket = new TokenBucket({ capacity: 5, refillPerSecond: 1, now: clock.now });
  assert.equal(bucket.allow('ada', 3), true);
  assert.equal(bucket.tokens('ada'), 2);
  assert.equal(bucket.allow('ada', 3), false); // only 2 left
  assert.equal(bucket.tokens('ada'), 2); // a refused request spends nothing
  assert.equal(bucket.retryAfterMs('ada', 3), 1000);
  clock.advance(1000);
  assert.equal(bucket.allow('ada', 3), true);
});

test('token bucket: keys are independent and config is validated', () => {
  const bucket = new TokenBucket({ capacity: 1, refillPerSecond: 1, now: () => 0 });
  assert.equal(bucket.allow('ada'), true);
  assert.equal(bucket.allow('grace'), true);
  assert.equal(bucket.allow('ada'), false);

  assert.throws(() => new TokenBucket({ capacity: 0, refillPerSecond: 1 }), RangeError);
  assert.throws(() => new TokenBucket({ capacity: 5, refillPerSecond: -1 }), RangeError);
  assert.throws(() => new TokenBucket({ capacity: 5, refillPerSecond: 1, now: 'later' }), TypeError);
});
