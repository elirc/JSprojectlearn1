# 🏋️ Practice: Rate Limiter

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Exercise 3 adds methods **inside** the class (it needs `#hits`) — work on a **copy** of `refactored/limiters.js`. Exercises 1, 2, 4, 5 and 6 build on top of the limiters without changing them. Every exercise uses a fake clock; none of them should take measurable time to run.

A helper you'll want in every test:

```js
function fakeClock(start = 0) {
  let current = start;
  return { now: () => current, at(ms) { current = ms; }, advance(ms) { current += ms; } };
}
```

## Exercises

### ⭐ 1. Put the original's bug in a test (warm-up)

The original's boundary burst could only be *demonstrated* by busy-waiting. Prove that injection is what made it testable: write a small `FixedWindowLimiter` class that is a faithful port of `original.js`'s `allow` — `Math.floor(now() / 1000)`, reset the count when the second changes — except that it takes `now` as an option. Then assert, with a fake clock, that 5 requests at t=970 and 5 more at t=1010 are **all ten allowed**. Then run the identical sequence against `SlidingWindowLimiter` and assert the second five are all refused.

What it practices: the point of the whole project, in one file — the same bug, first unreachable and now pinned down by an assertion, with no change but where the clock comes from.

Hint: your port needs no `console.log` at all; `allow` returns a boolean, which is what makes it assertable.

### ⭐⭐ 2. consume() — a decision, not a boolean (core)

An HTTP handler needs more than yes/no: it needs `X-RateLimit-Remaining` and `Retry-After` headers. Write `consume(key)` returning `{ allowed, remaining, retryAfterMs }`. Careful with ordering — `retryAfterMs` must be computed *before* the request is recorded, or a refused request will report the wrong wait. Check offline with `limit: 2, windowMs: 1000`: at t=200 → `{ allowed: true, remaining: 1, retryAfterMs: 0 }`; at t=300 → `{ allowed: true, remaining: 0, retryAfterMs: 0 }`; immediately again → `{ allowed: false, remaining: 0, retryAfterMs: 900 }`; at t=1200 → allowed again.

What it practices: designing the return value around what the *caller* has to do, rather than around what the function happens to compute.

Hint: `remaining` is `limit - count(key)` after a successful `allow`, and `0` whenever the request was refused.

### ⭐⭐ 3. reset(), resetAll() and sweep() (core)

Three operations every production limiter grows. `reset(key)` forgets one key — support staff use it to unblock a customer — returning whether anything was there. `resetAll()` clears everything and returns how many keys it dropped. `sweep()` proactively discards keys whose windows are empty, returning the count reclaimed; without it, memory is only reclaimed for keys someone happens to ask about. Check offline: block `ada` at `limit: 2`, `reset('ada')` → `true`, and she's allowed again; `reset('nobody')` → `false`. Track 100 users, `sweep()` → `0` (nothing has expired), advance 5 seconds, `sweep()` → `100` and `trackedKeys` → `0`. Finally: a key that is still live must **survive** a sweep.

What it practices: distinguishing lazy cleanup (free, but only for keys you touch) from an explicit sweep (costs a full pass, reclaims everything) — and testing that the sweep doesn't take live data with it.

Hint: `#recent(key)` already deletes empty keys as a side effect. `sweep` is a loop that calls it for every key — iterate over a *copy* of the keys, since you're deleting while you go.

### ⭐⭐ 4. Chain two limiters: 3/second AND 5/minute (core)

Real APIs stack limits. Write `LimiterChain` that takes an array of limiters and allows a request only if **all** of them would. The trap: `allow()` has a side effect, so `limiters.every(l => l.allow(key))` is wrong — the first limiter records a request that the second then refuses, and its budget is silently burned. Check all of them without spending, then spend only if they all agree. `retryAfterMs` is the longest wait of any member. Check offline with 3/second + 5/minute: three succeed at t=0, the fourth fails with `retryAfterMs` 1000; at t=1000 two more succeed and then the *minute* limit bites with `retryAfterMs` 59000; at t=60000 it's allowed again.

What it practices: spotting that a query and a command are tangled in one method, and that "check all, then act" is the only safe order when the check has side effects.

Hint: `retryAfterMs(key) > 0` is your side-effect-free "would this be refused?" test.

### ⭐⭐⭐ 5. Give the token bucket a `retryAfterMs` you can trust (challenge)

`TokenBucket.retryAfterMs` claims that if you wait exactly that long, the request will succeed. Test that claim rather than trusting it: for capacity 1–5, refill rates 1/2/3 per second, and costs 1–3, drain the bucket, read `retryAfterMs`, advance the fake clock by **exactly** that amount, and assert `allow(key, cost)` returns `true`. Then advance by `retryAfterMs - 1` instead and assert it returns `false`. Skip the combinations where `cost > capacity` — and decide what the method *should* do there, since no amount of waiting will ever help.

What it practices: testing a promise instead of an implementation. The assertion is "the number this function returns is *correct advice*", which is the only thing a caller cares about.

