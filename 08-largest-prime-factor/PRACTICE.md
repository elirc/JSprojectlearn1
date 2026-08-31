# 🏋️ Practice: Largest Prime Factor

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Two shapes of number the tests skip (warm-up)
The suite tests composites, primes, and powers of two — but not a *square of an odd prime* or a *product of two primes that straddle the square root*. Add tests: `largestPrimeFactor(49)` must be `7` (49 = 7 × 7) and `largestPrimeFactor(91)` must be `13` (91 = 7 × 13 — after dividing out 7, the leftover 13 is bigger than its own square root).
What it practices: choosing test inputs by which *code path* they exercise, not by size.
Hint: 49 finishes with `remaining === 1` (answer comes from `largest`); 91 finishes with `remaining === 13` (answer comes from the leftover). Two tests, two exits.

### ⭐⭐ 2. The smallest prime factor
Write `smallestPrimeFactor(n)` with the same guard as `largestPrimeFactor`: the first factor from 2 upward that divides `n`, or `n` itself if nothing up to its square root does. Tests: `smallestPrimeFactor(91) === 7`, `smallestPrimeFactor(97) === 97`, `smallestPrimeFactor(6) === 2`, and `smallestPrimeFactor(1)` throws a `RangeError`.
What it practices: the square-root trick and the guard clause, rebuilt from memory in a fresh function.
Hint: the first divisor found by counting up is automatically prime — the same "its smaller pieces would have divided first" insight. No `isPrime` needed.

### ⭐⭐ 3. Return ALL the factors
Write `primeFactors(n)` returning the full list with repeats, smallest first: `primeFactors(60)` gives `[2, 2, 3, 5]`, `primeFactors(97)` gives `[97]`. Test that multiplying the list back together returns `n`, and that the *last* element equals `largestPrimeFactor(n)` for `13195`.
What it practices: returning data instead of only a summary — the divide-out loop barely changes, but the answer becomes reusable.
Hint: same loop as `largestPrimeFactor`, but `push` each factor instead of overwriting `largest`; don't forget to push the leftover when `remaining > 1`. `list.reduce((a, b) => a * b, 1)` multiplies a list.

### ⭐⭐ 4. isPrime, done right this time
The refactor *deleted* the original's `isPrime` — now resurrect it properly: loop only while `factor * factor <= n`, return `false` for anything below 2 or non-integer (no throwing — "is 1.5 prime?" has an answer: no). Tests: `isPrime(2)` true, `isPrime(97)` true, `isPrime(91)` false, `isPrime(1)` false. Then add the cross-check: for every n from 2 to 100, `isPrime(n)` must equal `largestPrimeFactor(n) === n`.
What it practices: the sqrt bound applied to primality; a boolean function vs. a throwing guard; testing two functions against each other.
Hint: the original checked `i < x` — up to 600 billion steps. Yours stops at the square root: 775,146 steps for the same number. Same answers, different universe.

### ⭐⭐⭐ 5. Count the divisors without listing them
A classic result: if n = 2² × 3 × 5, then n has (2+1)×(1+1)×(1+1) = 12 divisors — each exponent, plus one, multiplied together. Write `countDivisors(n)` that builds exponent counts from `primeFactors(n)` and applies the formula. Tests: `countDivisors(60) === 12`, `countDivisors(97) === 2`, `countDivisors(1024) === 11`.
What it practices: layering — a new fact computed *from* the factor list, not from another loop over n; the tally-object pattern.
Hint: count repeats with `exponents[p] = (exponents[p] ?? 0) + 1`, then `Object.values(exponents).reduce(...)`. Sanity-check 60 by listing its divisors on paper: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60.

### ⭐⭐⭐ 6. One property test to rule them all
Write a single test that, for **every** n from 2 to 500, asserts three properties of `primeFactors(n)`: the product of the list is exactly `n`; every element passes your `isPrime`; and the list is sorted ascending. That's 499 numbers × 3 guarantees — about ten lines of test.
What it practices: property-based testing — encoding the *definition* of a correct factorization instead of hand-picking examples.
Hint: the test should pass as-is, and fail if you sabotage `primeFactors` to skip the `remaining > 1` push (91 would come back as just `[7]`, and 7 ≠ 91).

## Solutions

### 1. Path-picking tests
```js
test('square of an odd prime — everything divides out', () => {
  assert.equal(largestPrimeFactor(49), 7);
});

test('leftover bigger than its own square root', () => {
  assert.equal(largestPrimeFactor(91), 13);
});
```
WHY: the function has two exits — `largest` when remaining hits 1, and the leftover when a big prime survives the loop. 49 exercises the first (7 divides out twice, `factor * factor` passes 7² exactly), 91 the second (13 > √13 ≈ 3.6 after 7 leaves). Tests chosen per code path catch bugs that a pile of random inputs can miss.

### 2. smallestPrimeFactor
```js
export function smallestPrimeFactor(n) {
  if (!Number.isInteger(n) || n < 2) {
    throw new RangeError(`Need an integer >= 2, got ${n}`);
  }
  for (let factor = 2; factor * factor <= n; factor++) {
    if (n % factor === 0) return factor;
  }
  return n; // no factor up to sqrt(n) — n is prime
}
```
WHY: counting up means the first hit can't be composite — its own prime pieces would have divided `n` earlier — the same insight that let the refactor delete `isPrime`. The `return n` line *is* the square-root trick as a statement: survive the loop and you're prime. Guard-then-work keeps the body free to assume clean input.

### 3. primeFactors
```js
export function primeFactors(n) {
  if (!Number.isInteger(n) || n < 2) {
    throw new RangeError(`Need an integer >= 2, got ${n}`);
  }
  const factors = [];
  let remaining = n;
  for (let factor = 2; factor * factor <= remaining; factor++) {
    while (remaining % factor === 0) {
      factors.push(factor);
      remaining = remaining / factor;
    }
  }
  if (remaining > 1) factors.push(remaining);
  return factors;
}

test('the factor list multiplies back to n', () => {
  assert.deepEqual(primeFactors(60), [2, 2, 3, 5]);
  assert.equal(primeFactors(60).reduce((a, b) => a * b, 1), 60);
  assert.equal(primeFactors(13195).at(-1), largestPrimeFactor(13195));
});
```
WHY: three tiny edits — `push` instead of overwrite, keep the leftover, return the array — and the summary function becomes a data function, the same "return data, don't print (or summarize)" move as project 07. Ascending order comes free because the loop counts up, which makes `.at(-1)` agree with `largestPrimeFactor` by construction.

### 4. isPrime
```js
export function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let factor = 2; factor * factor <= n; factor++) {
    if (n % factor === 0) return false;
  }
  return true;
}

test('isPrime agrees with largestPrimeFactor on 2..100', () => {
  for (let n = 2; n <= 100; n++) {
    assert.equal(isPrime(n), largestPrimeFactor(n) === n);
  }
});
```
WHY: a *question* function returns `false` for weird input ("is 1.5 prime? no"), while a *worker* function throws — choosing which contract fits is a boundary-design decision, not a habit. The sqrt bound turns the original's uselessly slow checker into a usable one: step-counting, applied. And the cross-check works because "n is prime" and "n is its own largest prime factor" are the same claim reached by different code — two paths, one fact, tested against each other.

### 5. countDivisors
```js
export function countDivisors(n) {
  const exponents = {};
  for (const p of primeFactors(n)) {
    exponents[p] = (exponents[p] ?? 0) + 1;
  }
  return Object.values(exponents).reduce((total, e) => total * (e + 1), 1);
}
// countDivisors(60) === 12, countDivisors(97) === 2, countDivisors(1024) === 11
```
WHY: no new loop over `n` — the expensive work (factoring) happens once in `primeFactors`, and this function just reshapes the result. That's layering: each divisor of 60 picks 2 zero-to-two times, 3 zero-or-once, 5 zero-or-once, hence (2+1)(1+1)(1+1). `1024 = 2¹⁰` gives exponent 10 and 11 divisors — the powers-of-two path again, now via data.

### 6. The factorization property test
```js
test('primeFactors satisfies its own definition for 2..500', () => {
  for (let n = 2; n <= 500; n++) {
    const factors = primeFactors(n);
    assert.equal(factors.reduce((a, b) => a * b, 1), n, `product for ${n}`);
    for (const f of factors) assert.ok(isPrime(f), `${f} prime, from ${n}`);
    for (let i = 1; i < factors.length; i++) {
      assert.ok(factors[i] >= factors[i - 1], `sorted for ${n}`);
    }
  }
});
```
WHY: "multiplies back to n, all prime, sorted" is the *definition* of the answer — asserting the definition over a whole range beats any list of examples, and it leans on exercise 4's `isPrime` as an independent witness. The message strings matter: when a property fails among 499 numbers, `product for 91` tells you exactly where to look. Total cost is a few thousand steps — fast enough to run on every save, which is the performance lesson wearing its test-suite hat.