Hint: floating-point refill means `advance(retryAfterMs)` can land a hair under the requirement. That's a real finding, not a nuisance — decide whether to round up inside `retryAfterMs` and document it.

### ⭐⭐⭐ 6. Property test: no window ever exceeds the limit (challenge)

The strongest possible statement about a sliding window limiter is not any single example — it's: *for every accepted request, the number of accepted requests in the `windowMs` starting at that moment is at most `limit`*. Write a test that runs 200 trials; each picks a random limit 1–5, fires 300 requests at random gaps of 0–120ms on a fake clock, records the timestamps of the accepted ones, and then checks that property over every window. Put the offending window in the failure message.

What it practices: **property-based testing** — asserting the invariant the component exists to guarantee, and letting randomness find the counterexample you'd never have written by hand (project 41's fuzz test, aimed at time instead of structure).

Hint: for each accepted timestamp `t`, count accepted timestamps in `[t, t + windowMs)`. The half-open interval matters and should match your `at > cutoff` rule exactly — if it doesn't, one of the two is wrong.

## Solutions

### 1. Put the original's bug in a test

```js
class FixedWindowLimiter {              // the original, clock injected
  #limit; #now; #counts = new Map(); #windows = new Map();
  constructor({ limit, now }) { this.#limit = limit; this.#now = now; }
  allow(key) {
    const second = Math.floor(this.#now() / 1000);
    if (this.#windows.get(key) !== second) {
      this.#windows.set(key, second);
      this.#counts.set(key, 0);          // the reset that causes the burst
    }
    const used = this.#counts.get(key);
    if (used < this.#limit) { this.#counts.set(key, used + 1); return true; }
    return false;
  }
}

test('the fixed window leaks a double burst at the seam', () => {
  const clock = fakeClock();
  const fixed = new FixedWindowLimiter({ limit: 5, now: clock.now });
  clock.at(970);
  assert.deepEqual([0,1,2,3,4].map(() => fixed.allow('grace')), [true,true,true,true,true]);
  clock.at(1010);
  assert.deepEqual([0,1,2,3,4].map(() => fixed.allow('grace')), [true,true,true,true,true]);
  // 10 allowed in 40ms, limit 5/second — and now it's a repeatable assertion
});
```

WHY: the algorithm is byte-for-byte the original's, and the bug reproduces perfectly — in microseconds, deterministically, with no CPU spinning and no dependence on when you happened to run it. The *only* change was `Math.floor(this.#now() / 1000)` instead of `Math.floor(Date.now() / 1000)`. That is the entire argument for dependency injection, and it's worth noticing what it implies: the original's bug wasn't hard to find because it was subtle, it was hard to find because the code was built so that no test could look. Keeping this class around is genuinely useful too — a documented wrong implementation makes the right one's tests meaningful by contrast. Verified by running.

### 2. consume()

```js
consume(key) {
  const retryAfterMs = this.retryAfterMs(key);   // BEFORE allow() mutates state
  const allowed = this.allow(key);
  return {
    allowed,
    remaining: allowed ? this.limit - this.count(key) : 0,
    retryAfterMs: allowed ? 0 : retryAfterMs,
  };
}
```

WHY: the ordering is the whole exercise. `allow` records a timestamp, which changes what `retryAfterMs` would answer, so computing the wait *after* the attempt gives the caller a number describing a world that no longer exists. Reading first and acting second is the general fix whenever a method both queries and mutates. The shape of the return value is the other half: `{ allowed, remaining, retryAfterMs }` maps one-to-one onto the HTTP response a caller has to build, which is what a well-designed return value does — it answers the caller's next question, not the implementer's last one. Verified by running: the refused request reports `900`, the exact wait until the t=200 hit ages out.

### 3. reset(), resetAll() and sweep()

```js
reset(key) {
  return this.#hits.delete(key);          // Map.delete already returns the boolean
}

resetAll() {
  const forgotten = this.#hits.size;
  this.#hits.clear();
  return forgotten;
}

sweep() {
  let dropped = 0;
  for (const key of [...this.#hits.keys()]) {   // copy: we delete while iterating
    if (this.#recent(key).length === 0) dropped++;
  }
  return dropped;
}
```

WHY: `sweep` is three lines because `#recent` already does the work — it filters the timestamps and deletes the key when nothing survives. That's the payoff for having put "what counts as recent?" in exactly one private method: a new public feature is a loop over an existing rule, not a second copy of it. The `[...keys()]` copy is the detail that bites people; mutating a `Map` while iterating it is undefined-behaviour territory in most languages and merely confusing in JavaScript. As for *why* you need `sweep` at all when `#recent` already cleans lazily: lazy cleanup only reclaims keys somebody asks about, so an API that saw a million one-time IP addresses yesterday still holds a million entries today. Run `sweep` on a timer and the memory comes back. Verified by running, including the case that matters most: a still-live key survives the sweep untouched.

### 4. LimiterChain

```js
export class LimiterChain {
  #limiters;
  constructor(limiters) {
    if (!Array.isArray(limiters) || limiters.length === 0) {
      throw new RangeError('A chain needs at least one limiter');
    }
    this.#limiters = limiters;
  }

  allow(key) {
    // Check ALL of them without spending anything...
    if (this.#limiters.some((limiter) => limiter.retryAfterMs(key) > 0)) return false;
    // ...only now commit to every one.
    for (const limiter of this.#limiters) limiter.allow(key);
    return true;
  }

  retryAfterMs(key) {
    return Math.max(...this.#limiters.map((limiter) => limiter.retryAfterMs(key)));
  }
}
```

WHY: `limiters.every(l => l.allow(key))` is the natural thing to write and it is wrong in a way that would take weeks to notice. `every` short-circuits, but not before the earlier limiters have already recorded the request — so a client refused by the per-minute limit still burns per-second budget, and their effective rate quietly sags below both stated limits. The fix is to make the check side-effect-free (`retryAfterMs(key) > 0`) and separate it from the commit, which is the same query/command split as exercise 2 at a larger scale. `Math.max` for the combined wait is the honest answer: the caller must satisfy the *strictest* limit, so promising the shorter one would just earn them another rejection. Verified by running: the per-second limit reports 1000ms, and after it clears the per-minute limit correctly reports 59000ms.

### 5. Trusting retryAfterMs

```js
test('retryAfterMs is advice you can act on', () => {
  for (const capacity of [1, 2, 3, 4, 5]) {
    for (const refillPerSecond of [1, 2, 3]) {
      for (const cost of [1, 2, 3]) {
        if (cost > capacity) continue;          // no wait ever suffices
        const clock = fakeClock();
        const bucket = new TokenBucket({ capacity, refillPerSecond, now: clock.now });
        while (bucket.allow('ada', cost)) { /* drain it */ }

        const wait = bucket.retryAfterMs('ada', cost);
        assert.ok(wait > 0);

        const early = fakeClock();
        const other = new TokenBucket({ capacity, refillPerSecond, now: early.now });
        while (other.allow('ada', cost)) { /* drain */ }
        early.advance(other.retryAfterMs('ada', cost) - 1);
        assert.equal(other.allow('ada', cost), false, 'a millisecond early must fail');

        clock.advance(wait);
        assert.equal(bucket.allow('ada', cost), true, `waiting ${wait}ms should suffice`);
      }
    }
  }
});
```

WHY: this tests the *contract* — "wait this long and you'll get through" — rather than the arithmetic that produces it, which is the difference between a test that survives a rewrite and one that has to be rewritten alongside the code. Two design questions fall out of it. First, `cost > capacity` can never succeed no matter how long you wait, so `retryAfterMs` returning a finite number there would be a lie; the honest options are `Infinity` or a thrown `RangeError`, and you should pick one and document it. Second, `retryAfterMs` returns a *fractional* millisecond (`(cost - tokens) / refillPerMs`). With `capacity: 5, refillPerSecond: 3` it answers `333.3333333333333`; wait `Math.floor` of that and you have `0.999` tokens and are refused again — an infinite retry loop in the wild — while `Math.ceil` succeeds. Rounding *up* inside `retryAfterMs` makes the promise true for every caller, including the many who will quietly floor it (an HTTP `Retry-After` header is whole seconds). That's a decision worth a comment and a test rather than a bug report. Verified by running: all 36 capacity/rate/cost combinations succeed after exactly `retryAfterMs`, and every one of them still fails a millisecond early.

### 6. Property test

```js
test('PROPERTY: no window of windowMs ever holds more than `limit` accepts', () => {
  for (let trial = 0; trial < 200; trial++) {
    const clock = fakeClock();
    const limit = 1 + Math.floor(Math.random() * 5);
    const windowMs = 1000;
    const limiter = new SlidingWindowLimiter({ limit, windowMs, now: clock.now });

    const accepted = [];
    let t = 0;
    for (let i = 0; i < 300; i++) {
      t += Math.floor(Math.random() * 120);
      clock.at(t);
      if (limiter.allow('ada')) accepted.push(t);
    }

    for (const start of accepted) {
      const inWindow = accepted.filter((at) => at >= start && at < start + windowMs).length;
      assert.ok(inWindow <= limit,
        `window starting ${start} held ${inWindow} > ${limit} (accepted: ${accepted})`);
    }
  }
});
```

WHY: every other test in this project checks one scenario somebody thought of. This one checks the *promise itself* — "at most `limit` per `windowMs`, anywhere you place the window" — over 60,000 randomly-timed requests, which is a fundamentally stronger claim than any list of examples. The original would fail it within a handful of trials, and the failure message hands you the exact timeline to replay. Two details worth internalising: the interval is half-open (`>= start`, `< start + windowMs`) to match the limiter's own `at > cutoff` rule, and it is enough to test windows that *start at an accepted request*, because sliding a window forward from anywhere else can only drop requests, never add them. Random gaps of 0–120ms are chosen so that bursts, exact-boundary hits and long idle stretches all occur naturally. Verified by running: 200 trials pass.
